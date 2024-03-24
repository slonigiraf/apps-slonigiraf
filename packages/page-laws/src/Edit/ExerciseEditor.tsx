import React, { useState, ChangeEvent, FC } from 'react';
import { TextArea, styled } from '@polkadot/react-components';
import { useTranslation } from '../translate.js';
import { Exercise, Skill } from '@slonigiraf/app-slonig-components';

interface Props {
  className?: string;
  exercise: Exercise;
  index: number;
  skill: Skill;
  onSkillChange: (updatedList: { q?: Exercise[] }) => void;
}

const ExerciseEditor: FC<Props> = ({ className = '', exercise, index, skill, onSkillChange }) => {
  const { t } = useTranslation();
  const [exerciseImage, setExerciseImage] = useState<string>(exercise.p || '');
  const [solutionImage, setSolutionImage] = useState<string>(exercise.i || '');

  const convertToBase64 = (file: File, callback: (base64Image: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (e.target?.result) {
        callback(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };


  const updateExercise = (updatedExercise: Exercise) => {
    const updatedExercises = [...(skill.q || [])];
    updatedExercises[index] = updatedExercise;
    onSkillChange({ ...skill, q: updatedExercises });
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>, type: 'exercise' | 'solution') => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      convertToBase64(file, (base64Image) => {
        if (type === 'exercise') {
          setExerciseImage(base64Image);
          updateExercise({ ...exercise, p: base64Image });
        } else {
          setSolutionImage(base64Image);
          updateExercise({ ...exercise, i: base64Image });
        }
      });
    }
  };

  const onEditExerciseText = (text: string) => {
    updateExercise({ ...exercise, h: text });
  };

  const onEditSolutionText = (text: string) => {
    updateExercise({ ...exercise, a: text });
  };

  return (
    <div className={className}>
      <TextArea
        label={t('Exercise')}
        seed={exercise.h}
        onChange={onEditExerciseText}
      />
      <ImageUploadContainer>
        {exerciseImage && <StyledImage src={exerciseImage} alt="Exercise" />}
        <input
          type="file"
          onChange={(e) => handleImageChange(e, 'exercise')}
          accept="image/*"
        />
      </ImageUploadContainer>

      <TextArea
        label={t('Solution')}
        seed={exercise.a}
        onChange={onEditSolutionText}
      />
      <ImageUploadContainer>
        {solutionImage && <StyledImage src={solutionImage} alt="Solution" />}
        <input
          type="file"
          onChange={(e) => handleImageChange(e, 'solution')}
          accept="image/*"
        />
      </ImageUploadContainer>
    </div>
  );
};

const ImageUploadContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: left;
  margin-bottom: 15px;
  padding-left: 2rem;
`;

const StyledImage = styled.img`
  width: 200px;
  margin-bottom: 10px;
`;

export default React.memo(ExerciseEditor);