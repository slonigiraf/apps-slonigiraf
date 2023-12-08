// Copyright 2021-2022 @slonigiraf/app-recommendations authors & contributors
// SPDX-License-Identifier: Apache-2.0
import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import BN from 'bn.js';
import Unlock from '@polkadot/app-signing/Unlock';
import { statics } from '@polkadot/react-api/statics';
import { styled, Toggle, Button, Input, InputAddress, InputBalance, Output, Modal, Icon, Card } from '@polkadot/react-components';
import { web3FromSource } from '@polkadot/extension-dapp';
import type { KeyringPair } from '@polkadot/keyring/types';
import { useApi, useBlockTime, useToggle } from '@polkadot/react-hooks';
import { isFunction, u8aToHex, hexToU8a, u8aWrapBytes, BN_ONE } from '@polkadot/util';
import { keyring } from '@polkadot/ui-keyring';
import type { Skill } from '@slonigiraf/app-slonig-components';
import { QRWithShareAndCopy, getBaseUrl, getIPFSDataFromContentID, parseJson, useIpfsContext, nameFromKeyringPair, QRAction } from '@slonigiraf/app-slonig-components';
import { db, Letter } from '@slonigiraf/app-recommendations';
import { getPublicDataToSignByReferee, getPrivateDataToSignByReferee } from '@slonigiraf/helpers';
import { getLastUnusedLetterNumber, setLastUsedLetterNumber, storeLetter } from '../utils.js';
import Reexamine from './Reexamine.js';
import { TeachingAlgorithm } from './TeachingAlgorithm.js';
import DoInstructions from './DoInstructions.js';
import { useTranslation } from '../translate.js';
import type { AccountState, SignerState } from '@slonigiraf/app-slonig-components';

interface Props {
  className?: string;
}

const getDiplomaBlockNumber = (currentBlock: BN, blockTimeMs: number, secondsToAdd: number): BN => {
  const secondsToGenerateBlock = blockTimeMs / 1000;
  const blocksToAdd = new BN(secondsToAdd).div(new BN(secondsToGenerateBlock));
  const blockAllowed = currentBlock.add(blocksToAdd);
  return blockAllowed;
}

function letterAsArray(letter: Letter) {
  let result = [];
  result.push(letter.cid);                      // Skill CID
  result.push(letter.workerId);                 // Student Identity
  result.push(letter.genesis);                  // Genesis U8 Hex
  result.push(letter.letterNumber);             // Letter ID
  result.push(letter.block);                    // Diploma Block Number
  result.push(letter.referee);                  // Referee Public Key Hex
  result.push(letter.worker);                   // Student
  result.push(letter.amount);                   // Amount
  result.push(letter.signOverPrivateData);      // Referee Sign Over Private Data
  result.push(letter.signOverReceipt);          // Referee Sign Over Receipt
  return result;
}


function Tutor({ className = '' }: Props): React.ReactElement<Props> {
  // Initialize api, ipfs and translation
  const { ipfs, isIpfsReady } = useIpfsContext();
  const { api, isApiReady } = useApi();
  const { t } = useTranslation();

  // Process query
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const queryData = queryParams.get("d") || "";
  const [tutor, skillCID, studentIdentity, student, cidR, genesisR, nonceR, blockR, blockAllowedR, tutorR, studentR, amountR, signOverPrivateDataR, signOverReceiptR, studentSignR] = queryData.split(' ');
  const [skill, setSkill] = useState<Skill | null>(null);

  // Initialize account
  const [currentPair, setCurrentPair] = useState<KeyringPair | null>(() => keyring.getPairs()[0] || null);
  const [{ isInjected }, setAccountState] = useState<AccountState>({ isExternal: false, isHardware: false, isInjected: false });
  const [isLocked, setIsLocked] = useState(false);
  const [{ isUsable, signer }, setSigner] = useState<SignerState>({ isUsable: true, signer: null });
  const [signature, setSignature] = useState('');
  const [isUnlockVisible, toggleUnlock] = useToggle();

  // Store progress state
  const [canIssueDiploma, setCanIssueDiploma] = useState(false);
  const [reexamined, setReexamined] = useState<boolean>(cidR === undefined);
  const [teachingAlgorithm, setTeachingAlgorithm] = useState<TeachingAlgorithm | null>(null);

  // Initialize diploma details
  //   stake: 572 Slon, 12 zeroes for numbers after point
  const defaultStake: BN = new BN("572000000000000");
  const [amount, setAmount] = useState<BN>(defaultStake);
  //   days
  const defaultDaysValid: number = 730;
  const [daysValid, setDaysValid] = useState<number>(defaultDaysValid);
  //   last block number
  const [currentBlockNumber, setCurrentBlockNumber] = useState(new BN(0));
  const [millisecondsPerBlock,] = useBlockTime(BN_ONE, api);
  const [diplomaBlockNumber, setDiplomaBlockNumber] = useState<BN>(new BN(0));
  //   raw diploma data
  const [diplomaText, setDiplomaText] = useState('');
  const [diplomaAddUrl, setDiplomaAddUrl] = useState('');
  //   student name
  const [studentName, setStudentName] = useState<string | undefined>(undefined);
  //   show stake and days or hide
  const [visibleDiplomaDetails, toggleVisibleDiplomaDetails] = useToggle(false);
  //   issued diploma
  const [diploma, setDiploma] = useState<Letter | null>(null);

  // Fetch diploma from db if it was already issued
  useEffect(() => {
    if (student) {
      async function fetchDiploma() {
        const issuedDiploma = await db.letters.get({ worker: student });
        console.log("student", student)
        console.log("diploma", diploma)
        if (issuedDiploma) {
          setDiploma(issuedDiploma);
          createDiplomaQR(issuedDiploma);
        } else {
          setDiploma(null);
        }
      }
      fetchDiploma()
    }
  }, [student])

  // Fetch skill data and set teaching algorithm
  useEffect(() => {
    async function fetchData() {
      if (isIpfsReady && skillCID) {
        try {
          const skillContent = await getIPFSDataFromContentID(ipfs, skillCID);
          const skillJson = parseJson(skillContent);
          setSkill(skillJson);
          setTeachingAlgorithm(new TeachingAlgorithm(t, skillJson ? skillJson.q : []));
        }
        catch (e) {
          console.log(e);
        }
      }
    }
    fetchData()
  }, [ipfs, skillCID])

  // Fetch student name
  useEffect(() => {
    async function fetchStudentName() {
      if (studentIdentity) {
        const name = await db.pseudonyms.get(studentIdentity);
        if (name) {
          setStudentName(name.pseudonym);
        }
      }
    }
    fetchStudentName()
  }, [studentIdentity])

  // Fetch block number (once)
  useEffect(() => {
    async function fetchBlockNumber() {
      if (isApiReady) {
        try {
          const chainHeader = await api.rpc.chain.getHeader();
          const currentBlockNumber = new BN(chainHeader.number.toString());
          setCurrentBlockNumber(currentBlockNumber);
          const defaultSecondsValid = defaultDaysValid * 86400;
          const diplomaBlockNumber: BN = getDiplomaBlockNumber(currentBlockNumber, millisecondsPerBlock, defaultSecondsValid);
          setDiplomaBlockNumber(diplomaBlockNumber);
        } catch (error) {
          console.error("Error fetching block number: ", error);
        }
      }
    }
    fetchBlockNumber();
  }, [api, isApiReady]);

  // Initialize account state
  useEffect((): void => {
    const meta = (currentPair && currentPair.meta) || {};
    const isExternal = (meta.isExternal as boolean) || false;
    const isHardware = (meta.isHardware as boolean) || false;
    const isInjected = (meta.isInjected as boolean) || false;
    const isUsable = !(isExternal || isHardware || isInjected);

    setAccountState({ isExternal, isHardware, isInjected });
    setIsLocked(
      isInjected
        ? false
        : (currentPair && currentPair.isLocked) || false
    );
    setSignature('');
    setSigner({ isUsable, signer: null });

    // for injected, retrieve the signer
    if (meta.source && isInjected) {
      web3FromSource(meta.source as string)
        .catch((): null => null)
        .then((injected) => setSigner({
          isUsable: isFunction(injected?.signer?.signRaw),
          signer: injected?.signer || null
        }))
        .catch(console.error);
    }
  }, [currentPair]);

  const createDiplomaQR = useCallback((letter: Letter) => {
    const letterArray = letterAsArray(letter);
    const qrData = {
      q: QRAction.ADD_DIPLOMA,
      d: letterArray.join(",")
    };
    const qrCodeText = JSON.stringify(qrData);
    const url = getBaseUrl() + `/#/diplomas?d=${letterArray.join("+")}`;
    setDiplomaText(qrCodeText);
    setDiplomaAddUrl(url);
  }, [setDiplomaText, setDiplomaAddUrl]);

  const _onChangeAccount = useCallback(
    (accountId: string | null) => accountId && setCurrentPair(keyring.getPair(accountId)),
    []
  );

  const _onChangeDaysValid = useCallback(
    (value: string) => {
      const days = parseInt(value, 10); // Using base 10 for the conversion
      if (!isNaN(days)) {
        setDaysValid(days);
        const secondsToAdd = days * 86400; // 86400 - seconds in a day
        if (Number.isSafeInteger(secondsToAdd)) {
          const diplomaBlockNumber: BN = getDiplomaBlockNumber(currentBlockNumber, millisecondsPerBlock, secondsToAdd);
          setDiplomaBlockNumber(diplomaBlockNumber);
        }
      } else {
        setDaysValid(0);
      }
    },
    [currentBlockNumber]
  );

  // Sign diploma
  const _onSign = useCallback(
    async () => {
      if (isLocked || !isUsable || !currentPair) {
        return;
      }
      // generate a data to sign
      const genesisU8 = statics.api.genesisHash;
      const referee = currentPair;
      const refereeU8 = referee.publicKey;
      const refereePublicKeyHex = u8aToHex(refereeU8);
      const letterId = await getLastUnusedLetterNumber(refereePublicKeyHex);
      const workerPublicKeyU8 = hexToU8a(student);
      const privateData = getPrivateDataToSignByReferee(skillCID, genesisU8, letterId, diplomaBlockNumber, refereeU8, workerPublicKeyU8, amount);
      const receipt = getPublicDataToSignByReferee(genesisU8, letterId, diplomaBlockNumber, refereeU8, workerPublicKeyU8, amount);

      let refereeSignOverPrivateData = '';
      let refereeSignOverReceipt = '';

      // sign
      if (signer && isFunction(signer.signRaw)) {// Use browser extenstion 
        const u8RefereeSignOverPrivateData = await signer.signRaw({
          address: currentPair.address,
          data: u8aToHex(privateData),
          type: 'bytes'
        });
        refereeSignOverPrivateData = u8RefereeSignOverPrivateData.signature;
        //
        const u8RefereeSignOverReceipt = await signer.signRaw({
          address: currentPair.address,
          data: u8aToHex(receipt),
          type: 'bytes'
        });
        refereeSignOverReceipt = u8RefereeSignOverReceipt.signature;
      } else {// Use locally stored account to sign
        refereeSignOverPrivateData = u8aToHex(currentPair.sign(u8aWrapBytes(privateData)));
        refereeSignOverReceipt = u8aToHex(currentPair.sign(u8aWrapBytes(receipt)));
      }

      const letter = {
        created: new Date(),
        cid: skillCID,
        workerId: studentIdentity,
        genesis: genesisU8.toHex(),
        letterNumber: letterId,
        block: diplomaBlockNumber.toString(),
        referee: refereePublicKeyHex,
        worker: student,
        amount: amount.toString(),
        signOverPrivateData: refereeSignOverPrivateData,
        signOverReceipt: refereeSignOverReceipt
      };
      await storeLetter(letter);
      await setLastUsedLetterNumber(refereePublicKeyHex, letterId);
      createDiplomaQR(letter);
      setDiploma(letter);
    },
    [currentPair, isLocked, isUsable, signer, ipfs, skill, student, diplomaBlockNumber, amount]
  );

  // If account is unlocked by password
  const _onUnlock = useCallback(
    (): void => {
      setIsLocked(false);
      toggleUnlock();
    },
    [toggleUnlock]
  );

  const updateReexamined = (): void => {
    setReexamined(true);
  };

  const updateTutoring = (stage: string): void => {
    if (stage === 'success') {
      setCanIssueDiploma(true);
    } else {
      setCanIssueDiploma(false);
    }
  };

  const publicKeyHex = currentPair ? u8aToHex(currentPair.publicKey) : "";
  const name = nameFromKeyringPair(currentPair);
  const qrData = {
    q: QRAction.SHOW_TUTOR_IDENTITY,
    n: name,
    p: publicKeyHex,
  };
  const qrCodeText = JSON.stringify(qrData);
  const url: string = getBaseUrl() + `/#/knowledge?tutor=${publicKeyHex}`;

  const insurance = {
    created: new Date(),
    cid: cidR,
    genesis: genesisR,
    letterNumber: parseInt(nonceR, 10),
    block: blockR,
    blockAllowed: blockAllowedR,
    referee: tutorR,
    worker: studentR,
    amount: amountR,
    signOverPrivateData: signOverPrivateDataR,
    signOverReceipt: signOverReceiptR,
    employer: publicKeyHex,
    workerSign: studentSignR,
    wasUsed: false
  };

  const isDedicatedTutor = (tutor === publicKeyHex) || !tutor;

  const unlock = <>
    <div
      className='unlock-overlay'
      hidden={!isUsable || !isLocked || isInjected}
    >
      {isLocked && (
        <div className='unlock-overlay-warning'>
          <div className='unlock-overlay-content'>
            <div>
              <Button
                icon='unlock'
                label={t('Unlock your account before tutoring')}
                onClick={toggleUnlock}
              />
            </div>
          </div>
        </div>
      )}
    </div>
    <div
      className='unlock-overlay'
      hidden={isUsable}
    >
      <div className='unlock-overlay-warning'>
        <div className='unlock-overlay-content'>
          {isInjected
            ? t('This injected account cannot be used to sign data since the extension does not support raw signing.')
            : t('This external account cannot be used to sign data. Only Limited support is currently available for signing from any non-internal accounts.')}
        </div>
      </div>
    </div>
    {isUnlockVisible && (
      <Unlock
        onClose={toggleUnlock}
        onUnlock={_onUnlock}
        pair={currentPair}
      />
    )}
  </>;

  const showDiplomaFromDb = <>
    <div>
      <h2>{t('Student')}: {studentName}</h2>
    </div>
    <div>
      <h2>{t('Show the QR to your student to sell the diploma')}: "{skill ? skill.h : ''}"</h2>
    </div>
    <br />
    <QRWithShareAndCopy
      dataQR={diplomaText}
      titleShare={t('QR code')}
      textShare={t('Press the link to add the diploma')}
      urlShare={diplomaAddUrl}
      dataCopy={diplomaAddUrl} />
  </>;

  const reexamAndDiplomaIssuing = <>
    <div>
      <h2>{t('Student')}: {studentName}</h2>
    </div>
    <div style={!reexamined ? {} : { display: 'none' }}>
      <Reexamine currentPair={currentPair} insurance={insurance} onResult={updateReexamined} />
    </div>
    <div style={reexamined ? {} : { display: 'none' }}>
      <b>{t('Teach and create a diploma')}: </b>
      <b>"{skill ? skill.h : ''}"</b>
      <DoInstructions algorithm={teachingAlgorithm} onResult={updateTutoring} />
    </div>
    {
      canIssueDiploma &&
      <StyledDiv>
        <Card>
          <div className='ui--row'>
            <h2>{t('Diploma')}</h2>
          </div>
          <table>
            <tbody>
              <tr>
                <td><Icon icon='graduation-cap' /></td>
                <td>{skill ? skill.h : ''}</td>
              </tr>
              <tr>
                <td><Icon icon='person' /></td>
                <td>{studentName}</td>
              </tr>
            </tbody>
          </table>
          <Toggle
            label={t('details')}
            onChange={toggleVisibleDiplomaDetails}
            value={visibleDiplomaDetails}
          />
          <div className='ui--row' style={visibleDiplomaDetails ? {} : { display: 'none' }}>
            <InputBalance
              help={t('Stake reputation help info')}
              isZeroable
              label={t('stake slon')}
              onChange={setAmount}
              defaultValue={amount}
            />
          </div>
          <div className='ui--row' style={visibleDiplomaDetails ? {} : { display: 'none' }}>
            <Input
              className='full'
              help={t('Days valid info')}
              label={t('days valid')}
              onChange={_onChangeDaysValid}
              value={daysValid.toString()}
            />
          </div>
        </Card>

        <div className='toolbox--Tutor-input'>
          <div className='ui--row'>
            <Output
              className='full'
              help={t('create a diploma help text')}
              isHidden={signature.length === 0}
              isMonospace
              label={t('create a diploma')}
              value={signature}
              withCopy
            />
          </div>
        </div>
        <div>
          {unlock}
          {!isLocked && (<Button
            icon='dollar'
            isDisabled={!(isUsable && !isLocked && isIpfsReady)}
            label={t('Sell the diploma')}
            onClick={_onSign}
          />)}
          {!isIpfsReady ? <div>{t('Connecting to IPFS...')}</div> : ""}
        </div>
      </StyledDiv>
    }
  </>;

  return (
    <div className={`toolbox--Tutor ${className}`}>
      {/* The div below helps initialize account */}
      <div className='ui--row' style={{ display: 'none' }}>
        <InputAddress
          className='full'
          help={t('select the account you wish to sign data with')}
          isInput={false}
          label={t('account')}
          onChange={_onChangeAccount}
          type='account'
        />
      </div>

      {
        (student === undefined || !isDedicatedTutor) ? <>
          {
            isDedicatedTutor ?
              <h2>{t('Show to a student to begin tutoring')}</h2>
              :
              <h2>{t('Student has shown you a QR code created for a different tutor. Ask them to scan your QR code.')}</h2>
          }
          <QRWithShareAndCopy
            dataQR={qrCodeText}
            titleShare={t('QR code')}
            textShare={t('Press the link to start learning')}
            urlShare={url}
            dataCopy={url} />
        </>
          :
          <> {isLocked ?
            unlock :
            <> {diploma ? showDiplomaFromDb : reexamAndDiplomaIssuing}</>
          }</>
      }
    </div>
  );
}

const StyledDiv = styled.div`
  max-width: 300px;
`;

export default React.memo(Tutor);
