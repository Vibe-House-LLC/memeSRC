import { alpha, Box, Card, type BoxProps, type CardProps, useTheme } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { forwardRef, useMemo } from 'react';

export type PaletteTone = 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info' | 'neutral';

type ToneSwatch = {
  main: string;
  light: string;
  dark: string;
};

type GradientTone = {
  background: string;
  border: string;
  shadow: string;
};

function resolveSwatch(theme: Theme, tone: PaletteTone): ToneSwatch {
  if (tone === 'neutral') {
    const primary = theme.palette.primary;
    return {
      main: primary.main || '#6366f1',
      light: primary.light || '#818cf8',
      dark: primary.dark || '#4338ca',
    };
  }

  const paletteEntry = theme.palette[tone];
  if (paletteEntry && paletteEntry.main) {
    return {
      main: paletteEntry.main,
      light: paletteEntry.light || paletteEntry.main,
      dark: paletteEntry.dark || paletteEntry.main,
    };
  }

  const fallback = theme.palette.primary;
  return {
    main: fallback.main || '#6366f1',
    light: fallback.light || '#818cf8',
    dark: fallback.dark || '#4338ca',
  };
}

function buildGradientTone(theme: Theme, tone: PaletteTone): GradientTone {
  const swatch = resolveSwatch(theme, tone);
  return {
    background: `linear-gradient(135deg, ${alpha(swatch.light, 0.96)} 0%, ${alpha(swatch.dark, 0.9)} 100%)`,
    border: `1px solid ${alpha(swatch.main, 0.4)}`,
    shadow: `0 34px 72px ${alpha(swatch.dark, 0.52)}`,
  };
}

function buildTintTone(theme: Theme, tone: PaletteTone, highlighted: boolean): GradientTone {
  const swatch = resolveSwatch(theme, tone);
  const surface = theme.palette.background.paper || '#0f172a';
  const overlayTop = highlighted ? alpha(swatch.light, 0.4) : alpha(swatch.light, 0.2);
  const overlayMid = highlighted ? alpha(swatch.main, 0.28) : alpha(swatch.main, 0.12);
  const overlaySoft = highlighted ? alpha(swatch.main, 0.14) : alpha(swatch.main, 0.06);
  return {
    background: `linear-gradient(180deg, ${overlayTop} 0px, ${overlayMid} 160px, ${overlaySoft} 260px, transparent 420px), ${surface}`,
    border: `1px solid ${alpha(swatch.main, highlighted ? 0.32 : 0.18)}`,
    shadow: 'none',
  };
}

export interface FeedCardSurfaceProps extends BoxProps {
  tone?: PaletteTone;
  gradient?: string;
}

export const FeedCardSurface = forwardRef<HTMLDivElement, FeedCardSurfaceProps>(function FeedCardSurface(
  { tone = 'primary', gradient, sx, ...rest },
  ref
) {
  const theme = useTheme();
  const toneStyles = useMemo(() => buildGradientTone(theme, tone), [theme, tone]);

  return (
    <Box
      ref={ref}
      component="article"
      sx={{
        width: '100%',
        borderRadius: { xs: '28px', md: 3.5 },
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        px: { xs: 2, sm: 2, md: 2, lg: 3 },
        py: { xs: 2, sm: 2, md: 2, lg: 3 },
        gap: { xs: 2.2, sm: 2.4 },
        maxWidth: { xs: '100%', sm: '100%', md: '100%', lg: 780 },
        mx: { xs: 0, sm: 'auto' },
        border: toneStyles.border,
        background: gradient ?? toneStyles.background,
        boxShadow: toneStyles.shadow,
        backdropFilter: 'blur(18px)',
        ...sx,
      }}
      {...rest}
    />
  );
});

export interface ReleaseCardSurfaceProps extends CardProps {
  tone?: PaletteTone;
  highlighted?: boolean;
}

export const ReleaseCardSurface = forwardRef<HTMLDivElement, ReleaseCardSurfaceProps>(
  function ReleaseCardSurface({ tone = 'neutral', highlighted = false, sx, ...rest }, ref) {
    const theme = useTheme();
    const toneStyles = useMemo(() => buildTintTone(theme, tone, highlighted), [theme, tone, highlighted]);

    return (
      <Card
        ref={ref}
        component="article"
        elevation={0}
        sx={{
          borderRadius: { xs: 2, sm: 3 },
          border: toneStyles.border,
          background: toneStyles.background,
          boxShadow: toneStyles.shadow,
          backdropFilter: 'blur(12px)',
          transition: 'box-shadow 0.3s ease',
          ...sx,
        }}
        {...rest}
      />
    );
  }
);
