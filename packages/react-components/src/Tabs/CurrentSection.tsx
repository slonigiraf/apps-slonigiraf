// Copyright 2017-2023 @polkadot/react-components authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { IconName } from '@fortawesome/fontawesome-svg-core';

import React from 'react';

import Icon from '../Icon.js';
import { styled } from '../styled.js';

interface Props {
  className?: string;
  icon: IconName;
  text: string;
}

function CurrentSection ({ className = '', icon, text }: Props): React.ReactElement<Props> {
  return (
    <StyledDiv className={`${className} active-tab`}>
      <Icon icon={icon} />
      <span>{text}</span>
    </StyledDiv>
  );
}

const StyledDiv = styled.div`
  margin: 0 0 0 1.5rem;
  font-weight: var(--font-weight-normal);
  font-size: var(--font-size-base);
  line-height: 1.57rem;
  min-width: max-content;
  height: 100%;
  display: flex;
  align-items: center;
  color: var(--color-text);

  .ui--Icon {
    margin-right: 0.85rem;
    max-width: 1rem;
    max-height: 1rem;
  }

  @media only screen and (max-width: 900px) {
    &.active-tab span {
      display: none;
    }
  }

`;

export default React.memo(CurrentSection);
