// Copyright 2021-2022 @slonigiraf/app-recommendations authors & contributors
// SPDX-License-Identifier: Apache-2.0

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlgorithmStage } from './AlgorithmStage.js';
import { Button, TxButton } from '@polkadot/react-components';
import type { Skill } from '@slonigiraf/app-slonig-components';
import { ValidatingAlgorithm } from './ValidatingAlgorithm.js';
import { useTranslation } from '../translate.js';
import { useIpfsContext } from '@slonigiraf/app-slonig-components';
import { Insurance } from '../db/Insurance.js';
import { getIPFSDataFromContentID, parseJson } from '@slonigiraf/app-slonig-components'
import type { KeyringPair } from '@polkadot/keyring/types';
import { useApi } from '@polkadot/react-hooks';
import { db } from "../db/index.js";
import BN from 'bn.js';
import { u8aToHex } from '@polkadot/util';

interface Props {
  className?: string;
  currentPair: KeyringPair;
  insurance: Insurance | null;
  onResult: () => void;
}

function Reexamine({ className = '', currentPair, insurance, onResult }: Props): React.ReactElement<Props> {
  const { api } = useApi();
  const { ipfs, isIpfsReady } = useIpfsContext();
  const [skill, setSkill] = useState<Skill>();
  const { t } = useTranslation();
  const [algorithmStage, setAlgorithmStage] = useState<AlgorithmStage>();

  useEffect(() => {
    async function fetchData() {
      if (isIpfsReady && insurance && insurance.cid) {
        try {
          const skillContent = await getIPFSDataFromContentID(ipfs, insurance.cid);
          const skillJson = parseJson(skillContent);
          setSkill(skillJson);
          const newAlgorithm = new ValidatingAlgorithm(t, skillJson ? skillJson.q : []);
          setAlgorithmStage(newAlgorithm.getBegin());
        }
        catch (e) {
          console.log(e);
        }
      }
    }
    fetchData()
  }, [ipfs, insurance])

  const handleStageChange = (nextStage) => {
    if (nextStage.type === 'reimburse') {
      getBounty();
    } else if (nextStage.type === 'success') {
      onResult();
    } else {
      setAlgorithmStage(nextStage);
    }
  };

  const markUsedInsurance = () => {
    if (insurance.id) {
      db.insurances.where({ id: insurance.id }).modify((f) => f.wasUsed = true);
    }
  }

  const _onSuccess = (_result: any) => {
    markUsedInsurance();
    onResult();
  }

  const _onFailed = (_result: any) => {
    onResult();
  }

  const getBounty = () => {
    signAndSendTransaction().catch(console.error);
  }

  const signAndSendTransaction = useCallback(async () => {
    // Ensure insurance and currentPair are available
    if (!insurance || !currentPair) {
      console.error('Required parameters are missing');
      return;
    }

    // Create the transaction
    const transfer = api.tx.letters.reimburse(
      insurance.letterNumber,
      new BN(insurance.block),
      new BN(insurance.blockAllowed),
      insurance.referee,
      insurance.worker,
      u8aToHex(currentPair.publicKey),
      new BN(insurance.amount),
      insurance.signOverReceipt,
      insurance.workerSign
    );

    // Sign and send the transaction
    try {
      await transfer.signAndSend(currentPair, ({ status, events }) => {
        // Handle transaction status and events
        console.log(`Transaction status: ${status}`);
        if (status.isInBlock || status.isFinalized) {
          //TODO: use _onFailed and _onSuccess
          onResult();

          events.forEach(({ event }) => {
            console.log(`Event: ${event.section}.${event.method}`);

            if (api.events.system.ExtrinsicFailed.is(event)) {
              const [error] = event.data;
              if (error.isModule) {
                // for module errors, we have the section indexed, lookup
                const decoded = api.registry.findMetaError(error.asModule);
                const { docs, method, section } = decoded;
                console.error(`${section}.${method}: ${docs.join(' ')}`);
              } else {
                // Other, CannotLookup, BadOrigin, no extra info
                console.error(error.toString());
              }
            }
          });
        }
      });
    } catch (error) {
      console.error('Error signing and sending transaction:', error);
    }
  }, [insurance, currentPair, api]);



  return (
    !skill ? <></> :
      <div>
        <div className='ui--row'>
          <b>{t('Reexamine the skill that student know')}: "{skill ? skill.h : ''}"</b>
        </div>
        {algorithmStage ? (
          <div>
            <div>{algorithmStage.getWords()}</div>
            <div>
              {algorithmStage.getPrevious() && (
                <Button onClick={() => handleStageChange(algorithmStage.getPrevious())}
                  icon='arrow-left'
                  label='Back'
                />
              )}
              {algorithmStage.getNext().map((nextStage, index) => (
                <Button key={index} onClick={() => handleStageChange(nextStage)}
                  icon='fa-square'
                  label={nextStage.getName()}
                />
              ))}

            </div>
          </div>
        ) : (
          <div>Error: Reload the page</div>
        )}
      </div>
  );
}

export default React.memo(Reexamine)