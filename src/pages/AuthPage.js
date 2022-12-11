import { Helmet } from 'react-helmet-async';
import { useContext } from 'react';
import { styled } from '@mui/material/styles';
import { Container, Typography } from '@mui/material';
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

const StyledSection = styled('div')(({ theme }) => ({
  width: '100%',
  maxWidth: 480,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  boxShadow: theme.customShadows.card,
  backgroundColor: theme.palette.background.default,
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
  if (user && !user.userConfirmed) {
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
            <Typography variant="h4" gutterBottom marginBottom={8}>
              {formTitle}
            </Typography>
            {formType}
          </StyledContent>
        </Container>
      </StyledRoot>
    </>
  );
}
