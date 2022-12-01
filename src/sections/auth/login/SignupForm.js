import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// @mui
import { Link, Stack, IconButton, InputAdornment, TextField, Checkbox } from '@mui/material';
import { LoadingButton } from '@mui/lab';
// utils
import signUp from '../../../utils/Auth';
// components
import Iconify from '../../../components/iconify';

// ----------------------------------------------------------------------

export default function SignupForm() {
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

  const trySignUp = async () => {
    
    setSignupStatus({
      'loading': true,
      'disabled': true,
      'text': 'Creating Account'
    });
    await signUp(username, password, email, false).then(data =>{
      console.log(data);
      setSignupStatus({
        'loading': false,
        'disabled': true,
        'text': 'Account Created!'
      });
    }).catch((data) => {
      console.log(data)
      setSignupStatus({
        'loading': false,
        'disabled': false,
        'text': 'Error. Try again.'
      });
    })
  }

  return (
    <>
      <Stack spacing={3}>
        <TextField name="username" label="Username" onInput={(x) => setUsername(x.target.value)}/>

        <TextField name="email" label="Email address" onInput={(x) => setEmail(x.target.value)}/>

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

      <LoadingButton fullWidth size="large" type="submit" variant="contained" loading={signupStatus.loading} onClick={trySignUp} id="signup-btn" disabled={signupStatus.disabled}>
        {signupStatus.text}
      </LoadingButton>
    </>
  );
}
