// IpfsContext.tsx
import React, { useContext, createContext, ReactNode, useState, useCallback, useEffect } from 'react';
import { useLogin } from './useLogin.js';
import type { KeyringPair } from '@polkadot/keyring/types';
import type { AccountState } from '@slonigiraf/app-slonig-components';
import SignIn from '@polkadot/app-signing/SignIn';
import { InputAddress, Spinner, styled } from '@polkadot/react-components';
import { useTranslation } from './translate.js';
import CreateModal from '@polkadot/app-accounts/modals/Create';
import ImportModal from '@polkadot/app-accounts/modals/Import';
import { useAccounts } from '@polkadot/react-hooks';
import type { ActionStatus } from '@polkadot/react-components/Status/types';

// Define an interface for your context state.
interface ILoginContext {
  currentPair: KeyringPair | null;
  accountState: AccountState | null;
  isLoggedIn: boolean;
  setIsLoggedIn: (v: boolean) => void;
  isLoginRequired: boolean;
  setLoginIsRequired: (v: boolean) => void;
  _onChangeAccount: (accountId: string | null) => void;
  logOut: () => void;
}

// Initialize the context with a default value.
const LoginContext = createContext<ILoginContext | null>(null);

// Define an interface for the props of IpfsProvider
interface LoginProviderProps {
  children: ReactNode;
}

export const LoginProvider: React.FC<LoginProviderProps> = ({ children }) => {
  const { hasAccounts } = useAccounts();
  const { t } = useTranslation();
  const [isSignIn, setIsSignIn] = useState(false);
  const [isImport, setIsImport] = useState(false);

  const {
    isReady,
    currentPair,
    accountState,
    isLoggedIn,
    setIsLoggedIn,
    isLoginRequired,
    setLoginIsRequired,
    _onChangeAccount,
    _onUnlock,
    logOut
  } = useLogin();

  useEffect(() => {
    if (hasAccounts) {
      setIsSignIn(true);
    }
  }, [hasAccounts]);

  const toggleImport = useCallback((): void => {
    setIsImport(!isImport);
    if (!hasAccounts) {
      setIsSignIn(false);
    }
  }, [hasAccounts, isImport]);


  const toggleSignIn = useCallback((): void => {
    setIsSignIn(!isSignIn);
  }, [isSignIn]);

  const cancelAuthorization = () => {
    setLoginIsRequired(false);
  }

  const signIn = (
    <>
      {hasAccounts &&
        <SignIn
          onClose={cancelAuthorization}
          onUnlock={_onUnlock}
          pair={currentPair}
          toggleSignIn={toggleSignIn}
          toggleImport={toggleImport}
        />}
      {(!hasAccounts || isImport) &&
        <ImportModal
          onClose={cancelAuthorization}
          onStatusChange={_onUnlock}
          toggleImport={toggleImport}
        />}
    </>
  );

  const onCreateAccount = (status: ActionStatus) => {
    if (status.status === 'success' && status.account) {
      _onUnlock();
    }
  }

  return (
    <LoginContext.Provider value={{ currentPair, accountState,  isLoggedIn,
      setIsLoggedIn,isLoginRequired, setLoginIsRequired, _onChangeAccount, logOut }}>
      <div className='ui--row' style={{ display: 'none' }}>
        <InputAddress
          className='full'
          isInput={false}
          label={'account'}
          type='account'
          onChange={_onChangeAccount}
        />
      </div>
      {!isReady &&
        <StyledDiv>
          <div className='connecting'>
            <Spinner label={t('Loading')} />
          </div>
        </StyledDiv>
      }
      {isReady && isLoginRequired && (
        <>
          {isSignIn ?
            signIn
            :
            <CreateModal
              onClose={cancelAuthorization}
              onStatusChange={onCreateAccount}
              toggle={toggleSignIn}
            />
          }</>
      )}
      {isReady && !isLoginRequired && children}
    </LoginContext.Provider>
  );
};

export function useLoginContext() {
  const context = useContext(LoginContext);
  if (!context) {
    throw new Error('useLoginContext must be used within an LoginProvider');
  }
  return context;
}

const StyledDiv = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  
  .connecting {
    padding: 1rem;
  }
`;