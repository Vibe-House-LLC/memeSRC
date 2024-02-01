import { Close, Redo, Sync } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { Alert, Button, Card, Container, Divider, Grid, Stack, TextField, Typography, useMediaQuery } from '@mui/material';
import { LineChart } from '@mui/x-charts';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import IndexTable from './IndexTable';

export default function ServerInfo({ details }) {
    const isSm = useMediaQuery(theme => theme.breakpoints.up('sm'))
    const [connected, setConnected] = useState(false);
    const [handlingConnection, setHandlingConnection] = useState(false);
    const [rateIn, setRateIn] = useState([
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ]
    );
    const [rateOut, setRateOut] = useState([
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ]
    );
    const [totalIn, setTotalIn] = useState(0);
    const [totalOut, setTotalOut] = useState(0);
    const [cidInput, setCidInput] = useState('');

    /* -------------------------------- Functions ------------------------------- */

    const handleConnectServer = (input) => {
        setHandlingConnection(true)
        setTimeout(() => {
            setConnected(input)
            setHandlingConnection(false)
        }, 2000)
    }

    function getRandomNumber(min, max) {
        if (min > max) {
            throw new Error("Minimum value should not be greater than maximum value.");
        }

        const range = max - min;
        const randomNumber = min + Math.random() * range;
        return Math.round(randomNumber * 10) / 10;
    }

    function addToFrontAndLimit(array, value) {
        array.unshift(value); // Add value to the front
        while (array.length > 30) {
            array.pop(); // Remove from end if length exceeds 30
        }
        return array;
    }

    useEffect(() => {
        const interval = setInterval(() => {
            const newNumber = getRandomNumber(0.3, 11.7);
            setRateIn(prevRateIn => {
                const newRateIn = addToFrontAndLimit([...prevRateIn], newNumber);
                return newRateIn;
            });
            setTotalIn(prevIn => {
                const newTotal = prevIn + newNumber
                return Math.round(newTotal * 10) / 10
            })
        }, 1000);

        return () => clearInterval(interval); // Clean up the interval on unmount
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            const newNumber = getRandomNumber(0.3, 11.7);
            setRateOut(prevRateOut => {
                const newRateOut = addToFrontAndLimit([...prevRateOut], newNumber);
                return newRateOut;
            });
            setTotalOut(prevOut => {
                const newTotal = prevOut + newNumber
                return Math.round(newTotal * 10) / 10
            })
        }, 1000);

        return () => clearInterval(interval); // Clean up the interval on unmount
    }, []);

    /* -------------------------------------------------------------------------- */

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
                <Grid item xs={12} md={5}>
                    <Typography fontSize={28} fontWeight='bold' margin={0} textAlign={isSm ? 'left' : 'center'}>
                        Network Connection
                    </Typography>
                </Grid>
                <Grid item xs={12} md={7}>
                    <Card variant='outlined' sx={{ p: 2 }}>
                        {connected ?
                            <Alert
                                severity="success"
                                action={
                                    <LoadingButton
                                        loading={handlingConnection}
                                        onClick={() => {
                                            handleConnectServer(false)
                                        }}
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
                                        onClick={() => {
                                            handleConnectServer(true)
                                        }}
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

                        <LineChart
                            // xAxis={[{ data: [0, 0, 0, 0, 0, 10] }]}
                            xAxis={[
                                {
                                    id: 'Seconds',
                                    data: [
                                        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
                                        11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
                                        21, 22, 23, 24, 25, 26, 27, 28, 29, 30
                                    ],
                                    scaleType: 'string',
                                    valueFormatter: (seconds) => `${seconds}s`,
                                },
                            ]}
                            series={[
                                {
                                    data: rateIn,
                                    label: `Rate In (${rateIn.at(0)}Kb/s)`,
                                    color: '#18f000',
                                    curve: "catmullRom",
                                }
                            ]}
                            sx={{
                                width: '100%',
                                '.MuiMarkElement-root': {
                                    display: 'none'
                                },
                            }}
                            height={200}
                        />
                        <LineChart
                            // xAxis={[{ data: [0, 0, 0, 0, 0, 10] }]}
                            xAxis={[
                                {
                                    id: 'Seconds',
                                    data: [
                                        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
                                        11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
                                        21, 22, 23, 24, 25, 26, 27, 28, 29, 30
                                    ],
                                    scaleType: 'string',
                                    valueFormatter: (seconds) => `${seconds}s`,
                                },
                            ]}
                            series={[
                                {
                                    data: rateOut,
                                    label: `Rate Out (${rateOut.at(0)}Kb/s)`,
                                    color: '#0080f0',
                                    curve: "catmullRom",
                                }
                            ]}
                            sx={{
                                width: '100%',
                                '.MuiMarkElement-root': {
                                    display: 'none'
                                },
                            }}
                            height={200}
                        />
                        <Stack direction='row' justifyContent='space-between' px={4.5}>
                            <Typography fontSize={14} fontWeight={800} color='#18f000'>
                                Total In: {totalIn}Kb
                            </Typography>
                            <Typography fontSize={14} fontWeight={800} color='#0080f0'>
                                Total Out: {totalOut}Kb
                            </Typography>
                        </Stack>
                    </Card>
                </Grid>
            </Grid>

            <Grid container spacing={3} mt={4}>
                <Grid item xs={12} md={5}>
                    <Typography fontSize={28} fontWeight='bold' margin={0} textAlign={isSm ? 'left' : 'center'}>
                        Indexes
                    </Typography>
                </Grid>
                <Grid item xs={12} md={7}>
                    <Card variant='outlined' sx={{ p: 2 }}>
                        <IndexTable />
                        <TextField
                            sx={{
                                mt: 3
                            }}
                            label='CID (Content Identifier)'
                            value={cidInput}
                            onChange={(event) => {
                                setCidInput(event.target.value)
                            }}
                            fullWidth
                            InputProps={{
                                endAdornment:
                                    <LoadingButton
                                        color='inherit'
                                    >
                                        Import
                                    </LoadingButton>
                            }}
                        />
                    </Card>
                </Grid>
            </Grid>
        </Container>
    )
}

ServerInfo.propTypes = {
    details: PropTypes.object
}