import { useNavigate } from 'react-router-dom';
// @mui
import { Stack, TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Auth } from 'aws-amplify';
import { useState } from 'react';
import PropTypes from 'prop-types';

// ----------------------------------------------------------------------

VerifyForm.propTypes = {
  username: PropTypes.string.isRequired
};

export default function VerifyForm(props) {
  const navigate = useNavigate();

  const [code, setCode] = useState(null)

  const confirmSignUp = async () => {
    try {
      await Auth.confirmSignUp(props.username, code);
      navigate('/dashboard', { replace: true });
    } catch (error) {
        console.log('error confirming sign up', error);
    }
  }

  return (
    <>
      <Stack spacing={3} marginBottom={3}>
        <TextField name="text" label="Verification Code" onInput={(x) => setCode(x.target.value)}/>
      </Stack>

      <LoadingButton fullWidth size="large" type="submit" variant="contained" onClick={confirmSignUp}>
        Verify
      </LoadingButton>
    </>
  );
}
