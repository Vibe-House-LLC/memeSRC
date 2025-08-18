import React from 'react';

interface MemeSRCLogoProps {
  color: string;
}

const MemeSRCLogo: React.FC<MemeSRCLogoProps> = ({ color }) => {
  // Convert color name to hex if necessary
  const hexColor = colorNameToHex(color);

  // Amount to adjust the color by
  const LIGHTEN_AMOUNT = 0.2; // Lighten by 20%
  const DARKEN_AMOUNT = 0.1;  // Darken by 10%

  // Adjust the colors using HSL functions
  const lighterColor = lightenColor(hexColor, LIGHTEN_AMOUNT);
  const darkerColor = darkenColor(hexColor, DARKEN_AMOUNT);

  return (
    <svg
      width="200"
      height="80"
      viewBox="0 0 750 450"
      xmlns="http://www.w3.org/2000/svg"
      style={{ objectFit: 'contain' }}
    >
      <defs>
        <linearGradient
          id="linearGradient1"
          x1="0"
          y1="0"
          x2="1"
          y2="0"
          gradientUnits="userSpaceOnUse"
          gradientTransform="matrix(6.07497e-15,-99.2118,99.2118,6.07497e-15,278.569,271.493)"
        >
          <stop offset="0" stopColor={lighterColor} />
          <stop offset="1" stopColor={darkerColor} />
        </linearGradient>
        <linearGradient
          id="linearGradient2"
          x1="0"
          y1="0"
          x2="1"
          y2="0"
          gradientUnits="userSpaceOnUse"
          gradientTransform="matrix(2.54706e-14,-415.967,415.967,2.54706e-14,359.704,437.058)"
        >
          <stop offset="0" stopColor={darkerColor} />
          <stop offset="1" stopColor={lighterColor} />
        </linearGradient>
      </defs>
      <g transform="matrix(1.13805,0,0,1.32974,-1030.88,-1339.16)">
        <rect
          id="ArtboardGreyscale"
          x="905.832"
          y="1007.08"
          width="659.024"
          height="338.413"
          style={{ fill: 'none' }}
        />
        <g id="ArtboardGreyscale1">
          <g transform="matrix(0.878698,0,0,0.752028,945.803,1049.04)">
            <path
              d="M98.8,166.008L13.007,311.727C13.007,311.727 88.128,360.176 155.187,303.304C222.247,246.432 230.759,165.677 230.759,165.63C230.759,165.584 426.352,164.082 426.352,164.082C426.352,164.082 450.547,269.3 504.354,303.309C558.161,337.319 607.353,336.307 647.334,312.702C579.947,195.245 559.738,162.094 559.738,162.094C559.738,162.094 528.245,128.636 509.367,125.42C490.49,122.203 372.469,153.381 372.469,153.381L285.248,151.908C285.248,151.908 135.562,105.666 98.8,166.008"
              fill="url(#linearGradient1)"
            />
          </g>
          <g transform="matrix(0.878698,0,0,0.752028,945.803,1049.04)">
            <path
              d="M98.8,166.008C132.319,129.837 185.623,145.6 219.243,204.674C252.864,263.749 276.919,328.792 329.078,328.792C381.238,328.792 404.922,267.025 440.821,205.906C476.719,144.787 502.08,127.976 559.738,162.094C515.536,83.092 436.238,-78.505 365.224,74.908C333.633,136.469 334.645,172.038 292.968,73.553C251.29,-24.932 191.714,11.364 155.381,69.399C119.047,127.434 98.02,166.849 98.8,166.008Z"
              fill="url(#linearGradient2)"
            />
          </g>
        </g>
      </g>
    </svg>
  );
};

export default MemeSRCLogo;

// Utility functions to lighten and darken colors using HSL

// Convert color name to hex code
function colorNameToHex(color: string): string {
  const colors: { [key: string]: string } = {
    black: '#000000',
    white: '#FFFFFF',
    yellow: '#FFFF00',
  };

  const hex = colors[color.toLowerCase()];
  return hex ? hex : color;
}

// Convert hex color to HSL
function hexToHSL(H: string) {
  // Remove '#' if present
  H = H.replace(/^#/, '');

  // Handle 3-digit hex colors by expanding them to 6 digits
  if (H.length === 3) {
    H = H
      .split('')
      .map((char) => char + char)
      .join('');
  }

  // Convert hex to RGB
  let r = parseInt(H.substring(0, 2), 16) / 255;
  let g = parseInt(H.substring(2, 4), 16) / 255;
  let b = parseInt(H.substring(4, 6), 16) / 255;

  // Find min and max values of RGB
  let max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max != min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Convert HSL color to hex
function hslToHex(h: number, s: number, l: number) {
  h /= 360;
  s /= 100;
  l /= 100;
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l; // Achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.padStart(2, '0');
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Lighten color by a percentage (amount between 0 and 1)
function lightenColor(color: string, amount: number) {
  const hsl = hexToHSL(color);
  hsl.l = Math.min(100, hsl.l + amount * 100);
  return hslToHex(hsl.h, hsl.s, hsl.l);
}

// Darken color by a percentage (amount between 0 and 1)
function darkenColor(color: string, amount: number) {
  const hsl = hexToHSL(color);
  hsl.l = Math.max(0, hsl.l - amount * 100);
  return hslToHex(hsl.h, hsl.s, hsl.l);
}
