// Copyright 2017-2023 @polkadot/apps authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { BareProps as Props } from '@polkadot/react-components/types';

import React, { useMemo } from 'react';

import { AccountSidebar, styled } from '@polkadot/react-components';
import GlobalStyle from '@polkadot/react-components/styles';
import { useApi, useTheme } from '@polkadot/react-hooks';
import Signer from '@polkadot/react-signer';

import Content from './Content/index.js';
import Menu from './Menu/index.js';
import ConnectingOverlay from './overlays/Connecting.js';
import DotAppsOverlay from './overlays/DotApps.js';
import WarmUp from './WarmUp.js';
import BottomMenu from './BottomMenu/index.js';
import { IpfsProvider, AppContainer } from '@slonigiraf/app-slonig-components';
import { InfoProvider } from '@slonigiraf/app-slonig-components';
import { LoginProvider } from '@slonigiraf/app-slonig-components';
export const PORTAL_ID = 'portals';

function Apps({ className = '' }: Props): React.ReactElement<Props> {
  const { themeClassName } = useTheme();
  const { apiEndpoint, isDevelopment } = useApi();

  const uiHighlight = useMemo(
    () => isDevelopment
      ? undefined
      : apiEndpoint?.ui.color,
    [apiEndpoint, isDevelopment]
  );
  return (
    <InfoProvider>
      <IpfsProvider>
        <GlobalStyle uiHighlight={uiHighlight} />
        <StyledDiv className={`${className} apps--Wrapper ${themeClassName}`}>
          <AppContainer>
            <Menu />
            <AccountSidebar>
              <Signer>
                <LoginProvider>

                  <Content />

                  <BottomMenu />
                </LoginProvider>
              </Signer>
              <ConnectingOverlay />
              <DotAppsOverlay />
              <div id={PORTAL_ID} />
            </AccountSidebar>
          </AppContainer>
        </StyledDiv>
        <WarmUp />
      </IpfsProvider>
    </InfoProvider>
  );
}

const StyledDiv = styled.div`
  background: var(--bg-page);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding-bottom: 80px;

  ${[
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    20, 21, 22, 23, 24
  ].map((n) => `
    .greyAnim-${n} {
      animation: greyAnim${n} 2s;
    }

    @keyframes greyAnim${n} {
      0% { background: #a6a6a6; }
      50% { background: darkorange; }
      100% { background: #a6a6a6; }
    }
  `).join('')}
`;

export default React.memo(Apps);
