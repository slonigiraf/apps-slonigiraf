// Copyright 2017-2023 @polkadot/app-accounts authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { ActionStatus } from '@polkadot/react-components/Status/types';
import type { KeyringAddress } from '@polkadot/ui-keyring/types';
import type { BN } from '@polkadot/util';
import type { AccountBalance, Delegation, SortedAccount } from '../types.js';
import type { SortCategory } from '../util.js';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button, styled, Table, InputAddress, TransferModal } from '@polkadot/react-components';
import { getAccountCryptoType } from '@polkadot/react-components/util';
import { useAccounts, useApi, useDelegations, useFavorites, useLedger, useNextTick, useProxies, useToggle } from '@polkadot/react-hooks';
import { keyring } from '@polkadot/ui-keyring';
import { BN_ZERO, isFunction } from '@polkadot/util';
import Ledger from '../modals/Ledger.js';
import Multisig from '../modals/MultisigCreate.js';
import Proxy from '../modals/ProxiedAdd.js';
import Qr from '../modals/Qr.js';
import { useTranslation } from '../translate.js';
import { SORT_CATEGORY, sortAccounts } from '../util.js';
import Account from './Account.js';
import Summary from './Summary.js';
import { CenterQRContainer, LoginButton, useInfo, useLoginContext } from '@slonigiraf/app-slonig-components';
import PayToAccountQR from './PayToAccountQR.js';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { encodeAddress } from '@polkadot/keyring';
import { hexToU8a } from '@polkadot/util';
import { storePseudonym } from '@slonigiraf/app-recommendations';

interface Balances {
  accounts: Record<string, AccountBalance>;
  summary?: AccountBalance;
}

interface Props {
  className?: string;
  onStatusChange: (status: ActionStatus) => void;
}

interface SortControls {
  sortBy: SortCategory;
  sortFromMax: boolean;
}

type GroupName = 'accounts' | 'hardware' | 'injected' | 'multisig' | 'proxied' | 'qr' | 'testing';

const DEFAULT_SORT_CONTROLS: SortControls = { sortBy: 'date', sortFromMax: true };

const STORE_FAVS = 'accounts:favorites';

const GROUP_ORDER: GroupName[] = ['accounts', 'injected', 'qr', 'hardware', 'proxied', 'multisig', 'testing'];

function groupAccounts(accounts: SortedAccount[]): Record<GroupName, string[]> {
  const ret: Record<GroupName, string[]> = {
    accounts: [],
    hardware: [],
    injected: [],
    multisig: [],
    proxied: [],
    qr: [],
    testing: []
  };

  for (let i = 0; i < accounts.length; i++) {
    const { account, address } = accounts[i];
    const cryptoType = getAccountCryptoType(address);

    if (account?.meta.isHardware) {
      ret.hardware.push(address);
    } else if (account?.meta.isTesting) {
      ret.testing.push(address);
    } else if (cryptoType === 'injected') {
      ret.injected.push(address);
    } else if (cryptoType === 'multisig') {
      ret.multisig.push(address);
    } else if (cryptoType === 'proxied') {
      ret.proxied.push(address);
    } else if (cryptoType === 'qr') {
      ret.qr.push(address);
    } else {
      ret.accounts.push(address);
    }
  }

  return ret;
}

function Overview({ className = '', onStatusChange }: Props): React.ReactElement<Props> {
  const { t } = useTranslation();
  const { _onChangeAccount, isLoggedIn } = useLoginContext();
  const { api, isElectron } = useApi();
  const { allAccounts, hasAccounts } = useAccounts();
  const { isLedgerEnabled } = useLedger();
  const [isCreateOpen, toggleCreate] = useToggle();
  const [isImportOpen, toggleImport] = useToggle();
  const [isLedgerOpen, toggleLedger] = useToggle();
  const [isMultisigOpen, toggleMultisig] = useToggle();
  const [isProxyOpen, toggleProxy] = useToggle();
  const [isQrOpen, toggleQr] = useToggle();
  const [favorites, toggleFavorite] = useFavorites(STORE_FAVS);
  const [balances, setBalances] = useState<Balances>({ accounts: {} });
  const [filterOn, setFilter] = useState<string>('');
  const [sortedAccounts, setSorted] = useState<SortedAccount[]>([]);
  const [{ sortBy, sortFromMax }, setSortBy] = useState<SortControls>(DEFAULT_SORT_CONTROLS);
  const delegations = useDelegations();
  const proxies = useProxies();
  const isNextTick = useNextTick();
  const [inputKey, setInputKey] = useState(0);
  const { showInfo } = useInfo();

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const recipientHex = queryParams.get("recipientHex");
  const recipientNameFromUrl = queryParams.get("name");
  const recipientAddress = recipientHex ? encodeAddress(hexToU8a(recipientHex)) : null;
  const navigate = useNavigate();
  const [isTransferOpen, toggleTransfer] = useToggle();

  const _closeTransfer = useCallback(
    (): void => {
      if (isTransferOpen) {
        navigate(``);
        toggleTransfer();
      }
    },
    [isTransferOpen]
  );

  useEffect((): void => {
    const savePseudonym = async () => {
      if (recipientHex && recipientNameFromUrl) {
        await storePseudonym(recipientHex, recipientNameFromUrl);
      }
    }
    if (recipientAddress) {
      toggleTransfer();
    }
    savePseudonym();
  }, [recipientAddress]);

  const onSortChange = useCallback(
    (sortBy: SortCategory) => setSortBy(({ sortFromMax }) => ({ sortBy, sortFromMax })),
    []
  );

  const onSortDirectionChange = useCallback(
    () => setSortBy(({ sortBy, sortFromMax }) => ({ sortBy, sortFromMax: !sortFromMax })),
    []
  );

  const sortOptions = useRef(SORT_CATEGORY.map((text) => ({ text, value: text })));

  const setBalance = useCallback(
    (account: string, balance: AccountBalance) =>
      setBalances(({ accounts }: Balances): Balances => {
        accounts[account] = balance;

        const aggregate = (key: keyof AccountBalance) =>
          Object.values(accounts).reduce((total: BN, value: AccountBalance) => total.add(value[key]), BN_ZERO);

        return {
          accounts,
          summary: {
            bonded: aggregate('bonded'),
            locked: aggregate('locked'),
            redeemable: aggregate('redeemable'),
            total: aggregate('total'),
            transferrable: aggregate('transferrable'),
            unbonding: aggregate('unbonding')
          }
        };
      }),
    []
  );

  const canStoreAccounts = true;

  // We use favorites only to check if it includes some element,
  // so Object is better than array for that because hashmap access is O(1).
  const favoritesMap = useMemo(
    () => Object.fromEntries(favorites.map((x) => [x, true])),
    [favorites]
  );

  // detect multisigs
  const hasPalletMultisig = useMemo(
    () => isFunction((api.tx.multisig || api.tx.utility)?.approveAsMulti),
    [api]
  );

  // proxy support
  const hasPalletProxy = useMemo(
    () => isFunction(api.tx.proxy?.addProxy),
    [api]
  );

  const accountsMap = useMemo(
    () => allAccounts
      .map((address, index): Omit<SortedAccount, 'account'> & { account: KeyringAddress | undefined } => {
        const deleg = delegations && delegations[index]?.isDelegating && delegations[index]?.asDelegating;
        const delegation: Delegation | undefined = (deleg && {
          accountDelegated: deleg.target.toString(),
          amount: deleg.balance,
          conviction: deleg.conviction
        }) || undefined;

        return {
          account: keyring.getAccount(address),
          address,
          delegation,
          isFavorite: favoritesMap[address ?? ''] ?? false
        };
      })
      .filter((a): a is SortedAccount => !!a.account)
      .reduce((ret: Record<string, SortedAccount>, x) => {
        ret[x.address] = x;

        return ret;
      }, {}),
    [allAccounts, favoritesMap, delegations]
  );

  const header = useMemo(
    (): Record<GroupName, [React.ReactNode?, string?, number?, (() => void)?][]> => {
      const ret: Record<GroupName, [React.ReactNode?, string?, number?, (() => void)?][]> = {
        accounts: [[<>{t('accounts')}<div className='sub'>{t('all locally stored accounts')}</div></>]],
        hardware: [[<>{t('hardware')}<div className='sub'>{t('accounts managed via hardware devices')}</div></>]],
        injected: [[<>{t('extension')}<div className='sub'>{t('accounts available via browser extensions')}</div></>]],
        multisig: [[<>{t('multisig')}<div className='sub'>{t('on-chain multisig accounts')}</div></>]],
        proxied: [[<>{t('proxied')}<div className='sub'>{t('on-chain proxied accounts')}</div></>]],
        qr: [[<>{t('via qr')}<div className='sub'>{t('accounts available via mobile devices')}</div></>]],
        testing: [[<>{t('development')}<div className='sub'>{t('accounts derived via development seeds')}</div></>]]
      };

      Object.values(ret).forEach((a): void => {
        a[0][1] = 'start';
        a[0][2] = 4;
      });

      return ret;
    },
    [t]
  );

  const grouped = useMemo(
    () => groupAccounts(sortedAccounts),
    [sortedAccounts]
  );

  const accounts = useMemo(
    () => Object.values(accountsMap).reduce<Record<string, React.ReactNode>>((all, { account, address, delegation, isFavorite }, index) => {
      all[address] = (
        <Account
          account={account}
          delegation={delegation}
          filter={filterOn}
          isFavorite={isFavorite}
          key={address}
          proxy={proxies?.[index]}
          setBalance={setBalance}
          toggleFavorite={toggleFavorite}
        />
      );

      return all;
    }, {}),
    [accountsMap, filterOn, proxies, setBalance, toggleFavorite]
  );

  const groups = useMemo(
    () => GROUP_ORDER.reduce<Record<string, React.ReactNode[]>>((groups, group) => {
      const items = grouped[group];

      if (items.length) {
        groups[group] = items.map((account) => accounts[account]);
      }

      return groups;
    }, {}),
    [grouped, accounts]
  );

  useEffect((): void => {
    setSorted((prev) => [
      ...prev
        .map((x) => accountsMap[x.address])
        .filter((x): x is SortedAccount => !!x),
      ...Object
        .keys(accountsMap)
        .filter((a) => !prev.find((y) => a === y.address))
        .map((a) => accountsMap[a])
    ]);
  }, [accountsMap]);

  useEffect((): void => {
    setSorted((sortedAccounts) =>
      sortAccounts(sortedAccounts, accountsMap, balances.accounts, sortBy, sortFromMax));
  }, [accountsMap, balances, sortBy, sortFromMax]);

  const callOnStatusChange = useCallback((status: ActionStatus) => {
    if (onStatusChange) {
      onStatusChange(status);
    }
    setInputKey(prev => prev + 1);
  }, [onStatusChange]);

  return (
    <StyledDiv className={className}>
      {isLoggedIn && <>
        <CenterQRContainer>
          <h2>{t('Show the QR to a sender to get Slon tokens')}</h2>
          <PayToAccountQR />
        </CenterQRContainer>
        {isTransferOpen && (
          <TransferModal
            key='modal-transfer'
            onClose={_closeTransfer}
            recipientId={recipientAddress ? recipientAddress : undefined}
          />
        )}

        <div className='ui--row'>
          <InputAddress
            key={inputKey}
            className='full'
            isInput={false}
            label={t('Account')}
            onChange={_onChangeAccount}
            type='account'
          />
        </div>
        <Summary balance={balances.summary} />
        {isLedgerOpen && (
          <Ledger onClose={toggleLedger} />
        )}
        {isMultisigOpen && (
          <Multisig
            onClose={toggleMultisig}
            onStatusChange={callOnStatusChange}
          />
        )}
        {isProxyOpen && (
          <Proxy
            onClose={toggleProxy}
            onStatusChange={callOnStatusChange}
          />
        )}
        {isQrOpen && (
          <Qr
            onClose={toggleQr}
            onStatusChange={callOnStatusChange}
          />
        )}
        {!isNextTick || !sortedAccounts.length
          ? (
            <Table
              empty={isNextTick && sortedAccounts && t("You don't have any accounts. Some features are currently hidden and will only become available once you have accounts.")}
              header={header.accounts}
            />
          )
          : GROUP_ORDER.map((group) =>
            groups[group] && (
              <Table
                empty={t('No accounts')}
                header={header[group]}
                isSplit
                key={group}
              >
                {groups[group]}
              </Table>
            )
          )
        }
      </>
      }
      <LoginButton label={t('Log in')} />
    </StyledDiv>
  );
}

const StyledDiv = styled.div`
  .ui--Dropdown {
    width: 15rem;
  }

  .header-box {
    .dropdown-section {
      display: flex;
      flex-direction: row;
      align-items: center;
    }

    .ui--Button-Group {
      margin-left: auto;
    }
  }
`;

export default React.memo(Overview);
