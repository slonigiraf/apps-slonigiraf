import React, { useState, useCallback } from 'react';
import { useToggle } from '@polkadot/react-hooks';
import { parseJson, QRScanner, receiveWebRTCData } from '@slonigiraf/app-slonig-components';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from './translate.js';
import { Modal, TransferModal } from '@polkadot/react-components';
import { ButtonWithLabelBelow, useInfo, QRAction } from '@slonigiraf/app-slonig-components';
import { storeSession, createAndStoreLetter, storeInsurances, storePseudonym, storeSetting, Session } from '@slonigiraf/app-recommendations';
import { encodeAddress } from '@polkadot/keyring';
import { hexToU8a } from '@polkadot/util';

interface Props {
  className?: string;
  label?: string;
  type?: number;
}

function ScanQR({ className = '', label, type }: Props): React.ReactElement<Props> {
  const { t } = useTranslation();
  const { showInfo, hideInfo } = useInfo();
  const [isQROpen, toggleQR] = useToggle();
  const [isTransferOpen, toggleTransfer] = useToggle();
  const [recipientId, setRecipientId] = useState<string>('');
  const navigate = useNavigate();

  // Process the scanned QR data
  const processQR = useCallback(async (data: string) => {
    toggleQR();
    try {
      const qrJSON = JSON.parse(data);
      // Validate JSON properties
      if (qrJSON.hasOwnProperty('q')) {
        if (!type || (type === qrJSON.q)) {
          switch (qrJSON.q) {
            case QRAction.NAVIGATION:
              console.log(qrJSON)
              navigate(qrJSON.d);
              break;
            case QRAction.TRANSFER:
              await storePseudonym(qrJSON.p, qrJSON.n);
              const recipientAddress = qrJSON.p ? encodeAddress(hexToU8a(qrJSON.p)) : "";
              setRecipientId(recipientAddress);
              toggleTransfer();
              break;
            case QRAction.ADD_DIPLOMA:
              const dataArray = qrJSON.d.split(",");
              await createAndStoreLetter(dataArray);
              navigate('diplomas');
              break;
            case QRAction.BUY_DIPLOMAS:
              await storePseudonym(qrJSON.p, qrJSON.n);
              showInfo(t('Loading'), 'info', 60)
              const diplomasFromUrl = await receiveWebRTCData(qrJSON.c);
              hideInfo();
              const dimplomasJson = parseJson(diplomasFromUrl);
              try {
                const dimplomasJsonWithMeta = {
                  q: QRAction.BUY_DIPLOMAS,
                  p: qrJSON.p,
                  n: qrJSON.n,
                  t: qrJSON.t,
                  d: dimplomasJson
                };
                await storeInsurances(dimplomasJsonWithMeta);
              } catch (error) {
                console.error("Failed to save diplomas:", error);
              }
              navigate(`diplomas/teacher?t=${qrJSON.t}&student=${qrJSON.p}`);
              break;
            case QRAction.LEARN_MODULE:
                await storePseudonym(qrJSON.p, qrJSON.n);
                showInfo(t('Loading'), 'info', 60)
                const webRTCData = await receiveWebRTCData(qrJSON.c);
                hideInfo();
                const webRTCJSON = parseJson(webRTCData);
                try {
                  console.log("Data received: " + JSON.stringify(webRTCJSON, null, 2));
                  const session: Session = {session : qrJSON.s, created: new Date(), cid: webRTCJSON.cid, student: qrJSON.p };
                  await storeSession(session);
                } catch (error) {
                  console.error("Failed to save session:", error);
                }
                navigate(`diplomas/tutor?s=${qrJSON.s}`);
                break;  
            case QRAction.TUTOR_IDENTITY:
              await storePseudonym(qrJSON.p, qrJSON.n);
              await storeSetting("tutor", qrJSON.p);
              if (type) {
                navigate(`?tutor=${qrJSON.p}`);
              } else {
                navigate(`knowledge?tutor=${qrJSON.p}`);
              }
              break;
            case QRAction.SKILL:
              const parts = qrJSON.d.split('+');
              if (parts.length > 1) {
                await storePseudonym(parts[2], qrJSON.n);
              }
              navigate(qrJSON.d);
              break;
            case QRAction.TEACHER_IDENTITY:
              await storePseudonym(qrJSON.p, qrJSON.n);
              await storeSetting("teacher", qrJSON.p);
              if (type) {
                navigate(`?teacher=${qrJSON.p}`);
              } else {
                navigate(`diplomas?teacher=${qrJSON.p}`);
              }
              break;
            default:
              console.warn("Unknown QR type:", qrJSON.q);
          }
        } else {
          showInfo(t('Wrong QR type'))
        }
      } else {
        console.error("Invalid QR data structure.");
      }
    } catch (error) {
      console.error("Error parsing QR data as JSON:", error);
    }
  }, [navigate, toggleQR, toggleTransfer]);

  // Handle the QR Scanner result
  const handleQRResult = useCallback((result, error) => {
    if (result != undefined) {
      processQR(result?.getText());
    }
  }, [processQR]);

  return (
    <>
      <ButtonWithLabelBelow
        icon='qrcode'
        label={label}
        onClick={toggleQR}
      />
      {isQROpen && (
        <Modal
          header={t('Scan a QR code')}
          onClose={toggleQR}
          size='small'
        >
          <Modal.Content>
            <QRScanner
              onResult={handleQRResult}
              constraints={{ facingMode: 'environment' }}
            />
          </Modal.Content>
        </Modal>
      )}
      {isTransferOpen && (
        <TransferModal
          key='modal-transfer'
          onClose={toggleTransfer}
          recipientId={recipientId}
        />
      )}
    </>
  );
}

export default React.memo(ScanQR);