import React, { useCallback, useEffect, useMemo, useRef, useState, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { styled, alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { keyframes } from '@mui/system';
import { Box, ButtonBase, CircularProgress, Collapse, IconButton, InputBase, Typography, ToggleButton, ToggleButtonGroup, Stack, Switch, FormControlLabel } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import CloseIcon from '@mui/icons-material/Close';
import { Shuffle as ShuffleIcon, Settings as SettingsIcon, Sun as SunIcon, Moon as MoonIcon, Monitor as MonitorIcon } from 'lucide-react';
import { useSearchSettings } from '../../contexts/SearchSettingsContext';
import SeriesSelectorDialog, { type SeriesItem } from '../SeriesSelectorDialog';
import { useSearchFilterGroups } from '../../hooks/useSearchFilterGroups';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';

type SeriesSelectorDialogProps = React.ComponentProps<typeof SeriesSelectorDialog>;

type OnSelectSeries = SeriesSelectorDialogProps['onSelect'];

export interface UnifiedSearchBarProps {
  value: string;
  placeholder?: string;
  onValueChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
  onRandom?: () => void | PromiseLike<void>;
  isRandomLoading?: boolean;
  shows: SeriesItem[];
  savedCids: SeriesItem[];
  currentValueId: string;
  includeAllFavorites: boolean;
  onSelectSeries: OnSelectSeries;
  appearance?: 'light' | 'dark';
  onClarifySearch?: (details: { original: string; stripped: string }) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

const FONT_FAMILY = 'Roboto, sans-serif';

const FormRoot = styled('form')(({ theme }) => ({
  width: '100%',
  maxWidth: 820,
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: theme.spacing(1.1),
}));

const FieldShell = styled('div')(({ theme }) => ({
  '--scope-button-size': '36px',
  '--scope-gap': theme.spacing(0.92),
  '--search-shell-shadow': 'none',
  position: 'relative',
  width: '100%',
  borderRadius: 14,
  border: '1px solid rgba(30, 30, 30, 0.08)',
  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(242, 242, 242, 0.94))',
  boxShadow: 'var(--search-shell-shadow)',
  padding: theme.spacing(1.05, 1.26),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.66),
  transition: 'padding 260ms cubic-bezier(0.4, 0, 0.2, 1), gap 220ms cubic-bezier(0.4, 0, 0.2, 1)',
  // remove hover/box-shadow animations
  overflow: 'hidden',
  '&[data-shortcut-open="true"]': {
    overflow: 'visible',
  },
  '&[data-expanded="false"]': {
    padding: theme.spacing(0.82, 1.04),
    gap: theme.spacing(0.26),
    '--scope-gap': theme.spacing(0.6),
    '--scope-button-size': '34px',
  },
  '&[data-expanded="true"]': {
    padding: theme.spacing(1.28, 1.52),
    gap: theme.spacing(0.6),
    '--scope-gap': theme.spacing(1.1),
  },
  '&[data-appearance="dark"]': {
    border: '1px solid rgba(255, 255, 255, 0.16)',
    background: 'rgba(30, 30, 32, 0.96)',
    color: 'rgba(245, 245, 245, 0.95)',
  },
  '&[data-appearance="dark"][data-expanded="false"]': {
    background: 'rgba(30, 30, 32, 0.96)',
  },
  '&[data-appearance="dark"][data-expanded="true"]': {
    background: 'rgba(30, 30, 32, 0.96)',
  },
  [theme.breakpoints.down('sm')]: {
    '--scope-button-size': '34px',
    '--scope-gap': theme.spacing(0.74),
    '--search-shell-shadow': '0 10px 24px rgba(0, 0, 0, 0.14)',
    padding: theme.spacing(0.86, 1.06),
    borderRadius: 12,
    transition: 'padding 240ms cubic-bezier(0.4, 0, 0.2, 1), gap 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    '&[data-expanded="false"]': {
      padding: theme.spacing(0.68, 0.92),
      gap: theme.spacing(0.18),
      '--scope-gap': theme.spacing(0.5),
      '--scope-button-size': '32px',
    },
    '&[data-expanded="true"]': {
      padding: theme.spacing(1.04, 1.26),
      gap: theme.spacing(0.5),
      '--scope-gap': theme.spacing(1),
    },
    '&[data-appearance="dark"]': {
      background: 'rgba(28, 28, 30, 0.96)',
      '--search-shell-shadow': '0 14px 36px rgba(0, 0, 0, 0.52)',
    },
    '&[data-appearance="dark"][data-expanded="false"]': {
      background: 'rgba(28, 28, 30, 0.96)',
    },
    '&[data-appearance="dark"][data-expanded="true"]': {
      background: 'rgba(28, 28, 30, 0.96)',
    },
  },
}));

const FieldRow = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--scope-gap)',
  transition: 'align-items 220ms cubic-bezier(0.4, 0, 0.2, 1), gap 220ms cubic-bezier(0.4, 0, 0.2, 1)',
  '&[data-expanded="true"]': {
    alignItems: 'flex-end',
  },
  '&[data-appearance="dark"]': {
    color: 'rgba(245, 245, 245, 0.95)',
  },
}));

const StyledInput = styled(InputBase)(({ theme }) => ({
  flex: 1,
  fontFamily: FONT_FAMILY,
  fontSize: '1.14rem',
  fontWeight: 500,
  color: '#2d2d2d',
  '& input': {
    padding: theme.spacing(0.9, 1),
    border: 'none',
    outline: 'none',
    background: 'transparent',
    caretColor: '#3a3a3a',
    '::placeholder': {
      color: 'rgba(90, 90, 90, 0.7)',
      opacity: 1,
    },
  },
  [theme.breakpoints.down('sm')]: {
    fontSize: '1.08rem',
    '& input': {
      padding: theme.spacing(0.6, 0.66),
    },
  },
  '&[data-appearance="dark"]': {
    color: '#f5f5f5',
    '& input': {
      color: '#f5f5f5',
      caretColor: '#f5f5f5',
      '::placeholder': {
        color: 'rgba(220, 220, 220, 0.68)',
      },
    },
  },
}));

const buildCircleButtonStyles = (theme: Theme) => ({
  width: 'var(--scope-button-size)',
  height: 'var(--scope-button-size)',
  borderRadius: '999px',
  border: '1px solid rgba(40, 40, 40, 0.18)',
  boxShadow: 'none',
});

const isPromiseLike = <T,>(value: unknown): value is PromiseLike<T> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as PromiseLike<T>).then === 'function';

const DEFAULT_SCOPE_STYLING = {
  background: '#f0f0f0',
  hoverBackground: '#e7e7e7',
  activeBackground: '#dedede',
  color: '#2f2f2f',
  borderColor: 'rgba(50, 50, 50, 0.2)',
  boxShadow: 'none',
  hoverBoxShadow: 'none',
  activeBoxShadow: 'none',
} as const;

const labelSwitchIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const labelFadeOut = keyframes`
  from {
    opacity: 1;
    transform: scaleX(1);
  }
  to {
    opacity: 0;
    transform: scaleX(0);
  }
`;

const RandomButton = styled(IconButton)(({ theme }) => {
  const base = buildCircleButtonStyles(theme);
  return {
    ...base,
    background: '#f0f0f0',
    color: '#2e2e2e',
    borderColor: 'rgba(50, 50, 50, 0.2)',
    boxShadow: 'none',
    '&:hover': {
      background: '#e7e7e7',
      boxShadow: 'none',
    },
    '&:active': {
      background: '#dedede',
      boxShadow: 'none',
    },
    '&.Mui-disabled': {
      opacity: 0.85,
      boxShadow: 'none',
      transform: 'none',
      background: '#e6e6e6',
      color: 'rgba(80, 80, 80, 0.8)',
      borderColor: 'rgba(60, 60, 60, 0.22)',
    },
    '&[data-appearance="dark"]': {
      background: '#29292d',
      color: '#f5f5f5',
      borderColor: 'rgba(255, 255, 255, 0.14)',
      '&:hover': {
        background: '#323236',
        boxShadow: 'none',
      },
      '&:active': {
        background: '#26262b',
        boxShadow: 'none',
      },
      '&.Mui-disabled': {
        background: '#232327',
        color: 'rgba(200, 200, 200, 0.7)',
        borderColor: 'rgba(135, 135, 135, 0.25)',
      },
    },
  };
});

const SettingsButton = styled(IconButton)(({ theme }) => {
  const base = buildCircleButtonStyles(theme);
  return {
    ...base,
    background: 'transparent',
    color: '#2e2e2e',
    borderColor: 'transparent',
    boxShadow: 'none',
    opacity: 0.5,
    '&:hover': {
      background: 'rgba(0, 0, 0, 0.05)',
      boxShadow: 'none',
      opacity: 1,
    },
    '&:active': {
      background: 'rgba(0, 0, 0, 0.1)',
      boxShadow: 'none',
      opacity: 1,
    },
    '&[data-appearance="dark"]': {
      color: '#f5f5f5',
      '&:hover': {
        background: 'rgba(255, 255, 255, 0.1)',
      },
      '&:active': {
        background: 'rgba(255, 255, 255, 0.15)',
      },
    },
  };
});

const TipRow = styled('div')(({ theme }) => ({
  borderRadius: 12,
  border: `1px solid ${alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.25 : 0.12)}`,
  background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : theme.palette.background.paper,
  padding: theme.spacing(1, 1.25),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
}));

const TipHeader = styled('div')(({ theme }) => ({
  fontWeight: 700,
  fontSize: '0.95rem',
  color: theme.palette.text.primary,
}));

const TipBody = styled('p')(({ theme }) => ({
  margin: 0,
  fontSize: '0.9rem',
  color: alpha(theme.palette.text.primary, 0.8),
}));

const TipExample = styled('code')(({ theme }) => ({
  alignSelf: 'flex-start',
  fontFamily: 'SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  fontSize: '0.82rem',
  borderRadius: 6,
  padding: theme.spacing(0.3, 0.6),
  background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : theme.palette.grey[100],
  color: theme.palette.text.primary,
}));

const TipNote = styled('div')(({ theme }) => ({
  borderRadius: 10,
  padding: theme.spacing(0.9, 1.1),
  border: `1px dashed ${alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.35 : 0.2)}`,
  background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.015)',
}));

const ScopeGlyph = styled('span')(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: FONT_FAMILY,
  fontWeight: 600,
  fontSize: '0.98rem',
  lineHeight: 1,
  color: 'inherit',
  flexShrink: 0,
  [theme.breakpoints.down('sm')]: {
    fontSize: '0.92rem',
  },
}));

const ScopeSelectorButton = styled(ButtonBase)(({ theme }) => {
  const base = buildCircleButtonStyles(theme);
  return {
    ...base,
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 'auto',
    minHeight: 'var(--scope-button-size)',
    borderRadius: theme.spacing(1.1),
    padding: theme.spacing(0.36, 0.54),
    border: '1px solid ' + DEFAULT_SCOPE_STYLING.borderColor,
    background: DEFAULT_SCOPE_STYLING.background,
    color: DEFAULT_SCOPE_STYLING.color,
    boxShadow: DEFAULT_SCOPE_STYLING.boxShadow,
    width: 'auto',
    minWidth: 'var(--scope-button-size)',
    gap: theme.spacing(0.08),
    transition:
      'min-width 240ms cubic-bezier(0.4, 0, 0.2, 1), padding 240ms cubic-bezier(0.4, 0, 0.2, 1), gap 240ms cubic-bezier(0.4, 0, 0.2, 1)',
    // no hover/active animations
    '&:hover': {
      background: DEFAULT_SCOPE_STYLING.hoverBackground,
      boxShadow: DEFAULT_SCOPE_STYLING.hoverBoxShadow,
    },
    '&:active': {
      background: DEFAULT_SCOPE_STYLING.activeBackground,
      boxShadow: DEFAULT_SCOPE_STYLING.activeBoxShadow,
    },
    '&[data-expanded="false"]': {
      minWidth: 'calc(var(--scope-button-size) * 1.42)',
      gap: theme.spacing(0.06),
    },
    '&[data-expanded="true"]': {
      flex: '0 1 auto',
      minWidth: 0,
      justifyContent: 'flex-start',
      padding: theme.spacing(0.36, 0.6),
      gap: theme.spacing(0.2),
    },
    '& .scopeLabel': {
      fontFamily: FONT_FAMILY,
      fontWeight: 600,
      fontSize: '0.88rem',
      color: '#2f2f2f',
      display: 'inline-flex',
      alignItems: 'center',
      lineHeight: 1.2,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      flex: '0 1 auto',
      minWidth: 0,
      maxWidth: '100%',
      [theme.breakpoints.down('sm')]: {
        fontSize: '0.84rem',
      },
    },
    '& svg': {
      flexShrink: 0,
      color: '#4a4a4a',
      fontSize: '1.1rem',
    },
    '& .collapsedIcon': {
      marginLeft: 0,
    },
    '&[data-appearance="dark"]': {
      background: '#29292d',
      color: '#f5f5f5',
      borderColor: 'rgba(255, 255, 255, 0.18)',
      '&:hover': {
        background: '#323236',
      },
      '&:active': {
        background: '#26262b',
      },
      '& .scopeLabel': {
        color: '#f5f5f5',
      },
      '& svg': {
        color: '#d0d3da',
      },
    },
  };
});

const ControlsRail = styled('div')(({ theme }) => ({
  alignSelf: 'stretch',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginTop: 0,
  opacity: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
  flexWrap: 'nowrap',
  minWidth: 0,
  transition: 'opacity 220ms cubic-bezier(0.4, 0, 0.2, 1), margin-top 220ms cubic-bezier(0.4, 0, 0.2, 1)',
  [theme.breakpoints.down('sm')]: {
    flexWrap: 'nowrap',
    gap: theme.spacing(0.82),
  },
  '&[data-expanded="true"]': {
    marginTop: theme.spacing(0.4),
    opacity: 1,
    pointerEvents: 'auto',
  },
  // Remove heavy shadows in the compact second row
  '& .railButton': {
    boxShadow: 'none !important',
    transform: 'none',
  },
  '& .railButton:hover': {
    boxShadow: 'none !important',
    transform: 'none',
  },
  '& .railButton:active': {
    boxShadow: 'none !important',
    transform: 'none',
  },
  '&[data-appearance="dark"]': {
    color: '#f5f5f5',
  },
}));

const RailRight = styled('div')(({ theme }) => ({
  marginLeft: 'auto',
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  flex: '0 0 auto',
}));

const LabeledSubmitButton = styled(ButtonBase)(({ theme }) => ({
  height: 'var(--scope-button-size)',
  minWidth: 'var(--scope-button-size)',
  width: 'auto',
  borderRadius: '999px',
  padding: theme.spacing(0.66, 1.15),
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing(0.72),
  border: '1px solid transparent',
  background: '#000',
  color: theme.palette.common.white,
  boxShadow: 'none',
  overflow: 'hidden',
  transition: 'padding 300ms cubic-bezier(0.4, 0, 0.2, 1), gap 300ms cubic-bezier(0.4, 0, 0.2, 1), min-width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  '&[data-collapsing="true"]': {
    padding: theme.spacing(0.66, 1),
    gap: 0,
    minWidth: 'var(--scope-button-size)',
  },
  '& .actionLabel': {
    fontFamily: FONT_FAMILY,
    fontWeight: 700,
    fontSize: '0.94rem',
    color: theme.palette.common.white,
    whiteSpace: 'nowrap',
    transformOrigin: 'left center',
    display: 'inline-block',
    maxWidth: '200px',
    overflow: 'hidden',
    transition: 'max-width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    animation: `${labelSwitchIn} 180ms ease both`,
    willChange: 'opacity, transform',
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  },
  '&[data-collapsing="true"] .actionLabel': {
    maxWidth: 0,
  },
  '&.Mui-disabled': {
    background: '#3f3f3f',
    color: '#f0f0f0',
    boxShadow: 'none',
    borderColor: 'transparent',
  },
  '&[data-appearance="dark"]': {
    background: '#f5f5f5',
    color: '#111',
    '& .actionLabel': {
      color: '#111',
    },
    '&.Mui-disabled': {
      background: '#3a3a3a',
      color: 'rgba(200, 200, 200, 0.7)',
      borderColor: 'transparent',
    },
  },
}));

const SubmitButton = styled(IconButton)(({ theme }) => ({
  width: 'var(--scope-button-size)',
  height: 'var(--scope-button-size)',
  padding: theme.spacing(0.66, 1),
  borderRadius: '999px',
  border: '1px solid transparent',
  background: '#000',
  color: theme.palette.common.white,
  boxShadow: 'none',
  '&:hover': {
    background: '#000',
    boxShadow: 'none',
  },
  '&:active': {
    background: '#000',
    boxShadow: 'none',
  },
  '&.Mui-disabled': {
    background: '#3f3f3f',
    color: '#f0f0f0',
    boxShadow: 'none',
    transform: 'none',
    borderColor: 'transparent',
  },
  '&[data-appearance="dark"]': {
    background: '#f5f5f5',
    color: '#111',
    '&:hover': {
      background: '#ffffff',
    },
    '&:active': {
      background: '#f0f0f0',
    },
    '&.Mui-disabled': {
      background: '#3a3a3a',
      color: 'rgba(200, 200, 200, 0.7)',
      borderColor: 'transparent',
    },
  },
}));

type QuickTip = {
  title: string;
  body: string;
  example?: string;
};

const QUICK_TIPS: QuickTip[] = [
  {
    title: 'Exact phrase match',
    body: 'Wrap the quote in double quotes to match it verbatim.',
    example: '"surely you can\'t be serious"',
  },
  {
    title: 'Require or exclude terms',
    body: 'Use +word to require it and -word to exclude it.',
    example: '+shirley -serious',
  },
  {
    title: 'Logical options',
    body: 'Use OR or parentheses when any of several terms is valid.',
    example: '(surely OR shirley) AND serious',
  },
  {
    title: 'Wildcards',
    body: 'Use * to match endings and ? for a single character.',
    example: 'shir* OR ser?ous',
  },
  {
    title: 'Fuzzy Search',
    body: 'Use ~ to match similar terms.',
    example: 'shirley~',
  },
  {
    title: 'Proximity Search',
    body: 'Use ~N to find words within N distance.',
    example: '"surely serious"~5',
  },
  {
    title: 'Boosting',
    body: 'Use ^N to increase term relevance.',
    example: 'speak jive^5',
  },
];

const ClearInputButton = styled(IconButton)(({ theme }) => ({
  width: 32,
  height: 32,
  borderRadius: 16,
  padding: theme.spacing(0.4),
  color: 'rgba(80, 80, 80, 0.78)',
  transition:
    'color 160ms cubic-bezier(0.4, 0, 0.2, 1), background-color 160ms cubic-bezier(0.4, 0, 0.2, 1), transform 160ms cubic-bezier(0.4, 0, 0.2, 1)',
  backgroundColor: 'transparent',
  '&:hover': {
    color: '#2d2d2d',
    backgroundColor: 'rgba(80, 80, 80, 0.16)',
  },
  '&:active': {
    transform: 'scale(0.95)',
  },
  '&.Mui-focusVisible': {
    outline: `2px solid rgba(100, 100, 100, 0.42)`,
    outlineOffset: 2,
  },
  '& svg': {
    fontSize: '1rem',
  },
  '&[data-appearance="dark"]': {
    color: 'rgba(220, 220, 220, 0.78)',
    '&:hover': {
      color: '#ffffff',
      backgroundColor: 'rgba(255, 255, 255, 0.16)',
    },
  },
}));

const ShortcutPanel = styled('div')(({ theme }) => ({
  position: 'absolute',
  left: theme.spacing(1),
  right: theme.spacing(1),
  top: '100%',
  marginTop: theme.spacing(0.75),
  borderRadius: 14,
  background: theme.palette.common.white,
  border: '1px solid rgba(20, 20, 20, 0.08)',
  boxShadow: '0 18px 50px rgba(15, 15, 15, 0.22)',
  padding: theme.spacing(0.5, 0.25, 0.5, 0.25),
  display: 'flex',
  flexDirection: 'column',
  maxHeight: 296,
  overflowY: 'auto',
  zIndex: 12,
  pointerEvents: 'auto',
  '&[data-appearance="dark"]': {
    background: '#1d1d1f',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    boxShadow: '0 18px 50px rgba(0, 0, 0, 0.55)',
  },
  [theme.breakpoints.down('sm')]: {
    left: theme.spacing(0.6),
    right: theme.spacing(0.6),
    marginTop: theme.spacing(0.5),
  },
}));

const ShortcutOptionButton = styled(ButtonBase)(({ theme }) => ({
  borderRadius: 12,
  padding: theme.spacing(0.8, 1),
  display: 'flex',
  width: '100%',
  alignItems: 'center',
  gap: theme.spacing(1),
  justifyContent: 'flex-start',
  textAlign: 'left',
  transition: theme.transitions.create(['background-color', 'transform'], {
    duration: theme.transitions.duration.shortest,
  }),
  '& .shortcutEmoji': {
    fontSize: '1.1rem',
    flexShrink: 0,
  },
  '& .shortcutText': {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  '& .shortcutPrimary': {
    fontWeight: 600,
    fontSize: '0.95rem',
    color: '#161616',
    lineHeight: 1.2,
  },
  '& .shortcutSecondary': {
    fontSize: '0.78rem',
    color: 'rgba(30, 30, 30, 0.64)',
  },
  '& .shortcutCheck': {
    color: theme.palette.primary.main,
    opacity: 0,
    transition: theme.transitions.create('opacity', {
      duration: theme.transitions.duration.shorter,
    }),
  },
  '&[data-active="true"]': {
    background: 'rgba(0, 0, 0, 0.04)',
    transform: 'translateY(-1px)',
    '& .shortcutSecondary': {
      color: 'rgba(30, 30, 30, 0.85)',
    },
  },
  '&[data-selected="true"] .shortcutCheck': {
    opacity: 1,
  },
  '&[data-appearance="dark"]': {
    '& .shortcutPrimary': {
      color: '#f4f4f4',
    },
    '& .shortcutSecondary': {
      color: 'rgba(244, 244, 244, 0.7)',
    },
    '&[data-active="true"]': {
      background: 'rgba(255, 255, 255, 0.08)',
    },
  },
}));

const ShortcutHint = styled('div')(({ theme }) => ({
  padding: theme.spacing(0.5, 1.25, 0.4, 1.25),
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: 0.4,
  color: 'rgba(20, 20, 20, 0.5)',
  textTransform: 'uppercase',
  '&[data-appearance="dark"]': {
    color: 'rgba(255, 255, 255, 0.5)',
  },
}));

const ShortcutEmpty = styled('div')(({ theme }) => ({
  padding: theme.spacing(1.1, 1.25),
  fontSize: '0.88rem',
  color: 'rgba(15, 15, 15, 0.7)',
  '&[data-appearance="dark"]': {
    color: 'rgba(255, 255, 255, 0.6)',
  },
}));

const ShortcutSwitchButton = styled('div')(({ theme }) => ({
  padding: theme.spacing(0.22, 0.8),
  borderRadius: 6,
  fontSize: '0.64rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 1.2,
  border: '1px solid rgba(20, 20, 20, 0.22)',
  color: 'rgba(10, 10, 10, 0.9)',
  background: 'rgba(250, 250, 250, 0.9)',
  '&[data-visible="false"]': {
    opacity: 0,
    transform: 'translateX(6px)',
    pointerEvents: 'none',
  },
  '&[data-visible="true"]': {
    opacity: 1,
    transform: 'translateX(0)',
  },
  '& span': {
    opacity: 0.68,
    fontWeight: 600,
    marginLeft: theme.spacing(0.4),
  },
  '&[data-appearance="dark"]': {
    borderColor: 'rgba(255, 255, 255, 0.25)',
    color: 'rgba(255, 255, 255, 0.92)',
    background: 'rgba(255, 255, 255, 0.08)',
  },
}));

const ScrollableFiltersBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(0.75),
  overflowX: 'auto',
  overflowY: 'hidden',
  WebkitOverflowScrolling: 'touch',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
  maskImage: 'linear-gradient(90deg, black 0%, black 10px, black calc(100% - 35px), rgba(0,0,0,0.6) calc(100% - 20px), transparent 100%)',
  WebkitMaskImage: 'linear-gradient(90deg, black 0%, black 10px, black calc(100% - 35px), rgba(0,0,0,0.6) calc(100% - 20px), transparent 100%)',
  transition: 'mask-image 0.35s cubic-bezier(0.4, 0, 0.2, 1), -webkit-mask-image 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
  '&::-webkit-scrollbar': {
    display: 'none',
  },
  '&[data-scroll-start="false"]': {
    maskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.6) 10px, black 25px, black calc(100% - 35px), rgba(0,0,0,0.6) calc(100% - 20px), transparent 100%)',
    WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.6) 10px, black 25px, black calc(100% - 35px), rgba(0,0,0,0.6) calc(100% - 20px), transparent 100%)',
  },
  '&[data-scroll-end="true"]': {
    maskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.6) 10px, black 25px, black 100%)',
    WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.6) 10px, black 25px, black 100%)',
  },
  '&[data-scroll-start="true"][data-scroll-end="true"]': {
    maskImage: 'linear-gradient(90deg, black 0%, black 100%)',
    WebkitMaskImage: 'linear-gradient(90deg, black 0%, black 100%)',
  },
  [theme.breakpoints.down('sm')]: {
    gap: theme.spacing(0.5),
    maskImage: 'linear-gradient(90deg, black 0%, black 8px, black calc(100% - 28px), rgba(0,0,0,0.6) calc(100% - 16px), transparent 100%)',
    WebkitMaskImage: 'linear-gradient(90deg, black 0%, black 8px, black calc(100% - 28px), rgba(0,0,0,0.6) calc(100% - 16px), transparent 100%)',
    '&[data-scroll-start="false"]': {
      maskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.6) 8px, black 20px, black calc(100% - 28px), rgba(0,0,0,0.6) calc(100% - 16px), transparent 100%)',
      WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.6) 8px, black 20px, black calc(100% - 28px), rgba(0,0,0,0.6) calc(100% - 16px), transparent 100%)',
    },
    '&[data-scroll-end="true"]': {
      maskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.6) 8px, black 20px, black 100%)',
      WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.6) 8px, black 20px, black 100%)',
    },
    '&[data-scroll-start="true"][data-scroll-end="true"]': {
      maskImage: 'linear-gradient(90deg, black 0%, black 100%)',
      WebkitMaskImage: 'linear-gradient(90deg, black 0%, black 100%)',
    },
  },
}));

const ScrollableFiltersWrapper = styled(Box)(({ theme }) => ({
  flex: 1,
  minWidth: 0,
}));

const CurrentFilterChip = styled(ButtonBase)(({ theme }) => ({
  textDecoration: 'none',
  borderRadius: '12px',
  padding: theme.spacing(0.6, 1.5),
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing(0.6),
  whiteSpace: 'nowrap',
  flexShrink: 0,
  cursor: 'pointer',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(0.5, 0.9),
    gap: theme.spacing(0.4),
    borderRadius: '10px',
  },
}));

const RecommendedFilterChip = styled(ButtonBase)(({ theme }) => ({
  textDecoration: 'none',
  backgroundColor: 'rgba(0, 0, 0, 0.01)',
  border: '1px dashed rgba(0, 0, 0, 0.1)',
  borderRadius: '12px',
  padding: theme.spacing(0.55, 1.25),
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing(0.6),
  whiteSpace: 'nowrap',
  flexShrink: 0,
  cursor: 'pointer',
  color: 'rgba(20, 20, 20, 0.58)',
  opacity: 0.78,
  transition: theme.transitions.create(['background-color', 'border-color', 'opacity', 'color'], {
    duration: theme.transitions.duration.shorter,
  }),
  '& .suggestionEmoji': {
    opacity: 0.58,
    color: 'inherit',
  },
  '& .suggestionLabel': {
    color: 'inherit',
    opacity: 0.92,
  },
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.01)',
    borderColor: 'rgba(0, 0, 0, 0.1)',
    color: 'rgba(20, 20, 20, 0.58)',
    opacity: 0.78,
  },
  '&.Mui-focusVisible': {
    outline: `2px solid ${alpha(theme.palette.primary.main, 0.32)}`,
    outlineOffset: 2,
  },
  '&[data-appearance="dark"]': {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px dashed rgba(255, 255, 255, 0.12)',
    color: 'rgba(245, 245, 245, 0.64)',
    '& .suggestionEmoji': {
      opacity: 0.68,
    },
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      borderColor: 'rgba(255, 255, 255, 0.12)',
      color: 'rgba(245, 245, 245, 0.64)',
    },
  },
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(0.45, 0.85),
    gap: theme.spacing(0.4),
    borderRadius: '10px',
  },
}));

function findSeriesItem(currentValueId: string, shows: SeriesItem[], savedCids: SeriesItem[], customFilters: any[]): SeriesItem | undefined {
  if (!currentValueId || currentValueId.startsWith('_')) {
    return undefined;
  }
  return shows.find((s) => s.id === currentValueId) ??
    savedCids.find((s) => s.id === currentValueId) ??
    customFilters.find((s) => s.id === currentValueId);
}

function buildCurrentLabel(currentValueId: string, currentSeries?: SeriesItem): string {
  if (currentValueId === '_universal') return '🌈 All Shows & Movies';
  if (currentValueId === '_favorites') return '⭐ All Favorites';
  if (!currentSeries) return 'Select show or movie';
  const emoji = currentSeries.emoji?.trim();
  const emojiPrefix = emoji ? `${emoji} ` : '';
  return `${emojiPrefix}${currentSeries.title || currentSeries.name}`;
}

const SHORTCUT_TRIGGER_CHAR = '@';
const SHORTCUT_RESULT_LIMIT = 7;
const SEARCH_CARET_STORAGE_KEY = 'memeSRC:pendingSearchCaret';

type ScopeShortcutKind = 'default' | 'series' | 'custom';

type ScopeShortcutOption = {
  id: string;
  primary: string;
  secondary?: string;
  emoji?: string;
  tokens: string[];
  normalizedPrimary: string;
  rank: number;
  kind: ScopeShortcutKind;
};

type ShortcutQueryState = {
  query: string;
  start: number;
  cursor: number;
  mode: 'explicit' | 'implicit';
};

const normalizeShortcutText = (input: string): string =>
  String(input ?? '')
    .toLowerCase()
    .trim()
    .replace(/^the\s+/, '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

const normalizeLooseText = (input: string): string =>
  normalizeShortcutText(input)
    .replace(/[^\p{Letter}\p{Number}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

const removeMatchedWords = (query: string, matchedWords: string[]): string => {
  if (!query || !matchedWords || matchedWords.length === 0) return query;
  const removalSet = new Set(
    matchedWords
      .map((word) => normalizeLooseText(word))
      .filter((word) => Boolean(word))
  );
  if (removalSet.size === 0) return query;
  const removals = Array.from(removalSet);

  const words = query.split(/\s+/);
  const remaining = words.filter((word) => {
    const norm = normalizeLooseText(word);
    if (!norm) return false;
    return !removals.some((remove) => norm === remove || norm.startsWith(remove) || remove.startsWith(norm));
  });
  return remaining.join(' ');
};

const coerceTimestamp = (value: unknown): number => {
  if (!value) return 0;
  const date = new Date(value as any);
  const time = date.getTime();
  return Number.isFinite(time) ? time : 0;
};

const buildShortcutTokens = (...values: Array<string | string[] | undefined | null>): string[] => {
  const tokens: string[] = [];
  values.forEach((value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        const normalized = normalizeShortcutText(item);
        if (normalized) tokens.push(normalized);
      });
      return;
    }
    const normalized = normalizeShortcutText(value);
    if (normalized) tokens.push(normalized);
  });
  return Array.from(new Set(tokens));
};

const isShortcutBoundary = (char?: string): boolean => {
  if (!char) return true;
  return /\s|[(){}\[\],;:"'`]/.test(char);
};

const extractShortcutState = (text: string, cursor: number): ShortcutQueryState | null => {
  if (cursor == null) return null;
  const safeCursor = Math.max(0, Math.min(text.length, cursor));
  let index = safeCursor - 1;
  while (index >= 0) {
    const char = text[index];
    if (char === SHORTCUT_TRIGGER_CHAR) {
      const prev = text[index - 1];
      if (!isShortcutBoundary(prev)) {
        return null;
      }
      const query = text.slice(index + 1, safeCursor);
      return {
        query,
        start: index,
        cursor: safeCursor,
        mode: 'explicit',
      };
    }
    if (char === ' ') {
      index -= 1;
      continue;
    }
    if (/\s/.test(char)) {
      return null;
    }
    index -= 1;
  }
  const leadingSlice = text.slice(0, safeCursor);
  const trimmedLeading = leadingSlice.replace(/^\s+/, '');
  if (!trimmedLeading) {
    return null;
  }
  const start = safeCursor - trimmedLeading.length;
  const prefixBeforeStart = leadingSlice.slice(0, Math.max(0, start)).replace(/\s+/g, '');
  if (prefixBeforeStart.length > 0) {
    return null;
  }
  return {
    query: trimmedLeading,
    start,
    cursor: safeCursor,
    mode: 'implicit',
  };
};

const shortcutStateEquals = (a: ShortcutQueryState | null, b: ShortcutQueryState | null): boolean => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.query === b.query && a.start === b.start && a.cursor === b.cursor && a.mode === b.mode;
};

const evaluateShortcutScore = (tokens: string[], query: string): number => {
  if (!query) return 0;
  const normalizedQuery = normalizeShortcutText(query);
  if (!normalizedQuery) return 0;
  let best = Number.POSITIVE_INFINITY;
  tokens.forEach((token) => {
    if (!token) return;
    if (token === normalizedQuery) {
      best = Math.min(best, 0);
      return;
    }
    if (token.startsWith(normalizedQuery)) {
      best = Math.min(best, 1);
      return;
    }
    const index = token.indexOf(normalizedQuery);
    if (index >= 0) {
      best = Math.min(best, 2 + index / 100);
    }
  });
  return best;
};

const persistPendingCaret = (caret: number) => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SEARCH_CARET_STORAGE_KEY, String(caret));
  } catch {
    // ignore storage failures
  }
};

export const UnifiedSearchBar: React.FC<UnifiedSearchBarProps> = ({
  value,
  placeholder = "What's the quote?",
  onValueChange,
  onSubmit,
  onClear,
  onRandom,
  isRandomLoading,
  shows,
  savedCids,
  currentValueId,
  includeAllFavorites,
  onSelectSeries,
  onClarifySearch,
  appearance: propAppearance = 'light',
  inputRef: externalInputRef,
}) => {
  const { groups } = useSearchFilterGroups();
  const { themePreference, setThemePreference, compactMode, setCompactMode, effectiveTheme } = useSearchSettings();
  const navigate = useNavigate();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorAnchorEl, setSelectorAnchorEl] = useState<HTMLElement | null>(null);
  const [internalRandomLoading, setInternalRandomLoading] = useState(false);
  const [settingsAnchorEl, setSettingsAnchorEl] = useState<null | HTMLElement>(null);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const internalInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = externalInputRef || internalInputRef;
  const shouldRestoreFocusRef = useRef(false);
  const helpDialogTitleId = useId();
  const helpDialogDescriptionId = useId();
  const lastSelectionRef = useRef<number>(value.length);
  const [shortcutState, setShortcutState] = useState<ShortcutQueryState | null>(null);
  const [shortcutActiveIndex, setShortcutActiveIndex] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);
  const [stableQuery, setStableQuery] = useState(value);
  const [recommendationVersion, setRecommendationVersion] = useState(0);
  const appliedRecommendationVersionRef = useRef(0);
  const lastChangeWasTypingRef = useRef(false);
  const lastFilterIdRef = useRef(currentValueId);
  const filtersScrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollState, setScrollState] = useState({ atStart: true, atEnd: false });

  const customFilters = useMemo<SeriesItem[]>(() => {
    return groups.map(g => {
      try {
        const parsed = JSON.parse(g.filters);
        return {
          id: g.id,
          title: g.name,
          name: g.name,
          emoji: parsed.emoji,
          items: parsed.items,
          colorMain: parsed.colorMain,
          colorSecondary: parsed.colorSecondary
        };
      } catch (e) {
        return {
          id: g.id,
          title: g.name,
          name: g.name,
          emoji: '📁',
          items: []
        };
      }
    });
  }, [groups]);

  // Use effectiveTheme if the prop is 'light' (default fallback), otherwise respect the prop (e.g. 'dark' from a show)
  const appearance = propAppearance === 'light' ? effectiveTheme : propAppearance;

  const currentSeries = useMemo(
    () => findSeriesItem(currentValueId, shows, savedCids, customFilters),
    [currentValueId, savedCids, shows, customFilters],
  );



  const currentLabel = useMemo(
    () => buildCurrentLabel(currentValueId, currentSeries),
    [currentSeries, currentValueId],
  );

  const scopeGlyph = useMemo(() => {
    if (currentValueId === '_universal') return '🌈';
    if (currentValueId === '_favorites') return '⭐';
    const trimmedEmoji = currentSeries?.emoji?.trim();
    if (trimmedEmoji) return trimmedEmoji;
    const source = currentSeries?.title ?? currentSeries?.name ?? currentLabel;
    const trimmed = source.trim();
    if (!trimmed) return '∙';
    const [glyph] = Array.from(trimmed);
    if (!glyph) return '∙';
    const upper = glyph.toLocaleUpperCase();
    const lower = glyph.toLocaleLowerCase();
    if (upper !== lower) return upper;
    return glyph;
  }, [currentLabel, currentSeries, currentValueId]);

  const scopeShortcutOptions = useMemo<ScopeShortcutOption[]>(() => {
    const map = new Map<string, ScopeShortcutOption>();

    const upsertOption = (option: ScopeShortcutOption) => {
      if (!option.primary) return;
      if (!map.has(option.id) || option.kind === 'custom') {
        map.set(option.id, option);
      }
    };

    const upsertSeriesOption = (series: SeriesItem, kind: ScopeShortcutKind) => {
      if (!series?.id) return;
      const label = series.title || series.name;
      if (!label) return;
      const extendedSeries = series as SeriesItem & { slug?: string; cleanTitle?: string; shortId?: string };
      const option: ScopeShortcutOption = {
        id: series.id,
        primary: label,
        secondary: kind === 'custom' ? 'Custom filter' : 'Direct index',
        emoji: series.emoji?.trim(),
        tokens: buildShortcutTokens(
          label,
          series.name,
          series.id,
          extendedSeries.slug,
          extendedSeries.cleanTitle,
          extendedSeries.shortId,
        ),
        normalizedPrimary: normalizeShortcutText(label),
        rank: kind === 'custom' ? 2 : 3,
        kind,
      };
      upsertOption(option);
    };

    shows?.forEach((item) => upsertSeriesOption(item, 'series'));
    savedCids?.forEach((item) => upsertSeriesOption(item, 'series'));
    customFilters?.forEach((item) => upsertSeriesOption(item as SeriesItem, 'custom'));

    if (includeAllFavorites) {
      upsertOption({
        id: '_favorites',
        primary: 'Favorites',
        secondary: 'Every saved favorite quote',
        emoji: '⭐',
        tokens: buildShortcutTokens('favorites', 'favorite', 'fav', 'all favorites'),
        normalizedPrimary: normalizeShortcutText('Favorites'),
        rank: 0,
        kind: 'default',
      });
    }

    upsertOption({
      id: '_universal',
      primary: 'Everything',
      secondary: 'Search entire catalog',
      emoji: '🌈',
      tokens: buildShortcutTokens('all', 'everything', 'universal', 'global', 'movies', 'shows'),
      normalizedPrimary: normalizeShortcutText('Everything'),
      rank: includeAllFavorites ? 1 : 0,
      kind: 'default',
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.primary.localeCompare(b.primary);
    });
  }, [shows, savedCids, customFilters, includeAllFavorites]);

  const filterMatchSections = useMemo(() => {
    const trimmedValue = stableQuery.trim();
    const normalizedQueryLoose = normalizeLooseText(trimmedValue);
    const queryTokens = normalizedQueryLoose
      ? normalizedQueryLoose.split(/\s+/).filter((token) => token.length >= 2)
      : [];
    const boundaryTokens = queryTokens.length > 0
      ? Array.from(new Set([queryTokens[0], queryTokens[queryTokens.length - 1]].filter(Boolean)))
      : [];
    const shouldBoostWithQuery = boundaryTokens.length > 0;

    const excludedIds = new Set([currentValueId].filter(Boolean));
    const entryMap = new Map<string, { option: ScopeShortcutOption; matchedWords: Set<string> }>();
    const baseOrder: string[] = [];

    const addOption = (option?: ScopeShortcutOption | null, matchedWords: string[] = []) => {
      if (!option || !option.id || excludedIds.has(option.id)) return;
      let entry = entryMap.get(option.id);
      if (!entry) {
        entry = { option, matchedWords: new Set<string>() };
        entryMap.set(option.id, entry);
        baseOrder.push(option.id);
      }
      matchedWords.filter(Boolean).forEach((word) => entry!.matchedWords.add(normalizeLooseText(word)));
    };

    const addOptions = (options: Array<ScopeShortcutOption | undefined | null>) => {
      options.forEach((opt) => addOption(opt));
    };

    const getOptionById = (id?: string | null) => scopeShortcutOptions.find((opt) => opt.id === id);

    const getOptionsForIds = (ids: Array<string | undefined>) =>
      ids
        .map((id) => getOptionById(id))
        .filter((opt): opt is ScopeShortcutOption => Boolean(opt) && !excludedIds.has(opt!.id));

    const favoriteShows = (shows || []).filter((show) => show.isFavorite);
    const favoritesByUpdated = [...favoriteShows].sort(
      (a, b) =>
        coerceTimestamp(b?.updatedAt || (b as any)?.createdAt) - coerceTimestamp(a?.updatedAt || (a as any)?.createdAt)
    );
    const favoriteOptions = favoritesByUpdated
      .map((show) => getOptionById(show.id))
      .filter((opt): opt is ScopeShortcutOption => Boolean(opt) && !excludedIds.has(opt!.id));

    const recentShowOptions = (shows || [])
      .slice()
      .sort(
        (a, b) =>
          coerceTimestamp(b?.updatedAt || (b as any)?.createdAt) -
          coerceTimestamp(a?.updatedAt || (a as any)?.createdAt)
      )
      .map((show) => getOptionById(show.id))
      .filter((opt): opt is ScopeShortcutOption => Boolean(opt) && !excludedIds.has(opt!.id));

    const addRecentUntil = (limit: number) => {
      for (let i = 0; i < recentShowOptions.length && entryMap.size < limit; i += 1) {
        addOption(recentShowOptions[i]);
      }
    };

    // Custom filter group - show items within the group
    if (currentValueId && currentValueId.startsWith('custom_')) {
      const customFilter = customFilters.find((f) => f.id === currentValueId);
      if (customFilter?.items) {
        const groupItems = getOptionsForIds(customFilter.items);
        addOptions(groupItems);
      }
    }

    // Favorites scope
    if (currentValueId === '_favorites') {
      addOptions(favoriteOptions);
    }

    // Universal scope
    if (currentValueId === '_universal') {
      if (includeAllFavorites) {
        addOption(getOptionById('_favorites'));
        addOptions(favoriteOptions);
      }
      addRecentUntil(10);
    }

    // Specific show - still offer favorites toggle if applicable
    const isSpecificShow = currentValueId && !currentValueId.startsWith('_') && !currentValueId.startsWith('custom_');
    if (isSpecificShow && includeAllFavorites) {
      addOption(getOptionById('_favorites'));
    }

    // Backfill with favorites/recent to hit ~10 items
    if (entryMap.size < 10) {
      addOptions(favoriteOptions);
    }
    addRecentUntil(10);

    // Final fallback: any remaining options to avoid empties
    if (entryMap.size < 10) {
      scopeShortcutOptions.forEach((opt) => addOption(opt));
    }

    if (entryMap.size === 0) {
      addOption(getOptionById(currentValueId));
    }

    const baseOrdered = baseOrder
      .map((id) => entryMap.get(id))
      .filter((entry): entry is { option: ScopeShortcutOption; matchedWords: Set<string> } => Boolean(entry));
    const baseIndexMap = new Map<string, number>();
    baseOrdered.forEach((opt, idx) => {
      baseIndexMap.set(opt.option.id, idx);
    });

    let prioritized: Array<{ option: ScopeShortcutOption; matchedWords: Set<string> }> = [];

    if (shouldBoostWithQuery) {
      const queryMatches = scopeShortcutOptions
        .filter((option) => option?.id && !excludedIds.has(option.id))
        .map((option) => {
          const primaryTokens = normalizeLooseText(option.primary).split(/\s+/).filter(Boolean);
          const tokenSet = new Set<string>(
            [
              ...primaryTokens,
              ...(Array.isArray(option.tokens) ? option.tokens.map(normalizeLooseText) : []),
            ].filter((token) => Boolean(token) && token.length >= 2)
          );

          const allMatches = queryTokens.filter((queryToken) => {
            return Array.from(tokenSet).some(
              (token) =>
                token === queryToken ||
                token.startsWith(queryToken) ||
                queryToken.startsWith(token)
            );
          });

          const boundaryMatches = boundaryTokens.filter((queryToken) => {
            return Array.from(tokenSet).some(
              (token) =>
                token === queryToken ||
                token.startsWith(queryToken) ||
                queryToken.startsWith(token)
            );
          });

          const matchScore = boundaryMatches.length > 0 ? 0 : Number.POSITIVE_INFINITY;
          const baseIndex = baseIndexMap.has(option.id) ? baseIndexMap.get(option.id)! : Number.POSITIVE_INFINITY;

          return {
            option,
            matches: allMatches,
            boundaryMatches,
            matchScore,
            baseIndex,
          };
        })
        .filter(({ matchScore, boundaryMatches }) => boundaryMatches.length > 0 && Number.isFinite(matchScore))
        .sort((a, b) => {
          if (a.matchScore !== b.matchScore) return a.matchScore - b.matchScore;
          if (a.matches.length !== b.matches.length) return b.matches.length - a.matches.length;
          return a.baseIndex - b.baseIndex;
        })
        .map(({ option, matches }) => {
          addOption(option, matches);
          return entryMap.get(option.id)!;
        });

      prioritized = queryMatches;
    }

    const final: Array<{ option: ScopeShortcutOption; matchedWords: Set<string> }> = [];
    const pushUnique = (entry?: { option: ScopeShortcutOption; matchedWords: Set<string> } | null) => {
      if (!entry || !entry.option?.id) return;
      if (final.some((existing) => existing.option.id === entry.option.id)) return;
      final.push(entry);
    };

    prioritized.forEach((entry) => pushUnique(entry));
    baseOrdered.forEach((entry) => pushUnique(entry));
    scopeShortcutOptions.forEach((opt) => pushUnique(entryMap.get(opt.id)));

    return {
      recommended: final.slice(0, 10).map((entry) => ({
        ...entry.option,
        matchedWords: Array.from(entry.matchedWords),
      })),
    };
  }, [currentValueId, customFilters, includeAllFavorites, scopeShortcutOptions, shows, stableQuery]);

  const hasInput = value.trim().length > 0;
  const { recommended: recommendedFilters } = filterMatchSections;
  const [displayedRecommendations, setDisplayedRecommendations] = useState(recommendedFilters);

  const commitRecommendations = useCallback((nextQuery?: string) => {
    const normalized = typeof nextQuery === 'string' ? nextQuery : value;
    setStableQuery(normalized);
    setRecommendationVersion((prev) => prev + 1);
  }, [value]);
  const resetFilterScroll = useCallback(() => {
    if (filtersScrollRef.current) {
      filtersScrollRef.current.scrollTo({ left: 0, behavior: 'auto' });
    }
  }, []);

  const updateScrollState = useCallback(() => {
    const el = filtersScrollRef.current;
    if (!el) return;

    const scrollLeft = el.scrollLeft;
    const scrollWidth = el.scrollWidth;
    const clientWidth = el.clientWidth;
    const threshold = 10;

    setScrollState({
      atStart: scrollLeft <= threshold,
      atEnd: scrollLeft >= scrollWidth - clientWidth - threshold,
    });
  }, []);

  useEffect(() => {
    const el = filtersScrollRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });

    return () => {
      el.removeEventListener('scroll', updateScrollState);
    };
  }, [updateScrollState]);

  useEffect(() => {
    const inSyncWithInput = value === stableQuery;
    if (inSyncWithInput) {
      appliedRecommendationVersionRef.current = recommendationVersion;
      setDisplayedRecommendations(recommendedFilters);
      // Update scroll state after recommendations change
      requestAnimationFrame(() => {
        updateScrollState();
      });
      return;
    }
    if (recommendationVersion !== appliedRecommendationVersionRef.current) {
      appliedRecommendationVersionRef.current = recommendationVersion;
      setDisplayedRecommendations(recommendedFilters);
      // Update scroll state after recommendations change
      requestAnimationFrame(() => {
        updateScrollState();
      });
    }
  }, [recommendationVersion, recommendedFilters, stableQuery, value, updateScrollState]);

  useEffect(() => {
    if (currentValueId !== lastFilterIdRef.current) {
      lastFilterIdRef.current = currentValueId;
      commitRecommendations();
    }
  }, [commitRecommendations, currentValueId]);

  useEffect(() => {
    resetFilterScroll();
    // Update scroll state after reset
    requestAnimationFrame(() => {
      updateScrollState();
    });
  }, [currentValueId, resetFilterScroll, updateScrollState]);

  useEffect(() => {
    if (lastChangeWasTypingRef.current) {
      lastChangeWasTypingRef.current = false;
      return;
    }
    if (value !== stableQuery) {
      commitRecommendations(value);
    }
  }, [commitRecommendations, stableQuery, value]);

  const updateShortcutState = useCallback(
    (nextValue: string, selectionPosition?: number | null) => {
      const resolvedSelection =
        typeof selectionPosition === 'number' && Number.isFinite(selectionPosition)
          ? selectionPosition
          : nextValue.length;
      const derived = extractShortcutState(nextValue, resolvedSelection);
      setShortcutState((prev) => (shortcutStateEquals(prev, derived) ? prev : derived));
    },
    [],
  );

  useEffect(() => {
    updateShortcutState(value, lastSelectionRef.current);
  }, [updateShortcutState, value]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let storedCaret: number | null = null;
    try {
      const raw = window.sessionStorage.getItem(SEARCH_CARET_STORAGE_KEY);
      if (raw !== null) {
        window.sessionStorage.removeItem(SEARCH_CARET_STORAGE_KEY);
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) {
          storedCaret = parsed;
        }
      }
    } catch {
      storedCaret = null;
    }
    if (storedCaret === null) return;
    requestAnimationFrame(() => {
      const target = inputRef.current;
      if (!target) return;
      const length = target.value?.length ?? 0;
      const caret = Math.max(0, Math.min(length, storedCaret ?? 0));
      target.focus();
      target.setSelectionRange(caret, caret);
    });
  }, []);

  const shortcutSuggestions = useMemo(() => {
    if (!shortcutState) return [];
    const normalizedQuery = normalizeShortcutText(shortcutState.query);
    if (!normalizedQuery) {
      return scopeShortcutOptions.slice(0, SHORTCUT_RESULT_LIMIT);
    }
    return scopeShortcutOptions
      .map((option) => ({
        option,
        score: evaluateShortcutScore(option.tokens, normalizedQuery),
      }))
      .filter(({ score }) => Number.isFinite(score))
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        if (a.option.rank !== b.option.rank) return a.option.rank - b.option.rank;
        return a.option.primary.localeCompare(b.option.primary);
      })
      .slice(0, SHORTCUT_RESULT_LIMIT)
      .map(({ option }) => option);
  }, [scopeShortcutOptions, shortcutState]);

  useEffect(() => {
    if (!shortcutState || shortcutSuggestions.length === 0) {
      setShortcutActiveIndex(0);
      return;
    }

    if (shortcutState.mode === 'implicit') {
      setShortcutActiveIndex(-1);
    } else {
      setShortcutActiveIndex((prev) => {
        if (prev < 0) return 0;
        return Math.min(prev, shortcutSuggestions.length - 1);
      });
    }
  }, [shortcutState, shortcutSuggestions.length]);

  const scheduleShortcutRefresh = useCallback(() => {
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      const selection = inputRef.current.selectionStart ?? value.length;
      lastSelectionRef.current = selection;
      updateShortcutState(value, selection);
    });
  }, [updateShortcutState, value]);

  const applyShortcutOption = useCallback(
    (option: ScopeShortcutOption) => {
      if (!shortcutState) return;
      const inputEl = inputRef.current;
      const inputValue = inputEl?.value ?? value;
      const { start } = shortcutState;
      const liveCursor = inputEl?.selectionEnd ?? shortcutState.cursor;
      const cursor = Math.max(start, Math.min(liveCursor, inputValue.length));
      const before = inputValue.slice(0, start);
      let after = inputValue.slice(cursor);

      const beforeEndsWithSpace = /\s$/.test(before);
      const afterStartsWithSpace = /^\s/.test(after);

      if (!before) {
        after = after.replace(/^\s+/, '');
      } else if (!after) {
        // nothing else to normalize
      } else if (!beforeEndsWithSpace && !afterStartsWithSpace) {
        after = ` ${after}`;
      } else if (beforeEndsWithSpace && afterStartsWithSpace) {
        after = after.replace(/^\s+/, ' ');
      } else if (!beforeEndsWithSpace && afterStartsWithSpace) {
        after = after.replace(/^ +/, ' ');
      }

      const caret = before.length;
      const nextValue = `${before}${after}`;
      persistPendingCaret(caret);
      if (inputEl) {
        inputEl.value = nextValue;
        inputEl.setSelectionRange(caret, caret);
      }
      onValueChange(nextValue);
      onSelectSeries(option.id);
      setShortcutState(null);
      setShortcutActiveIndex(0);
      lastSelectionRef.current = caret;
      requestAnimationFrame(() => {
        const selection = Math.max(0, Math.min(inputRef.current?.value?.length ?? caret, caret));
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(selection, selection);
      });
    },
    [shortcutState, value, onValueChange, onSelectSeries],
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;
      const selection = event.target.selectionStart ?? nextValue.length;
      lastSelectionRef.current = selection;
      lastChangeWasTypingRef.current = true;
      onValueChange(nextValue);
      updateShortcutState(nextValue, selection);
    },
    [onValueChange, updateShortcutState],
  );

  const handleFilterClick = useCallback((anchor: HTMLElement) => {
    // open selector without forcing expansion
    setSelectorAnchorEl(anchor);
    setSelectorOpen(true);
  }, []);

  const handleCloseSelector = useCallback(() => {
    setSelectorOpen(false);
    setSelectorAnchorEl(null);
  }, []);

  const handleSelect: OnSelectSeries = useCallback(
    (selectedId) => {
      onSelectSeries(selectedId);
      resetFilterScroll();
      handleCloseSelector();
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    },
    [handleCloseSelector, onSelectSeries, resetFilterScroll],
  );

  const handleClear = useCallback(() => {
    onClear();
    lastSelectionRef.current = 0;
    setShortcutState(null);
  }, [onClear]);

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (shortcutState) {
        const hasResults = shortcutSuggestions.length > 0;
        const isExplicitShortcut = shortcutState.mode === 'explicit';
        if (hasResults && event.key === 'ArrowDown') {
          event.preventDefault();
          setShortcutActiveIndex((prev) => {
            if (prev === -1) return 0;
            return (prev + 1) % shortcutSuggestions.length;
          });
          return;
        }
        if (hasResults && event.key === 'ArrowUp') {
          event.preventDefault();
          setShortcutActiveIndex((prev) => {
            if (prev === -1) return shortcutSuggestions.length - 1;
            return (prev - 1 + shortcutSuggestions.length) % shortcutSuggestions.length;
          });
          return;
        }
        if (event.key === 'Tab' && !event.shiftKey && hasResults) {
          event.preventDefault();
          const option = shortcutSuggestions[shortcutActiveIndex] ?? shortcutSuggestions[0];
          if (option) {
            applyShortcutOption(option);
          }
          return;
        }
        if (event.key === 'Enter') {
          if (isExplicitShortcut && hasResults) {
            event.preventDefault();
            const option = shortcutSuggestions[shortcutActiveIndex] ?? shortcutSuggestions[0];
            if (option) {
              applyShortcutOption(option);
            }
            return;
          }
          if (!isExplicitShortcut) {
            if (hasResults && shortcutActiveIndex !== -1) {
              event.preventDefault();
              const option = shortcutSuggestions[shortcutActiveIndex];
              if (option) {
                applyShortcutOption(option);
              }
              return;
            }
            setShortcutState(null);
            return;
          }
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          setShortcutState(null);
          return;
        }
      }

      if (event.key === 'Escape' && value.trim()) {
        event.preventDefault();
        handleClear();
      }
    },
    [applyShortcutOption, handleClear, shortcutActiveIndex, shortcutState, shortcutSuggestions, value],
  );

  const handleInputFocus = useCallback(() => {
    setInputFocused(true);
    scheduleShortcutRefresh();
  }, [scheduleShortcutRefresh]);

  const handleInputBlur = useCallback(() => {
    setInputFocused(false);
    shouldRestoreFocusRef.current = false;
    setShortcutState(null);
  }, []);

  const handleRandomPointerDown = useCallback(() => {
    if (typeof document === 'undefined') {
      shouldRestoreFocusRef.current = false;
      return;
    }
    shouldRestoreFocusRef.current = document.activeElement === inputRef.current;
  }, []);

  const randomLoading = isRandomLoading ?? internalRandomLoading;

  const handleRandomClick = useCallback(() => {
    if (!onRandom || randomLoading) {
      shouldRestoreFocusRef.current = false;
      return;
    }

    const shouldRestoreFocus = shouldRestoreFocusRef.current;
    const restoreFocus = () => {
      requestAnimationFrame(() => {
        if (shouldRestoreFocus) {
          inputRef.current?.focus();
        }
        shouldRestoreFocusRef.current = false;
      });
    };

    const result = onRandom();

    if (isRandomLoading === undefined && isPromiseLike(result)) {
      setInternalRandomLoading(true);
      Promise.resolve(result)
        .catch(() => undefined)
        .finally(() => {
          setInternalRandomLoading(false);
          restoreFocus();
        });
      return;
    }

    restoreFocus();
  }, [onRandom, randomLoading, isRandomLoading]);

  const handleFormSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      const result = onSubmit(event);
      commitRecommendations(value);
      return result;
    },
    [commitRecommendations, onSubmit, value],
  );

  // Expansion is now controlled by preference, not input
  const scopeExpanded = !compactMode;

  // Controls move to second line when expanded
  // SubmitButton now uses consistent black styling; disabled state is dark grey
  const scopeButtonLabel = scopeExpanded
    ? `Choose series: ${currentLabel}`
    : `Show filter options for ${currentLabel}`;

  const shortcutPanelVisible = Boolean(shortcutState);
  const shortcutHasResults = shortcutSuggestions.length > 0;
  const shouldRenderShortcutPanel = shortcutPanelVisible && shortcutHasResults && inputFocused;
  const shouldShowShortcutHint = Boolean(!shortcutState?.query || shortcutState?.start === 0);

  const handleScopeClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    handleFilterClick(event.currentTarget);
  }, [handleFilterClick]);

  const handleEditFilter = (filter: SeriesItem) => {
    navigate(`/search/filter/edit/${filter.id}`);
  };

  const handleOpenEditor = () => {
    navigate('/search/filter/edit');
  };

  const handleOpenSettings = (event: React.MouseEvent<HTMLElement>) => {
    setSettingsAnchorEl(event.currentTarget);
  };

  const handleCloseSettings = () => {
    setSettingsAnchorEl(null);
  };

  const handleOpenHelpDialog = () => {
    handleCloseSettings();
    setHelpDialogOpen(true);
  };

  const handleCloseHelpDialog = () => {
    setHelpDialogOpen(false);
  };

  const handleSwitchToFilter = useCallback((filterId: string, matchedWords?: string[]) => {
    if (matchedWords && matchedWords.length > 0) {
      const stripped = removeMatchedWords(value, matchedWords).trim();
      if (stripped !== value) {
        onValueChange(stripped);
        onClarifySearch?.({ original: value, stripped });
      }
    }
    onSelectSeries(filterId);
    resetFilterScroll();
  }, [onClarifySearch, onSelectSeries, onValueChange, resetFilterScroll, value]);

  const currentSeriesOption = scopeShortcutOptions.find(opt => opt.id === currentValueId);

  return (
    <FormRoot onSubmit={handleFormSubmit} noValidate>
      <FieldShell
        data-expanded={scopeExpanded ? 'true' : 'false'}
        data-appearance={appearance}
        data-shortcut-open={shouldRenderShortcutPanel ? 'true' : 'false'}
      >
        <FieldRow data-expanded={scopeExpanded ? 'true' : 'false'} data-appearance={appearance}>
          {!scopeExpanded && (
            <ScopeSelectorButton
              type="button"
              onClick={handleScopeClick}
              data-expanded="false"
              data-appearance={appearance}
              aria-expanded={scopeExpanded}
              aria-pressed={scopeExpanded}
              aria-label={scopeButtonLabel}
              aria-haspopup="listbox"
              title={currentLabel}
            >
              <ScopeGlyph>{scopeGlyph}</ScopeGlyph>
              <ArrowDropDownIcon fontSize="small" className="collapsedIcon" aria-hidden="true" />
            </ScopeSelectorButton>
          )}
          <StyledInput
            value={value}
            inputRef={inputRef}
            placeholder={placeholder}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onBlur={handleInputBlur}
            onFocus={handleInputFocus}
            onClick={scheduleShortcutRefresh}
            onMouseUp={scheduleShortcutRefresh}
            onKeyUp={scheduleShortcutRefresh}
            onSelect={scheduleShortcutRefresh}
            data-appearance={appearance}
            inputProps={{
              autoComplete: 'off',
              autoCorrect: 'off',
              spellCheck: 'false',
              'aria-autocomplete': 'none',
            }}
            sx={{
              '& input': (theme) => ({
                padding: scopeExpanded ? theme.spacing(0.72, 0.66) : theme.spacing(0.9, 1),
                transition: 'padding 220ms cubic-bezier(0.4, 0, 0.2, 1)',
              }),
            }}
          />
          {hasInput && (
            <ClearInputButton
              type="button"
              onClick={handleClear}
              onPointerDown={(event) => event.preventDefault()}
              aria-label="Clear search"
              data-appearance={appearance}
              title="Clear"
            >
              <CloseRoundedIcon fontSize="small" />
            </ClearInputButton>
          )}
          {!scopeExpanded && (
            <>
              {hasInput ? (
                <SubmitButton
                  type="submit"
                  aria-label="Search"
                  disabled={!hasInput}
                  title="Search"
                  data-appearance={appearance}
                >
                  <ArrowForwardRoundedIcon sx={{ fontSize: '16px' }} />
                </SubmitButton>
              ) : (
                <>
                  <SettingsButton
                    type="button"
                    aria-label="Settings"
                    onClick={handleOpenSettings}
                    title="Settings"
                    data-appearance={appearance}
                  >
                    <SettingsIcon size={16} strokeWidth={2.4} aria-hidden="true" focusable="false" />
                  </SettingsButton>
                  <SubmitButton
                    type="button"
                    aria-label="Show something random"
                    onClick={handleRandomClick}
                    onPointerDown={handleRandomPointerDown}
                    disabled={randomLoading}
                    aria-busy={randomLoading}
                    title="Random"
                    data-appearance={appearance}
                  >
                    {randomLoading ? (
                      <CircularProgress size={16} thickness={5} sx={{ color: 'currentColor' }} />
                    ) : (
                      <ShuffleIcon size={16} strokeWidth={2.4} aria-hidden="true" focusable="false" />
                    )}
                  </SubmitButton>
                </>
              )}
            </>
          )}
        </FieldRow>
        {shouldRenderShortcutPanel && (
          <ShortcutPanel
            role="listbox"
            aria-label="Choose a scope shortcut"
            data-appearance={appearance}
          >
            {shouldShowShortcutHint && (
              <ShortcutHint data-appearance={appearance}>Jump to a show or filter</ShortcutHint>
            )}
            {shortcutSuggestions.map((option, index) => (
              <ShortcutOptionButton
                key={option.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applyShortcutOption(option)}
                onMouseEnter={() => setShortcutActiveIndex(index)}
                data-active={index === shortcutActiveIndex ? 'true' : 'false'}
                data-selected={option.id === currentValueId ? 'true' : 'false'}
                data-appearance={appearance}
                role="option"
                aria-selected={index === shortcutActiveIndex}
                tabIndex={-1}
              >
                <span className="shortcutEmoji" aria-hidden="true">
                  {option.emoji ?? '∙'}
                </span>
                <span className="shortcutText">
                  <Typography component="span" className="shortcutPrimary" noWrap>
                    {option.primary}
                  </Typography>
                  {option.secondary && (
                    <Typography component="span" className="shortcutSecondary" noWrap>
                      {option.secondary}
                    </Typography>
                  )}
                </span>
                <ShortcutSwitchButton
                  data-visible={index === shortcutActiveIndex ? 'true' : 'false'}
                  data-appearance={appearance}
                  className="shortcutSwitch"
                >
                  SWITCH
                </ShortcutSwitchButton>
                <CheckRoundedIcon className="shortcutCheck" fontSize="small" />
              </ShortcutOptionButton>
            ))}
          </ShortcutPanel>
        )}
        <Collapse in={scopeExpanded} timeout={260} unmountOnExit>
          <ControlsRail data-expanded={scopeExpanded ? 'true' : 'false'} data-appearance={appearance}>
            {/* Filter indicator with current filter and recommendations - fills left side */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 0.5, sm: 1 },
              flex: 1,
              minWidth: 0
            }}>
              {/* Current filter - static on desktop, scrollable on mobile */}
              <Box sx={{
                display: { xs: 'none', sm: 'flex' },
                flexShrink: 0
              }}>
                {currentValueId && currentValueId !== '_universal' && currentSeriesOption ? (
                  <CurrentFilterChip
                    onClick={handleScopeClick}
                    sx={{
                      backgroundColor: appearance === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
                      border: appearance === 'dark' ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(0,0,0,0.25)',
                      '&:hover': {
                        backgroundColor: appearance === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
                        borderColor: appearance === 'dark' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
                      },
                    }}
                  >
                    {currentSeriesOption.emoji && (
                      <Typography sx={{ fontSize: '0.95rem', lineHeight: 1 }}>
                        {currentSeriesOption.emoji}
                      </Typography>
                    )}
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: appearance === 'dark' ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.9)',
                        lineHeight: 1,
                        fontSize: '0.85rem'
                      }}
                    >
                      {currentSeriesOption.primary}
                    </Typography>
                    <ArrowDropDownIcon sx={{ fontSize: '1.1rem', ml: -0.2, opacity: 0.7 }} />
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSeries('_universal');
                      }}
                      sx={{
                        ml: -0.5,
                        mr: -0.5,
                        width: 20,
                        height: 20,
                        padding: 0,
                        color: appearance === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
                        '&:hover': {
                          backgroundColor: 'transparent',
                          color: appearance === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
                        },
                      }}
                    >
                      <CloseIcon sx={{ fontSize: '0.9rem' }} />
                    </IconButton>
                  </CurrentFilterChip>
                ) : (
                  <CurrentFilterChip
                    onClick={handleScopeClick}
                    sx={{
                      backgroundColor: appearance === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
                      border: appearance === 'dark' ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(0,0,0,0.25)',
                      '&:hover': {
                        backgroundColor: appearance === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
                        borderColor: appearance === 'dark' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
                      },
                    }}
                  >
                    <Typography sx={{ fontSize: '0.95rem', lineHeight: 1 }}>
                      🌈
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: appearance === 'dark' ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.9)',
                        lineHeight: 1,
                        fontSize: '0.85rem'
                      }}
                    >
                      All
                    </Typography>
                    <ArrowDropDownIcon sx={{ fontSize: '1.1rem', ml: -0.5 }} />
                  </CurrentFilterChip>
                )}
              </Box>

              {/* Scrollable area - includes current filter on mobile */}
              <ScrollableFiltersWrapper data-appearance={appearance}>
                <ScrollableFiltersBox
                  ref={filtersScrollRef}
                  data-scroll-start={scrollState.atStart ? 'true' : 'false'}
                  data-scroll-end={scrollState.atEnd ? 'true' : 'false'}
                >
                {/* Current filter on mobile only */}
                <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                  {currentValueId && currentValueId !== '_universal' && currentSeriesOption ? (
                    <CurrentFilterChip
                    onClick={handleScopeClick}
                    sx={{
                      backgroundColor: appearance === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
                      border: appearance === 'dark' ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(0,0,0,0.25)',
                      '&:hover': {
                        backgroundColor: appearance === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
                        borderColor: appearance === 'dark' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
                      },
                    }}
                  >
                      {currentSeriesOption.emoji && (
                        <Typography sx={{ fontSize: { xs: '0.9rem', sm: '0.95rem' }, lineHeight: 1 }}>
                          {currentSeriesOption.emoji}
                        </Typography>
                      )}
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          color: appearance === 'dark' ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.9)',
                          lineHeight: 1,
                          fontSize: { xs: '0.75rem', sm: '0.85rem' }
                        }}
                      >
                        {currentSeriesOption.primary}
                      </Typography>
                      <ArrowDropDownIcon sx={{ fontSize: { xs: '1rem', sm: '1.1rem' }, ml: -0.2, opacity: 0.7 }} />
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSeries('_universal');
                        }}
                        sx={{
                          ml: -0.5,
                          mr: -0.5,
                        width: { xs: 18, sm: 20 },
                        height: { xs: 18, sm: 20 },
                        padding: 0,
                        color: appearance === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
                        '&:hover': {
                          backgroundColor: 'transparent',
                          color: appearance === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
                        },
                      }}
                    >
                        <CloseIcon sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' } }} />
                      </IconButton>
                    </CurrentFilterChip>
                  ) : (
                    <CurrentFilterChip
                    onClick={handleScopeClick}
                    sx={{
                      backgroundColor: appearance === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
                      border: appearance === 'dark' ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(0,0,0,0.25)',
                      '&:hover': {
                        backgroundColor: appearance === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
                        borderColor: appearance === 'dark' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
                      },
                    }}
                  >
                      <Typography sx={{ fontSize: { xs: '0.9rem', sm: '0.95rem' }, lineHeight: 1 }}>
                        🌈
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          color: appearance === 'dark' ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.9)',
                          lineHeight: 1,
                          fontSize: { xs: '0.75rem', sm: '0.85rem' }
                        }}
                      >
                        All
                      </Typography>
                      <ArrowDropDownIcon sx={{ fontSize: { xs: '1rem', sm: '1.1rem' }, ml: -0.5 }} />
                    </CurrentFilterChip>
                  )}
                </Box>

                {/* Recommended filters */}
                {displayedRecommendations.map((match: any) => (
                  <RecommendedFilterChip
                    key={match.id}
                    onClick={() => handleSwitchToFilter(match.id, match.matchedWords)}
                    data-appearance={appearance}
                  >
                    {match.emoji && (
                      <Typography
                        className="suggestionEmoji"
                        sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' }, lineHeight: 1 }}
                      >
                        {match.emoji}
                      </Typography>
                    )}
                    <Typography
                      variant="body2"
                      className="suggestionLabel"
                      sx={{
                        fontWeight: 500,
                        lineHeight: 1,
                        fontSize: { xs: '0.72rem', sm: '0.8rem' }
                      }}
                    >
                      {match.primary}
                    </Typography>
                  </RecommendedFilterChip>
                ))}
                </ScrollableFiltersBox>
              </ScrollableFiltersWrapper>
            </Box>

            <RailRight>
              <SettingsButton
                type="button"
                aria-label="Settings"
                onClick={handleOpenSettings}
                title="Settings"
                className="railButton"
                data-appearance={appearance}
                sx={{ width: 32, height: 32 }}
              >
                <SettingsIcon size={16} strokeWidth={2.4} aria-hidden="true" focusable="false" />
              </SettingsButton>
              {hasInput ? (
                <SubmitButton
                  type="submit"
                  aria-label="Search"
                  disabled={!hasInput}
                  className="railButton"
                  data-appearance={appearance}
                  title="Search"
                  sx={{ width: 32, height: 32 }}
                >
                  <ArrowForwardRoundedIcon sx={{ fontSize: '16px' }} />
                </SubmitButton>
              ) : (
                <SubmitButton
                  type="button"
                  aria-label="Show something random"
                  onClick={handleRandomClick}
                  onPointerDown={handleRandomPointerDown}
                  disabled={randomLoading}
                  aria-busy={randomLoading}
                  className="railButton"
                  data-appearance={appearance}
                  title="Random"
                  sx={{ width: 32, height: 32 }}
                >
                  {randomLoading ? (
                    <CircularProgress size={16} thickness={5} sx={{ color: 'currentColor' }} />
                  ) : (
                    <ShuffleIcon size={16} strokeWidth={2.4} aria-hidden="true" focusable="false" />
                  )}
                </SubmitButton>
              )}
            </RailRight>
          </ControlsRail>
        </Collapse>
      </FieldShell>
      <SeriesSelectorDialog
        open={selectorOpen}
        onClose={handleCloseSelector}
        onSelect={handleSelect}
        shows={shows}
        savedCids={savedCids}
        currentValueId={currentValueId}
        includeAllFavorites={includeAllFavorites}
        anchorEl={selectorAnchorEl}
        onOpenEditor={handleOpenEditor}
        onEdit={handleEditFilter}
      />

      <Menu
        anchorEl={settingsAnchorEl}
        open={Boolean(settingsAnchorEl)}
        onClose={handleCloseSettings}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            minWidth: 200,
            p: 1.5,
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', display: 'block', mb: 0.75, px: 0.5 }}>
          APPEARANCE
        </Typography>
        <ToggleButtonGroup
          value={themePreference}
          exclusive
          onChange={(_, newValue) => {
            if (newValue) setThemePreference(newValue);
          }}
          aria-label="theme preference"
          fullWidth
          size="small"
          sx={{ mb: 1.5 }}
        >
          <ToggleButton value="system" aria-label="system" sx={{ flexDirection: 'column', gap: 0.25, py: 0.5 }}>
            <MonitorIcon size={16} />
            <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600, lineHeight: 1, textTransform: 'none' }}>Auto</Typography>
          </ToggleButton>
          <ToggleButton value="light" aria-label="light" sx={{ flexDirection: 'column', gap: 0.25, py: 0.5 }}>
            <SunIcon size={16} />
            <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600, lineHeight: 1, textTransform: 'none' }}>Light</Typography>
          </ToggleButton>
          <ToggleButton value="dark" aria-label="dark" sx={{ flexDirection: 'column', gap: 0.25, py: 0.5 }}>
            <MoonIcon size={16} />
            <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600, lineHeight: 1, textTransform: 'none' }}>Dark</Typography>
          </ToggleButton>
        </ToggleButtonGroup>

        <FormControlLabel
          control={
            <Switch
              checked={compactMode}
              onChange={(e) => {
                setCompactMode(e.target.checked);
                handleCloseSettings();
              }}
              size="small"
            />
          }
          label={
            <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
              Compact mode
            </Typography>
          }
          sx={{ ml: 0, mb: 1 }}
        />
        <Divider sx={{ my: 1 }} />
        <MenuItem onClick={handleOpenHelpDialog} sx={{ borderRadius: 1, px: 1, py: 0.75 }}>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <HelpOutlineRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Search tips"
            primaryTypographyProps={{ variant: 'body2', fontWeight: 600, fontSize: '0.875rem' }}
          />
        </MenuItem>
      </Menu>

      <Dialog
        open={helpDialogOpen}
        onClose={handleCloseHelpDialog}
        aria-labelledby={helpDialogTitleId}
        aria-describedby={helpDialogDescriptionId}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id={helpDialogTitleId} sx={{ pb: 1 }}>
          <Typography variant="h6" component="div">
            Advanced search tips
          </Typography>
          <Typography
            id={helpDialogDescriptionId}
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Use OpenSearch boolean syntax to chain phrases, operators, and filters for precise results.
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Stack spacing={1.5}>
            {QUICK_TIPS.map((tip) => (
              <TipRow key={tip.title}>
                <TipHeader>{tip.title}</TipHeader>
                <TipBody>{tip.body}</TipBody>
                {tip.example && (
                  <TipExample aria-label={`${tip.title} example`}>{tip.example}</TipExample>
                )}
              </TipRow>
            ))}
            <TipNote>
              <Typography variant="caption" color="text.secondary">
                Search errors? Remove stray quotes/parentheses or shorten the query.
              </Typography>
            </TipNote>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={handleCloseHelpDialog} autoFocus>
            Got it
          </Button>
        </DialogActions>
      </Dialog>

    </FormRoot>
  );
};

export default UnifiedSearchBar;
