import { useNavigate } from 'react-router-dom';
// @mui
import { Backdrop, CircularProgress, Link, Stack, TextField, Typography } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Auth } from 'aws-amplify';
import { useContext, useState } from 'react';
import PropTypes from 'prop-types';
import { Check } from '@mui/icons-material';
import { UserContext } from '../../../UserContext';

// ----------------------------------------------------------------------

// VerifyForm.propTypes = {
//   username: PropTypes.string.isRequired
// };

export default function VerifyForm(props) {
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext)

  const [code, setCode] = useState('')
  const [username, setUsername] = useState(user.username ? user.username : '');
  const [email, setEmail] = useState(user.email ? user.email : '');
  const [loading, setLoading] = useState(false);
  const [backdropOpen, setBackdropOpen] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);

  const confirmSignUp = async () => {
    try {
      await Auth.confirmSignUp(username, code);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.log('error confirming sign up', error);
    }
  }

  const handleResendVerification = () => {
    setResendingCode('sending');
    setBackdropOpen(true)
    Auth.resendSignUp(username).then(() => {
      setResendingCode('sent');
      setTimeout(() => {
        setBackdropOpen(false);
      }, 1000)
    }).catch(err => console.log(err));
  }

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Verify Your Account
      </Typography>
      <Typography variant='body1' gutterBottom marginBottom={8}>
        Didn't receive your code? <Link sx={{ cursor: 'pointer' }} onClick={handleResendVerification}>Click here.</Link>
      </Typography>
      <Stack spacing={3} marginBottom={3}>
        <TextField
          name="text"
          label="Username"
          autoComplete='username'
          value={username}
          disabled={Boolean(user.username)}
          onChange={(event) => {
            setUsername(event.target.value)
          }}
        />
        {/* <TextField
          name="text"
          label="Email Address"
          value={email}
          disabled={Boolean(user.email)}
          onInput={(x) => setEmail(x.target.value)}
        /> */}
        <TextField
          name="text"
          label="Verification Code"
          value={code}
          onChange={(event) => {
            setCode(event.target.value)
          }}
        />
      </Stack>

      <LoadingButton fullWidth size="large" type="submit" variant="contained" onClick={confirmSignUp}>
        Verify
      </LoadingButton>

      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={backdropOpen}
      >
        <Stack alignItems='center' spacing={2}>
          {(resendingCode === 'sending') &&
            <>
              <CircularProgress color="inherit" />
              <Typography variant='h6'>
                Resending verification code...
              </Typography>
            </>
          }
          {(resendingCode === 'sent') &&
            <>
              <Check fontSize='large' color='success' />
              <Typography variant='h6'>
                Verification Code Resent Successfully!
              </Typography>
            </>
          }
        </Stack>
      </Backdrop>
    </>
  );
}
