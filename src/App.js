import { Suspense } from 'react';

import { Backdrop, CircularProgress } from '@mui/material';
import { SearchDetailsProvider } from './contexts/SearchDetailsProvider';
import { CollageProvider } from './contexts/CollageContext';
// routes
import Router from './routes';
// theme
import ThemeProvider from './theme';
import DesktopProcessingProvider from './contexts/DesktopProcessingProvider';
import SnackBar from './utils/Snackbar';
import StripeWatcher from './utils/StripeWatcher';


// ----------------------------------------------------------------------

export default function App() {

  // console.log(`REACT_APP_USER_BRANCH: ${process.env.REACT_APP_USER_BRANCH}`)

  // Return the App
  return (
    <ThemeProvider>

      <SnackBar>
        {/* <ScrollToTop /> */}
        {/* <StyledChart /> */}
        <StripeWatcher>
          <Suspense fallback={
            <Backdrop open sx={{ backgroundColor: "white" }}>
              <CircularProgress />
            </Backdrop>
          }>
            {/* <FeaturePopover> */}
            <SearchDetailsProvider>
              <CollageProvider>
                <DesktopProcessingProvider>
                  {/* <FeatureSectionPopover> */}
                  <Router />
                  {/* </FeatureSectionPopover> */}
                </DesktopProcessingProvider>
              </CollageProvider>
            </SearchDetailsProvider>
            {/* </FeaturePopover> */}
          </Suspense>
        </StripeWatcher>
      </SnackBar>
    </ThemeProvider>
  );
}
