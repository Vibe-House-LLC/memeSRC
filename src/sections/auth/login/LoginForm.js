import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// @mui
import { Link, Stack, IconButton, InputAdornment, TextField, Checkbox } from '@mui/material';
import { LoadingButton } from '@mui/lab';
// components
import { Auth } from 'aws-amplify';
import Iconify from '../../../components/iconify';


// ----------------------------------------------------------------------

export default function LoginForm() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);

  const [staySignedIn, setStaySignedIn] = useState(false);
  
  const [username, setUsername] = useState(null);

  const [password, setPassword] = useState(null);

  const handleClick = () => {
    if (!staySignedIn) {
      Auth.configure({ storage: window.sessionStorage })
    } else {
      Auth.configure({ storage: window.localStorage })
    }
    Auth.signIn(username, password).then(() => {
      navigate('/dashboard/app', { replace: true })
    }).catch((err) => {
      alert(err);
    })
  };

  return (
    <>
      <Stack spacing={3}>
        <TextField name="text" label="Username" onInput={(x) => setUsername(x.target.value)} />

        <TextField
          name="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                  <Iconify icon={showPassword ? 'eva:eye-fill' : 'eva:eye-off-fill'} />
                </IconButton>
              </InputAdornment>
            ),
          }}
          onInput={(x) => setPassword(x.target.value)}
        />
      </Stack>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ my: 2 }}>
        <Checkbox name="remember" label="Remember me" onChange={(x) => setStaySignedIn(x.target.checked)}/>
        <Link variant="subtitle2" underline="hover">
          Forgot password?
        </Link>
      </Stack>

      <LoadingButton fullWidth size="large" type="submit" variant="contained" onClick={handleClick}>
        Login
      </LoadingButton>
    </>
  );
}
