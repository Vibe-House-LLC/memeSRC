import { useContext, useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// @mui
import { Link, Stack, IconButton, InputAdornment, TextField, Checkbox, Typography, styled, FormControlLabel, FormGroup } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { API, Auth } from 'aws-amplify';
// utils
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SnackbarContext } from '../../../SnackbarContext';
// components
import Iconify from '../../../components/iconify';
import { UserContext } from '../../../UserContext';


// ----------------------------------------------------------------------
const AutoFillTextField = styled(TextField)`
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active  {
    -webkit-box-shadow: 0 0 0 60px #192633 inset !important;
    background-color: #192633 !important;
    background-clip: content-box !important;
`;

export default function SignupForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { setSeverity, setMessage, setOpen } = useContext(SnackbarContext);

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

  const [agree, setAgree] = useState(false);

  const [formErrors, setFormErrors] = useState({
    username: false,
    email: false,
    password: false,
    confirmPassword: false,
    passwordMismatch: false,
    passwordLength: false,
    agree: false
  });

  const [emailInUse, setEmailInUse] = useState(false);

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
    if (!email || !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
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
      agree: (!agree)
    });

    return (_username || _email || _password || _confirmPassword || _passwordMismatch || _passwordLength || !agree)
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
          enabled: false,
        }
      }).then((result) => {
        console.log(result);
        API.post('publicapi', '/user/new', {
          body: {
            username,
            email,
            sub: result.userSub
          }
        }).then(apiResponse => {
          setSignupStatus({
            'loading': false,
            'disabled': true,
            'text': 'Sign Up Complete'
          });
          console.log(apiResponse)
          setUser({
            username,
            email,
            userConfirmed: false,
          })
        }).catch(err => console.log(err))
      }).catch((err) => {
        setSignupStatus({
          'loading': false,
          'disabled': false,
          'error': err.message,
          'text': 'Sign Up'
        });
        if (err.message === "PreSignUp failed with error EmailExistsException.") {
          setMessage('Email already in use.')
          setSeverity('error')
          setOpen(true)
          setEmailInUse(true)
          setFormErrors({
            ...formErrors,
            email: true
          })
        } else {
          setMessage(err.message)
          setSeverity('error')
          setOpen(true)
        }
        
      });
    } else {
      setMessage('Please check form for errors')
      setSeverity('error')
      setOpen(true)
    }
  }

  useEffect(() => {
    if (user && user.username && user.email && user.userConfirmed === false) {
      navigate(`/verify${searchParams.get('dest') ? `?dest=${encodeURIComponent(searchParams.get('dest'))}` : '' }`);
    }
  }, [user])

  const handleLinkClick = (event, url) => {
    event.preventDefault();
    event.stopPropagation();
    window.open(url, '_blank');
  };

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Create a memeSRC account
      </Typography>
      <Typography variant='body1' gutterBottom marginBottom={8}>
        Already have an account? <Link sx={{ cursor: 'pointer' }} onClick={() => { navigate('/login') }}>Sign in</Link>
      </Typography>
      <form onSubmit={(e) => {
        e.preventDefault();
        createUser();
        return false
      }}>
        <Stack spacing={3}>
          <AutoFillTextField
            name="username"
            label="Username"
            error={formErrors.username}
            value={username}
            onChange={(x) => {
              const sanitizedValue = x.target.value.replace(/[^\w\s]/gi, '').replace(/\s/g, '').toLowerCase();
              setUsername(sanitizedValue);
              setFormErrors({
                ...formErrors,
                username: false
              })
            }}
          />

          <AutoFillTextField
            name="email"
            label="Email address"
            autoComplete='email'
            error={formErrors.email}
            helperText={emailInUse ? 'The email address you have provided belongs to an existing account.' : ''}
            onChange={(x) => {
              setEmail(x.target.value)
              setFormErrors({
                ...formErrors,
                email: false
              })
              setEmailInUse(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                createUser();
              }
            }}
          />

          <AutoFillTextField
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                createUser();
              }
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
          <AutoFillTextField
            name="confirm-password"
            label="Confirm Password"
            sx={{ '&:-webkit-autofill': { '-webkit-box-shadow': '0 0 0 1000px #1b1b1b inset !important', '-webkit-text-fill-color': 'white !important' } }}
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                createUser();
              }
            }}
            helperText={formErrors.confirmPassword ? '' : `${formErrors.passwordLength ? 'Password is not long enough' : ''}${(formErrors.passwordLength && formErrors.passwordMismatch) ? ' & ' : ''}${formErrors.passwordMismatch ? 'Passwords do not match' : ''}`}
          />
          <FormGroup>
            <FormControlLabel
              required
              control={
                <Checkbox
                  checked={agree}
                  onChange={
                    (event) => {
                      setAgree(event.target.checked)
                      setFormErrors({
                        ...formErrors,
                        agree: false
                      })
                    }
                  }
                />
              }
              label={
                <span style={{color: formErrors.agree ? 'red' : ''}}>
                  I agree to the{' '}
                  <Link
                    sx={{ cursor: 'pointer' }}
                    onClick={(event) => handleLinkClick(event, '/termsofservice')}
                  >
                    Terms of Service
                  </Link>{' '}
                  &{' '}
                  <Link
                    sx={{ cursor: 'pointer' }}
                    onClick={(event) => handleLinkClick(event, '/privacypolicy')}
                  >
                    Privacy Policy
                  </Link>
                </span>
              }
            />
          </FormGroup>
          <LoadingButton sx={{ my: 3 }} fullWidth size="large" type="submit" variant="contained" loading={signupStatus.loading} onClick={createUser} id="signup-btn" disabled={signupStatus.disabled}>
            {signupStatus.text}
          </LoadingButton>
        </Stack>
      </form>


      {/* <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ my: 2 }}>
        <Checkbox name="remember" label="Remember me" />
        <Link variant="subtitle2" underline="hover">
          Forgot password?
        </Link>
      </Stack> */}


    </>
  );
};

