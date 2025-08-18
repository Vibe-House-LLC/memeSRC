import { Helmet } from 'react-helmet-async';
import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { Container } from '@mui/material';
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

export default function AuthPage({ method, children }) {
  // Set up the user context
  const { user, setUser } = useContext(UserContext)

  // Prep the auth page content depending on the situation
  // TODO: fix issue where you can get "stuck" verifying 
  // TODO: add auto-login functionality after confirmation
  let formType = children || null;
  let formTitle = 'Sign in';

  if (!formType) {
    // Fallback to legacy behavior when no children are provided
    formType = method === "signin" ? <LoginForm /> : <SignupForm setUser={setUser} />
    // Prefer the child component's declared title if available
    const legacyChild = method === 'signin' ? LoginForm : SignupForm;
    const legacyChildTitle = legacyChild && legacyChild.pageTitle;
    formTitle = method === "signup" ? (legacyChildTitle || "Create Account") : (legacyChildTitle || "Sign in")
    if (user && user.userConfirmed === false) {
      formType = <VerifyForm username={user.username} />
      formTitle = VerifyForm.pageTitle || "Verify Account"
    }
  } else {
    // Title based on current route when explicit children are provided
    const childDeclaredTitle = children && children.type && children.type.pageTitle;
    formTitle = childDeclaredTitle || 'memeSRC';
  }

  // Return the page
  return (
    <>
      <Helmet>
        <title> {formTitle} • memeSRC </title>
      </Helmet>

      <StyledRoot>
        <Link to='/'>
          <Logo
            sx={{
              position: 'fixed',
              top: { xs: 16, sm: 24, md: 40 },
              left: { xs: 16, sm: 24, md: 40 },
            }}
          />
        </Link>

        <Container maxWidth="sm">
          <StyledContent>
            {formType}
          </StyledContent>
        </Container>
      </StyledRoot>
    </>
  );
};

AuthPage.propTypes = {
  method: PropTypes.string,
  children: PropTypes.node,
};
