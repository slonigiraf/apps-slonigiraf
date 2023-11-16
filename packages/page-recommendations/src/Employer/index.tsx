// Copyright 2021-2022 @slonigiraf/app-recommendations authors & contributors
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useState } from 'react';
import InsurancesList from './InsurancesList';
import { IPFS } from 'ipfs-core';
import { useTranslation } from '../translate';
import { InputAddress } from '@polkadot/react-components';
import type { KeyringPair } from '@polkadot/keyring/types';
import { keyring } from '@polkadot/ui-keyring';
import { u8aToHex } from '@polkadot/util';
import QRCode from 'qrcode.react';
import { useLocation } from 'react-router-dom';

interface Props {
  className?: string;
  ipfs: IPFS;
}

function Employer({ className = '', ipfs }: Props): React.ReactElement<Props> {
  const [currentPair, setCurrentPair] = useState<KeyringPair | null>(() => keyring.getPairs()[0] || null);
  const { t } = useTranslation();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const student = queryParams.get("student") || "";

  const _onChangeAccount = useCallback(
    (accountId: string | null) => accountId && setCurrentPair(keyring.getPair(accountId)),
    []
  );

  let publicKeyHex = "";
  if (currentPair !== null) {
    publicKeyHex = u8aToHex(currentPair.publicKey);
  }
  const qrToBuyDiplomas = `{"q": 0,"d": "diplomas?teacher=${publicKeyHex}"}`;

  return (
    <div className={`toolbox--Student ${className}`}>
      {/* The div below helps initialize account */}
      <div className='ui--row' style={{ display: 'none' }}>
        <InputAddress
          className='full'
          help={t('select the account you wish to sign data with')}
          isInput={false}
          label={t('account')}
          type='account'
          onChange={_onChangeAccount}
        />
      </div>
      {
        student === "" ? <>
          <h2>{t('Show the QR to a student to see their results')}</h2>
          <QRCode value={qrToBuyDiplomas} />
        </>
          :
          <div className='ui--row'>
            <InsurancesList ipfs={ipfs} teacher={u8aToHex(currentPair?.publicKey)} student={student} />
          </div>
      }
    </div>
  )
}

export default React.memo(Employer);