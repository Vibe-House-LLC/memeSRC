'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

interface BackgroundProps {
  mainColor: string | null;
}

export default function Background({ mainColor }: BackgroundProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure the component is only rendered after it has mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !resolvedTheme) {
    // Avoid rendering to prevent hydration mismatch
    return null;
  }

  // Determine the end color based on the resolved theme
  const endColor = resolvedTheme === 'dark' ? '#1A1A1A' : '#F0F0F0';

  const backgroundStyle = mainColor
    ? {
        background: `linear-gradient(to bottom, ${mainColor} 10%, ${endColor} 100%)`,
        backgroundSize: '100% 100vh',
        backgroundRepeat: 'no-repeat',
        backgroundColor: endColor,
      }
    : {
        backgroundColor: endColor,
      };

  return <div className="absolute inset-0" style={backgroundStyle} />;
}
