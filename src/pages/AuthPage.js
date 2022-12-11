import { Helmet } from 'react-helmet-async';

import { useContext, useState } from 'react';
// @mui
import { styled } from '@mui/material/styles';

import { Container, Typography } from '@mui/material';
import { LoginForm } from '../sections/auth/login';

// hooks
import useResponsive from '../hooks/useResponsive';

// components
import Logo from '../components/logo';
// sections
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
  const mdUp = useResponsive('up', 'md');

  const [userState, setUserState] = useState("");

  const {user, setUser} = useContext(UserContext)

  const AuthForm = () => {
    let formType = <LoginForm />
    let formHeader = "Welcome back!"
    if (props.method === "signup") {
      if (user.username) {
          formType = <VerifyForm username={user.username} />
          formHeader = "Verify your account"
      } else {
          formType = <SignupForm setUserState={setUser}/>
          formHeader = "Create your account"
      }
    }
    return formType
  }

  // Default to login form
  let formType = <LoginForm />
  let formTitle = "Sign in"
  let formHeader = "Welcome back!"
  if (props.method === "signup") {
    // If the user is not verified
    // TODO: add explicit check for verified boolean and forward to dashboard if they are already verified
    if (user.username) {
        formType = <VerifyForm username={user.username} />
        formTitle = "Verify account"
        formHeader = "Verify your account"
    } else {
      // Regular signup flow
        formType = <SignupForm setUserState={setUser}/>
        formTitle = "Create account"
        formHeader = "Create your account"
    }
  }

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
              {formHeader}
            </Typography>
            <AuthForm />
          </StyledContent>
        </Container>
      </StyledRoot>
    </>
  );
}
