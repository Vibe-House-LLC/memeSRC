import React, { useEffect, useReducer, useCallback } from 'react';
import { LineChart } from '@mui/x-charts';
import { Stack, Typography, Box } from '@mui/material';

const initialState = {
  rateIn: Array(30).fill(0),
  rateOut: Array(30).fill(0),
  totalIn: 0,
  totalOut: 0,
};

function reducer(state, action) {
    switch (action.type) {
      case 'updateStats': {
        const { newRateIn, newRateOut } = action.payload;
        const updatedRateIn = addToEndAndLimit(state.rateIn, newRateIn);
        const updatedRateOut = addToEndAndLimit(state.rateOut, newRateOut);
        return {
          ...state,
          rateIn: updatedRateIn,
          rateOut: updatedRateOut,
          totalIn: Math.round((state.totalIn + newRateIn) * 10) / 10,
          totalOut: Math.round((state.totalOut + newRateOut) * 10) / 10,
        };
      }
      default:
        return state;
    }
  }
  

function addToEndAndLimit(array, value) {
  const newArray = array.length >= 30 ? array.slice(1) : array;
  newArray.push(value);
  return newArray;
}

function useBandwidthStats() {
  const [stats, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const electron = window.require('electron');
        const { stats } = await electron.ipcRenderer.invoke('fetch-bandwidth-stats');
        const newRateIn = parseFloat(stats.RateIn) || 0;
        const newRateOut = parseFloat(stats.RateOut) || 0;

        dispatch({
          type: 'updateStats',
          payload: { newRateIn, newRateOut },
        });
      } catch (error) {
        console.error('Failed to fetch bandwidth stats:', error);
      }
    };

    const interval = setInterval(fetchStats, 1000);
    return () => clearInterval(interval);
  }, []);

  return stats;
}

const StatCard = ({ title, value, total, color }) => (
  <Box sx={{ background: '#121212', borderRadius: '8px', p: '12px', width: 'fit-content' }}>
    <Typography fontSize={14} fontWeight={800} color={color}>
      {title}
    </Typography>
    <Typography fontSize={18} fontWeight={500} color={color}>
      {value}
    </Typography>
    <Typography fontSize={14} color={color} sx={{ opacity: 0.7 }}>
      Total
    </Typography>
    <Typography fontSize={16} color={color} sx={{ opacity: 0.7 }}>
      {total}Kb
    </Typography>
  </Box>
);

const NetworkGraph = () => {
  const { rateIn, rateOut, totalIn, totalOut } = useBandwidthStats();

  return (
    <>
      <LineChart
        xAxis={[
          {
            id: 'Seconds',
            data: Array.from({ length: 30 }, (_, i) => i),
            scaleType: 'linear',
            valueFormatter: (seconds) => `${seconds}s`,
          },
        ]}
        series={[
          {
            data: rateIn,
            label: 'Rate In',
            color: '#0080f0',
            curve: 'catmullRom',
          },
          {
            data: rateOut,
            label: 'Rate Out',
            color: '#18f000',
            curve: 'catmullRom',
          },
        ]}
        sx={{
          width: '100%',
          '.MuiMarkElement-root': { display: 'none' },
        }}
        height={200}
      />
      <Stack direction="row" justifyContent="space-around" px={4.5} mt={2} spacing={4}>
        <StatCard title="Current Rate" value={`${rateIn.at(-1)}Kb/s`} total={totalIn} color="#0080f0" />
        <StatCard title="Current Rate" value={`${rateOut.at(-1)}Kb/s`} total={totalOut} color="#18f000" />
      </Stack>
    </>
  );
};

export default NetworkGraph;
