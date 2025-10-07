import { useContext, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useLocation } from 'react-router-dom';
// @mui
import { Link, Stack, IconButton, InputAdornment, TextField, Checkbox, FormControlLabel, Typography, styled } from '@mui/material';
import { LoadingButton } from '@mui/lab';
// components
import { API, Auth } from 'aws-amplify';
import Iconify from '../../../components/iconify';
import { UserContext } from '../../../UserContext';
import { SnackbarContext } from '../../../SnackbarContext';
import { getShowsWithFavorites } from '../../../utils/fetchShowsRevised';
import { fetchProfilePhoto } from '../../../utils/profilePhoto';
import { safeGetItem, writeJSON } from '../../../utils/storage';


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


  const [username, setUsername] = useState(null);

  const [password, setPassword] = useState(null);

  const [loading, setLoading] = useState(false);

  const [formErrors, setFormErrors] = useState({
    username: false,
    password: false
  });


  const { setUser, handleUpdateDefaultShow, setShows } = useContext(UserContext)

  // Use the useLocation hook to get the location object
  const location = useLocation();
  const queryString = location.search;
  const queryParams = new URLSearchParams(queryString);
  const dest = queryParams.get('dest');
  const handleClick = async () => {
    setLoading(true);

    // TODO: Get the session/local storage thing figured out. Currently if it's set to session, if you manually go to another page on the site it logs you out.

    // Handle sign in
    // if (!staySignedIn) {
    //   Auth.configure({ storage: window.sessionStorage })
    // } else {
    //   Auth.configure({ storage: window.localStorage })
    // }


    if (!username || !password) {
      setFormErrors({
        username: !username,
        password: !password
      });
      setOpen(true);
      setMessage(`${username ? '' : 'Username'}${(!username && !password) ? ' & ' : ''}${password ? '' : 'Password'} required.`);
      setSeverity('error');
      setLoading(false);
      return;
    }

    try {
      const signedInUser = await Auth.signIn(username, password);
      await API.post('publicapi', '/user/update/status');

      const [userDetailsResponse, profilePhoto] = await Promise.all([
        API.get('publicapi', '/user/get').catch((error) => {
          console.log('Error fetching user details:', error);
          return null;
        }),
        fetchProfilePhoto().catch((error) => {
          console.log('Error fetching profile photo:', error);
          return null;
        })
      ]);

      const userDetails = userDetailsResponse?.data?.getUserDetails;
      let favorites = [];
      if (userDetails?.favorites) {
        try {
          favorites = JSON.parse(userDetails.favorites) || [];
        } catch (parseError) {
          console.log('Error parsing favorites:', parseError);
        }
      }

      const loadedShows = await getShowsWithFavorites(favorites);
      setShows(loadedShows);
      writeJSON('memeSRCShows', loadedShows);

      const userWithDetails = {
        ...signedInUser,
        ...signedInUser?.signInUserSession?.accessToken?.payload,
        userDetails,
        profilePhoto
      };

      setUser(userWithDetails);
      writeJSON('memeSRCUserDetails', userWithDetails);

      const storedDefaultShow = safeGetItem('memeSRCDefaultIndex');
      const hasFavorite = loadedShows.some((show) => show.isFavorite);
      const nextDefaultShow = hasFavorite
        ? storedDefaultShow || favorites[0] || '_universal'
        : '_universal';

      handleUpdateDefaultShow(nextDefaultShow);

      navigate(dest ? decodeURIComponent(dest) : '/', { replace: true });
    } catch (error) {
      console.log(error.name);

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
          break;
        case 'UserNotFoundException':
          setOpen(true);
          setMessage('Account not found. Please try again.');
          setSeverity('error');
          setFormErrors({
            ...formErrors,
            username: true
          });
          break;
        default:
          setOpen(true);
          setMessage(`Error: ${error.message}`);
          setSeverity('error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title> Sign in • memeSRC </title>
      </Helmet>
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
          control={<Checkbox name="remember" checked disabled />}
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
