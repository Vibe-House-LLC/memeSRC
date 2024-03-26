import { Close } from '@mui/icons-material';
import { Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Fade, Grid, IconButton, LinearProgress, Typography, useMediaQuery } from '@mui/material';
import { API } from 'aws-amplify';
import { createContext, useState } from 'react';

export const DialogContext = createContext();

export const DialogProvider = ({ children }) => {
    const isMd = useMediaQuery(theme => theme.breakpoints.up('md'));
    const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(true);
    const [loading, setLoading] = useState(false);

    const openDialog = (content) => {
        setSubscriptionDialogOpen(true);
    };

    const closeDialog = () => {
        setSubscriptionDialogOpen(false);
    };

    const buySubscription = (priceKey) => {
        setLoading(true)
        API.post('publicapi', '/user/update/getCheckoutSession', {
            body: {
                currentUrl: window.location.href,
                priceKey
            }
        }).then(results => {
            console.log(results)
            window.location.href = results
        }).catch(error => {
            console.log(error.response)
            setLoading(false)
        })
    }

    return (
        <DialogContext.Provider value={{ subscriptionDialogOpen, setSubscriptionDialogOpen }}>
            {children}
            <Dialog
                open={subscriptionDialogOpen}
                onClose={closeDialog}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
                maxWidth='md'
                fullWidth
                scroll='paper'
                PaperProps={{
                    sx: {
                        borderRadius: 5,
                        backgroundColor: theme => theme.palette.common.black
                    }
                }}
            >
                <DialogTitle id="alert-dialog-title" sx={{ position: 'relative' }}>
                    <Typography fontSize={isMd ? 30 : 20} textAlign={isMd ? 'center' : 'left'} fontWeight={700}>
                        Subscribe to memeSRC Pro
                    </Typography>
                    <IconButton onClick={closeDialog} size='large' sx={{ position: 'absolute', top: isMd ? 15 : 8, right: 10 }}>
                        <Close />
                    </IconButton>
                </DialogTitle>
                <Divider />
                {!loading &&
                    <Fade in timeout={400}>
                        <DialogContent sx={{ mb: 5, minHeight: 500 }}>
                            <Typography fontSize={22} textAlign='center' py={3}>
                                Choose Your Plan
                            </Typography>
                            <Grid container spacing={isMd ? 2 : 8} alignItems={isMd ? 'stretch' : false}>
                                <Grid item xs={12} md={4}>
                                    <Box
                                        sx={{
                                            height: '100%',
                                            width: '100%',
                                            p: 1,
                                            transition: 'padding 0.2s ease-in-out',
                                            cursor: 'pointer',
                                            '&:hover': {
                                                p: 0
                                            }
                                        }}
                                    >
                                        <Card onClick={() => { buySubscription('pro5') }} variant='outlined' sx={{ borderRadius: 5, m: 2, height: '100%' }}>
                                            <Box
                                                sx={{
                                                    height: 20,
                                                    width: '100%',
                                                    backgroundColor: theme => theme.palette.warning.main
                                                }}
                                            />
                                            <Box sx={{ p: 2 }}>
                                                <Typography fontSize={30} fontWeight={700} textAlign='center' mb={2}>
                                                    Pro 5
                                                </Typography>
                                                <Divider />
                                                <Typography fontSize={70} fontWeight={700} textAlign='center' sx={{ color: theme => theme.palette.common.white, '& sup': { fontSize: 30 }, }} mt={2} lineHeight={1}>
                                                    $2<sup>99</sup>
                                                </Typography>
                                                <Typography fontSize={14} fontWeight={400} textAlign='center' mb={2} sx={{ color: theme => theme.palette.text.disabled }}>
                                                    Billed Monthly
                                                </Typography>
                                                <Divider />
                                                <Typography fontSize={20} fontWeight={400} textAlign='center' mt={2}>
                                                    No Ads
                                                </Typography>
                                                <Typography fontSize={20} fontWeight={400} textAlign='center' mt={1}>
                                                    <b>5</b> Credits Per Month
                                                </Typography>
                                                <Typography fontSize={20} fontWeight={400} textAlign='center' mt={1}>
                                                    Pro Support
                                                </Typography>
                                            </Box>
                                        </Card>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Box
                                        sx={{
                                            height: '100%',
                                            width: '100%',
                                            p: 1,
                                            transition: 'padding 0.2s ease-in-out',
                                            cursor: 'pointer',
                                            '&:hover': {
                                                p: 0
                                            }
                                        }}
                                    >
                                        <Card onClick={() => { buySubscription('pro25') }} variant='outlined' sx={{ borderRadius: 5, m: 2, height: '100%' }}>
                                            <Box
                                                sx={{
                                                    height: 20,
                                                    width: '100%',
                                                    backgroundColor: theme => theme.palette.info.main
                                                }}
                                            />
                                            <Box sx={{ p: 2 }}>
                                                <Typography fontSize={30} fontWeight={700} textAlign='center' mb={2}>
                                                    Pro 25
                                                </Typography>
                                                <Divider />
                                                <Typography fontSize={70} fontWeight={700} textAlign='center' sx={{ color: theme => theme.palette.common.white, '& sup': { fontSize: 30 }, }} mt={2} lineHeight={1}>
                                                    $4<sup>99</sup>
                                                </Typography>
                                                <Typography fontSize={14} fontWeight={400} textAlign='center' mb={2} sx={{ color: theme => theme.palette.text.disabled }}>
                                                    Billed Monthly
                                                </Typography>
                                                <Divider />
                                                <Typography fontSize={20} fontWeight={400} textAlign='center' mt={2}>
                                                    No Ads
                                                </Typography>
                                                <Typography fontSize={20} fontWeight={400} textAlign='center' mt={1}>
                                                    <b>25</b> Credits Per Month
                                                </Typography>
                                                <Typography fontSize={20} fontWeight={400} textAlign='center' mt={1}>
                                                    Pro Support
                                                </Typography>
                                            </Box>
                                        </Card>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Box
                                        sx={{
                                            height: '100%',
                                            width: '100%',
                                            p: 1,
                                            transition: 'padding 0.2s ease-in-out',
                                            cursor: 'pointer',
                                            '&:hover': {
                                                p: 0
                                            }
                                        }}
                                    >
                                        <Card onClick={() => { buySubscription('pro69') }} variant='outlined' sx={{ borderRadius: 5, m: 2, height: '100%' }}>
                                            <Box
                                                sx={{
                                                    height: 20,
                                                    width: '100%',
                                                    backgroundColor: theme => theme.palette.error.main
                                                }}
                                            />
                                            <Box sx={{ p: 2 }}>
                                                <Typography fontSize={30} fontWeight={700} textAlign='center' mb={2}>
                                                    Pro 69
                                                </Typography>
                                                <Divider />
                                                <Typography fontSize={70} fontWeight={700} textAlign='center' sx={{ color: theme => theme.palette.common.white, '& sup': { fontSize: 30 }, }} mt={2} lineHeight={1}>
                                                    $6<sup>99</sup>
                                                </Typography>
                                                <Typography fontSize={14} fontWeight={400} textAlign='center' mb={2} sx={{ color: theme => theme.palette.text.disabled }}>
                                                    Billed Monthly
                                                </Typography>
                                                <Divider />
                                                <Typography fontSize={20} fontWeight={400} textAlign='center' mt={2}>
                                                    No Ads
                                                </Typography>
                                                <Typography fontSize={20} fontWeight={400} textAlign='center' mt={1}>
                                                    <b>69</b> Credits Per Month
                                                </Typography>
                                                <Typography fontSize={20} fontWeight={400} textAlign='center' mt={1}>
                                                    Pro Support
                                                </Typography>
                                            </Box>
                                        </Card>
                                    </Box>
                                </Grid>
                            </Grid>
                        </DialogContent>
                    </Fade>
                }
                {loading &&
                    <DialogContent sx={{ minHeight: 500, display: 'flex', mb: 5 }}>
                        <Box sx={{ m: 'auto' }}>
                            <Typography fontSize={30} fontWeight={700} textAlign='center' mb={7}>
                                One moment while we prepare your cart...
                            </Typography>
                            <LinearProgress />
                        </Box>
                    </DialogContent>
                }
            </Dialog>
        </DialogContext.Provider>
    );
};