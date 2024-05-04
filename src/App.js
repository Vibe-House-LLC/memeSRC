import { Suspense } from 'react';

import { Backdrop, CircularProgress } from '@mui/material';
import { SearchDetailsProvider } from './contexts/SearchDetailsProvider';
// routes
import Router from './routes';
// theme
import ThemeProvider from './theme';
import SnackBar from './utils/Snackbar';
import StripeWatcher from './utils/StripeWatcher';
import { V2SearchDetailsProvider } from './contexts/V2SearchDetailsProvider';
import { DialogProvider } from './contexts/SubscribeDialog';
// import FeatureSectionPopover from './components/v2-feature-section/v2-feature-section-popover';
// import AutoAdWrapper from './ads/AutoAdWrapper';
// import FeaturePopover from './components/features-popover/featurePopover';
// components
// import ScrollToTop from './components/scroll-to-top';
// import { StyledChart } from './components/chart';


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
              {/* <FeatureSectionPopover> */}
                <Router />
              {/* </FeatureSectionPopover> */}
            </SearchDetailsProvider>
            {/* </FeaturePopover> */}
          </Suspense>
        </StripeWatcher>
      </SnackBar>
    </ThemeProvider>
  );
}
