
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { keyframes } from '@mui/system';
import { useState, useEffect, useMemo, memo } from 'react';
import PropTypes from 'prop-types';
import { SALE_END_DATE, CURRENT_SALE } from '../constants/sales';

export const Snowflake = memo(
  ({ left, startingY, animationDelay, scale, duration }) => {
    const snowfall = useMemo(
      () =>
        keyframes({
          '0%': {
            transform: `translateY(${startingY}px) rotate(0deg)`,
            opacity: 0.3,
          },
          '100%': {
            transform: 'translateY(400px) rotate(360deg)',
            opacity: 0.2,
          },
        }),
      [startingY]
    );

    return (
      <Box
        component="div"
        sx={{
          position: 'absolute',
          left,
          top: '-20px',
          color: '#fff',
          userSelect: 'none',
          fontSize: '0.5rem',
          transform: `scale(${scale})`,
          animation: `${snowfall} ${duration}s linear infinite`,
          animationDelay,
        }}
      >
        ❄
      </Box>
    );
  }
);

Snowflake.propTypes = {
  left: PropTypes.string.isRequired,
  startingY: PropTypes.number.isRequired,
  animationDelay: PropTypes.string.isRequired,
  scale: PropTypes.number.isRequired,
  duration: PropTypes.number.isRequired,
};

export const SnowEffect = () => {
  const snowflakes = useMemo(
    () =>
      [...Array(30)].map((_, i) => {
        const duration = Math.random() * 15 + 15;
        return {
          id: i,
          left: `${Math.random() * 100}%`,
          startingY: -Math.random() * 200 - 20,
          animationDelay: `${-Math.random() * duration}s`,
          duration,
          scale: Math.random() * 0.5 + 0.5,
        };
      }),
    []
  );

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
    >
      {snowflakes.map(
        ({ id, left, startingY, animationDelay, scale, duration }) => (
          <Snowflake
            key={id}
            left={left}
            startingY={startingY}
            animationDelay={animationDelay}
            scale={scale}
            duration={duration}
          />
        )
      )}
    </Box>
  );
};

const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState(() => {
    const now = new Date().getTime();
    const distance = SALE_END_DATE - now;

    return {
      days: Math.floor(distance / (1000 * 60 * 60 * 24)),
      hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((distance % (1000 * 60)) / 1000),
    };
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = SALE_END_DATE - now;

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor(
          (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        ),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <Box
      sx={{
        position: 'relative',
        background: 'linear-gradient(45deg, #2f1c47 30%, #4a2d71 90%)',
        borderRadius: 2,
        p: 1.5,
        mb: 3,
        overflow: 'hidden',
        border: '1px solid #6b42a1',
        boxShadow: '0 0 20px rgba(107,66,161,0.3)',
      }}
    >
      <SnowEffect />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        <Typography
          fontWeight={800}
          color="#fff"
          textAlign="center"
          sx={{
            fontSize: 22,
            textShadow: '0 2px 8px rgba(0,0,0,0.2)',
            background: 'linear-gradient(45deg, #fff 30%, #e0e0ff 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            position: 'relative',
          }}
        >
          {CURRENT_SALE.name}
        </Typography>
      </Box>
      <Typography
        sx={{
          color: '#b794f4',
          textAlign: 'center',
          fontSize: 14,
          fontWeight: 500,
          mt: 0.5,
        }}
      >
        {'Get '}
        <Box component="span" sx={{ color: '#fff', fontWeight: 700 }}>
          {CURRENT_SALE.discountPercent}% off
        </Box>
        {' your first '}{CURRENT_SALE.monthsDuration}{' months!'}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 1,
          mt: 1,
          position: 'relative',
        }}
      >
        {Object.entries(timeLeft).map(([unit, value]) => (
          <Box key={unit} sx={{ textAlign: 'center' }}>
            <Typography
              sx={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: 'monospace',
                color: '#fff',
                backgroundColor: 'rgba(107,66,161,0.4)',
                borderRadius: 1.5,
                px: 1,
                py: 0.5,
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              {value.toString().padStart(2, '0')}
            </Typography>
            <Typography
              sx={{
                fontSize: 10,
                color: '#b794f4',
                textTransform: 'uppercase',
                mt: 0.5,
                fontWeight: 600,
              }}
            >
              {unit}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export { CountdownTimer };
