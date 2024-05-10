import MuiAlert from '@mui/material/Alert';
import PropTypes from 'prop-types';
import { forwardRef, useContext, useEffect, useRef, useState } from 'react';
import { Box, Button, Chip, Divider, Fab, Popover, Stack, Typography, css, useTheme } from '@mui/material';
import { AutoFixHighRounded, Close, SupervisedUserCircle, Verified } from '@mui/icons-material';
import { API } from 'aws-amplify';
import { LoadingButton } from '@mui/lab';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserContext } from '../../UserContext';
import { MagicPopupContext } from '../../MagicPopupContext';
import { SnackbarContext } from '../../SnackbarContext';
import { useSubscribeDialog } from '../../contexts/useSubscribeDialog';

const Alert = forwardRef((props, ref) =>
    <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />
);

MagicPopup.propTypes = {
    children: PropTypes.element
}

export default function MagicPopup({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [magicToolsPopoverAnchorEl, setMagicToolsPopoverAnchorEl] = useState(null);
    const { user } = useContext(UserContext);
    const [loadingSubscriptionUrl, setLoadingSubscriptionUrl] = useState(false);
    const theme = useTheme();
    const { openSubscriptionDialog } = useSubscribeDialog();
    const magicPopupRef = useRef(null);

    useEffect(() => {
      if (
        location.pathname === '/pro' &&
        user !== null &&
        user.userDetails?.subscriptionStatus === 'active'
      ) {
        // console.log(user.userDetails);
        // Set the anchorEl to magicPopup if the element with ID 'magicPopup' exists
        const magicPopupElement = document.getElementById('magicChip');
        if (magicPopupElement) {
          setMagicToolsPopoverAnchorEl(magicPopupElement);
        } else {
          setMagicToolsPopoverAnchorEl(null);
        }
      }
    }, [user, location]);

    const logIntoCustomerPortal = () => {
        setLoadingSubscriptionUrl(true)
        API.post('publicapi', '/user/update/getPortalLink', {
            body: {
                currentUrl: window.location.href
            }
        }).then(results => {
            console.log(results)
            setLoadingSubscriptionUrl(false)
            window.location.href = results
        }).catch(error => {
            console.log(error.response)
            setLoadingSubscriptionUrl(false)
        })
    }

    const handleSubscribe = () => {
        openSubscriptionDialog();
        setMagicToolsPopoverAnchorEl();
    }

    return (
        <MagicPopupContext.Provider value={{ magicToolsPopoverAnchorEl, setMagicToolsPopoverAnchorEl }}>
            {children}
            <Popover
                open={Boolean(magicToolsPopoverAnchorEl)}
                anchorEl={magicToolsPopoverAnchorEl}
                onClose={() => {
                    setMagicToolsPopoverAnchorEl(null);
                }}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'center', // Change 'left' to 'center'
                }}
                transformOrigin={{
                    vertical: 'top', // Add this line to position the top corner at the bottom center
                    horizontal: 'center', // Add this line to position the top corner at the bottom center
                }}
                // This is how you can change the background of the popover
                PaperProps={{
                    sx: {
                        backgroundColor: 'black',
                        borderRadius: '15px',
                        padding: '7px',
                    },
                }}
            >
                <Fab
                    color="secondary"
                    aria-label="close"
                    onClick={() => setMagicToolsPopoverAnchorEl(null)}
                    sx={{
                        position: 'absolute',
                        top: theme.spacing(1),
                        right: theme.spacing(1),
                        backgroundColor: '#222',
                        '&:hover': {
                            backgroundColor: '#333',
                        },
                    }}
                >
                    <Close />
                </Fab>
                <Box
                    m={3}
                    mx={5}
                    sx={{
                        maxWidth: '400px',
                    }}
                >
                    {/* --------------------- User is invited to early access -------------------- */}
                    {user?.userDetails?.magicSubscription !== 'true' && (
                        <>
                            <Stack justifyContent="center" spacing={3}>
                                <Stack direction="row" color="#54d62c" alignItems="center" justifyContent="left" spacing={1}>
                                    <AutoFixHighRounded fontSize="large" />
                                    <Typography variant="h3">Magic Tools</Typography>
                                </Stack>

                                <Typography variant="h3">
                                   memeSRC Pro unlocks Early&nbsp;Access to new generative editing tools.
                                </Typography>

                                <Typography variant="subtitle1" fontWeight="bold" lineHeight={2} textAlign="left" px={2}>
                                    <ul>
                                        <li key="magic-eraser">
                                            Magic Eraser{' '}
                                            <Chip
                                                color="success"
                                                size="small"
                                                label="Early Access"
                                                sx={{ marginLeft: '5px', opacity: 0.7 }}
                                                variant="outlined"
                                            />
                                        </li>
                                        <li key="magic-fill">
                                            Magic Fill{' '}
                                            <Chip
                                                color="success"
                                                size="small"
                                                label="Early Access"
                                                sx={{ marginLeft: '5px', opacity: 0.7 }}
                                                variant="outlined"
                                            />
                                        </li>
                                        <li key="magic-expander">
                                            Magic Expander{' '}
                                            <Chip size="small" label="Planned" sx={{ marginLeft: '5px', opacity: 0.5 }} variant="outlined" />
                                        </li>
                                        <li key="magic-isolator">
                                            Magic Isolator{' '}
                                            <Chip size="small" label="Planned" sx={{ marginLeft: '5px', opacity: 0.5 }} variant="outlined" />
                                        </li>
                                    </ul>
                                </Typography>

                                {/* <Stack direction="row" alignItems="center">
                                    <Verified sx={{ mr: 1 }} color="success" />
                                    <Typography variant="h5" sx={{ color: (theme) => theme.palette.success.main }}>
                                        You're Invited!
                                    </Typography>
                                </Stack> */}
                            </Stack>
                            {/* <Typography variant="body1" textAlign="left" fontWeight={700} pt={1}>
                                You've been invited to the Early Access program to help us test new features as they're developed.
                            </Typography> */}
                        </>
                    )}

                    {/* --------------------- User has accepted early access -------------------- */}
                    {user?.userDetails?.magicSubscription === 'true' && (
                        <Stack justifyContent="center" spacing={3}>
                            <Stack direction="row" color="#54d62c" alignItems="center" justifyContent="left" spacing={1}>
                                <AutoFixHighRounded fontSize="large" />
                                <Typography variant="h3">Magic Tools</Typography>
                            </Stack>

                            <Typography variant="h4">
                                memeSRC Pro has unlocked Early&nbsp;Access to new generative editing tools!
                            </Typography>

                            <Typography variant="subtitle1" fontWeight="bold" lineHeight={2} textAlign="left" px={2}>
                                <ul>
                                    <li key="magic-eraser">
                                        Magic Eraser{' '}
                                        <Chip
                                            color="success"
                                            size="small"
                                            label="Early Access"
                                            sx={{ marginLeft: '5px', opacity: 0.7 }}
                                            variant="outlined"
                                        />
                                    </li>
                                    <li key="magic-fill">
                                        Magic Fill{' '}
                                        <Chip
                                            color="success"
                                            size="small"
                                            label="Early Access"
                                            sx={{ marginLeft: '5px', opacity: 0.7 }}
                                            variant="outlined"
                                        />
                                    </li>
                                    <li key="magic-expander">
                                        Magic Expander{' '}
                                        <Chip size="small" label="Planned" sx={{ marginLeft: '5px', opacity: 0.5 }} variant="outlined" />
                                    </li>
                                    <li key="magic-isolator">
                                        Magic Isolator{' '}
                                        <Chip size="small" label="Planned" sx={{ marginLeft: '5px', opacity: 0.5 }} variant="outlined" />
                                    </li>
                                </ul>
                            </Typography>
                            <Divider />
                            {user?.userDetails?.magicSubscription === 'true' ? (
                                <Typography variant="body1" component="span" fontWeight={800} fontSize={20} textAlign="center">
                                    You have{' '}
                                    <Typography
                                        variant="body1"
                                        component="span"
                                        fontWeight={800}
                                        fontSize={26}
                                        sx={{ color: (theme) => theme.palette.success.main }}
                                        textAlign="center"
                                    >
                                        {user?.userDetails?.credits}
                                    </Typography>{' '}
                                    credits
                                </Typography>
                            ) : (
                                <Typography variant="body1" component="span" fontWeight={800} fontSize={20} textAlign="center">
                                    You have{' '}
                                    <Typography
                                        variant="body1"
                                        component="span"
                                        fontWeight={800}
                                        fontSize={26}
                                        sx={{ color: (theme) => theme.palette.success.main }}
                                        textAlign="center"
                                    >
                                        {user?.userDetails?.credits}
                                    </Typography>{' '}
                                    free credits
                                </Typography>
                            )}
                        </Stack>
                    )}

                    {/* --------------------- User has done nothing about early access -------------------- */}
                    {/* {(!user?.userDetails?.earlyAccessStatus || user?.userDetails?.earlyAccessStatus === 'requested') && (
                        <Stack justifyContent="center" spacing={3}>
                            <Stack direction="row" color="#54d62c" alignItems="center" justifyContent="left" spacing={1}>
                                <AutoFixHighRounded fontSize="large" />
                                <Typography variant="h3">Magic Tools</Typography>
                            </Stack>

                            <Typography variant="h3">
                                A new suite of generative editing tools and features are coming soon!
                            </Typography>

                            <Typography variant="subtitle1" fontWeight="bold" lineHeight={2} textAlign="left" px={2}>
                                <ul>
                                    <li key="magic-eraser">
                                        Magic Eraser{' '}
                                        <Chip
                                            color="success"
                                            size="small"
                                            label="Early Access"
                                            sx={{ marginLeft: '5px', opacity: 0.7 }}
                                            variant="outlined"
                                        />
                                    </li>
                                    <li key="magic-fill">
                                        Magic Fill{' '}
                                        <Chip
                                            color="success"
                                            size="small"
                                            label="Early Access"
                                            sx={{ marginLeft: '5px', opacity: 0.7 }}
                                            variant="outlined"
                                        />
                                    </li>
                                    <li key="magic-expander">
                                        Magic Expander{' '}
                                        <Chip size="small" label="Planned" sx={{ marginLeft: '5px', opacity: 0.5 }} variant="outlined" />
                                    </li>
                                    <li key="magic-isolator">
                                        Magic Isolator{' '}
                                        <Chip size="small" label="Planned" sx={{ marginLeft: '5px', opacity: 0.5 }} variant="outlined" />
                                    </li>
                                </ul>
                            </Typography>
                            <Typography variant="body1">
                                {' '}
                                We're opening an Early Access program for users who would like to help us test these features as they're
                                developed.
                            </Typography>
                        </Stack>
                    )} */}
                </Box>
                <Box width="100%" px={2} pb={2} pt={1}>
                    <>
                        {user?.userDetails?.magicSubscription === 'true' ? (
                            // <Button
                            //     loading={loadingSubscriptionUrl}
                            //     onClick={() => { navigate('/manageSubscription'); setMagicToolsPopoverAnchorEl(); }}
                            //     variant="contained"
                            //     size="large"
                            //     fullWidth
                            // >
                            //     Manage Subscription
                            // </Button>
                            <LoadingButton
                                loading={loadingSubscriptionUrl}
                                onClick={logIntoCustomerPortal}
                                variant="contained"
                                size="large"
                                fullWidth
                            >
                                Manage Subscription
                            </LoadingButton>
                        ) : (
                            <>
                                <LoadingButton
                                    onClick={handleSubscribe}
                                    variant="contained"
                                    size="large"
                                    fullWidth
                                    sx={{
                                        backgroundColor: (theme) => theme.palette.success.main,
                                        color: (theme) => theme.palette.common.black,
                                        '&:hover': {
                                            ...(!loadingSubscriptionUrl && {
                                                backgroundColor: (theme) => theme.palette.success.dark,
                                                color: (theme) => theme.palette.common.black,
                                            }),
                                        },
                                    }}
                                >
                                    Get memeSRC Pro 
                                    {/* <Chip size='small' sx={{ ml: 1, backgroundColor: 'white', color: 'green' }} label="30% off" /> */}
                                </LoadingButton>
                                {/* <Typography
                                    variant="caption"
                                    display="block"
                                    gutterBottom
                                    align="center"
                                    sx={{ pt: 1, marginTop: 1, opacity: 0.8 }}
                                >
                                    69 credits/mo for <del>$6.00</del> $4.20. Cancel any time.
                                </Typography> */}
                            </>
                        )}
                    </>

                    {/* <Typography
              variant="caption"
              align="center"
              sx={{ display: 'block', marginTop: theme.spacing(1), cursor: 'pointer', color: '#999' }}
              onClick={() => setAnchorEl(null)}
            >
              Dismiss
            </Typography> */}
                </Box>
            </Popover>
        </MagicPopupContext.Provider>
    );
}