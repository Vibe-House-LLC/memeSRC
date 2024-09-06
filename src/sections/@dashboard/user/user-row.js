// UserRow.js
import { useContext, useState } from 'react';
import { ListItem, ListItemText, IconButton, Menu, MenuItem, Chip, Divider, Typography, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';
import { MoreVert } from '@mui/icons-material';
import { API, Auth, graphqlOperation } from 'aws-amplify';
import { LoadingButton } from '@mui/lab';
import { createUserNotification, updateUserDetails } from '../../../graphql/mutations';
import { SnackbarContext } from '../../../SnackbarContext';

const UserRow = ({ user, isLastItem }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const { setOpen, setMessage, setSeverity } = useContext(SnackbarContext)
    const [contributor, setContributor] = useState(user?.contributorAccessStatus || false);
    const [makingContributor, setMakingContributor] = useState();
    const [openGiveCreditsDialog, setOpenGiveCreditsDialog] = useState(false);
    const [credits, setCredits] = useState(user?.credits || 0);
    const [updatedCredits, setUpdatedCredits] = useState(user?.credits || 0);
    const [updatingCredits, setUpdatingCredits] = useState(false);

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleOpenGiveCredits = () => {
        handleMenuClose();
        setOpenGiveCreditsDialog(true);
    };

    const handleCloseGiveCreditsDialog = () => {
        setOpenGiveCreditsDialog(false);
        setUpdatedCredits(credits || 0);
    };

    const handleCreditsToGiveChange = (event) => {
        setUpdatedCredits(parseInt(event.target.value, 10));
    };

    const handleUpdateCredits = async () => {
        setUpdatingCredits(true)
        try {
            await API.graphql(
                graphqlOperation(updateUserDetails, { input: { id: user.id, credits: updatedCredits } })
            );
            setMessage(`${user.username}'s new credit amount is ${updatedCredits}`)
            setSeverity('success');
            setOpen(true)
            setCredits(updatedCredits)
            setOpenGiveCreditsDialog(false);
            setUpdatingCredits(false)
        } catch (error) {
            console.error('Something went wrong.')
            setMessage('Something went wrong.')
            setSeverity('error');
            setOpen(true)
            setUpdatingCredits(false)
        }
    };

    const makeContributor = async () => {
        setMakingContributor(true)
        const apiName = 'AdminQueries';
        const path = '/addUserToGroup';
        const myInit = {
            body: {
                "username": user.username,
                "groupname": "contributors"
            },
            headers: {
                'Content-Type': 'application/json',
                Authorization: `${(await Auth.currentSession()).getAccessToken().getJwtToken()}`
            }
        }
        try {
            await API.post(apiName, path, myInit);
            await API.graphql(
                graphqlOperation(updateUserDetails, { input: { id: user.id, contributorAccessStatus: 'approved' } })
            )
            setContributor('approved')
            setMessage(`${user.username} has been made a contributor!`)
            setSeverity('success');
            setOpen(true)
            setMakingContributor(false)
            handleMenuClose();
        } catch {
            console.error('Something went wrong.')
            setMessage('Something went wrong.')
            setSeverity('error');
            setOpen(true)
            setMakingContributor(false)
        }
    }

    return (
        <>
            <ListItem>
                <ListItemText
                    primary={<><b>{user.username}</b> {user.magicSubscription ? <Chip color='success' size='small' label='Pro Subscription' /> : ''} <br />({user.email}) </>}
                    secondary={<>{contributor === 'approved' ? <><Typography sx={{ color: theme => theme.palette.success.main }} component='span'>Contributor</Typography><br /></> : ''} Credits: {credits || 0}</>}
                />
                <IconButton
                    aria-label="more"
                    aria-controls="user-menu"
                    aria-haspopup="true"
                    onClick={handleMenuOpen}
                >
                    <MoreVert />
                </IconButton>
            </ListItem>
            {!isLastItem && <Divider />}
            <Menu
                id="user-menu"
                anchorEl={anchorEl}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem disabled={makingContributor || updatingCredits} onClick={makeContributor}>Make Contributor {makingContributor && <CircularProgress size={16} sx={{ ml: 1 }} />} </MenuItem>
                <MenuItem disabled={makingContributor || updatingCredits} onClick={handleOpenGiveCredits}>Update Credits</MenuItem>
            </Menu>

            <Dialog open={openGiveCreditsDialog} onClose={updatingCredits ? () => {} : handleCloseGiveCreditsDialog} maxWidth='xs' fullWidth>
                <DialogTitle>Update {user.username}'s Credits</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Credits"
                        type="number"
                        fullWidth
                        value={updatedCredits}
                        onChange={handleCreditsToGiveChange}
                    />
                    <Typography variant="body2" color="textSecondary" sx>
                        Existing Credits: {credits || 0}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button disabled={updatingCredits} onClick={handleCloseGiveCreditsDialog} color="primary">
                        Cancel
                    </Button>
                    <LoadingButton loading={updatingCredits} onClick={handleUpdateCredits} color="success">
                        Update Credits
                    </LoadingButton>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default UserRow;
