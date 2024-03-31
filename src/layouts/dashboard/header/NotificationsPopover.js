import PropTypes from 'prop-types';
import { set, sub } from 'date-fns';
import { noCase } from 'change-case';
import { useContext, useEffect, useState } from 'react';
// @mui
import {
  Box,
  List,
  Badge,
  Button,
  Avatar,
  Tooltip,
  Divider,
  Popover,
  Typography,
  IconButton,
  ListItemText,
  ListSubheader,
  ListItemAvatar,
  ListItemButton,
} from '@mui/material';
// utils
// import { API, graphqlOperation } from 'aws-amplify';
import { API } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import { fToNow } from '../../../utils/formatTime';
// components
import Iconify from '../../../components/iconify';
import Scrollbar from '../../../components/scrollbar';
import { UserContext } from '../../../UserContext';

// import { listGlobalMessages } from '../../../graphql/queries'

// ----------------------------------------------------------------------

// const NOTIFICATIONS = [
// ];

export default function NotificationsPopover() {
  const [notifications, setNotifications] = useState([]);

  const totalUnRead = notifications.filter((item) => item.isUnRead === true).length;

  const [open, setOpen] = useState(null);

  const { user, setUser } = useContext(UserContext);



  // async function pullNotifications() {  
  //   const response = await API.graphql(graphqlOperation(listGlobalMessages));
  //   const result = response.data.listGlobalMessages.items
  //   const notifications = result.map(item => (
  //     {
  //       id: item.id,
  //       title: item.title,
  //       description: item.message,
  //       avatar: null,
  //       type: 'example',
  //       createdAt: new Date(item.createdAt),
  //       isUnRead: true,
  //     }
  //   ))
  //   setNotifications(notifications);
  // }

  // pullNotifications();

  useEffect(() => {
    setNotifications(
      (user?.userDetails?.userNotifications?.items?.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))?.slice(0, 6)) || []
    );    
    console.log(user?.userDetails?.userNotifications?.items)
  }, [user])

  const handleOpen = (event) => {
    setOpen(event.currentTarget);
  };

  const handleClose = () => {
    setOpen(null);
  };

  const handleMarkAllAsRead = () => {
    setNotifications(
      notifications.map((notification) => ({
        ...notification,
        isUnRead: false,
      }))
    );
  };

  const handleMarkAsRead = (notification) => {
    // Find the index of the notification in the notifications array
    const index = notifications.findIndex(n => n.id === notification.id);

    if (index > -1) {
      // Copy the array for immutability
      const newNotifications = [...notifications];

      // Update the 'isUnRead' property of the specific notification to false
      newNotifications[index].isUnRead = false;

      // Set the updated notifications array
      setNotifications(newNotifications);
      setUser({
        ...user,
        userDetails:
        {
          ...user.userDetails,
          notifications: newNotifications
        },
      })

      if (notifications.filter((item) => item.isUnRead === true).length === 0){
        setOpen(false)
      }

      API.post('publicapi', '/user/update/notification/read', {
        body: {
          notificationId: notification.id
        }
      }).then((response) => console.log(response)).catch(error => {
        console.log(error);
        // Copy the array for immutability
        const newNotifications = [...notifications];

        // Update the 'isUnRead' property of the specific notification to false
        newNotifications[index].isUnRead = true;

        // Set the updated notifications array
        setNotifications(newNotifications);
        setUser({
          ...user,
          userDetails:
          {
            ...user.userDetails,
            notifications: newNotifications
          },
        })
      })
    }
  };

  const handleMarkAsUnRead = (notification) => {
    // Find the index of the notification in the notifications array
    const index = notifications.findIndex(n => n.id === notification.id);

    if (index > -1) {
      // Copy the array for immutability
      const newNotifications = [...notifications];

      // Update the 'isUnRead' property of the specific notification to false
      newNotifications[index].isUnRead = true;

      // Set the updated notifications array
      setNotifications(newNotifications);
      setUser({
        ...user,
        userDetails:
        {
          ...user.userDetails,
          notifications: newNotifications
        },
      })

      API.post('publicapi', '/user/update/notification/unread', {
        body: {
          notificationId: notification.id
        }
      }).then((response) => console.log(response)).catch(error => {
        console.log(error);
        // Copy the array for immutability
        const newNotifications = [...notifications];

        // Update the 'isUnRead' property of the specific notification to false
        newNotifications[index].isUnRead = true;

        // Set the updated notifications array
        setNotifications(newNotifications);
        setUser({
          ...user,
          userDetails:
          {
            ...user.userDetails,
            notifications: newNotifications
          },
        })
      })
    }
  };

  return (
    <>
      <IconButton color={open ? 'primary' : 'default'} onClick={handleOpen} sx={{ width: 40, height: 40 }}>
        <Badge badgeContent={totalUnRead} color="error">
          <Iconify icon="eva:bell-fill" />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(open)}
        anchorEl={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            mt: 1.5,
            ml: 0.75,
            width: 360,
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', py: 2, px: 2.5 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1">Notifications</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              You have {totalUnRead} unread messages
            </Typography>
          </Box>

          {/* {totalUnRead > 0 && (
            <Tooltip title=" Mark all as read">
              <IconButton color="primary" onClick={handleMarkAllAsRead}>
                <Iconify icon="eva:done-all-fill" />
              </IconButton>
            </Tooltip>
          )} */}
        </Box>



        {notifications?.length > 0 &&
          <>
            <Divider sx={{ borderStyle: 'dashed' }} />
            <Scrollbar sx={{ height: { xs: 340, sm: 'auto' } }}>
              <List
                disablePadding
                subheader={
                  <ListSubheader disableSticky sx={{ py: 1, px: 2.5, typography: 'overline' }}>
                    New
                  </ListSubheader>
                }
              >
                {notifications.filter(obj => obj.isUnRead === true).map((notification) => (
                  <NotificationItem readFunction={handleMarkAsRead} key={notification.id} notification={notification} />
                ))}
              </List>

              <List
                disablePadding
                subheader={
                  <ListSubheader disableSticky sx={{ py: 1, px: 2.5, typography: 'overline' }}>
                    Before that
                  </ListSubheader>
                }
              >
                {notifications.filter(obj => obj.isUnRead !== true).map((notification) => (
                  <NotificationItem unreadFunction={handleMarkAsUnRead} key={notification.id} notification={notification} />
                ))}
              </List>
            </Scrollbar>
          </>
        }

        {/* <Divider sx={{ borderStyle: 'dashed' }} /> */}

        <Box sx={{ p: 1 }}>
          {/* <Button fullWidth disableRipple>
            View All
          </Button> */}
        </Box>
      </Popover>
    </>
  );
}

// ----------------------------------------------------------------------

NotificationItem.propTypes = {
  notification: PropTypes.shape({
    createdAt: PropTypes.instanceOf(Date),
    id: PropTypes.string,
    isUnRead: PropTypes.bool,
    title: PropTypes.string,
    description: PropTypes.string,
    type: PropTypes.string,
    avatar: PropTypes.any,
    readFunction: PropTypes.func,
    unreadFunction: PropTypes.func,
  }),
};

function NotificationItem({ notification, readFunction, unreadFunction }) {
  const navigate = useNavigate();
  const { avatar, title } = renderContent(notification);

  return (
    <ListItemButton
      sx={{
        py: 1.5,
        px: 2.5,
        mt: '1px',
        ...(notification.isUnRead && {
          bgcolor: 'action.selected',
        }),
      }}
      onClick={() => {
        if (notification.isUnRead === false) {
          unreadFunction(notification)
        } else {
          readFunction(notification);
          if (notification.path) {
            navigate(notification.path)
          }
        }
      }}
    >
      <ListItemAvatar>
        <Avatar sx={{ bgcolor: 'background.neutral' }}>{avatar}</Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={title}
        secondary={
          <Typography
            variant="caption"
            sx={{
              mt: 0.5,
              display: 'flex',
              alignItems: 'center',
              color: 'text.disabled',
            }}
          >
            <Iconify icon="eva:clock-outline" sx={{ mr: 0.5, width: 16, height: 16 }} />
            {fToNow(notification.createdAt)}
          </Typography>
        }
      />
    </ListItemButton>
  );
}

// ----------------------------------------------------------------------

function renderContent(notification) {
  const title = (
    <Typography variant="subtitle2">
      {notification.title}
      <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
        &nbsp; {noCase(notification.description)}
      </Typography>
    </Typography>
  );

  if (notification.type === 'order_placed') {
    return {
      avatar: <img alt={notification.title} src="/assets/icons/ic_notification_package.svg" />,
      title,
    };
  }
  if (notification.type === 'order_shipped') {
    return {
      avatar: <img alt={notification.title} src="/assets/icons/ic_notification_shipping.svg" />,
      title,
    };
  }
  if (notification.type === 'mail') {
    return {
      avatar: <img alt={notification.title} src="/assets/icons/ic_notification_mail.svg" />,
      title,
    };
  }
  if (notification.type === 'chat_message') {
    return {
      avatar: <img alt={notification.title} src="/assets/icons/ic_notification_chat.svg" />,
      title,
    };
  }
  return {
    avatar: notification.avatar ? <img alt={notification.title} src={notification.avatar} /> : null,
    title,
  };
}
