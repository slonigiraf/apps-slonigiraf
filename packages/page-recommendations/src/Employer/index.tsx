// Copyright 2021-2022 @slonigiraf/app-recommendations authors & contributors
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useState } from 'react'
import QrScanner from '../QrScanner'
import InsurancesList from './InsurancesList'
import { IPFS } from 'ipfs-core';
import { useTranslation } from '../translate';
import { Button, InputAddress, Modal } from '@polkadot/react-components';
import { storeInsurance } from '../utils';
import type { KeyringPair } from '@polkadot/keyring/types';
import { keyring } from '@polkadot/ui-keyring';
import { u8aToHex } from '@polkadot/util';

interface Props {
  className?: string;
  ipfs: IPFS;
}

function Employer({ className = '', ipfs }: Props): React.ReactElement<Props> {
  const [currentPair, setCurrentPair] = useState<KeyringPair | null>(() => keyring.getPairs()[0] || null);
  const [modalIsOpen, setModalIsOpen] = useState(false)
  const { t } = useTranslation();

  const _onChangeAccount = useCallback(
    (accountId: string | null) => accountId && setCurrentPair(keyring.getPair(accountId)),
    []
  );

  const storeLetter = (data: string) => {
    let dataArray = data.split(",")
    if (dataArray.length === 11) {
      storeToDB(dataArray);
      setModalIsOpen(false);
    }
  }

  const storeToDB = async (data: string[]) => {
    const [textHash,
      genesisHex,
      letterId,
      blockNumber,
      refereePublicKeyHex,
      workerPublicKeyHex,
      amountValue,
      refereeSignOverPrivateData,
      refereeSignOverReceipt,
      employerPublicKeyHex,
      workerSignOverInsurance] = data;
    
    const insurance = {
      created: new Date(),
      cid: textHash,
      genesis: genesisHex,
      letterNumber: parseInt(letterId, 10),
      block: blockNumber,
      referee: refereePublicKeyHex,
      worker: workerPublicKeyHex,
      amount: amountValue,
      signOverPrivateData: refereeSignOverPrivateData,
      signOverReceipt: refereeSignOverReceipt,
      employer: employerPublicKeyHex,
      workerSign: workerSignOverInsurance,
      wasUsed: false
    };
    storeInsurance(insurance);
  }

  return (
    <div className={`toolbox--Worker ${className}`}>
      <h1>{t<string>('Workers\' diplomas')}</h1>
      <div className='ui--row'>
        <InputAddress
          className='full'
          help={t<string>('select the account you wish to sign data with')}
          isInput={false}
          label={t<string>('account')}
          type='account'
          onChange={_onChangeAccount}
        />
      </div>
      <div className='ui--row'>
        <Button
          icon='plus'
          label={t<string>('Add worker\'s letter')}
          onClick={() => setModalIsOpen(true)}
        />
      </div>
      <div className='ui--row'>
        <InsurancesList ipfs={ipfs} employer={u8aToHex(currentPair?.publicKey)} />
      </div>

      {modalIsOpen && <div className='ui--row'>
        <Modal
          header={t<string>('Scan a letter QR code')}
          onClose={() => setModalIsOpen(false)}
          size='small'
        >
          <Modal.Content>
            <QrScanner
              onResult={(result, error) => {
                if (result != undefined) {
                  storeLetter(result?.getText())
                }
                if (!error) {
                  console.info(error)
                }
              }}
              constraints={{facingMode: 'environment'}}
            />
          </Modal.Content>
        </Modal>
      </div>}
    </div>
  )
}

export default React.memo(Employer);