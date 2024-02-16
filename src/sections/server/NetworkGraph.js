import React, { useEffect, useReducer } from 'react';
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
        totalIn: state.totalIn + newRateIn,
        totalOut: state.totalOut + newRateOut,
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
    <Box
      sx={{
        background: '#121212',
        borderRadius: '8px',
        p: '12px',
        flexGrow: 1, // Add flexGrow to make the components fill the space
        flexBasis: 0, // Set flexBasis to 0 to allow components to expand
        minWidth: 0, // Ensure minWidth is 0 to allow flexBasis to take effect
        '&:not(:last-child)': {
          marginRight: '8px', // Add margin between cards
        },
      }}
    >
      <Typography fontSize={14} fontWeight={800} color={color}>
        {title}
      </Typography>
      <Typography fontSize={18} fontWeight={500} color={color}>
        {value}/s
      </Typography>
      <Typography fontSize={12} color={color} sx={{ opacity: 0.7 }}>
        Total: {total}
      </Typography>
    </Box>
  );

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log2(bytes) / Math.log2(k));
  return `${parseFloat((bytes / (k ** i)).toFixed(2))} ${sizes[i]}`;
};

const NetworkGraph = () => {
  const { rateIn, rateOut, totalIn, totalOut } = useBandwidthStats();

  return (
    <>
      <Stack direction="row" justifyContent="space-around" px={4.5} mt={2} spacing={4}>
        <StatCard
          title="Incoming"
          value={formatBytes(rateIn.at(-1) * 1024)}
          total={formatBytes(totalIn * 1024)}
          color="#0080f0"
        />
        <StatCard
          title="Outgoing"
          value={formatBytes(rateOut.at(-1) * 1024)}
          total={formatBytes(totalOut * 1024)}
          color="#18f000"
        />
      </Stack>
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
            label: 'Incoming',
            color: '#0080f0',
            curve: 'catmullRom',
          },
          {
            data: rateOut,
            label: 'Outgoing',
            color: '#18f000',
            curve: 'catmullRom',
          },
        ]}
        sx={{
          width: '100%',
          '.MuiMarkElement-root': { display: 'none' },
        }}
        slotProps={{
            legend: {
              direction: 'row',
              position: { vertical: 'bottom', horizontal: 'middle' },
              padding: 0,
            },
          }}
        height={200}
      />
    </>
  );
};

export default NetworkGraph;
