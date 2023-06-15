import { Suspense } from 'react';

import { Backdrop, CircularProgress } from '@mui/material';
// routes
import Router from './routes';
// theme
import ThemeProvider from './theme';
import SnackBar from './utils/Snackbar';
// components
// import ScrollToTop from './components/scroll-to-top';
// import { StyledChart } from './components/chart';


// ----------------------------------------------------------------------

export default function App() {

  console.log(`REACT_APP_USER_BRANCH: ${process.env.REACT_APP_USER_BRANCH}`)

  // Return the App
  return (
    <ThemeProvider>
      <SnackBar>
        {/* <ScrollToTop /> */}
        {/* <StyledChart /> */}

        <Suspense fallback={
          <Backdrop open sx={{ backgroundColor: "white" }}>
            <CircularProgress />
          </Backdrop>
        }>
          <Router />
        </Suspense>
      </SnackBar>
    </ThemeProvider>
  );
}
