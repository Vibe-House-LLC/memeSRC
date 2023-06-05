import { Helmet } from 'react-helmet-async';
import { useContext } from 'react';
import { styled } from '@mui/material/styles';
import { Container, Link, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import { LoginForm } from '../sections/auth/login';
import Logo from '../components/logo';
import VerifyForm from '../sections/auth/login/VerifyForm';
import SignupForm from '../sections/auth/login/SignupForm';
import { UserContext } from '../UserContext';

// ----------------------------------------------------------------------

const StyledRoot = styled('div')(({ theme }) => ({
  [theme.breakpoints.up('md')]: {
    display: 'flex',
  },
}));

const StyledContent = styled('div')(({ theme }) => ({
  maxWidth: 480,
  margin: 'auto',
  minHeight: '100vh',
  display: 'flex',
  justifyContent: 'center',
  flexDirection: 'column',
  padding: theme.spacing(12, 0),
}));

// ----------------------------------------------------------------------

export default function AuthPage(props) {
  // Set up the user context
  const {user, setUser} = useContext(UserContext)

  // Prep the auth page content depending on the situation
  // TODO: fix issue where you can get "stuck" verifying 
  // TODO: add auto-login functionality after confirmation
  let formType = props.method === "signin" ? <LoginForm /> : <SignupForm setUser={setUser}/>
  let formTitle = props.method === "signup" ? "Create Account" : "Sign in"
  if (user && user.userConfirmed === false) {
    formType = <VerifyForm username={user.username} />
    formTitle = "Verify Account"
  }

  // Return the page
  return (
    <>
      <Helmet>
        <title> {formTitle} • memeSRC </title>
      </Helmet>

      <StyledRoot>
        <Logo
          sx={{
            position: 'fixed',
            top: { xs: 16, sm: 24, md: 40 },
            left: { xs: 16, sm: 24, md: 40 },
          }}
        />

        <Container maxWidth="sm">
          <StyledContent>
            {props.children}
          </StyledContent>
        </Container>
      </StyledRoot>
    </>
  );
};

// AuthPage.propTypes = {
//   method: PropTypes.string.isRequired,
// };
