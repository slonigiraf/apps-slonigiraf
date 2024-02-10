// Copyright 2021-2022 @slonigiraf/app-laws authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { AppProps as Props } from '@polkadot/react-components/types';

import React, { useRef, useMemo } from 'react';
import { Route, Routes } from 'react-router';
import { Tabs } from '@polkadot/react-components';
import { useDeveloperSetting } from '@slonigiraf/app-slonig-components';
import { useTranslation } from './translate.js';
import useCounter from './useCounter.js';
import Create from './Create';
import Edit from './Edit';
import ItemLabel from './Edit/ItemLabel.js';
import ExerciseList from './Edit/ExerciseList.js';
export { useCounter, ItemLabel, ExerciseList };

function LawsApp({ basePath, onStatusChange }: Props): React.ReactElement<Props> {
  const { t } = useTranslation();
  const isDeveloper = useDeveloperSetting();

  const tabsRef = useRef([
    {
      isRoot: true,
      name: 'browse',
      text: t('Browse')
    },
    {
      name: 'create',
      text: t('Create')
    }
  ]);

  const hidden = useMemo(
    () => isDeveloper
      ? []
      : ['create'],
    [isDeveloper]
  );

  return (
    <main className='accounts--App'>
      <Tabs
        basePath={basePath}
        hidden={hidden}
        items={tabsRef.current}
      />
      <Routes>
        <Route path={basePath}>
          {isDeveloper && (
            <Route
              element={<Create onStatusChange={onStatusChange} />}
              path='create'
            />
          )}
          <Route
            element={
              <Edit onStatusChange={onStatusChange} />
            }
            index
          />
        </Route>
      </Routes>
    </main>
  );
}

export default React.memo(LawsApp);
