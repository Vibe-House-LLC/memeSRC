import { useNavigate } from 'react-router-dom';
import { Backdrop, CircularProgress, Link, Stack, TextField, Typography } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { API, Auth } from 'aws-amplify';
import { useContext, useState } from 'react';
import { UserContext } from '../../../UserContext';
import { SnackbarContext } from '../../../SnackbarContext';

export default function ResetPasswordForm(props) {
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);
  const { setSeverity, setMessage, setOpen } = useContext(SnackbarContext);
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [backdropOpen, setBackdropOpen] = useState(false);

  const handleResetPassword = () => {
    setLoading(true)
    Auth.forgotPassword(username)
      .then(() => {
        setLoading(false);
        setSeverity('info');
        setMessage(`Verification code sent to ${username}. Please check your email.`);
        setOpen(true);
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
      <Typography variant="h4" gutterBottom>
        Reset Your Password
      </Typography>
      <Stack spacing={3} marginBottom={3}>
        <TextField
          name="text"
          label="Username"
          autoComplete='username'
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
        <TextField
          name="text"
          label="Verification Code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        <TextField
          name="text"
          label="New Password"
          type='password'
          autoComplete='new-password'
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Stack>
      <LoadingButton loading={loading} fullWidth size="large" type="submit" variant="contained" onClick={handleResetPasswordSubmit}>
        Reset Password
      </LoadingButton>
      <Link sx={{ cursor: 'pointer', display: 'block', textAlign: 'center', marginTop: '1rem' }} onClick={handleResetPassword}>
        Send Verification Code
      </Link>

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
