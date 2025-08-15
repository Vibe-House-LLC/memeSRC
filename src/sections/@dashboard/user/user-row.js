// UserRow.js
import { useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { ListItem, ListItemText, IconButton, Menu, MenuItem, Chip, Divider, Typography, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';
import { MoreVert } from '@mui/icons-material';
import { API, Auth, graphqlOperation } from 'aws-amplify';
import { LoadingButton } from '@mui/lab';
import { updateUserDetails } from '../../../graphql/mutations';
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
    const [settingStatus, setSettingStatus] = useState(false);
    const [status, setStatus] = useState(user?.status || 'unverified');

    useEffect(() => {
        console.log('User Row User')
        console.log(user)
    }, [user]);

    async function disableUser() {
        setSettingStatus(true)
        const apiName = 'AdminQueries';
        const path = '/disableUser';
        const myInit = {
            body: {
                "username": user?.username
            },
            headers: {
                'Content-Type': 'application/json',
                Authorization: `${(await Auth.currentSession()).getAccessToken().getJwtToken()}`
            }
        }
        const disableUserResponse = await API.post(apiName, path, myInit);
        console.log('disableUserResponse')
        console.log(disableUserResponse)

        const disableUserGraphQL = await API.graphql(
            graphqlOperation(updateUserDetails, { input: { id: user.id, status: 'disabled' } })
        )
        console.log('disableUserGraphQL')
        console.log(disableUserGraphQL)
        setStatus('disabled')
        setMessage(`${user.username} has been disabled.`)
        setSeverity('success');
        setOpen(true)
        handleMenuClose();
        setSettingStatus(false)
    }

    async function enableUser() {
        setSettingStatus(true)
        const apiName = 'AdminQueries';
        const path = '/enableUser';
        const myInit = {
            body: {
                "username": user?.username
            },
            headers: {
                'Content-Type': 'application/json',
                Authorization: `${(await Auth.currentSession()).getAccessToken().getJwtToken()}`
            }
        }
        const disableUserResponse = await API.post(apiName, path, myInit);
        console.log('disableUserResponse')
        console.log(disableUserResponse)

        const disableUserGraphQL = await API.graphql(
            graphqlOperation(updateUserDetails, { input: { id: user.id, status: 'verified' } })
        )
        console.log('disableUserGraphQL')
        console.log(disableUserGraphQL)
        setStatus('verified')
        setMessage(`${user.username} has been enabled.`)
        setSeverity('success');
        setOpen(true)
        handleMenuClose();
        setSettingStatus(false)
    }

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

    const getStatusChipProps = (status) => {
        switch (status) {
            case 'verified':
                return { color: 'success', label: 'Account Verified' };
            case 'disabled':
                return { color: 'error', label: 'Account Disabled' };
            case 'unverified':
            default:
                return { color: 'warning', label: 'Account Unverified' };
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
                    primary={<><b>{user.username}</b><br /> <Chip {...getStatusChipProps(status)} size='small' variant='outlined' /> {user.magicSubscription ? <><Chip color='success' size='small' label='Pro' /></> : ''} <br />{user.email}<br /> User since: {user.createdAt ? new Date(user.createdAt).toLocaleString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric',
                    }) : ''}</>}
                    secondary={<>{contributor === 'approved' ? <><Typography sx={{ color: theme => theme.palette.success.main }} component='span'>Contributor</Typography><br /></> : contributor === 'requested' ? <><Typography sx={{ color: theme => theme.palette.warning.main }} component='span'>Requested To Be A Contributor</Typography><br /></> : ''} Credits: {credits || 0}</>}
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
                {status === 'disabled' && <MenuItem color='success' disabled={settingStatus} sx={{ color: settingStatus ? 'inherit' : 'green'}} onClick={() => enableUser()}>{settingStatus ? <CircularProgress size={16} sx={{ ml: 1 }} /> : 'Enable User'}</MenuItem>}
                {status === 'verified' && <MenuItem color='error' sx={{ color: settingStatus ? 'inherit' : 'red'}} disabled={settingStatus} onClick={() => disableUser()}>{settingStatus ? <CircularProgress size={16} sx={{ ml: 1 }} /> : 'Disable User'}</MenuItem>}
            </Menu>

            <Dialog open={openGiveCreditsDialog} onClose={updatingCredits ? () => { } : handleCloseGiveCreditsDialog} maxWidth='xs' fullWidth>
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

UserRow.propTypes = {
    user: PropTypes.shape({
        id: PropTypes.string,
        username: PropTypes.string,
        email: PropTypes.string,
        createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
        magicSubscription: PropTypes.any,
        contributorAccessStatus: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
        credits: PropTypes.number,
        status: PropTypes.string,
    }),
    isLastItem: PropTypes.bool,
};
