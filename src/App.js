import { useState } from 'react';
import { Auth } from 'aws-amplify';
// routes
import Router from './routes';
// theme
import ThemeProvider from './theme';
// components
import ScrollToTop from './components/scroll-to-top';
import { StyledChart } from './components/chart';
import { UserContext } from './UserContext';

// ----------------------------------------------------------------------

export default function App() {
  // Set up the user context
  const [user, setUser] = useState(null)
  console.log("checking user auth (App.js)")
  if (!user) {
    Auth.currentAuthenticatedUser().then((x) => {
        setUser(x)  // if an authenticated user is found, set it into the context
        console.log(x)
    }).catch(() => {
        setUser(null)  // if there's an issue, clear the user context
        console.log("There wasn't an authenticated user found")
    });
  }
  // Return the App
  return (
    <ThemeProvider>
      <ScrollToTop />
      <StyledChart />
      <UserContext.Provider value={{user, setUser}}>
        <Router />
      </UserContext.Provider>
    </ThemeProvider>
  );
}
