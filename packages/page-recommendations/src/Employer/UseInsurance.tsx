// Copyright 2021-2022 @slonigiraf/app-recommendations authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { KeyringPair } from '@polkadot/keyring/types';
import React, { useCallback, useState } from 'react';
import { Button, TxButton, InputAddress } from '@polkadot/react-components';
import { useApi } from '@polkadot/react-hooks';
import { keyring } from '@polkadot/ui-keyring';
import { u8aToHex } from '@polkadot/util';
import { useTranslation } from '../translate';
import { Insurance } from '../db/Insurance';
import { db } from "../db";
import BN from 'bn.js';

interface Props {
  className?: string;
  text: string;
  insurance: Insurance;
}

function UseInsurance({ className = '', text, insurance }: Props): React.ReactElement<Props> {
  const { t } = useTranslation();
  const [currentPair, setCurrentPair] = useState<KeyringPair | null>(() => keyring.getPairs()[0] || null);
  const { api } = useApi();

  const markUsedInsurance = () => {
    db.insurances.where({ id: insurance.id }).modify((f) => f.wasUsed = true);
  }

  const _onSuccess = (_result: any) => {
    markUsedInsurance();
  }

  const _onFailed = (_result: any) => {
  }

  const _onChangeAccount = useCallback(
    (accountId: string | null) => accountId && setCurrentPair(keyring.getPair(accountId)),
    []
  );

  const isUsable = currentPair != null;

  const txButton = isUsable && <TxButton
    className='reimburseButton'
    accountId={currentPair.address}
    icon='paper-plane'
    label={t<string>('Get a reimbirsement')}
    onSuccess={_onSuccess}
    onFailed={_onFailed}
    params={
      [insurance.paraId,
      insurance.letterNumber,
      new BN(insurance.block),
      insurance.referee,
      insurance.worker,
      u8aToHex(currentPair.publicKey),
      new BN(insurance.amount),
      insurance.signOverReceipt,
      insurance.workerSign]
    }
    tx={api.tx.letters.reimburse}
  />

  const usedInfo = <b>Was invalidated</b>

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
      <Button.Group>
        {insurance.wasUsed ? usedInfo : txButton}
      </Button.Group>
    </div>
  );
}

export default React.memo(UseInsurance);