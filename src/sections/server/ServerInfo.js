import React, { useEffect, useState } from 'react';
import { Alert, Card, Container, Divider, Grid, Stack, TextField, Typography, useMediaQuery } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import PropTypes from 'prop-types';
import NetworkGraph from './NetworkGraph'; // Make sure this import is correct based on your file structure
import IndexTable from './IndexTable';

export default function ServerInfo({ details }) {
    const isSm = useMediaQuery(theme => theme.breakpoints.up('sm'));
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
            // Don't wait for the toggle result or check status here. Let the periodic check handle it.
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
                    setLastStatus(connected); // Update lastStatus to previous connected state before changing connected
                    setConnected(status);
                    setHandlingConnection(false); // Stop loading spinner when status changes
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

    return (
        <Container maxWidth='lg'>
            <Typography variant='h2'>
                memeSRC Server Settings
            </Typography>
            <Typography variant='subtitle2'>
                Manage server settings and see server details
            </Typography>
            <Divider sx={{ mt: 3, mb: 7 }} />
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Card variant='outlined' sx={{ p: 2 }}>
                        <Typography fontSize={28} fontWeight='bold' margin={0} textAlign={isSm ? 'left' : 'center'}>
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
                    </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Card variant='outlined' sx={{ p: 2 }}>
                        <Typography fontSize={28} fontWeight='bold' margin={0} textAlign={isSm ? 'left' : 'center'}>
                            Indexes
                        </Typography>
                        <IndexTable />
                        <TextField
                            sx={{ mt: 3 }}
                            label='CID (Content Identifier)'
                            value={cidInput}
                            onChange={(event) => setCidInput(event.target.value)}
                            fullWidth
                            InputProps={{
                                endAdornment: <LoadingButton color='inherit'>Import</LoadingButton>
                            }}
                        />
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
}

ServerInfo.propTypes = {
    details: PropTypes.object,
};
