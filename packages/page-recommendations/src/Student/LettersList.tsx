// LettersList component with JavaScript Date objects

import LetterInfo from './LetterInfo.js';
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/index.js';
import { Letter } from '../db/Letter.js';
import { Button, styled, Icon, Modal } from '@polkadot/react-components';
import { useTranslation } from '../translate.js';
import { useLocation } from 'react-router-dom';
import SignLettersUseRight from './SignLettersUseRight.js';
import type { KeyringPair } from '@polkadot/keyring/types';
import { DateInput, SelectableList, useInfo } from '@slonigiraf/app-slonig-components';
import { useToggle } from '@polkadot/react-hooks';

interface Props {
  className?: string;
  worker: string;
  currentPair: KeyringPair;
}

function LettersList({ className = '', worker, currentPair }: Props): React.ReactElement<Props> {
  const MAX_SELECTED = 93;
  const { t } = useTranslation();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const employer = queryParams.get('teacher') || '';
  const { showInfo } = useInfo();

  // Initialize startDate and endDate as Date objects
  const [startDate, setStartDate] = useState<Date | null>(new Date(new Date().setHours(0, 0, 0, 0)));
  const [endDate, setEndDate] = useState<Date | null>(new Date(new Date().setHours(23, 59, 59, 999)));
  const [isDeleteConfirmOpen, toggleDeleteConfirm] = useToggle();

  const letters = useLiveQuery<Letter[]>(
    () => {
      let query = db.letters.where('workerId').equals(worker);
      if (startDate || endDate) {
        query = query.filter((letter) => {
          if (!letter.valid) return false;
          const createdDate = new Date(letter.created);
          if (startDate && createdDate < startDate) return false;
          if (endDate && createdDate > endDate) return false;
          return true;
        });
      }
      return query.reverse().sortBy('id');
    },
    [worker, startDate, endDate]
  );
  

  const [selectedLetters, setSelectedLetters] = useState<Letter[]>([]);

  const handleSelectionChange = (newSelectedLetters: Letter[]) => {
    if (newSelectedLetters.length > MAX_SELECTED) {
      showInfo(`${t('You can select no more than:')} ${MAX_SELECTED}`);
      return;
    }
    setSelectedLetters(newSelectedLetters);
  };

  const deleteDiplomas = async () => {
    const idsToDelete = selectedLetters.map((letter) => letter.id);
    try {
      for (const id of idsToDelete) {
        if (id) {
          await db.letters.delete(id);
        }
      }
      showInfo(t('Deleted'));
      setSelectedLetters([]);
    } catch (error) {
      console.error('Error deleting selected diplomas:', error);
      showInfo(t('Deletion failed'));
    } finally {
      toggleDeleteConfirm();
    }
  };

  const deleteSelectedButton =
    employer === '' && selectedLetters.length > 0 && (
      <Button icon="trash" label={t('Delete')} onClick={toggleDeleteConfirm} />
    );

  const isSelectionAllowed = true;

  return !letters ? (
    <div></div>
  ) : (
    <div>
      <h2>{employer === '' ? t('My diplomas') : t('Select diplomas and send them')}</h2>
      {employer !== '' && (
        <div>
          <SignLettersUseRight
            letters={selectedLetters}
            worker={worker}
            employer={employer}
            currentPair={currentPair}
          />
        </div>
      )}
      <div className="ui--row">
        <div>
          <DateInput
            date={startDate}
            onDateChange={setStartDate}
            id="start_date_id"
            label={t('Dates of receipt')}
          />
          <StyledIcon icon="arrow-right" />
          <DateInput
            date={endDate}
            onDateChange={setEndDate}
            id="end_date_id"
          />
        </div>
      </div>
      <SelectableList<Letter>
        items={letters}
        renderItem={(letter, isSelected, isSelectionAllowed, onToggleSelection) => (
          <LetterInfo
            letter={letter}
            isSelected={isSelected}
            onToggleSelection={onToggleSelection}
          />
        )}
        onSelectionChange={handleSelectionChange}
        maxSelectableItems={MAX_SELECTED}
        additionalControls={deleteSelectedButton}
        keyExtractor={(letter) => letter.signOverReceipt }
        key={worker}
      />
      {isDeleteConfirmOpen && (
        <StyledModal
          header={t('Are you sure you want to delete it?')}
          onClose={toggleDeleteConfirm}
          size="small"
        >
          <Modal.Content>
            <StyledDiv>
              <Button icon="check" label={t('Yes')} onClick={deleteDiplomas} />
              <Button icon="close" label={t('No')} onClick={toggleDeleteConfirm} />
            </StyledDiv>
          </Modal.Content>
        </StyledModal>
      )}
    </div>
  );
}

const StyledIcon = styled(Icon)`
  margin: 0 10px;
`;

const StyledDiv = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  column-gap: 40px;
`;

const StyledModal = styled(Modal)`
  button[data-testid='close-modal'] {
    opacity: 0;
    background: transparent;
    border: none;
    cursor: pointer;
  }
  button[data-testid='close-modal']:focus {
    outline: none;
  }
`;

export default React.memo(LettersList);