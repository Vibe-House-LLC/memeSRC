import { Suspense } from 'react';

import { Backdrop, CircularProgress } from '@mui/material';
import { SearchDetailsProvider } from '../src/contexts/SearchDetailsProvider';
import { CollageProvider } from '../src/contexts/CollageContext';
// routes
import Router from '../src/routes';
// theme
import ThemeProvider from '../src/theme';
import SnackBar from '../src/utils/Snackbar';
import StripeWatcher from '../src/utils/StripeWatcher';


// ----------------------------------------------------------------------

export default function App(): JSX.Element {

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
                {/* <FeatureSectionPopover> */}
                  <Router />
                {/* </FeatureSectionPopover> */}
              </CollageProvider>
            </SearchDetailsProvider>
            {/* </FeaturePopover> */}
          </Suspense>
        </StripeWatcher>
      </SnackBar>
    </ThemeProvider>
  );
}
