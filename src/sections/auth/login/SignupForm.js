import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// @mui
import { Link, Stack, IconButton, InputAdornment, TextField, Checkbox } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Auth } from 'aws-amplify';
// utils

// components
import Iconify from '../../../components/iconify';

// ----------------------------------------------------------------------

export default function SignupForm(props) {
  // const navigate = useNavigate();

  const [signupStatus, setSignupStatus] = useState({
    'loading': false,
    'disabled': false,
    'text': 'Sign Up'
  });

  const [showPassword, setShowPassword] = useState(false);

  const [username, setUsername] = useState('');

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const createUser = async () => {
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
      props.setUserState({
        username: result.user.username
      })
      console.log(result);
    }).catch((err) => {
      setSignupStatus({
        'loading': false,
        'disabled': false,
        'error': err,
        'text': 'Sign Up'
      });
      alert(err);
    });
  }

  return (
    <>
      <Stack spacing={3}>
        <TextField name="username" label="Username" onInput={(x) => setUsername(x.target.value)} />

        <TextField name="email" label="Email address" onInput={(x) => setEmail(x.target.value)} />

        <TextField
          name="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          onInput={(x) => setPassword(x.target.value)}
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
      </Stack>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ my: 2 }}>
        <Checkbox name="remember" label="Remember me" />
        <Link variant="subtitle2" underline="hover">
          Forgot password?
        </Link>
      </Stack>

      <LoadingButton fullWidth size="large" type="submit" variant="contained" loading={signupStatus.loading} onClick={createUser} id="signup-btn" disabled={signupStatus.disabled}>
        {signupStatus.text}
      </LoadingButton>
    </>
  );
}
