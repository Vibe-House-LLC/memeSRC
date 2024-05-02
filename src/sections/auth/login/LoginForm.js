import { useContext, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// @mui
import { Link, Stack, IconButton, InputAdornment, TextField, Checkbox, FormControlLabel, Typography, styled } from '@mui/material';
import { LoadingButton } from '@mui/lab';
// components
import { API, Auth } from 'aws-amplify';
import Iconify from '../../../components/iconify';
import { UserContext } from '../../../UserContext';
import { SnackbarContext } from '../../../SnackbarContext';


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

export default function LoginForm() {
  const navigate = useNavigate();

  const { setSeverity, setMessage, setOpen } = useContext(SnackbarContext);

  const [showPassword, setShowPassword] = useState(false);

  const [staySignedIn, setStaySignedIn] = useState(false);

  const [username, setUsername] = useState(null);

  const [password, setPassword] = useState(null);

  const [loading, setLoading] = useState(false);

  const [formErrors, setFormErrors] = useState({
    username: false,
    password: false
  });

  const loginForm = useRef();

  const { setUser } = useContext(UserContext)

  // Use the useLocation hook to get the location object
  const location = useLocation();
  const queryString = location.search;
  const queryParams = new URLSearchParams(queryString);
  const dest = queryParams.get('dest');
  const handleClick = () => {
    setLoading(true);

    // TODO: Get the session/local storage thing figured out. Currently if it's set to session, if you manually go to another page on the site it logs you out.

    // Handle sign in
    // if (!staySignedIn) {
    //   Auth.configure({ storage: window.sessionStorage })
    // } else {
    //   Auth.configure({ storage: window.localStorage })
    // }


    if (username && password) {
      Auth.signIn(username, password).then((x) => {
        API.post('publicapi', '/user/update/status').then(response => {
          setUser(x)
          navigate(dest ? decodeURIComponent(dest) : '/', { replace: true })
        })
      }).catch((error) => {
        console.log(error.name)

        switch (error.name) {
          case 'UserNotConfirmedException':
            setUser({
              userConfirmed: false,
              username
            });
            setOpen(true);
            setMessage('Please verify your account.');
            setSeverity('error');
            navigate('/verify');
            setLoading(false)
            break;
          case 'UserNotFoundException':
            setOpen(true);
            setMessage('Account not found. Please try again.');
            setSeverity('error')
            setFormErrors({
              ...formErrors,
              username: true
            })
            setLoading(false)
            break;
          default:
            setOpen(true);
            setMessage(`Error: ${error.message}`);
            setSeverity('error')
            setLoading(false)
        }
      })
    } else {
      setFormErrors({
        username: (!username),
        password: (!password)
      })
      setOpen(true);
      setMessage(`${username ? '' : 'Username'}${(!username && !password) ? ' & ' : ''}${password ? '' : 'Password'} required.`);
      setSeverity('error')
      setLoading(false)
    }
  };

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Sign In to memeSRC
      </Typography>
      <Typography variant='body1' gutterBottom marginBottom={8}>
        Need an account? <Link sx={{ cursor: 'pointer' }} onClick={() => { navigate(`/signup${dest ? `?dest=${encodeURIComponent(dest)}` : ''}`) }}>Create one</Link>
      </Typography>
      <form onSubmit={(e) => {
        e.preventDefault();
        handleClick();
        return false
      }}>
        <Stack spacing={3}>
          <AutoFillTextField
            name="text"
            label="Username"
            onInput={(x) => {
              setUsername(x.target.value);
              setFormErrors({
                ...formErrors,
                username: false
              })
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleClick();
              }
            }}
            error={formErrors.username}
          />

          <AutoFillTextField
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            error={formErrors.password}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                    <Iconify icon={showPassword ? 'eva:eye-fill' : 'eva:eye-off-fill'} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleClick();
              }
            }}
            onInput={(x) => {
              setPassword(x.target.value);
              setFormErrors({
                ...formErrors,
                password: false
              })
            }}
          />
        </Stack>
      </form>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ my: 2 }}>
        <FormControlLabel
          control={
            <Checkbox
              name="remember"
              onChange={(event) => setStaySignedIn(event.target.checked)}
              disabled
              checked
            />
          }
          label="Remember me"
        />
        <Link variant="subtitle2" underline="hover" sx={{ cursor: 'pointer' }} onClick={() => { navigate('/forgotpassword') }}>
          Forgot your password?
        </Link>
      </Stack>

      <LoadingButton loading={loading} fullWidth size="large" type="submit" variant="contained" onClick={handleClick}>
        Login
      </LoadingButton>
    </>
  );
}