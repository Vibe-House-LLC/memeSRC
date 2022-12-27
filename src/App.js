import { Suspense } from 'react';

import { Backdrop, CircularProgress } from '@mui/material';
// routes
import Router from './routes';
// theme
import ThemeProvider from './theme';
// components
// import ScrollToTop from './components/scroll-to-top';
// import { StyledChart } from './components/chart';


// ----------------------------------------------------------------------

export default function App() {

  // Return the App
  return (
    <ThemeProvider>
      {/* <ScrollToTop /> */}
      {/* <StyledChart /> */}
      
        <Suspense fallback={
          <Backdrop open sx={{ backgroundColor: "white" }}>
            <CircularProgress />
          </Backdrop>
        }>
          <Router />
        </Suspense>
    </ThemeProvider>
  );
}
