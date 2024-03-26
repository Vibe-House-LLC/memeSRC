// useDialog.js
import { useContext } from 'react';
import { DialogContext } from './DialogContext';

export const useDialog = () => {
  return useContext(DialogContext);
};