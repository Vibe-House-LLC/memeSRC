import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Container, Divider, Grid, Stack, TextField, Typography, useMediaQuery } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import PropTypes from 'prop-types';
import NetworkGraph from './NetworkGraph';
import IndexTable from './IndexTable';
import CidInput from './CidInput';
import CreateIndex from './CreateIndex';

export default function ServerInfo({ details }) {
    const isSm = useMediaQuery(theme => theme.breakpoints.up('sm'));
    const isLg = useMediaQuery(theme => theme.breakpoints.up('lg'));
    const [connected, setConnected] = useState(false);
    const [handlingConnection, setHandlingConnection] = useState(false);
    const [lastStatus, setLastStatus] = useState(false);
    const [cidInput, setCidInput] = useState('');

    const handleToggleServer = async () => {
        setHandlingConnection(true);
        // Trigger IPC to toggle without waiting for the result here.
        if (window && window.process && window.process.type) {
            const electron = window.require('electron');
            electron.ipcRenderer.invoke('toggle-ipfs-daemon').catch(console.error);
        } else {
            console.log('Not running in Electron.');
            setHandlingConnection(false); // Reset if not in Electron
        }
        // Timeout to stop waiting after 15 seconds, assuming failure if status hasn't changed
        const timeout = setTimeout(() => {
            if (connected === lastStatus) { // Status didn't change
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
                if (status !== connected) { // Status has changed
                    setLastStatus(connected);
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
        // Render only the disconnected message and button if not connected
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
                    onClick={() => handleToggleServer(true)}
                    variant="contained"
                >
                    Start Server
                </LoadingButton>
            </Container>
        );
    }

    // Original component rendering when connected
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
                    {/* Update for responsive design */}
                    <Card variant='outlined' sx={{ p: 2 }}>
                        <Stack spacing={2}>
                            <Typography fontSize={28} fontWeight='bold' textAlign={isSm ? 'left' : 'center'}>
                                Network Connection
                            </Typography>
                            {connected ?
                                <Alert
                                    severity="success"
                                    action={
                                        <LoadingButton
                                            loading={handlingConnection}
                                            onClick={() => handleToggleServer(false)}
                                            color='inherit'
                                            size='small'
                                        >
                                            Disconnect
                                        </LoadingButton>
                                    }
                                >
                                    Server is connected!
                                </Alert>
                                :
                                <Alert
                                    severity="error"
                                    action={
                                        <LoadingButton
                                            loading={handlingConnection}
                                            onClick={() => handleToggleServer(true)}
                                            color='inherit'
                                            size='small'
                                        >
                                            Connect
                                        </LoadingButton>
                                    }
                                >
                                    Server is disconnected
                                </Alert>
                            }
                            <NetworkGraph />
                        </Stack>
                    </Card>
                </Grid>
                <Grid item xs={12} lg={6}>
                    <Card variant='outlined' sx={{ p: 2 }}>
                        <Typography fontSize={28} fontWeight='bold' margin={0} textAlign={isSm ? 'left' : 'center'}>
                            Indexes
                        </Typography>
                        <IndexTable />
                        <CidInput onImport={(cid) => console.log('Import CID:', cid)} />
                        <CreateIndex />
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
}

ServerInfo.propTypes = {
    details: PropTypes.object,
};
