// @mui
import { alpha, type SxProps, type Theme } from '@mui/material/styles';

type BlurProps = {
  color?: string;
  blur?: number;
  opacity?: number;
  imgUrl?: string;
};

export function bgBlur(props?: BlurProps): SxProps<Theme> {
  const color = props?.color || '#000000';
  const blur = props?.blur ?? 6;
  const opacity = props?.opacity ?? 0.8;
  const imgUrl = props?.imgUrl;

  if (imgUrl) {
    return {
      position: 'relative',
      backgroundImage: `url(${imgUrl})`,
      '&:before': {
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 9,
        content: '""',
        width: '100%',
        height: '100%',
        backdropFilter: `blur(${blur}px)`,
        WebkitBackdropFilter: `blur(${blur}px)`,
        backgroundColor: alpha(color, opacity),
      },
    };
  }

  return {
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    backgroundColor: alpha(color, opacity),
  };
}

type GradientProps = {
  direction?: string;
  startColor?: string;
  endColor?: string;
  imgUrl?: string;
  color?: string;
};

export function bgGradient(props?: GradientProps): SxProps<Theme> {
  const direction = props?.direction || 'to bottom';
  const startColor = props?.startColor;
  const endColor = props?.endColor;
  const imgUrl = props?.imgUrl;
  const color = props?.color;

  if (imgUrl) {
    return {
      background: `linear-gradient(${direction}, ${startColor || color}, ${endColor || color}), url(${imgUrl})`,
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center center',
    };
  }

  return {
    background: `linear-gradient(${direction}, ${startColor}, ${endColor})`,
  };
}

export function textGradient(value: string): SxProps<Theme> {
  return {
    background: `-webkit-linear-gradient(${value})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  };
}

export function filterStyles(value: string): SxProps<Theme> {
  return {
    filter: value,
    WebkitFilter: value,
    MozFilter: value,
  };
}

export const hideScrollbarY: SxProps<Theme> = {
  msOverflowStyle: 'none',
  scrollbarWidth: 'none',
  overflowY: 'scroll',
  '&::-webkit-scrollbar': {
    display: 'none',
  },
};

export const hideScrollbarX: SxProps<Theme> = {
  msOverflowStyle: 'none',
  scrollbarWidth: 'none',
  overflowX: 'scroll',
  '&::-webkit-scrollbar': {
    display: 'none',
  },
};
