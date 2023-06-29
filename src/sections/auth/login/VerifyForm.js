import { useNavigate } from 'react-router-dom';
// @mui
import { Backdrop, CircularProgress, Link, Stack, TextField, Typography } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { API, Auth } from 'aws-amplify';
import { useContext, useState } from 'react';
import { UserContext } from '../../../UserContext';
import { SnackbarContext } from '../../../SnackbarContext';

// ----------------------------------------------------------------------

// VerifyForm.propTypes = {
//   username: PropTypes.string.isRequired
// };

export default function VerifyForm(props) {
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext)
  const { setSeverity, setMessage, setOpen } = useContext(SnackbarContext);
  const [code, setCode] = useState('')
  const [username, setUsername] = useState(user.username ? user.username : '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [backdropOpen, setBackdropOpen] = useState(false);
  const [formErrors, setFormErrors] = useState({
    username: false,
    password: false,
    code: false
  });

  const checkForm = () => {
    setFormErrors({
      username: (!username),
      password: (!password),
      code: (!code)
    })
    return !(!username || !password || !code)
  }

  const confirmSignUp = () => {
    if (checkForm()) {
      setLoading(true)
      // try {
      Auth.signIn(username, password).then(response => {
        console.log(response)
        setSeverity('success');
        setMessage(`Account already verified!`);
        setOpen(true)
        setUser(response)
        navigate('/', { replace: true });
        setLoading(false)
      }).catch(err => {
        console.log(err)
        if (err.name === 'UserNotConfirmedException') {
          Auth.confirmSignUp(username, code).then(response => {
            Auth.signIn(username, password).then(userSignedIn => {
              console.log(userSignedIn)
              API.post('publicapi', '/user/update/status').then(response => {
                console.log(response)
                setSeverity('success');
                setMessage(`Account Verified!`);
                setOpen(true)
                setUser(userSignedIn)
                navigate('/', { replace: true });
                setLoading(false)
              })
            }).catch(err => {
              if (err.name === 'InvalidPasswordException') {
                setSeverity('error');
                setMessage(`Invalid Password.`);
                setOpen(true)
                setFormErrors({
                  ...formErrors,
                  password: true
                })
              }
            })
          }).catch(err => {
            console.log(err)
            if (err.name === "NotAuthorizedException") {
              Auth.signIn(username, password).then(userSignedIn => {
                console.log(userSignedIn)
                setSeverity('success');
                setMessage(`Account already verified!`);
                setOpen(true)
                setUser(userSignedIn)
                navigate('/', { replace: true });
                setLoading(false)
              }).catch(err => console.log(err))
            } else if (err.name === "CodeMismatchException") {
              setSeverity('error');
              setMessage(err.message);
              setFormErrors({
                ...formErrors,
                code: true
              })
              setOpen(true)
              setLoading(false)
            }
          })
        }
      });
    } else {
      setSeverity('error');
      setMessage(`Please complete form to verify.`);
      setOpen(true)
    }
  }

  const handleResendVerification = () => {
    setBackdropOpen(true)
    Auth.resendSignUp(username).then(() => {
      setBackdropOpen(false)
    }).catch(error => {
      console.log(error);
      switch (error.name) {
        case 'TooManyRequestsException':
          setSeverity('error');
          setMessage(`Too many requests. Please try again later.`);
          setOpen(true)
          break;
        case 'NotAuthorizedException':
          setSeverity('error');
          setMessage(`Error: ${error.message}`);
          setOpen(true)
          break;
        case 'InternalErrorException':
          setSeverity('error');
          setMessage(`Error: ${error.message}`);
          setOpen(true)
          break;
        default:
          setSeverity('error');
          setMessage(`Error: ${error.message}`);
          setOpen(true)
      }
    });
  }

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Check your email
      </Typography>

      <Typography variant="body1" gutterBottom marginBottom={3}>
        We sent a verification code to your email
      </Typography>

      <Stack spacing={3} marginBottom={3}>
        <TextField
          name="text"
          label="Username"
          autoComplete='username'
          value={username}
          error={formErrors.username}
          disabled={Boolean(user.username)}
          onChange={(event) => {
            setUsername(event.target.value)
            setFormErrors({
              ...formErrors,
              username: false
            })
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              confirmSignUp();
            }
          }}
        />
        <TextField
          name="text"
          label="Password"
          autoComplete='Password'
          type='password'
          value={password}
          error={formErrors.password}
          onChange={(event) => {
            setPassword(event.target.value)
            setFormErrors({
              ...formErrors,
              password: false
            })
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              confirmSignUp();
            }
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
          error={formErrors.code}
          onChange={(event) => {
            setCode(event.target.value.replace(/[^0-9]/g, ''))
            setFormErrors({
              ...formErrors,
              code: false
            })
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              confirmSignUp();
            }
          }}
        />

      </Stack>



      <LoadingButton loading={loading} fullWidth size="large" type="submit" variant="contained" onClick={confirmSignUp}>
        Verify
      </LoadingButton>


      <Typography variant='caption' gutterBottom marginY={2} textAlign="center" sx={{ opacity: 0.8 }}>
        Never got it? <Link sx={{ cursor: 'pointer' }} onClick={handleResendVerification}>Resend</Link>
      </Typography>

      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={backdropOpen}
      >
        <Stack alignItems='center' spacing={2}>
          <>
            <CircularProgress color="inherit" />
            <Typography variant='h6'>
              Resending verification code...
            </Typography>
          </>
        </Stack>
      </Backdrop>
    </>
  );
}
