import { Button, Container, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { Stack } from '@mui/system';
import PropTypes from 'prop-types';
import { useState } from 'react';
import useSearchDetailsV2 from '../../hooks/useSearchDetailsV2';

export default function AddCidPopup({ open = false, setOpen = () => { } }) {
    const [title, setTitle] = useState('');
    const [cid, setCid] = useState('');

    const { localCids, setLocalCids } = useSearchDetailsV2();

    const handleClose = () => {
        setTitle('')
        setCid('')
        setOpen(false)
    }

    const handleSaveCid = () => {
        if (localCids && typeof localCids === 'object') {
            const newLocalCids = [
                ...localCids,
                {
                    title,
                    cid
                }
            ]

            localStorage.setItem('custom_cids', JSON.stringify(newLocalCids))
            setLocalCids(newLocalCids)
        } else {
            const newLocalCids = [
                {
                    title,
                    cid
                }
            ]

            localStorage.setItem('custom_cids', JSON.stringify(newLocalCids))
            setLocalCids(newLocalCids)
        }

        handleClose()
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
                            label='Series Title'
                            value={title}
                            onChange={(event) => {
                                setTitle(event.target.value)
                            }}
                            fullWidth
                        />
                        <TextField
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
                <Button color='error' onClick={handleClose}>Cancel</Button>
                <Button color='success' onClick={handleSaveCid}>
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    )
}

AddCidPopup.propTypes = {
    open: PropTypes.bool
}