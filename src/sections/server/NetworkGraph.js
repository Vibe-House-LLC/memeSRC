import React, { useEffect, useState } from 'react';
import { LineChart } from '@mui/x-charts';
import { Stack, Typography } from '@mui/material';

const NetworkGraph = () => {
    const [rateIn, setRateIn] = useState(Array(30).fill(0));
    const [rateOut, setRateOut] = useState(Array(30).fill(0));
    const [totalIn, setTotalIn] = useState(0);
    const [totalOut, setTotalOut] = useState(0);

    function addToEndAndLimit(array, value) {
        if (array.length >= 30) {
            array.shift(); // Remove from start if length exceeds or equals 30
        }
        array.push(value); // Add value to the end
        return array;
    }

    useEffect(() => {
        const electron = window.require('electron');
        const fetchStats = () => {
            electron.ipcRenderer.invoke('fetch-bandwidth-stats')
                .then(({ stats }) => {
                    const newRateIn = parseFloat(stats.RateIn) || 0; // Assume these keys are correct for your data
                    const newRateOut = parseFloat(stats.RateOut) || 0;

                    setRateIn(prevRateIn => addToEndAndLimit([...prevRateIn], newRateIn));
                    setRateOut(prevRateOut => addToEndAndLimit([...prevRateOut], newRateOut));
                    setTotalIn(prevIn => Math.round((prevIn + newRateIn) * 10) / 10);
                    setTotalOut(prevOut => Math.round((prevOut + newRateOut) * 10) / 10);
                })
                .catch(error => {
                    console.error('Failed to fetch bandwidth stats:', error);
                });
        };

        const interval = setInterval(fetchStats, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <LineChart
                xAxis={[
                    {
                        id: 'Seconds',
                        data: Array.from({ length: 30 }, (_, i) => i),
                        scaleType: 'string',
                        valueFormatter: (seconds) => `${seconds}s`,
                    },
                ]}
                series={[
                    {
                        data: rateIn,
                        label: `Rate In (${rateIn.at(-1)}Kb/s)`, // Notice the change to `-1` to reference the last item
                        color: '#18f000',
                        curve: "catmullRom",
                    },
                    {
                        data: rateOut,
                        label: `Rate Out (${rateOut.at(-1)}Kb/s)`, // Same here for consistency
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
            <Stack direction='row' justifyContent='space-between' px={4.5} mt={2}>
                <Typography fontSize={14} fontWeight={800} color='#18f000'>
                    Total In: {totalIn}Kb
                </Typography>
                <Typography fontSize={14} fontWeight={800} color='#0080f0'>
                    Total Out: {totalOut}Kb
                </Typography>
            </Stack>
        </>
    );
};

export default NetworkGraph;
