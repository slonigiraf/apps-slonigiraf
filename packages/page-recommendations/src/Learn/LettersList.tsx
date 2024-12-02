import DiplomaInfo from './../Assess/DiplomaInfo.js';
import React, { useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { deleteLetter, Diploma, getLetters, Letter } from '@slonigiraf/db';
import { Button, styled, Icon, Modal, Toggle, Tag } from '@polkadot/react-components';
import { useTranslation } from '../translate.js';
import { useLocation, useNavigate } from 'react-router-dom';
import SignLettersUseRight from './SignLettersUseRight.js';
import type { KeyringPair } from '@polkadot/keyring/types';
import { DateInput, SelectableList, StyledContentCloseButton, ToggleContainer, useInfo } from '@slonigiraf/app-slonig-components';
import { useToggle } from '@polkadot/react-hooks';
import PersonSelector from '../PersonSelector.js';

interface Props {
  className?: string;
  worker: string;
  currentPair: KeyringPair;
}

enum ToggleState {
  NO_SELECTION = 0,
  JUST_SELECTION = 1,
  GETTING_BONUSES = 2,
}

function LettersList({ className = '', worker, currentPair }: Props): React.ReactElement<Props> {
  const MAX_SELECTED = 93;
  const { t } = useTranslation();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const [employer, setEmployer] = useState(queryParams.get('teacher') || '');
  const { showInfo } = useInfo();
  const navigate = useNavigate();
  const [reloadCount, setReloadCount] = useState<number>(0);
  const [toggleState, setToggleState] = useState<ToggleState>(ToggleState.NO_SELECTION);

  // Initialize startDate and endDate as timestamps
  const [startDate, setStartDate] = useState<number | null>(new Date(new Date().setHours(0, 0, 0, 0)).getTime());
  const [endDate, setEndDate] = useState<number | null>(new Date(new Date().setHours(23, 59, 59, 999)).getTime());
  const [isDeleteConfirmOpen, toggleDeleteConfirm] = useToggle();

  const letters = useLiveQuery<Letter[]>(
    () => getLetters(worker, startDate, endDate),
    [worker, startDate, endDate]
  );

  const [selectedLetters, setSelectedLetters] = useState<Letter[]>([]);

  const handleSelectionChange = (newSelectedLetters: Diploma[]) => {
    const letters = newSelectedLetters as Letter[];
    if (letters.length > MAX_SELECTED) {
      showInfo(`${t('You can select no more than:')} ${MAX_SELECTED}`);
      return;
    }
    setSelectedLetters(letters);
  };

  const handleSelectionToggle = useCallback((checked: boolean): void => {
    if (checked && toggleState === ToggleState.NO_SELECTION) {
      setToggleState(ToggleState.JUST_SELECTION);
    } else {
      setToggleState(ToggleState.NO_SELECTION);
    }
  }, [toggleState]);

  const handleGetBonusToggle = useCallback((checked: boolean): void => {
    if (checked) {
      setToggleState(ToggleState.GETTING_BONUSES);
    } else {
      setToggleState(ToggleState.NO_SELECTION);
    }
  }, [toggleState]);

  const deleteDiplomas = async () => {
    const idsToDelete = selectedLetters.map((letter) => letter.pubSign);
    try {
      for (const id of idsToDelete) {
        if (id) {
          await deleteLetter(id);
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

  const close = () => {
    setSelectedLetters([]);
    setReloadCount(reloadCount + 1);
    navigate('', { replace: true });
  }

  const startDateId = 'letters:start';
  const endDateId = 'letters:end';

  const handleEmployerSelect = async (selectedKey: string) => {
    if(selectedKey){
      setEmployer(selectedKey);
    }
  };

  return !letters ? (
    <div></div>
  ) : (
    <div>
      <h2>{employer === '' ? t('My diplomas') : t('Select diplomas and send them')}</h2>
      {<PersonSelector
        label={t('select teacher / parent / employer')}
        onChange={handleEmployerSelect}
      />}
      {employer !== '' && selectedLetters && selectedLetters.length > 0 && (
        <div>
          <StyledContentCloseButton onClick={close}
            icon='close'
          />
          <SignLettersUseRight
            letters={selectedLetters}
            worker={worker}
            employer={employer}
            currentPair={currentPair}
            onDataSent={close}
          />
        </div>
      )}
      <div className="ui--row">
        <div>
          <DateInput
            date={startDate ? new Date(startDate) : null}
            onDateChange={(date) => setStartDate(date ? date.getTime() : null)}
            id={startDateId}
            sessionStorageId={startDateId}
            label={t('Dates of receipt')}
          />
          <StyledIcon icon="arrow-right" />
          <DateInput
            date={endDate ? new Date(endDate) : null}
            onDateChange={(date) => setEndDate(date ? date.getTime() : null)}
            id={endDateId}
          />
        </div>
      </div>
      <ToggleContainer>
        <Toggle
          label={t('Select')}
          onChange={handleSelectionToggle}
          value={toggleState !== ToggleState.NO_SELECTION}
        />
        <Toggle
          label={t('Get bonus')}
          onChange={handleGetBonusToggle}
          value={toggleState === ToggleState.GETTING_BONUSES}
        />
        <Tag
          key={'get-bonus-help'}
          label={'?'}
          size='large'
          isHelp={true}
          hover={t('Earn bonuses from teachers, parents, or employers—anyone who benefits from your learning. In return, they will be able to assess your diplomas and receive Slon tokens from tutors if you forget your skills.')}
        />
      </ToggleContainer>
      <SelectableList<Diploma>
        items={letters}
        renderItem={(letter, isSelected, isSelectionAllowed, onToggleSelection) => (
          <DiplomaInfo
            diploma={letter}
            isSelected={isSelected}
            onToggleSelection={onToggleSelection}
            isSelectionAllowed={isSelectionAllowed}
          />
        )}
        onSelectionChange={handleSelectionChange}
        maxSelectableItems={MAX_SELECTED}
        additionalControls={deleteSelectedButton}
        keyExtractor={(letter) => letter.pubSign}
        key={worker + reloadCount}
        isSelectionAllowed={toggleState !== ToggleState.NO_SELECTION}
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