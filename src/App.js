import { Suspense } from 'react';

import { Backdrop, CircularProgress } from '@mui/material';
import { SearchDetailsProvider } from './contexts/SearchDetailsProvider';
import { SearchSettingsProvider } from './contexts/SearchSettingsContext';
import { CollageProvider } from './contexts/CollageContext';
import { AdFreeDecemberProvider } from './contexts/AdFreeDecemberContext';
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
            <SearchSettingsProvider>
              <SearchDetailsProvider>
                <CollageProvider>
                  <DesktopProcessingProvider>
                    <AdFreeDecemberProvider>
                      {/* <FeatureSectionPopover> */}
                      <Router />
                      {/* </FeatureSectionPopover> */}
                    </AdFreeDecemberProvider>
                  </DesktopProcessingProvider>
                </CollageProvider>
              </SearchDetailsProvider>
            </SearchSettingsProvider>
            {/* </FeaturePopover> */}
          </Suspense>
        </StripeWatcher>
      </SnackBar>
    </ThemeProvider>
  );
}
