import { useContext, useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// @mui
import { Link, Stack, IconButton, InputAdornment, TextField, Checkbox, Typography } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Auth } from 'aws-amplify';
// utils
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
// components
import Iconify from '../../../components/iconify';
import { UserContext } from '../../../UserContext';


// ----------------------------------------------------------------------

export default function SignupForm(props) {
  const navigate = useNavigate();

  const { user, setUser } = useContext(UserContext);

  const [signupStatus, setSignupStatus] = useState({
    'loading': false,
    'disabled': false,
    'text': 'Sign Up'
  });

  const [showPassword, setShowPassword] = useState(false);

  const [username, setUsername] = useState('');

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [confirmPassword, setConfirmPassword] = useState('');

  const [formErrors, setFormErrors] = useState({
    username: false,
    email: false,
    password: false,
    confirmPassword: false,
    passwordMismatch: false,
    passwordLength: false
  });

  const checkForErrors = () => {
    let _username;
    let _email;
    let _password;
    let _confirmPassword;
    const _passwordMismatch = (password !== confirmPassword)
    let _passwordLength;

    if (!username) {
      _username = true
    }
    if (!password) {
      _password = true
    }
    if (!confirmPassword) {
      _confirmPassword = true
    }
    if (!email) {
      _email = true
    }

    if (password.length < 8) {
      _passwordLength = true
    }

    setFormErrors({
      username: _username,
      email: _email,
      password: _password,
      confirmPassword: _confirmPassword,
      passwordMismatch: _passwordMismatch,
      passwordLength: _passwordLength,
    });

    return (_username || _email || _password || _confirmPassword || _passwordMismatch || _passwordLength)
  }


  const createUser = async () => {
    const errors = checkForErrors();

    if (!errors) {
      setSignupStatus({
        'loading': true,
        'disabled': true,
        'text': 'Signing Up...'
      })

      Auth.signUp({
        username,
        password,
        attributes: {
          email,          // optional
          // other custom attributes
        },
        autoSignIn: { // optional - enables auto sign in after user is confirmed
          enabled: true,
        }
      }).then((result) => {
        setSignupStatus({
          'loading': false,
          'disabled': true,
          'text': 'Sign Up Complete'
        });
        console.log(result)
        setUser({
          username,
          email,
          userConfirmed: false,
        })
        console.log(result);
      }).catch((err) => {
        setSignupStatus({
          'loading': false,
          'disabled': false,
          'error': err,
          'text': 'Sign Up'
        });
        console.log(err);
      });
    }
  }

  useEffect(() => {
    if (user && user.username && user.email && user.userConfirmed === false) {
      navigate('/verify');
    }
  }, [user])

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Sign Up
      </Typography>
      <Typography variant='body1' gutterBottom marginBottom={8}>
        Already have an account? <Link sx={{cursor: 'pointer'}} onClick={() => {navigate('/login')}}>Click here.</Link>
      </Typography>
      <Stack spacing={3}>
        <TextField
          name="username"
          label="Username"
          error={formErrors.username}
          onChange={(x) => {
            setUsername(x.target.value)
            setFormErrors({
              ...formErrors,
              username: false
            })
          }}
        />

        <TextField
          name="email"
          label="Email address"
          autoComplete='email'
          error={formErrors.email}
          onChange={(x) => {
            setEmail(x.target.value)
            setFormErrors({
              ...formErrors,
              email: false
            })
          }}
        />

        <TextField
          name="password"
          label="Password"
          autoComplete='new-password'
          error={formErrors.password || formErrors.passwordMismatch}
          type={showPassword ? 'text' : 'password'}
          onChange={(x) => {
            setPassword(x.target.value)
            setFormErrors({
              ...formErrors,
              password: false,
              passwordMismatch: false,
              passwordLength: false
            })
          }}
          helperText={formErrors.password ? '' : `${formErrors.passwordLength ? 'Password is not long enough' : ''}${(formErrors.passwordLength && formErrors.passwordMismatch) ? ' & ' : ''}${formErrors.passwordMismatch ? 'Passwords do not match' : ''}`}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                  <Iconify icon={showPassword ? 'eva:eye-fill' : 'eva:eye-off-fill'} />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <TextField
          name="confirm-password"
          label="Confirm Password"
          error={formErrors.confirmPassword || formErrors.passwordMismatch}
          type={showPassword ? 'text' : 'password'}
          autoComplete='new-password'
          onChange={(x) => {
            setConfirmPassword(x.target.value)
            setFormErrors({
              ...formErrors,
              confirmPassword: false,
              passwordMismatch: false,
              passwordLength: false
            })
          }}
          helperText={formErrors.confirmPassword ? '' : `${formErrors.passwordLength ? 'Password is not long enough' : ''}${(formErrors.passwordLength && formErrors.passwordMismatch) ? ' & ' : ''}${formErrors.passwordMismatch ? 'Passwords do not match' : ''}`}
        />
      </Stack>

      {/* <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ my: 2 }}>
        <Checkbox name="remember" label="Remember me" />
        <Link variant="subtitle2" underline="hover">
          Forgot password?
        </Link>
      </Stack> */}

      <LoadingButton sx={{ my: 3 }} fullWidth size="large" type="submit" variant="contained" loading={signupStatus.loading} onClick={createUser} id="signup-btn" disabled={signupStatus.disabled}>
        {signupStatus.text}
      </LoadingButton>
    </>
  );
};

SignupForm.propTypes = {
  setUser: PropTypes.func.isRequired,
};
