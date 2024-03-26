// useDialog.js
import { useContext } from 'react';
import { SubscribeDialogContext } from './SubscribeDialog';

export const useSubscribeDialog = () => {
  return useContext(SubscribeDialogContext);
};