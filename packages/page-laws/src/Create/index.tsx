// Copyright 2021-2022 @slonigiraf/app-laws authors & contributors
// SPDX-License-Identifier: Apache-2.0

import BN from 'bn.js';
import { getIPFSContentID, digestFromCIDv1, useLoginContext } from '@slonigiraf/app-slonig-components';
import { BN_ZERO } from '@polkadot/util';
import React, { useCallback, useEffect, useState } from 'react';
import { Button, Input, InputBalance, TxButton } from '@polkadot/react-components';
import { u8aToHex } from '@polkadot/util';
import { useTranslation } from '../translate.js';
import { useApi } from '@polkadot/react-hooks';
import { randomAsU8a } from '@polkadot/util-crypto';
import { useIpfsContext } from '@slonigiraf/app-slonig-components';
import { useInfo } from '@slonigiraf/app-slonig-components';
import { useToggle } from '@polkadot/react-hooks';
import { sendCreateTransaction } from '../Edit/sendTransaction.js';

interface Props {
  className?: string;
}

function Create({ className = '' }: Props): React.ReactElement<Props> {
  const { ipfs, isIpfsReady } = useIpfsContext();
  const { t } = useTranslation();
  const { showInfo } = useInfo();
  const [isProcessing, toggleProcessing] = useToggle(false);
  const [text, setText] = useState<string>("");
  const {
    currentPair,
    isLoginRequired
  } = useLoginContext();
  console.log("Create, currentPair", currentPair?.address)
  console.log("Create, currentPair.isLocked", currentPair?.isLocked)

  const [amount, setAmount] = useState<BN>(BN_ZERO);
  const [idHex, setIdHex] = useState<string>("");
  const [digestHex, setDigestHex] = useState<string>("");
  const { api } = useApi();

  useEffect(() => {
    _onSign();
  }, [text]);

  const _onChangeData = useCallback(
    (data: string) => setText(data),
    []
  );

  const _onSign = useCallback(
    async () => {
      if (!isIpfsReady) {
        return;
      }
      // generate a data to sign
      const textCIDString = await getIPFSContentID(ipfs, text);
      const digest = await digestFromCIDv1(textCIDString);
      setDigestHex(u8aToHex(digest));
      setIdHex(u8aToHex(randomAsU8a(32)));
    },
    [currentPair, isLoginRequired, ipfs, text]
  );

  const _onResult = () => {
    toggleProcessing();
  }

  const _onSuccess = () => {
    _onResult();
  }
  const _onFailed = () => {
    _onResult();
  }

  const _onSave = (): void => {
    if (!(idHex && digestHex && amount && currentPair)) {
      console.error('Required parameters are missing');
      return;
    }
    toggleProcessing();
    sendCreateTransaction(idHex, digestHex, amount,
      currentPair, api, t, showInfo, _onSuccess, _onFailed);
  };

  const txButton = <Button
    icon='save'
    label={t('Save')}
    onClick={_onSave}
    isDisabled={isProcessing || !isIpfsReady || !currentPair || isLoginRequired}
  />;

  return (
    <div className={`toolbox--Sign ${className}`}>
      <h1>{t('Create')}</h1>
      <div className='ui--row'>
        <Input
          autoFocus
          className='full'
          help={t('Text')}
          label={t('text')}
          onChange={_onChangeData}
          value={text}
          isDisabled={ipfs == null}
        />
      </div>
      <div className='ui--row'>
        <InputBalance
          autoFocus
          help={t('Tokens to burn help info')}
          isZeroable
          label={t('Tokens to burn')}
          onChange={setAmount}
          isDisabled={ipfs == null}
        />
      </div>
      <Button.Group>
        {txButton}
        {!isIpfsReady ? <div>{t('Connecting to IPFS...')}</div> : ""}
      </Button.Group>
    </div>
  );
}

export default React.memo(Create);
