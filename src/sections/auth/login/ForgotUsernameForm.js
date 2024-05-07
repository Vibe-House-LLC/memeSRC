import { useNavigate } from 'react-router-dom';
import { Backdrop, CircularProgress, Link, Stack, TextField, Typography, styled } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { API, Auth } from 'aws-amplify';
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

export default function ResetPasswordForm(props) {
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);
  const { setSeverity, setMessage, setOpen } = useContext(SnackbarContext);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [backdropOpen, setBackdropOpen] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // const handleResetPassword = () => {
  //   setLoading(true)
  //   alert("TODO...")
  //   // Auth.forgotPassword(username)
  //   //   .then(() => {
  //   //     setLoading(false);
  //   //     setSeverity('info');
  //   //     setMessage(`Verification code sent to ${email}. Please check your email.`);
  //   //     setOpen(true);
  //   //     setResetSent(true)
  //   //   })
  //   //   .catch(err => {
  //   //     setLoading(false);
  //   //     console.log(err);
  //   //     setSeverity('error');
  //   //     setMessage(`Error: ${err.message}`);
  //   //     setOpen(true);
  //   //   });
  // }

  const handleRecoverUsernameSubmit = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false);
      setResetSent(true);
    }, 2000);
    // Auth.forgotPasswordSubmit(username, code, password)
    //   .then(() => {
    //     setLoading(false);
    //     setSeverity('success');
    //     setMessage(`Password reset successfully! Please log in with your new password.`);
    //     setOpen(true);
    //     navigate('/login', { replace: true });
    //   })
    //   .catch(err => {
    //     setLoading(false);
    //     console.log(err);
    //     setSeverity('error');
    //     setMessage(`Error: ${err.message}`);
    //     setOpen(true);
    //   });
  }

  return (
    <>
      <Typography variant="h4" textAlign='center'>
        Username Recovery
      </Typography>

      {!resetSent &&
        <>
          <Typography variant='subheading' mb={5} mt={1} textAlign='center'>
            Enter your email and we'll send your username.
          </Typography>
          <Stack spacing={3} marginBottom={3}>
            <AutoFillTextField
              name="text"
              label="Email Address"
              autoComplete='email'
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <LoadingButton loading={loading} fullWidth size="large" type="submit" variant="contained" onClick={handleRecoverUsernameSubmit}>
              Send Username
            </LoadingButton>
          </Stack>
          <Link sx={{ cursor: 'pointer', display: 'block', textAlign: 'center', marginTop: '1rem' }} onClick={() => { navigate('/login') }}>
            Already know it? Log in here.
          </Link>
        </>
      }

      {resetSent &&
        <>
          <Typography variant='subheading' mb={5} mt={1} textAlign='center'>
            If you have an account, we emailed your username.
          </Typography>
          <LoadingButton fullWidth size="large" type="submit" variant="contained" onClick={() => navigate('/login')}>
              Back to login
            </LoadingButton>
          {/* <form onSubmit={(e) => {
            e.preventDefault();
            handleRecoverUsernameSubmit();
            return false
          }}>
            <Stack spacing={3} marginBottom={3}>
              <AutoFillTextField
                name="text"
                label="Email"
                autoComplete='email'
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
              <LoadingButton loading={loading} fullWidth size="large" type="submit" variant="contained" onClick={handleRecoverUsernameSubmit}>
                Reset Password
              </LoadingButton>
              <Link sx={{ cursor: 'pointer', display: 'block', textAlign: 'center', marginTop: '1rem' }} onClick={handleResetPassword}>
                Click here to resend code.
              </Link>
            </Stack>
          </form> */}
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
