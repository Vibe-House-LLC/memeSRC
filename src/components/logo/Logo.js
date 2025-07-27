import PropTypes from 'prop-types';
import { forwardRef, useId } from 'react';
import { Box } from '@mui/material';
import { lighten, darken } from '@mui/material/styles';
import colorToHex from '../../utils/colorToHex';

const Logo = forwardRef(({ sx, color = 'white', ...other }, ref) => {
  const hexColor = colorToHex(color).toLowerCase();
  const id = useId();
  const gradient1 = `${id}-grad-1`;
  const gradient2 = `${id}-grad-2`;

  if (hexColor === '#ffffff') {
    return (
      <Box
        ref={ref}
        component="img"
        src="/assets/memeSRC-white.svg"
        alt="memeSRC logo"
        sx={{ width: 40, objectFit: 'contain', height: 'auto', cursor: 'pointer', ...sx }}
        {...other}
      />
    );
  }

  const colorStop1 = lighten(hexColor, 0.2);
  const colorStop2 = darken(hexColor, 0.1);

  return (
    <Box
      ref={ref}
      component="svg"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 750 450"
      role="img"
      aria-label="memeSRC logo"
      sx={{ width: 40, objectFit: 'contain', height: 'auto', cursor: 'pointer', ...sx }}
      {...other}
    >
      <title>memeSRC logo</title>
      <defs>
        <linearGradient id={gradient1} x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="matrix(6.07497e-15,-99.2118,99.2118,6.07497e-15,278.569,271.493)">
          <stop offset="0" stopColor={colorStop1} />
          <stop offset="1" stopColor={colorStop2} />
        </linearGradient>
        <linearGradient id={gradient2} x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="matrix(2.54706e-14,-415.967,415.967,2.54706e-14,359.704,437.058)">
          <stop offset="0" stopColor={colorStop2} />
          <stop offset="1" stopColor={colorStop1} />
        </linearGradient>
      </defs>
      <g transform="matrix(1.13805,0,0,1.32974,-1030.88,-1339.16)">
        <rect x="905.832" y="1007.08" width="659.024" height="338.413" fill="none" />
        <g>
          <g transform="matrix(0.878698,0,0,0.752028,945.803,1049.04)">
            <path d="M98.8,166.008L13.007,311.727C13.007,311.727 88.128,360.176 155.187,303.304C222.247,246.432 230.759,165.677 230.759,165.63C230.759,165.584 426.352,164.082 426.352,164.082C426.352,164.082 450.547,269.3 504.354,303.309C558.161,337.319 607.353,336.307 647.334,312.702C579.947,195.245 559.738,162.094 559.738,162.094C559.738,162.094 528.245,128.636 509.367,125.42C490.49,122.203 372.469,153.381 372.469,153.381L285.248,151.908C285.248,151.908 135.562,105.666 98.8,166.008" fill={`url(#${gradient1})`} />
          </g>
          <g transform="matrix(0.878698,0,0,0.752028,945.803,1049.04)">
            <path d="M98.8,166.008C132.319,129.837 185.623,145.6 219.243,204.674C252.864,263.749 276.919,328.792 329.078,328.792C381.238,328.792 404.922,267.025 440.821,205.906C476.719,144.787 502.08,127.976 559.738,162.094C515.536,83.092 436.238,-78.505 365.224,74.908C333.633,136.469 334.645,172.038 292.968,73.553C251.29,-24.932 191.714,11.364 155.381,69.399C119.047,127.434 98.02,166.849 98.8,166.008Z" fill={`url(#${gradient2})`} />
          </g>
        </g>
      </g>
    </Box>
  );
});

Logo.propTypes = {
  sx: PropTypes.object,
  color: PropTypes.string,
};

export default Logo;
