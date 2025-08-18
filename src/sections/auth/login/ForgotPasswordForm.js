import { useNavigate } from 'react-router-dom';
import { Backdrop, CircularProgress, Link, Stack, TextField, Typography, styled } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { LoadingButton } from '@mui/lab';
import { Auth } from 'aws-amplify';
import { useContext, useState } from 'react';
import { UserContext } from '../../../UserContext';
import { SnackbarContext } from '../../../SnackbarContext';

const AutoFillTextField = styled(TextField)`
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active  {
    -webkit-box-shadow: 0 0 0 60px #192633 inset !important;
    background-color: #192633 !important;
    background-clip: content-box !important;
`;

export default function ResetPasswordForm() {
  const navigate = useNavigate();
  useContext(UserContext);
  const { setSeverity, setMessage, setOpen } = useContext(SnackbarContext);
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [backdropOpen] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleResetPassword = () => {
    setLoading(true)
    Auth.forgotPassword(username)
      .then(() => {
        setLoading(false);
        setSeverity('info');
        setMessage(`Verification code sent to ${username}. Please check your email.`);
        setOpen(true);
        setResetSent(true)
      })
      .catch(err => {
        setLoading(false);
        console.log(err);
        setSeverity('error');
        setMessage(`Error: ${err.message}`);
        setOpen(true);
      });
  }

  const handleResetPasswordSubmit = () => {
    setLoading(true)
    Auth.forgotPasswordSubmit(username, code, password)
      .then(() => {
        setLoading(false);
        setSeverity('success');
        setMessage(`Password reset successfully! Please log in with your new password.`);
        setOpen(true);
        navigate('/login', { replace: true });
      })
      .catch(err => {
        setLoading(false);
        console.log(err);
        setSeverity('error');
        setMessage(`Error: ${err.message}`);
        setOpen(true);
      });
  }

  return (
    <>
      <Helmet>
        <title> Reset Password • memeSRC </title>
      </Helmet>
      <Typography variant="h4" textAlign='center'>
        Reset memeSRC password
      </Typography>


      {!resetSent &&
        <>
          <Typography variant='subheading' mt={1} textAlign='center'>
            Enter your memeSRC username below to reset your password
          </Typography>
          <Link mb={5} sx={{ cursor: 'pointer', display: 'block', textAlign: 'center' }} onClick={() => { navigate('/forgotusername') }}>
            Forgot your username?
          </Link>
          <Stack spacing={3} marginBottom={3}>
            <AutoFillTextField
              name="text"
              label="Username"
              autoComplete='username'
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            <LoadingButton loading={loading} fullWidth size="large" type="submit" variant="contained" onClick={handleResetPassword}>
              Send Verification Code
            </LoadingButton>
          </Stack>
          <Link sx={{ cursor: 'pointer', display: 'block', textAlign: 'center', marginTop: '1rem' }} onClick={() => { setResetSent(true) }}>
            Already have a code? Click here.
          </Link>
        </>
      }

      {resetSent &&
        <>
          <Typography variant='subheading' mb={5} mt={1} textAlign='center'>
            Check your email for the code to enter below.
          </Typography>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleResetPasswordSubmit();
            return false
          }}>
            <Stack spacing={3} marginBottom={3}>
              <AutoFillTextField
                name="text"
                label="Username"
                autoComplete='username'
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
              <AutoFillTextField
                name="text"
                label="Verification Code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
              <AutoFillTextField
                name="text"
                label="New Password"
                type='password'
                autoComplete='new-password'
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <LoadingButton loading={loading} fullWidth size="large" type="submit" variant="contained" onClick={handleResetPasswordSubmit}>
                Reset Password
              </LoadingButton>
              <Link sx={{ cursor: 'pointer', display: 'block', textAlign: 'center', marginTop: '1rem' }} onClick={handleResetPassword}>
                Click here to resend code.
              </Link>
            </Stack>
          </form>
        </>
      }

      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={backdropOpen}
      >
        <Stack alignItems='center' spacing={2}>
          <CircularProgress color="inherit" />
          <Typography variant='h6'>
            Resending verification code...
          </Typography>
        </Stack>
      </Backdrop>
    </>
  );
}
