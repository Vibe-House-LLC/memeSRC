import { styled } from '@mui/material/styles';
import MuiAlert from '@mui/material/Alert';
import { Card } from '@mui/material';
import { forwardRef } from 'react';

export const Alert = forwardRef((props, ref) => <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />);

export const ParentContainer = styled('div')`
    height: 100%;
`;

export const ColorPickerPopover = styled('div')({});

export const StyledCard = styled(Card)`
  border: 3px solid transparent;
  box-sizing: border-box;
  &:hover {
    border: 3px solid orange;
  }
`;

export const StyledLayerControlCard = styled(Card)`
  width: 280px;
  border: 3px solid transparent;
  box-sizing: border-box;
  padding: 10px 15px;
`;

export const StyledCardMedia = styled('img')`
  width: 100%;
  height: auto;
  background-color: black;
`;
