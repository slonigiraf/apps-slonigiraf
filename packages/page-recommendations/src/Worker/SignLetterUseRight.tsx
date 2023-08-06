// Copyright 2021-2022 @slonigiraf/app-recommendations authors & contributors
// SPDX-License-Identifier: Apache-2.0
import BN from 'bn.js';
import QRCode from 'qrcode.react';
import { getDataToSignByWorker } from '@slonigiraf/helpers';
import type { Signer } from '@polkadot/api/types';
import type { KeyringPair } from '@polkadot/keyring/types';
import React, { useCallback, useEffect, useState } from 'react';
import { web3FromSource } from '@polkadot/extension-dapp';
import { Button, Input, InputAddress, Output } from '@polkadot/react-components';
import { useToggle } from '@polkadot/react-hooks';
import { keyring } from '@polkadot/ui-keyring';
import { isFunction, u8aToHex, hexToU8a, u8aWrapBytes } from '@polkadot/util';
import { useTranslation } from '../translate';
import { qrCodeSize } from '../constants';
import Unlock from '@polkadot/app-signing/Unlock';
import { Letter } from '../db/Letter';
import { storeLetterUsageRight } from '../utils';

interface Props {
  className?: string;
  text: string;
  letter: Letter;
}

interface AccountState {
  isExternal: boolean;
  isHardware: boolean;
  isInjected: boolean;
}

interface SignerState {
  isUsable: boolean;
  signer: Signer | null;
}

function SignLetterUseRight({ className = '', text, letter }: Props): React.ReactElement<Props> {
  const { t } = useTranslation();
  const [currentPair, setCurrentPair] = useState<KeyringPair | null>(() => keyring.getPairs()[0] || null);
  const [{ isInjected }, setAccountState] = useState<AccountState>({ isExternal: false, isHardware: false, isInjected: false });
  const [isLocked, setIsLocked] = useState(false);
  const [{ isUsable, signer }, setSigner] = useState<SignerState>({ isUsable: true, signer: null });
  const [signature, setSignature] = useState('');
  const [isUnlockVisible, toggleUnlock] = useToggle();
  const [employerPublicKeyHex, setEmployerPublicKeyHex] = useState<string>("");
  const [letterInfo, setLetterInfo] = useState('')
  const [modalIsOpen, setModalIsOpen] = useState(false)

  // const [textHash, letterId, blockNumber, refereeAddress,
  //   workerAddress, amount, refereeSignOverPrivateData, refereeSignOverReceipt] = letter.split(",");

  // const letterIdValue = parseInt(letterId, 10);
  // const blockNumberValue = parseInt(blockNumber, 10);
  // const amountValue = parseInt(amount, 10);

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

  const _onChangeAccount = useCallback(
    (accountId: string | null) => accountId && setCurrentPair(keyring.getPair(accountId)),
    []
  );

  const _onChangeEmployer = useCallback(
    (employerPublicKeyHex: string) => setEmployerPublicKeyHex(employerPublicKeyHex),
    []
  );

  const _onSign = useCallback(
    async () => {
      if (isLocked || !isUsable || !currentPair) {
        return;
      }
      // generate a data to sign      
      const letterInsurance = getDataToSignByWorker(letter.paraId, letter.letterNumber, new BN(letter.block), hexToU8a(letter.referee),
      hexToU8a(letter.worker), new BN(letter.amount), hexToU8a(letter.signOverReceipt), hexToU8a(employerPublicKeyHex));
      let workerSignOverInsurance = "";
      // sign
      if (signer && isFunction(signer.signRaw)) {// Use browser extenstion 
        const u8WorkerSignOverInsurance = await signer.signRaw({
          address: currentPair.address,
          data: u8aToHex(letterInsurance),
          type: 'bytes'
        });
        workerSignOverInsurance = u8WorkerSignOverInsurance.signature;

      } else {// Use locally stored account to sign
        workerSignOverInsurance = u8aToHex(currentPair.sign(u8aWrapBytes(letterInsurance)));
      }
      // create the result text
      let result = [];
      result.push(letter.cid);
      result.push(letter.paraId);
      result.push(letter.letterNumber);
      result.push(letter.block);
      result.push(letter.referee);
      result.push(letter.worker);
      result.push(letter.amount);
      result.push(letter.signOverPrivateData);
      result.push(letter.signOverReceipt);
      result.push(employerPublicKeyHex);
      result.push(workerSignOverInsurance);
      const letterInfo = result.join(",");
      // show QR
      storeLetterUsageRight(letter, employerPublicKeyHex, workerSignOverInsurance);
      setLetterInfo(letterInfo);
      setModalIsOpen(true);
    },
    [currentPair, isLocked, isUsable, signer, employerPublicKeyHex]
  );

  const _onUnlock = useCallback(
    (): void => {
      setIsLocked(false);
      toggleUnlock();
    },
    [toggleUnlock]
  );

  const qrPart = modalIsOpen ? <div><h2>{t<string>('Scan this from an employer account')}</h2><QRCode value={letterInfo} size={qrCodeSize} /></div>
   : ""

  return (
    <div className={`toolbox--Sign ${className}`}>
      <h1>{text}</h1>
      <div className='ui--row'>
        <InputAddress
          className='full'
          help={t<string>('select the account you wish to sign data with')}
          isInput={false}
          label={t<string>('account')}
          onChange={_onChangeAccount}
          type='account'
        />
      </div>
      <div className='ui--row'>
        <Input
          autoFocus
          className='full'
          help={t<string>('To employer help info TODO')}
          label={t<string>('to employer')}
          onChange={_onChangeEmployer}
          value={employerPublicKeyHex}
        />
      </div>
      <div className='toolbox--Sign-input'>
        <div className='ui--row'>
          <Output
            className='full'
            help={t<string>('create a diploma help text')}
            isHidden={signature.length === 0}
            isMonospace
            label={t<string>('create a diploma')}
            value={signature}
            withCopy
          />
        </div>
      </div>
      <Button.Group>
        <div
          className='unlock-overlay'
          hidden={!isUsable || !isLocked || isInjected}
        >
          {isLocked && (
            <div className='unlock-overlay-warning'>
              <div className='unlock-overlay-content'>
                {t<string>('You need to unlock this account to be able to sign data.')}<br />
                <Button.Group>
                  <Button
                    icon='unlock'
                    label={t<string>('Unlock account')}
                    onClick={toggleUnlock}
                  />
                </Button.Group>
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
                ? t<string>('This injected account cannot be used to sign data since the extension does not support raw signing.')
                : t<string>('This external account cannot be used to sign data. Only Limited support is currently available for signing from any non-internal accounts.')}
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
        <Button
          icon='key'
          isDisabled={!(isUsable && !isLocked )}
          label={t<string>('Sign the recommendation')}
          onClick={_onSign}
        />
      </Button.Group>
      {qrPart}
    </div>
  );
}

export default React.memo(SignLetterUseRight);