import React, { useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
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
      const { newRateIn, newRateOut, stats } = action.payload;
      // Use raw byte values directly, no need to parseFloat
      const updatedRateIn = addToEndAndLimit(state.rateIn, newRateIn*-1);
      const updatedRateOut = addToEndAndLimit(state.rateOut, newRateOut);
      return {
        ...state,
        rateIn: updatedRateIn,
        rateOut: updatedRateOut,
        totalIn: stats.TotalIn, // Use raw byte values directly
        totalOut: stats.TotalOut, // Use raw byte values directly
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
        dispatch({
          type: 'updateStats',
          payload: { newRateIn: stats.RateIn, newRateOut: stats.RateOut, stats },
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
      flexGrow: 1,
      flexBasis: 0,
      minWidth: 0,
      '&:not(:last-child)': {
        marginRight: '8px',
      },
    }}
  >
    <Typography fontSize={14} fontWeight={800} color={color}>
      {title}
    </Typography>
    <Typography fontSize={18} fontWeight={500} color={color}>
      {formatBytes(value*-1)} /s
    </Typography>
    <Typography fontSize={12} color={color} sx={{ opacity: 0.7 }}>
      Total: {formatBytes(total)}
    </Typography>
  </Box>
);

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
};

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log2(bytes) / Math.log2(k));
  // Replace Math.pow with the ** operator
  return `${parseFloat((bytes / (k ** i)).toFixed(2))} ${sizes[i]}`;
};

const NetworkGraph = () => {
  const { rateIn, rateOut, totalIn, totalOut } = useBandwidthStats();

  return (
    <>
      <Stack direction="row" justifyContent="space-around" px={4.5} mt={2} spacing={4}>
        <StatCard
          title="Incoming"
          value={rateIn[rateIn.length - 1]} // Use the most recent rate for display
          total={totalIn}
          color="#0080f0"
        />
        <StatCard
          title="Outgoing"
          value={rateOut[rateOut.length - 1]*-1} // Use the most recent rate for display
          total={totalOut}
          color="#18f000"
        />
      </Stack>
      <LineChart
        xAxis={[
          {
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
            area: true, // Enable area fill
          },
          {
            data: rateOut,
            label: 'Outgoing',
            color: '#18f000',
            curve: 'catmullRom',
            area: true, // Enable area fill
          },
        ]}
        height={300} 
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
      />
    </>
  );
};

export default NetworkGraph;