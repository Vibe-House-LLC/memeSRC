import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Container, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid, Stack, Typography, useMediaQuery } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import PropTypes from 'prop-types';
import NetworkGraph from './NetworkGraph';
import IndexTable from './IndexTable';

export default function ServerInfo({ details }) {
    const isSm = useMediaQuery(theme => theme.breakpoints.up('sm'));
    const isLg = useMediaQuery(theme => theme.breakpoints.up('lg'));
    const [connected, setConnected] = useState(false);
    const [handlingConnection, setHandlingConnection] = useState(false);

    const handleToggleServer = async () => {
        setHandlingConnection(true);
        if (window && window.process && window.process.type) {
            const electron = window.require('electron');
            electron.ipcRenderer.invoke('toggle-ipfs-daemon').catch(console.error);
        } else {
            console.log('Not running in Electron.');
            setHandlingConnection(false);
        }
        const timeout = setTimeout(() => {
            if (connected === !handlingConnection) {
                setHandlingConnection(false);
                console.log('Timeout: Status change assumed failed.');
            }
        }, 15000);

        return () => clearTimeout(timeout);
    };

    const checkServerStatus = async () => {
        if (window && window.process && window.process.type) {
            const electron = window.require('electron');
            try {
                const status = await electron.ipcRenderer.invoke('check-daemon-status');
                if (status !== connected) {
                    setConnected(status);
                    setHandlingConnection(false);
                }
            } catch (error) {
                console.error('IPC error:', error);
                setConnected(false);
                setHandlingConnection(false);
            }
        } else {
            console.log('Not running in Electron environment.');
        }
    };

    useEffect(() => {
        checkServerStatus();
        const statusInterval = setInterval(checkServerStatus, 5000);
        return () => clearInterval(statusInterval);
    }, []);

    if (!connected) {
        return (
            <Container
                maxWidth="sm"
                sx={{
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <Typography variant="h4" textAlign="center" gutterBottom>
                    Server Disconnected
                </Typography>
                <LoadingButton
                    loading={handlingConnection}
                    onClick={handleToggleServer}
                    variant="contained"
                >
                    Start Server
                </LoadingButton>
            </Container>
        );
    }

    return (
        <Container maxWidth={isLg ? false : 'lg'}>
            <Typography variant='h2'>
                memeSRC Server Settings
            </Typography>
            <Typography variant='subtitle2'>
                Manage server settings and see server details
            </Typography>
            <Divider sx={{ mt: 3, mb: 7 }} />
            <Grid container spacing={3}>
                <Grid item xs={12} lg={6}>
                    <Card variant='outlined' sx={{ p: 2 }}>
                        <Stack spacing={2}>
                            <Typography fontSize={28} fontWeight='bold' textAlign={isSm ? 'left' : 'center'}>
                                Network Connection
                            </Typography>
                            <Alert
                                severity="success"
                                action={
                                    <LoadingButton
                                        loading={handlingConnection}
                                        onClick={handleToggleServer}
                                        color='inherit'
                                        size='small'
                                    >
                                        Disconnect
                                    </LoadingButton>
                                }
                            >
                                Server is connected!
                            </Alert>
                            <NetworkGraph />
                        </Stack>
                    </Card>
                </Grid>
                <Grid item xs={12} lg={6}>
                    <Card variant='outlined' sx={{ p: 2 }}>
                        <IndexTable />
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
}

ServerInfo.propTypes = {
    details: PropTypes.object,
};
