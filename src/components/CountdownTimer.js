import { Box, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
import { useState, useEffect, useMemo, memo } from 'react';

const NEW_YEARS = new Date('2025-01-01T00:00:00').getTime();
const DISCOUNT = 0.5;
const HOLIDAY = DISCOUNT > 0;

const Snowflake = memo(
  ({ left, startingY, animationDelay, scale, duration }) => {
    const snowfall = useMemo(
      () =>
        keyframes({
          '0%': {
            transform: `translateY(${startingY}px) rotate(0deg)`,
            opacity: 0.4,
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

function SnowEffect() {
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
}

const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState(() => {
    const now = new Date().getTime();
    const distance = NEW_YEARS - now;

    return {
      days: Math.floor(distance / (1000 * 60 * 60 * 24)),
      hours: Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      ),
      minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((distance % (1000 * 60)) / 1000),
    };
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = NEW_YEARS - now;

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
        p: 2,
        mb: 3,
        overflow: 'hidden',
        border: '1px solid #6b42a1',
        boxShadow: '0 0 20px rgba(107,66,161,0.3)',
      }}
    >
      <SnowEffect />
      <Typography
        fontSize={26}
        fontWeight={800}
        color="#fff"
        textAlign="center"
        sx={{
          textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          background: 'linear-gradient(45deg, #fff 30%, #e0e0ff 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          position: 'relative',
        }}
      >
        Holiday Sale - 50% Off!
      </Typography>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 2,
          mt: 1.5,
          position: 'relative',
        }}
      >
        {Object.entries(timeLeft).map(([unit, value]) => (
          <Box key={unit} sx={{ textAlign: 'center' }}>
            <Typography
              sx={{
                fontSize: 22,
                fontWeight: 700,
                fontFamily: 'monospace',
                color: '#fff',
                backgroundColor: 'rgba(107,66,161,0.4)',
                borderRadius: 1.5,
                px: 1.5,
                py: 0.75,
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              {value.toString().padStart(2, '0')}
            </Typography>
            <Typography
              sx={{
                fontSize: 12,
                color: '#b794f4',
                textTransform: 'uppercase',
                mt: 0.75,
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

export { CountdownTimer, NEW_YEARS, DISCOUNT, HOLIDAY };
