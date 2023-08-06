// Copyright 2021-2022 @slonigiraf/app-recommendations authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Button, Modal } from '@polkadot/react-components';
import React, { useState, useEffect } from 'react'
import SignLetterUseRight from './SignLetterUseRight'
import { getIPFSDataFromContentID } from '@slonigiraf/helpers'
import { useTranslation } from '../translate';
import { IPFS } from 'ipfs-core';
import { Letter } from '../db/Letter';

interface Props {
  className?: string;
  letter: Letter;
  ipfs: IPFS;
}

function LetterInfo({ className = '', letter, ipfs }: Props): React.ReactElement<Props> {
  const { t } = useTranslation();
  const [modalIsOpen, setModalIsOpen] = useState(false)
  const [text, setText] = useState(letter.cid)

  useEffect(() => {
    async function fetchData() {
      if (ipfs !== null && text === letter.cid) {
        try {
          const content = await getIPFSDataFromContentID(ipfs, letter.cid)
          setText(content)
        }
        catch (e) {
          setText(letter.cid + " (" + t<string>('loading') + "...)")
          console.log(e)
        }
      }
    }
    fetchData()
  }, [ipfs, letter, text])

  return (
    <div className='ui--row' >
      <Button
        icon='eye'
        label={text}
        onClick={() => setModalIsOpen(true)}
      />
      {modalIsOpen && <Modal
        header={t<string>('Sign recommendation letter')}
        size={"small"}
        onClose={() => setModalIsOpen(false)}
      >
        <Modal.Content>
          <SignLetterUseRight text={text} letter={letter} />
        </Modal.Content>
      </Modal>
      }
    </div>
  )
}

export default React.memo(LetterInfo);