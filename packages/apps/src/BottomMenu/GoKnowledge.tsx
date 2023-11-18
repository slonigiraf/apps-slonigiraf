import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../translate.js';
import { ButtonWithLabelBelow } from './ButtonWithLabelBelow';

function GoKnowledge(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const _onClick = () => {
    navigate('knowledge');
  }

  return (
    <ButtonWithLabelBelow
      icon='list'
      label={t('Knowledge')}
      onClick={_onClick}
    />
  );
}

export default GoKnowledge;