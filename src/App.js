import { Suspense } from 'react';


import { SearchDetailsProvider } from './contexts/SearchDetailsProvider';
import { CollageProvider } from './contexts/CollageContext';
// routes
import Router from './routes';
// theme
import ThemeProvider from './theme';
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
