import { alpha } from '@mui/material/styles';

// ----------------------------------------------------------------------

// SETUP COLORS
const GREY = {
  0: '#FFFFFF',
  100: '#F9F9F9',
  200: '#F4F4F4',
  300: '#DFDFDF',
  400: '#C4C4C4',
  500: '#919191',
  600: '#636363',
  700: '#454545',
  800: '#212121',
  900: '#161616',
};

const PRIMARY = {
  lighter: '#D1E9FC',
  light: '#76B0F1',
  main: '#2065D1',
  dark: '#103996',
  darker: '#061B64',
  contrastText: '#fff',
};

const SECONDARY = {
  lighter: '#C3C3C3',
  light: '#757575',
  main: '#4C4C4C',
  dark: '#292929',
  darker: '#141414',
  contrastText: '#fff',
};


const INFO = {
  lighter: '#D0F2FF',
  light: '#74CAFF',
  main: '#1890FF',
  dark: '#0C53B7',
  darker: '#04297A',
  contrastText: '#fff',
};

const SUCCESS = {
  lighter: '#08660D',
  light: '#229A16',
  main: '#54D62C',
  dark: '#AAF27F',
  darker: '#E9FCD4',
  contrastText: GREY[800],
};

const WARNING = {
  lighter: '#FFF7CD',
  light: '#FFE16A',
  main: '#FFC107',
  dark: '#B78103',
  darker: '#7A4F01',
  contrastText: GREY[200],
};

const ERROR = {
  lighter: '#FFE7D9',
  light: '#FFA48D',
  main: '#FF4842',
  dark: '#B72136',
  darker: '#7A0C2E',
  contrastText: '#fff',
};

const paletteDark = {
  common: { black: '#000', white: '#fff' },
  primary: PRIMARY,
  secondary: SECONDARY,
  info: INFO,
  success: SUCCESS,
  warning: WARNING,
  error: ERROR,
  grey: GREY,
  divider: alpha(GREY[500], 0.24),
  mode: 'dark',
  text: {
    primary: GREY[200],
    secondary: GREY[400],
    disabled: GREY[500],
  },
  background: {
    paper: GREY[800],
    default: GREY[900],
    neutral: GREY[800],
  },
  action: {
    active: GREY[400],
    hover: alpha(GREY[500], 0.08),
    selected: alpha(GREY[500], 0.16),
    disabled: alpha(GREY[500], 0.8),
    disabledBackground: alpha(GREY[500], 0.24),
    focus: alpha(GREY[500], 0.24),
    hoverOpacity: 0.08,
    disabledOpacity: 0.48,
  },
};

export default paletteDark;
