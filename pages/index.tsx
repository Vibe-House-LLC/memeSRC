import { Suspense } from 'react';
import type { FC } from 'react';
import { Backdrop, CircularProgress } from '@mui/material';
import { SearchDetailsProvider } from '../src/contexts/SearchDetailsProvider';
import { CollageProvider } from '../src/contexts/CollageContext';
import ThemeProvider from '../src/theme';
import SnackBar from '../src/utils/Snackbar';
import StripeWatcher from '../src/utils/StripeWatcher';

const Home: FC = () => {
  return (
    <ThemeProvider>
      <SnackBar>
        <StripeWatcher>
          <Suspense
            fallback={
              <Backdrop open sx={{ backgroundColor: 'white' }}>
                <CircularProgress />
              </Backdrop>
            }
          >
            <SearchDetailsProvider>
              <CollageProvider>
                <div>Home Page</div>
              </CollageProvider>
            </SearchDetailsProvider>
          </Suspense>
        </StripeWatcher>
      </SnackBar>
    </ThemeProvider>
  );
};

export default Home;
