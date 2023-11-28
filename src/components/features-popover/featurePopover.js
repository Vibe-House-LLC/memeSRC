import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, FormControlLabel, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const listItemStyling = { position: 'relative', pl: '20px', '&::before': { content: '"•"', position: 'absolute', left: 0 } }

export default function FeaturePopover({ children }) {
    const [open, setOpen] = useState(false);
    const [showAgain, setShowAgain] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const [path, setPath] = useState();

    const handleClose = async (pathToSet) => {
        setOpen(false)
        setPath(pathToSet)
    }

    useEffect(() => {
        if (!open && path) {
            if (!showAgain) {
                // The user did not choose "Don't show me this again"
                try {
                    sessionStorage.setItem('disableFeaturePopover', true);
                    navigate(path)
                    console.log(open)
                } catch (err) {
                    console.log(err)
                }
            } else {
                // The user chose "Don't show me this again"
                try {
                    localStorage.setItem('disableFeaturePopover', true);
                    navigate(path)
                    console.log(open)
                } catch (err) {
                    console.log(err)
                }
            }
        }
    }, [open, path]);

    useEffect(() => {
        if (!localStorage.getItem('disableFeaturePopover') && location.pathname === '/') {
            console.log('ITS OPENING')
            setOpen(true)
        }
    }, [location]);



    // useEffect(() => {

    //     // Check to see if they've closed the dialog yet
    //     if (!(localStorage.getItem('disableFeaturePopover') || sessionStorage.getItem('disableFeaturePopover') && !open)) {
    //         setOpen(true)
    //     }

    // }, []);



    return (
        <>
            {children}
            <Dialog
                open={open}
                onClose={handleClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                    }
                }}
            >
                <DialogTitle id="alert-dialog-title">
                    <Typography fontSize={32}>
                        <b>memeSRC 2.0</b> - New Features
                    </Typography>
                </DialogTitle>
                <Divider />
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        <Stack direction='row' spacing={1} alignItems='center'>
                            <Typography variant="h4">Magic Tools</Typography>
                            <Button
                                size='small'
                                variant='contained'
                                color='success'
                                sx={{
                                    backgroundColor: (theme) => theme.palette.success.main,
                                    color: (theme) => theme.palette.common.black,
                                    '&:hover': {
                                        backgroundColor: (theme) => theme.palette.success.dark,
                                        color: (theme) => theme.palette.common.black
                                    },
                                }}
                                onClick={() => {
                                    handleClose('/editor/seinfeld43-8-5-926?magicTools=true');
                                }}
                            >
                                Try Now
                            </Button>
                        </Stack>
                        <List dense disablePadding>
                            <ListItem sx={{ ...listItemStyling }}>
                                <ListItemText primary={<b>Magic Eraser</b>} secondary='Remove objects and subjects from photos' />
                            </ListItem>
                            <ListItem sx={{ ...listItemStyling }}>
                                <ListItemText primary={<b>Magic Fill</b>} secondary="Replace sections of an image using prompt-based AI generation" />
                            </ListItem>
                        </List>

                        <Stack direction='row' mt={3} spacing={1} alignItems='center'>
                            <Typography variant="h4">Uploads</Typography>
                            <Button
                                size='small'
                                variant='contained'
                                color='success'
                                sx={{
                                    backgroundColor: (theme) => theme.palette.success.main,
                                    color: (theme) => theme.palette.common.black,
                                    '&:hover': {
                                        backgroundColor: (theme) => theme.palette.success.dark,
                                        color: (theme) => theme.palette.common.black
                                    },
                                }}
                                onClick={() => {
                                    handleClose('/edit');
                                }}
                            >
                                Try Now
                            </Button>
                        </Stack>
                        <List dense disablePadding>
                            <ListItem sx={{ ...listItemStyling }}>
                                <ListItemText primary="Upload your own photos into our editor to add text and use Magic Tools" />
                            </ListItem>
                        </List>

                        <Stack direction='row' mt={3} spacing={1} alignItems='center'>
                            <Typography variant="h4">Voting</Typography>
                            <Button
                                size='small'
                                variant='contained'
                                color='success'
                                sx={{
                                    backgroundColor: (theme) => theme.palette.success.main,
                                    color: (theme) => theme.palette.common.black,
                                    '&:hover': {
                                        backgroundColor: (theme) => theme.palette.success.dark,
                                        color: (theme) => theme.palette.common.black
                                    },
                                }}
                                onClick={() => {
                                    handleClose('/vote');
                                }}
                            >
                                Try Now
                            </Button>
                        </Stack>
                        <List dense disablePadding>
                            <ListItem sx={{ ...listItemStyling }}>
                                <ListItemText primary="Submit shows and movies you would like to see on memeSRC" />
                            </ListItem>
                            <ListItem sx={{ ...listItemStyling }}>
                                <ListItemText primary="Vote on shows and movies to encourage content submission" />
                            </ListItem>
                        </List>

                        <Typography variant="body1" fontWeight={700} mt={4}>
                            We've also worked behind the scenes to make searching and editing images much faster.
                        </Typography>
                    </DialogContentText>
                </DialogContent>
                <Divider />
                <DialogActions
                    sx={{
                        p: 2
                    }}
                >
                    <Stack direction='row' spacing={2} alignItems='center'>
                        <FormControlLabel control={<Checkbox checked={showAgain} onChange={(event) => { setShowAgain(event.target.checked) }} />} label={`Don't show again`} labelPlacement='start' />
                        <Button variant='contained' color='error' onClick={handleClose}>
                            Close
                        </Button>
                    </Stack>
                </DialogActions>
            </Dialog>
        </>
    )
}

FeaturePopover.propTypes = {
    children: PropTypes.node
}