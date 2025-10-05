import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { styled } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { keyframes } from '@mui/system';
import { ButtonBase, CircularProgress, Collapse, IconButton, InputBase, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { Shuffle as ShuffleIcon } from 'lucide-react';
import SeriesSelectorDialog, { type SeriesItem } from '../SeriesSelectorDialog';

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
  '--scope-button-size': '44px',
  '--scope-gap': theme.spacing(0.92),
  position: 'relative',
  width: '100%',
  borderRadius: 14,
  border: '1px solid rgba(30, 30, 30, 0.08)',
  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(242, 242, 242, 0.94))',
  boxShadow: '0 10px 24px rgba(0, 0, 0, 0.14)',
  padding: theme.spacing(1.05, 1.26),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.66),
  transition: 'padding 260ms cubic-bezier(0.4, 0, 0.2, 1), gap 220ms cubic-bezier(0.4, 0, 0.2, 1)',
  // remove hover/box-shadow animations
  overflow: 'hidden',
  '&[data-expanded="false"]': {
    padding: theme.spacing(0.82, 1.04),
    gap: theme.spacing(0.26),
    '--scope-gap': theme.spacing(0.6),
  },
  '&[data-expanded="true"]': {
    padding: theme.spacing(1.28, 1.52),
    gap: theme.spacing(0.6),
    '--scope-gap': theme.spacing(1.1),
  },
  '&[data-appearance="dark"]': {
    border: '1px solid rgba(255, 255, 255, 0.16)',
    background: 'linear-gradient(180deg, rgba(32, 32, 34, 0.96), rgba(20, 20, 22, 0.98))',
    color: 'rgba(245, 245, 245, 0.95)',
    boxShadow: '0 18px 44px rgba(0, 0, 0, 0.55)',
  },
  '&[data-appearance="dark"][data-expanded="false"]': {
    background: 'linear-gradient(180deg, rgba(28, 28, 30, 0.94), rgba(18, 18, 20, 0.98))',
  },
  '&[data-appearance="dark"][data-expanded="true"]': {
    background: 'linear-gradient(180deg, rgba(36, 36, 38, 0.96), rgba(24, 24, 26, 0.98))',
  },
  [theme.breakpoints.down('sm')]: {
    '--scope-button-size': '37px',
    '--scope-gap': theme.spacing(0.74),
    padding: theme.spacing(0.86, 1.06),
    borderRadius: 12,
    transition: 'padding 240ms cubic-bezier(0.4, 0, 0.2, 1), gap 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    '&[data-expanded="false"]': {
      padding: theme.spacing(0.68, 0.92),
      gap: theme.spacing(0.18),
      '--scope-gap': theme.spacing(0.5),
    },
    '&[data-expanded="true"]': {
      padding: theme.spacing(1.04, 1.26),
      gap: theme.spacing(0.5),
      '--scope-gap': theme.spacing(1),
    },
    '&[data-appearance="dark"]': {
      background: 'linear-gradient(180deg, rgba(30, 30, 32, 0.95), rgba(18, 18, 20, 0.98))',
      boxShadow: '0 14px 36px rgba(0, 0, 0, 0.52)',
    },
    '&[data-appearance="dark"][data-expanded="false"]': {
      background: 'linear-gradient(180deg, rgba(26, 26, 28, 0.95), rgba(16, 16, 18, 0.98))',
    },
    '&[data-appearance="dark"][data-expanded="true"]': {
      background: 'linear-gradient(180deg, rgba(34, 34, 36, 0.96), rgba(22, 22, 24, 0.98))',
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

const ScopeGlyph = styled('span')(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: FONT_FAMILY,
  fontWeight: 600,
  fontSize: '1.06rem',
  lineHeight: 1,
  color: 'inherit',
  flexShrink: 0,
  [theme.breakpoints.down('sm')]: {
    fontSize: '0.98rem',
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
      fontSize: '0.94rem',
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
        fontSize: '0.9rem',
      },
    },
    '& svg': {
      flexShrink: 0,
      color: '#4a4a4a',
      fontSize: '1.26rem',
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

function findSeriesItem(currentValueId: string, shows: SeriesItem[], savedCids: SeriesItem[]): SeriesItem | undefined {
  if (!currentValueId || currentValueId.startsWith('_')) {
    return undefined;
  }
  return shows.find((s) => s.id === currentValueId) ?? savedCids.find((s) => s.id === currentValueId);
}

function buildCurrentLabel(currentValueId: string, currentSeries?: SeriesItem): string {
  if (currentValueId === '_universal') return '🌈 All Shows & Movies';
  if (currentValueId === '_favorites') return '⭐ All Favorites';
  if (!currentSeries) return 'Select show or movie';
  const emoji = currentSeries.emoji?.trim();
  const emojiPrefix = emoji ? `${emoji} ` : '';
  return `${emojiPrefix}${currentSeries.title}`;
}

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
  appearance = 'light',
}) => {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorAnchorEl, setSelectorAnchorEl] = useState<HTMLElement | null>(null);
  const [internalRandomLoading, setInternalRandomLoading] = useState(false);
  const [showRandomLabel, setShowRandomLabel] = useState(true);
  const [isFadingOutLabel, setIsFadingOutLabel] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const shouldRestoreFocusRef = useRef(false);
  // railId and scopeButtonSx removed with inline expansion approach
  const currentSeries = useMemo(
    () => findSeriesItem(currentValueId, shows, savedCids),
    [currentValueId, savedCids, shows],
  );

  // Show "Random" label for 1 second on mount, then fade it out
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsFadingOutLabel(true);
    }, 1000);
    
    const hideTimer = setTimeout(() => {
      setShowRandomLabel(false);
      setIsFadingOutLabel(false);
    }, 1400); // 1000ms display + 300ms fade animation + 100ms buffer
    
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  const currentLabel = useMemo(
    () => buildCurrentLabel(currentValueId, currentSeries),
    [currentSeries, currentValueId],
  );

  const scopeGlyph = useMemo(() => {
    if (currentValueId === '_universal') return '🌈';
    if (currentValueId === '_favorites') return '⭐';
    const trimmedEmoji = currentSeries?.emoji?.trim();
    if (trimmedEmoji) return trimmedEmoji;
    const source = currentSeries?.title ?? currentLabel;
    const trimmed = source.trim();
    if (!trimmed) return '∙';
    const [glyph] = Array.from(trimmed);
    if (!glyph) return '∙';
    const upper = glyph.toLocaleUpperCase();
    const lower = glyph.toLocaleLowerCase();
    if (upper !== lower) return upper;
    return glyph;
  }, [currentLabel, currentSeries, currentValueId]);

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
      handleCloseSelector();
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    },
    [handleCloseSelector, onSelectSeries],
  );

  const handleClear = useCallback(() => {
    onClear();
  }, [onClear]);

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape' && value.trim()) {
        event.preventDefault();
        handleClear();
      }
    },
    [handleClear, value],
  );

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

  const trimmedValue = value.trim();
  const hasInput = trimmedValue.length > 0;
  const scopeExpanded = hasInput;
  // Controls move to second line when expanded
  // SubmitButton now uses consistent black styling; disabled state is dark grey
  const scopeButtonLabel = scopeExpanded
    ? `Choose series: ${currentLabel}`
    : `Show filter options for ${currentLabel}`;

  const handleScopeClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    handleFilterClick(event.currentTarget);
  }, [handleFilterClick]);

  return (
    <FormRoot onSubmit={onSubmit} noValidate>
      <FieldShell data-expanded={scopeExpanded ? 'true' : 'false'} data-appearance={appearance}>
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
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={handleInputKeyDown}
            onBlur={() => {
              shouldRestoreFocusRef.current = false;
            }}
            data-appearance={appearance}
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
                  <ArrowForwardRoundedIcon fontSize="small" />
                </SubmitButton>
              ) : (showRandomLabel || isFadingOutLabel) && !randomLoading ? (
                <LabeledSubmitButton
                  type="button"
                  aria-label="Show something random"
                  onClick={handleRandomClick}
                  onPointerDown={handleRandomPointerDown}
                  disabled={randomLoading}
                  aria-busy={randomLoading}
                  data-appearance={appearance}
                  data-collapsing={isFadingOutLabel ? 'true' : 'false'}
                >
                  <ShuffleIcon size={18} strokeWidth={2.4} aria-hidden="true" focusable="false" />
                  <span
                    className="actionLabel"
                    style={
                      isFadingOutLabel
                        ? {
                            animation: `${labelFadeOut} 300ms cubic-bezier(0.4, 0, 0.6, 1) both`,
                          }
                        : undefined
                    }
                  >
                    Random
                  </span>
                </LabeledSubmitButton>
              ) : (
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
                    <CircularProgress size={18} thickness={5} sx={{ color: 'currentColor' }} />
                  ) : (
                    <ShuffleIcon size={18} strokeWidth={2.4} aria-hidden="true" focusable="false" />
                  )}
                </SubmitButton>
              )}
            </>
          )}
        </FieldRow>
        <Collapse in={scopeExpanded} timeout={260} unmountOnExit>
          <ControlsRail data-expanded={scopeExpanded ? 'true' : 'false'} data-appearance={appearance}>
            <ScopeSelectorButton
              type="button"
              onClick={handleScopeClick}
              data-expanded="true"
              data-appearance={appearance}
              aria-expanded={scopeExpanded}
              aria-pressed={scopeExpanded}
              aria-label={scopeButtonLabel}
              aria-haspopup="listbox"
              title={currentLabel}
              className="railButton"
            >
              <Typography component="span" className="scopeLabel" noWrap>
                {currentLabel}
              </Typography>
              <ArrowDropDownIcon fontSize="small" />
            </ScopeSelectorButton>
            <RailRight>
              {hasInput ? (
                <LabeledSubmitButton
                  type="submit"
                  aria-label="Search"
                  disabled={!hasInput}
                  className="railButton"
                  data-appearance={appearance}
                >
                  <span className="actionLabel">Search</span>
                  <ArrowForwardRoundedIcon fontSize="small" />
                </LabeledSubmitButton>
              ) : (
                <SubmitButton
                  className="railButton"
                  type="submit"
                  aria-label="Search"
                  disabled={!hasInput}
                  title="Search"
                  data-appearance={appearance}
                >
                  <ArrowForwardRoundedIcon fontSize="small" />
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
      />
    </FormRoot>
  );
};

export default UnifiedSearchBar;
