import { useState, Suspense } from 'react';
import { Auth } from 'aws-amplify';
import { Backdrop, CircularProgress } from '@mui/material';
// routes
import Router from './routes';
// theme
import ThemeProvider from './theme';
// components
import ScrollToTop from './components/scroll-to-top';
// import { StyledChart } from './components/chart';
import { UserContext } from './UserContext';

// ----------------------------------------------------------------------

export default function App() {
  // Set up the user context
  const [user, setUser] = useState(null);
  if (!user) {
    Auth.currentAuthenticatedUser().then((x) => {
      setUser(x)  // if an authenticated user is found, set it into the context
      console.log(x)
    }).catch(() => {
      setUser({ username: false })  // indicate the context is ready but user is not auth'd
      console.log("There wasn't an authenticated user found")
    });
  }
  // Return the App
  return (
    <ThemeProvider>
      <ScrollToTop />
      {/* <StyledChart /> */}
      <UserContext.Provider value={{ user, setUser }}>
        <Suspense fallback={
          <Backdrop open sx={{ backgroundColor: "white" }}>
            <CircularProgress />
          </Backdrop>
        }>
          <Router />
        </Suspense>
      </UserContext.Provider>
    </ThemeProvider>
  );
}
