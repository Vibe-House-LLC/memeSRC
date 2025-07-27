import { useNavigate } from 'react-router-dom';
import { Link, Stack, TextField, Typography, styled } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { API } from 'aws-amplify';
import { useContext, useState } from 'react';
import { SnackbarContext } from '../../../SnackbarContext';
import validateEmail from '../../../utils/validateEmail';

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
  const { setSeverity, setMessage, setOpen } = useContext(SnackbarContext);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [invalidEmail, setInvalidEmail] = useState(false);

  const handleRecoverUsernameSubmit = () => {
    if (validateEmail(email)) {
      setLoading(true)
      API.post('publicapi', '/forgotusername', { body: { email } }).then(() => {
        setLoading(false);
        setResetSent(true);
      }).catch(() => {
        setLoading(false);
        setResetSent(true);
        setSeverity('error');
        setMessage("Something went wrong. Please try again.");
        setOpen(true);
      })
    } else {
      setInvalidEmail(true)
    }
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
              name="email"
              label="Email Address"
              autoComplete='email'
              value={email}
              error={invalidEmail}
              helperText={invalidEmail ? 'Email invalid. Check for errors.' : null}
              onChange={(event) => {
                setEmail(event.target.value);
                setInvalidEmail(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleRecoverUsernameSubmit();
                }
              }}
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

    </>
  );
}
