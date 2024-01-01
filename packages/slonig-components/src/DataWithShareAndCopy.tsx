import React from 'react';
import QRCode from 'qrcode.react';
import ShareButton from './ShareButton.js';
import ClipboardCopyButton from './ClipboardCopyButton.js';
import { Icon, styled } from '@polkadot/react-components';

interface Props {
    className?: string;
    dataQR: string;
    titleShare: string;
    textShare: string;
    urlShare: string;
    dataCopy: string;
}

function DataWithShareAndCopy({ className, dataQR, titleShare, textShare, urlShare, dataCopy }: Props): React.ReactElement<Props> {
    return (
        <StyledDiv>
            <div>
                <div className='qr--row'>
                    <Icon icon='share' />
                </div>
                <div className='qr--row'>
                    <ShareButton title={titleShare} text={textShare} url={urlShare} />
                    <ClipboardCopyButton text={dataCopy} />
                </div>
            </div>
        </StyledDiv>
    );
}

const StyledDiv = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  max-width: 300px;
  .qr--row {
    display: flex;
    justify-content: center;
    align-items: center;
  }
`;

export default React.memo(DataWithShareAndCopy);