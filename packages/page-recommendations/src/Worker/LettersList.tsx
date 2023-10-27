// Copyright 2021-2022 @slonigiraf/app-recommendations authors & contributors
// SPDX-License-Identifier: Apache-2.0

import LetterInfo from './LetterInfo'
import React, { useCallback, useState } from 'react'
import { useIpfsContext } from '@slonigiraf/app-slonig-components';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { Letter } from "./Letter";
import { Button } from '@polkadot/react-components';
import { useTranslation } from '../translate';

interface Props {
  className?: string;
  worker: string;
}

function LettersList({ className = '', worker }: Props): React.ReactElement<Props> {
  const { ipfs, isIpfsReady, ipfsInitError } = useIpfsContext();
  const [selectedLetters, setSelectedLetters] = useState<Letter[]>([]);
  const { t } = useTranslation();
  console.log("selectedLetters: " + selectedLetters);

  const toggleLetterSelection = (letter: Letter) => {
    if (selectedLetters.includes(letter)) {
      setSelectedLetters(prevLetters => prevLetters.filter(item => item !== letter));
    } else {
      setSelectedLetters(prevLetters => [...prevLetters, letter]);
    }
  };

  const letters = useLiveQuery(
    () =>
      db.letters
        .where("worker")
        .equals(worker)
        .sortBy("id"),
    [worker]
  );

  const _selectAll = useCallback(
    () => setSelectedLetters(letters),
    [letters]
  );

  const _deselectAll = useCallback(
    () => setSelectedLetters([]),
    []
  );

  const selectionButton = <Button
    icon={'fa-square'}
    label={t('Select all')}
    onClick={_selectAll}
  />;

  const deselectionButton = <Button
    icon={'fa-check'}
    label={t('Deselect all')}
    onClick={_deselectAll}
  />;

  const selectDeselect = (selectedLetters.length === 0) ? selectionButton : deselectionButton;

  const sellByQr = <Button
    icon={'fa-dollar-sign'}
    label={t('Get bonuses')}
    onClick={_deselectAll}
  />;

  return (
    !letters ? <div></div> :
      <div>
        <div className='ui--row'>
          {selectDeselect}
          {sellByQr}
        </div>
        {letters.map((letter, index) => (
          <div key={index} className='ui--row'>
            <LetterInfo
              letter={letter}
              ipfs={ipfs}
              isSelected={selectedLetters.includes(letter)}
              onToggleSelection={toggleLetterSelection} />
          </div>
        ))}
      </div>

  )
}

export default React.memo(LettersList)