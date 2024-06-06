// UserRow.js
import { useState } from 'react';
import { ListItem, ListItemText, IconButton, Menu, MenuItem, Chip, Divider } from '@mui/material';
import { MoreVert } from '@mui/icons-material';

const UserRow = ({ user, isLastItem }) => {
    const [anchorEl, setAnchorEl] = useState(null);

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    return (
        <>
            <ListItem>
                <ListItemText
                    primary={<><b>{user.username}</b> ({user.email}) {user.magicSubscription ? <Chip color='success' size='small' label='Pro Subscription' /> : ''}</>}
                    secondary={`Credits: ${user.credits || 0}`}
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
                <MenuItem onClick={handleMenuClose}>Option 1</MenuItem>
                <MenuItem onClick={handleMenuClose}>Option 2</MenuItem>
                <MenuItem onClick={handleMenuClose}>Option 3</MenuItem>
            </Menu>
        </>
    );
};

export default UserRow;