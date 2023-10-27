import React from 'react';
import { useToggle } from '@polkadot/react-hooks';
import { QrScanner } from '@slonigiraf/app-slonig-components';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../translate.js';
import { Button, Modal } from '@polkadot/react-components';

function ScanQr(): React.ReactElement {
  const { t } = useTranslation();
  const [isQrOpen, toggleQr] = useToggle();

  const navigate = useNavigate();

  const processQr = (data: string) => {
    try {
      // Attempt to parse the data as JSON
      const jsonData = JSON.parse(data);

      // Check if the JSON has the expected properties
      if (jsonData.hasOwnProperty('q') && jsonData.hasOwnProperty('d')) {
        // Process based on the 'q' value or other conditions
        switch (jsonData.q) {
          // 0 - is navigation
          case 0:
            navigate(jsonData.d);
            break;
          // Add more cases as needed
          // case 2:
          //   ...
          //   break;
          default:
            console.warn("Unknown QR type:", jsonData.q);
            break;
        }
      } else {
        console.error("Invalid QR data structure.");
      }

    } catch (error) {
      console.error("Error parsing QR data as JSON:", error);
    }
    toggleQr();
  }

  return (
    <>
    <Button
          icon='qrcode'
          label={t('Scan Qr')}
          onClick={toggleQr}
        />
    {isQrOpen && <div className='ui--row'>
        <Modal
          header={t('Scan a QR code')}
          onClose={toggleQr}
          size='small'
        >
          <Modal.Content>
            <QrScanner
              onResult={(result, error) => {
                if (result != undefined) {
                  processQr(result?.getText())
                }
              }}
              constraints={{ facingMode: 'environment' }}
            />
          </Modal.Content>
        </Modal>
      </div>}
    </>
    
  );
}

export default ScanQr;