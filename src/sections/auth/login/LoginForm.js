import { useContext, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// @mui
import { Link, Stack, IconButton, InputAdornment, TextField, Checkbox, FormControlLabel } from '@mui/material';
import { LoadingButton } from '@mui/lab';
// components
import { Auth } from 'aws-amplify';
import Iconify from '../../../components/iconify';
import { UserContext } from '../../../UserContext';


// ----------------------------------------------------------------------

export default function LoginForm() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);

  const [staySignedIn, setStaySignedIn] = useState(false);

  const [username, setUsername] = useState(null);

  const [password, setPassword] = useState(null);

  const [loading, setLoading] = useState(false);

  const {setUser} = useContext(UserContext)

  // Use the useLocation hook to get the location object
  const location = useLocation();

  const handleClick = () => {
    setLoading(true);
    // Get the query string from the location object
    const queryString = location.search;

    // Parse the query string into an object
    const queryParams = new URLSearchParams(queryString);

    // Get the 'dest' parameter from the query string
    const dest = queryParams.get('dest');

    // Handle sign in
    // if (!staySignedIn) {
    //   Auth.configure({ storage: window.sessionStorage })
    // } else {
    //   Auth.configure({ storage: window.localStorage })
    // }
    Auth.signIn(username, password).then((x) => {
      setUser(x)
      navigate(dest || '/dashboard/app', { replace: true })
    }).catch((err) => {
      alert(err);
      console.log(err.name)
      if(err.name === 'UserNotConfirmedException') {
        setUser({
          userConfirmed: false,
          username
        })
      }
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
        <FormControlLabel
          control={
            <Checkbox
              name="remember"
              onChange={(event) => setStaySignedIn(event.target.checked)}
            />
          }
          label="Remember me"
        />
        <Link variant="subtitle2" underline="hover">
          Forgot your password?
        </Link>
      </Stack>

      <LoadingButton loading={loading} fullWidth size="large" type="submit" variant="contained" onClick={handleClick}>
        Login
      </LoadingButton>
    </>
  );
}
