import React from 'react';
import styled from 'styled-components';
import ScanQR from './ScanQR';
import GoKnowledge from './GoKnowledge';
import GetSLON from './GetSLON';
import GoDiplomas from './GoDiplomas';


function BottomMenu(): React.ReactElement {
  return (
    <MenuWrapper>
      <MenuItem><GoKnowledge /></MenuItem>
      <MenuItem><ScanQR /></MenuItem>
      <MenuItem><GoDiplomas /></MenuItem>
      <MenuItem><GetSLON /></MenuItem>
    </MenuWrapper>
  );
}

const MenuWrapper = styled.div`
  display: flex;
  justify-content: space-around;
  align-items: center;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 70px;
  background-color: #f7f7f7;
  border-top: 1px solid #d1d1d1;
  z-index: 1000; 
`;

const MenuItem = styled.div`
  font-size: 12px;
  color: #666;
  text-align: center;
  flex: 1;
`;

export default BottomMenu;