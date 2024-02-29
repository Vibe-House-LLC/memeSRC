import { Button, Container, Dialog, DialogActions, DialogContent, DialogTitle, Divider, TextField, Typography } from '@mui/material';
import { Stack } from '@mui/system';
import PropTypes from 'prop-types';
import { useContext, useState } from 'react';
import { LoadingButton } from '@mui/lab';
import { API } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import useSearchDetailsV2 from '../../hooks/useSearchDetailsV2';
import { UserContext } from '../../UserContext';

export default function AddCidPopup({ open = false, setOpen = () => { } }) {
    const [cid, setCid] = useState('');
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();
    const { user } = useContext(UserContext)

    const { localCids, setLocalCids, savedCids, setSavedCids } = useSearchDetailsV2();

    const handleClose = () => {
        setCid('')
        setOpen(false)
    }

    const handleSaveCid = () => {
        setSaving(true)
        API.post('publicapi', '/user/update/saveMetadata', { body: { cid } }).then(response => {
            console.log('SAVED METADATA', response)
            setSavedCids([
                ...savedCids,
                { ...response }
            ])
            setSaving(false)
            handleClose();
        }).catch(err => {
            setSaving(false)
            console.log(err)
        })
    }

    const handleLogin = () => {
        handleClose();
        navigate('/login')
    }

    return (
        <Dialog
            open={open}
            onClose={() => {
                setOpen(false)
            }}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
            maxWidth='sm'
            fullWidth
        >
            {user ?
                <>
                    <DialogTitle id="alert-dialog-title">
                        <Typography fontSize={28} fontWeight={700}>
                            Add Custom CID
                        </Typography>
                        <Typography fontSize={14} fontWeight={400}>
                            Add a custom IPFS CID to search
                        </Typography>
                    </DialogTitle>
                    <DialogContent>
                        <Container maxWidth='lg'>
                            <Stack pt={2} spacing={2}>
                                <TextField
                                    disabled={saving}
                                    label='CID'
                                    value={cid}
                                    onChange={(event) => {
                                        setCid(event.target.value)
                                    }}
                                    fullWidth
                                />
                            </Stack>
                        </Container>
                    </DialogContent>
                    <DialogActions>
                        <Button disabled={saving} color='error' onClick={handleClose}>Cancel</Button>
                        <LoadingButton loading={saving} color='success' onClick={handleSaveCid}>
                            Save
                        </LoadingButton>
                    </DialogActions>
                </>
                :
                <>
                    <DialogTitle id="alert-dialog-title">
                        <Typography fontSize={28} fontWeight={700} textAlign='center'>
                            Please Login
                        </Typography>
                        <Divider sx={{ my: 2 }} />
                    </DialogTitle>
                        <Container maxWidth='lg' sx={{pb: 3}}>
                            
                        <Typography fontSize={20} fontWeight={400} textAlign='center'>
                            You must be logged in to add a CID.
                        </Typography>
                        </Container>
                    <DialogActions>
                        <Button disabled={saving} color='error' onClick={handleClose}>Close</Button>
                        <Button disabled={saving} color='success' onClick={handleLogin}>Login</Button>
                    </DialogActions>
                </>

            }

        </Dialog>
    )
}

AddCidPopup.propTypes = {
    open: PropTypes.bool
}