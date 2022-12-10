import { Helmet } from 'react-helmet-async';

import { useState } from 'react';
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

  const AuthForm = () => {
    let formType = <LoginForm />
    if (props.method === "signup") {
      if (userState.username) {
          formType = <VerifyForm username={userState.username} />
      } else {
          formType = <SignupForm setUserState={setUserState}/>
      }
    }
    return formType
  }

  return (
    <>
      <Helmet>
        <title> Verify Email | Minimal UI </title>
      </Helmet>

      <StyledRoot>
        <Logo
          sx={{
            position: 'fixed',
            top: { xs: 16, sm: 24, md: 40 },
            left: { xs: 16, sm: 24, md: 40 },
          }}
        />

        {mdUp && (
          <StyledSection>
            <Typography variant="h3" sx={{ px: 5, mt: 10, mb: 5 }}>
              Hi, Welcome Back
            </Typography>
            <img src="/assets/illustrations/illustration_login.png" alt="login" />
          </StyledSection>
        )}

        <Container maxWidth="sm">
          <StyledContent>
            <Typography variant="h4" gutterBottom marginBottom={8}>
              Verify your account
            </Typography>
            <AuthForm />
          </StyledContent>
        </Container>
      </StyledRoot>
    </>
  );
}
