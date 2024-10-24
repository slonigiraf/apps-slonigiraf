// LessonsList component with JavaScript Date objects

import LessonInfo from './LessonInfo.js';
import React, { useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/index.js';
import { Lesson } from '../db/Lesson.js';
import { Button, styled, Icon, Modal, Toggle } from '@polkadot/react-components';
import { useTranslation } from '../translate.js';
import { DateInput, SelectableList, useInfo } from '@slonigiraf/app-slonig-components';
import { useToggle } from '@polkadot/react-hooks';

interface Props {
  className?: string;
  tutor: string;
}

function LessonsList({ className = '', tutor }: Props): React.ReactElement<Props> {
  const MAX_SELECTED = 93;
  const { t } = useTranslation();
  const { showInfo } = useInfo();
  const [isSelectionAllowed, setSelectionAllowed] = useState(false);

  // Initialize startDate and endDate as Date objects
  const [startDate, setStartDate] = useState<Date | null>(new Date(new Date().setHours(0, 0, 0, 0)));
  const [endDate, setEndDate] = useState<Date | null>(new Date(new Date().setHours(23, 59, 59, 999)));
  const [isDeleteConfirmOpen, toggleDeleteConfirm] = useToggle();
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  const lessons = useLiveQuery<Lesson[]>(
    () => {
      let query = db.lessons.where('tutor').equals(tutor);
      if (startDate || endDate) {
        query = query.filter((lesson) => {
          const createdDate = new Date(lesson.created);
          if (startDate && createdDate < startDate) return false;
          if (endDate && createdDate > endDate) return false;
          return true;
        });
      }
      return query.reverse().sortBy('id');
    },
    [tutor, startDate, endDate]
  );


  const [selectedItems, setSelectedLessons] = useState<Lesson[]>([]);

  const handleSelectionChange = (newSelectedLessons: Lesson[]) => {
    if (newSelectedLessons.length > MAX_SELECTED) {
      showInfo(`${t('You can select no more than:')} ${MAX_SELECTED}`);
      return;
    }
    setSelectedLessons(newSelectedLessons);
  };

  const handleSelectionToggle = useCallback((checked: boolean): void => {
    setSelectionAllowed(checked);
  }, []);

  const onResumeTutoring = (lesson: Lesson) => {
    setActiveLesson(lesson);
  };

  const deleteItems = async () => {
    const idsToDelete = selectedItems.map((lesson) => lesson.id);
    try {
      for (const id of idsToDelete) {
        if (id) {
          await db.lessons.delete(id);
        }
      }
      showInfo(t('Deleted'));
      setSelectedLessons([]);
    } catch (error) {
      console.error('Error deleting selected items:', error);
      showInfo(t('Deletion failed'));
    } finally {
      toggleDeleteConfirm();
    }
  };

  const deleteSelectedButton =
    selectedItems.length > 0 && (
      <Button icon="trash" label={t('Delete')} onClick={toggleDeleteConfirm} />
    );

  return !lessons ? (
    <div></div>
  ) : (
    <div>
      <h2>{t('My lessons')}</h2>
      <div className="ui--row">
        <div>
          <DateInput
            date={startDate}
            onDateChange={setStartDate}
            id="start_date_id"
            label={t('Lesson dates')}
          />
          <StyledIcon icon="arrow-right" />
          <DateInput
            date={endDate}
            onDateChange={setEndDate}
            id="end_date_id"
          />
        </div>
      </div>
      <Toggle
            label={t('Allow selection')}
            onChange={handleSelectionToggle}
            value={isSelectionAllowed}
          />
      <SelectableList<Lesson>
        items={lessons}
        renderItem={(lesson, isSelected, isSelectionAllowed, onToggleSelection) => (
          <LessonInfo
            lesson={lesson}
            isSelected={isSelected}
            onToggleSelection={onToggleSelection}
            onResumeTutoring={onResumeTutoring}
            isSelectionAllowed={isSelectionAllowed}
          />
        )}
        onSelectionChange={handleSelectionChange}
        maxSelectableItems={MAX_SELECTED}
        additionalControls={deleteSelectedButton}
        keyExtractor={(lesson) => lesson.id}
        key={tutor}
        isSelectionAllowed={isSelectionAllowed}
      />
      {isDeleteConfirmOpen && (
        <StyledModal
          header={t('Are you sure you want to delete it?')}
          onClose={toggleDeleteConfirm}
          size="small"
        >
          <Modal.Content>
            <StyledDiv>
              <Button icon="check" label={t('Yes')} onClick={deleteItems} />
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

export default React.memo(LessonsList);