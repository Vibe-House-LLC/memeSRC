import MuiAlert from '@mui/material/Alert';
import PropTypes from 'prop-types';
import { forwardRef, useContext, useEffect, useRef, useState } from 'react';
import { Box, Chip, Divider, Fab, Popover, Stack, Typography, css, useTheme } from '@mui/material';
import { AutoFixHighRounded, Close, SupervisedUserCircle, Verified } from '@mui/icons-material';
import { API } from 'aws-amplify';
import { LoadingButton } from '@mui/lab';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../UserContext';
import { MagicPopupContext } from '../../MagicPopupContext';
import { SnackbarContext } from '../../SnackbarContext';

const Alert = forwardRef((props, ref) =>
    <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />
);

MagicPopup.propTypes = {
    children: PropTypes.element
}

export default function MagicPopup({ children }) {
    const [magicToolsPopoverAnchorEl, setMagicToolsPopoverAnchorEl] = useState(null);
    const { user, setUser } = useContext(UserContext);
    const [earlyAccessLoading, setEarlyAccessLoading] = useState(false);
    const [earlyAccessComplete, setEarlyAccessComplete] = useState(false);
    const [earlyAccessDisabled, setEarlyAccessDisabled] = useState(false);
    const [loadingSubscriptionUrl, setLoadingSubscriptionUrl] = useState(false);
    const { setOpen, setMessage, setSeverity } = useContext(SnackbarContext)
    const navigate = useNavigate();
    const buttonRef = useRef(null);
    const theme = useTheme();

    const earlyAccessSubmit = () => {
        buttonRef.current.blur();
        setEarlyAccessLoading(true);
        console.log('submitting')
        API.get('publicapi', '/user/update/earlyAccess').then(response => {
            console.log(response)
            setEarlyAccessComplete(true);
            setEarlyAccessLoading(false);
            setEarlyAccessDisabled(true);
        }).catch(err => console.log(err))
    }

    const acceptInvitation = () => {
        setLoadingSubscriptionUrl(true)
        API.post('publicapi', '/user/update/acceptMagicInvitation').then(results => {
            console.log(results)
            setUser({ ...user, userDetails: { ...user.userDetails, earlyAccessStatus: 'accepted', credits: results.credits } })
            setLoadingSubscriptionUrl(false)
            setMessage(results.message);
            setSeverity('success');
            setOpen(true)
        }).catch(error => {
            console.log(error.response)
            setMessage(error.response.message);
            setSeverity('error');
            setOpen(true)
            setLoadingSubscriptionUrl(false)
        })
    }

    const buySubscription = () => {
        setLoadingSubscriptionUrl(true)
        API.post('publicapi', '/user/update/getCheckoutSession', {
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



    const cancelSubscription = () => {
        setLoadingSubscriptionUrl(true)
        API.post('publicapi', '/user/update/cancelSubscription').then(results => {
            console.log(results)
            setLoadingSubscriptionUrl(false)
            setMessage('Your subscription has been cancelled.')
            setSeverity('info')
            setOpen(true)
            setUser({ ...user, userDetails: { ...user.userDetails, magicSubscription: null } })
        }).catch(error => {
            console.log(error.response)
            setLoadingSubscriptionUrl(false)
            setMessage('Something went wrong.')
            setSeverity('error')
            setOpen(true)
        })
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
                    {user?.userDetails?.earlyAccessStatus === 'invited' && (
                        <>
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
                                        <li>
                                            Magic Eraser{' '}
                                            <Chip
                                                color="success"
                                                size="small"
                                                label="Early Access"
                                                sx={{ marginLeft: '5px', opacity: 0.7 }}
                                                variant="outlined"
                                            />
                                        </li>
                                        <li>
                                            Magic Fill{' '}
                                            <Chip
                                                color="success"
                                                size="small"
                                                label="Early Access"
                                                sx={{ marginLeft: '5px', opacity: 0.7 }}
                                                variant="outlined"
                                            />
                                        </li>
                                        <li>
                                            Magic Expander{' '}
                                            <Chip size="small" label="Planned" sx={{ marginLeft: '5px', opacity: 0.5 }} variant="outlined" />
                                        </li>
                                        <li>
                                            Magic Isolator{' '}
                                            <Chip size="small" label="Planned" sx={{ marginLeft: '5px', opacity: 0.5 }} variant="outlined" />
                                        </li>
                                    </ul>
                                </Typography>

                                <Stack direction="row" alignItems="center">
                                    <Verified sx={{ mr: 1 }} color="success" />
                                    <Typography variant="h5" sx={{ color: (theme) => theme.palette.success.main }}>
                                        You're Invited!
                                    </Typography>
                                </Stack>
                            </Stack>
                            <Typography variant="body1" textAlign="left" fontWeight={700} pt={1}>
                                You've been invited to the Early Access program to help us test new features as they're developed.
                            </Typography>
                        </>
                    )}

                    {/* --------------------- User has accepted early access -------------------- */}
                    {user?.userDetails?.earlyAccessStatus === 'accepted' && (
                        <Stack justifyContent="center" spacing={3}>
                            <Stack direction="row" color="#54d62c" alignItems="center" justifyContent="left" spacing={1}>
                                <AutoFixHighRounded fontSize="large" />
                                <Typography variant="h3">Magic Tools</Typography>
                            </Stack>

                            <Typography variant="h4">
                                You're in the Early Access program for a new suite of generative editing tools!
                            </Typography>

                            <Typography variant="subtitle1" fontWeight="bold" lineHeight={2} textAlign="left" px={2}>
                                <ul>
                                    <li>
                                        Magic Eraser{' '}
                                        <Chip
                                            color="success"
                                            size="small"
                                            label="Early Access"
                                            sx={{ marginLeft: '5px', opacity: 0.7 }}
                                            variant="outlined"
                                        />
                                    </li>
                                    <li>
                                        Magic Fill{' '}
                                        <Chip
                                            color="success"
                                            size="small"
                                            label="Early Access"
                                            sx={{ marginLeft: '5px', opacity: 0.7 }}
                                            variant="outlined"
                                        />
                                    </li>
                                    <li>
                                        Magic Expander{' '}
                                        <Chip size="small" label="Planned" sx={{ marginLeft: '5px', opacity: 0.5 }} variant="outlined" />
                                    </li>
                                    <li>
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
                    {(!user?.userDetails?.earlyAccessStatus || user?.userDetails?.earlyAccessStatus === 'requested') && (
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
                                    <li>
                                        Magic Eraser{' '}
                                        <Chip
                                            color="success"
                                            size="small"
                                            label="Early Access"
                                            sx={{ marginLeft: '5px', opacity: 0.7 }}
                                            variant="outlined"
                                        />
                                    </li>
                                    <li>
                                        Magic Fill{' '}
                                        <Chip
                                            color="success"
                                            size="small"
                                            label="Early Access"
                                            sx={{ marginLeft: '5px', opacity: 0.7 }}
                                            variant="outlined"
                                        />
                                    </li>
                                    <li>
                                        Magic Expander{' '}
                                        <Chip size="small" label="Planned" sx={{ marginLeft: '5px', opacity: 0.5 }} variant="outlined" />
                                    </li>
                                    <li>
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
                    )}
                </Box>
                <Box width="100%" px={2} pb={2} pt={1}>
                    {user?.userDetails?.earlyAccessStatus === 'accepted' ? (
                        <>
                            {user?.userDetails?.magicSubscription === 'true' ? (
                                <LoadingButton
                                    loading={loadingSubscriptionUrl}
                                    onClick={cancelSubscription}
                                    variant="contained"
                                    size="large"
                                    fullWidth
                                >
                                    Cancel Subscription
                                </LoadingButton>
                            ) : (
                                <>
                                    <LoadingButton
                                        loading={loadingSubscriptionUrl}
                                        onClick={buySubscription}
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
                                        Try Magic 69 <Chip size='small' sx={{ml: 1, backgroundColor: 'white', color: 'green'}} label="50% off" />
                                    </LoadingButton>
                                    <Typography
                                        variant="caption"
                                        display="block"
                                        gutterBottom
                                        align="center"
                                        sx={{ pt: 1, marginTop: 1, opacity: 0.8 }}
                                    >
                                        Get 69 credits/mo for <del>$6</del> $3. Cancel any time.
                                    </Typography>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            {user?.userDetails?.earlyAccessStatus === 'invited' ? (
                                <LoadingButton
                                    loading={loadingSubscriptionUrl}
                                    onClick={acceptInvitation}
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
                                    Accept Invitation
                                </LoadingButton>
                            ) : (
                                <LoadingButton
                                    onClick={(event) => {
                                        if (user) {
                                            earlyAccessSubmit();
                                        } else {
                                            navigate('/signup');
                                        }
                                    }}
                                    loading={earlyAccessLoading}
                                    disabled={
                                        user?.userDetails?.earlyAccessStatus ||
                                        earlyAccessLoading ||
                                        earlyAccessDisabled ||
                                        earlyAccessComplete
                                    }
                                    variant="contained"
                                    startIcon={<SupervisedUserCircle />}
                                    size="large"
                                    fullWidth
                                    sx={css`
                    font-size: 18px;
                    background-color: #54d62c;
                    color: black;

                    ${!(earlyAccessLoading || earlyAccessDisabled)
                                            ? `@media (hover: hover) and (pointer: fine) {
                          /* Apply hover style only on non-mobile devices */
                          &:hover {
                            background-color: #96f176;
                            color: black;
                          }
                        }`
                                            : ''}
                  `}
                                    onBlur={() => {
                                        // Blur the button when it loses focus
                                        buttonRef.current.blur();
                                    }}
                                    ref={buttonRef}
                                >
                                    {earlyAccessComplete ? (
                                        `You're on the list!`
                                    ) : (
                                        <>
                                            {user?.userDetails?.earlyAccessStatus && user?.userDetails?.earlyAccessStatus !== null
                                                ? `You're on the list!`
                                                : 'Request Access'}
                                        </>
                                    )}
                                </LoadingButton>
                            )}
                        </>
                    )}
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