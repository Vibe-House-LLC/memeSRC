import React, { useCallback, useEffect, useMemo, useRef, useState, useId } from 'react';
import { styled } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { ButtonBase, IconButton, InputBase, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import SeriesSelectorDialog, { type SeriesItem } from '../SeriesSelectorDialog';

type SeriesSelectorDialogProps = React.ComponentProps<typeof SeriesSelectorDialog>;

type OnSelectSeries = SeriesSelectorDialogProps['onSelect'];

export interface UnifiedSearchBarProps {
  value: string;
  placeholder?: string;
  onValueChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
  onRandom?: () => void;
  isRandomLoading?: boolean;
  shows: SeriesItem[];
  savedCids: SeriesItem[];
  currentValueId: string;
  includeAllFavorites: boolean;
  onSelectSeries: OnSelectSeries;
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
  '--scope-gap': theme.spacing(0.82),
  position: 'relative',
  width: '100%',
  borderRadius: 20,
  border: '1px solid rgba(15, 23, 42, 0.08)',
  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.94))',
  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.14)',
  padding: theme.spacing(1.2, 1.65, 1.75),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.66),
  transition: 'box-shadow 180ms ease',
  overflow: 'hidden',
  '&[data-expanded="false"]': {
    paddingBottom: theme.spacing(0.66),
    gap: theme.spacing(0.22),
  },
  '&[data-expanded="true"]': {
    paddingBottom: theme.spacing(1.54),
    gap: theme.spacing(0.88),
  },
  [theme.breakpoints.down('sm')]: {
    '--scope-button-size': '37px',
    '--scope-gap': theme.spacing(0.6),
    padding: theme.spacing(1, 1.2, 1.5),
    borderRadius: 17,
    '&[data-expanded="false"]': {
      paddingBottom: theme.spacing(0.6),
      gap: theme.spacing(0.18),
    },
    '&[data-expanded="true"]': {
      paddingBottom: theme.spacing(1.32),
      gap: theme.spacing(0.72),
    },
  },
}));

const FieldRow = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--scope-gap)',
  transition: 'align-items 180ms ease, gap 180ms ease',
  '&[data-expanded="true"]': {
    alignItems: 'flex-end',
  },
}));

const StyledInput = styled(InputBase)(({ theme }) => ({
  flex: 1,
  fontFamily: FONT_FAMILY,
  fontSize: '1.14rem',
  fontWeight: 500,
  color: '#0f172a',
  '& input': {
    padding: theme.spacing(0.9, 1),
    border: 'none',
    outline: 'none',
    background: 'transparent',
    caretColor: '#0F9D58',
    '::placeholder': {
      color: 'rgba(100, 116, 139, 0.78)',
      opacity: 1,
    },
  },
  [theme.breakpoints.down('sm')]: {
    fontSize: '1.08rem',
    '& input': {
      padding: theme.spacing(0.6, 0.66),
    },
  },
}));

const buildCircleButtonStyles = (theme: Theme) => ({
  width: 'var(--scope-button-size)',
  height: 'var(--scope-button-size)',
  borderRadius: '999px',
  border: '1px solid rgba(148, 163, 184, 0.32)',
  boxShadow: '0 8px 20px rgba(15, 23, 42, 0.15)',
  transition: 'transform 160ms ease, box-shadow 160ms ease, background 160ms ease',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: '0 10px 22px rgba(15, 23, 42, 0.2)',
  },
  '&:active': {
    transform: 'translateY(0)',
    boxShadow: '0 6px 16px rgba(15, 23, 42, 0.16)',
  },
});

const DEFAULT_SCOPE_STYLING = {
  background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(226, 232, 240, 0.96))',
  hoverBackground: 'linear-gradient(135deg, rgba(236, 242, 247, 0.98), rgba(226, 232, 240, 0.96))',
  color: '#0f172a',
  borderColor: 'rgba(148, 163, 184, 0.36)',
  boxShadow: '0 8px 20px rgba(15, 23, 42, 0.15)',
  hoverBoxShadow: '0 10px 22px rgba(15, 23, 42, 0.2)',
  activeBoxShadow: '0 6px 16px rgba(15, 23, 42, 0.18)',
} as const;

const ScopeButton = styled(IconButton)(({ theme }) => {
  const base = buildCircleButtonStyles(theme);
  return {
    ...base,
    position: 'relative',
    background: DEFAULT_SCOPE_STYLING.background,
    color: DEFAULT_SCOPE_STYLING.color,
    borderColor: DEFAULT_SCOPE_STYLING.borderColor,
    boxShadow: DEFAULT_SCOPE_STYLING.boxShadow,
    '&:hover': {
      ...base['&:hover'],
      background: DEFAULT_SCOPE_STYLING.hoverBackground,
      boxShadow: DEFAULT_SCOPE_STYLING.hoverBoxShadow,
      borderColor: DEFAULT_SCOPE_STYLING.borderColor,
    },
    '&:active': {
      ...(base['&:active'] ?? {}),
      boxShadow: DEFAULT_SCOPE_STYLING.activeBoxShadow,
      borderColor: DEFAULT_SCOPE_STYLING.borderColor,
    },
    '& svg': {
      flexShrink: 0,
      color: 'inherit',
    },
  };
});

const RandomButton = styled(IconButton)(({ theme }) => {
  const base = buildCircleButtonStyles(theme);
  return {
    ...base,
    background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(226, 232, 240, 0.96))',
    color: '#0f172a',
    borderColor: 'rgba(148, 163, 184, 0.36)',
    boxShadow: '0 12px 24px rgba(15, 23, 42, 0.15)',
    '&:hover': {
      ...base['&:hover'],
      background: 'linear-gradient(135deg, rgba(236, 242, 247, 0.98), rgba(226, 232, 240, 0.96))',
      boxShadow: '0 16px 28px rgba(15, 23, 42, 0.2)',
    },
    '&:active': {
      boxShadow: '0 10px 20px rgba(15, 23, 42, 0.18)',
    },
    '&.Mui-disabled': {
      opacity: 0.85,
      boxShadow: 'none',
      transform: 'none',
      background: 'linear-gradient(135deg, rgba(226, 232, 240, 0.9), rgba(226, 232, 240, 0.96))',
      color: 'rgba(100, 116, 139, 0.82)',
      borderColor: 'rgba(148, 163, 184, 0.3)',
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
  [theme.breakpoints.down('sm')]: {
    fontSize: '0.98rem',
  },
}));

const ScopeFlipButton = styled(ScopeButton)(({ theme }) => ({
  position: 'relative',
  '& .flipInner': {
    position: 'relative',
    width: '100%',
    height: '100%',
    transformStyle: 'preserve-3d',
    transition: 'transform 180ms ease',
  },
  '& .flipFace': {
    position: 'absolute',
    inset: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
  },
  '& .flipBack': {
    transform: 'rotateY(180deg)',
  },
  '&[aria-expanded="true"] .flipInner': {
    transform: 'rotateY(180deg)',
  },
}));

// No inline scope control; we use the circular flip button instead

const FilterRail = styled('div')(({ theme }) => ({
  alignSelf: 'stretch',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginTop: 0,
  maxHeight: 0,
  opacity: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
  transition: 'max-height 180ms ease, opacity 160ms ease, margin-top 160ms ease',
  [theme.breakpoints.down('sm')]: {
    flexWrap: 'wrap',
    gap: theme.spacing(0.82),
  },
  '&[data-expanded="true"]': {
    marginTop: theme.spacing(1.1),
    maxHeight: 132,
    opacity: 1,
    pointerEvents: 'auto',
  },
}));

const FilterTrigger = styled(ButtonBase)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(0.82),
  padding: theme.spacing(0.66, 1.15),
  borderRadius: 18,
  background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 0.96))',
  border: '1px solid rgba(148, 163, 184, 0.32)',
  boxShadow: '0 10px 20px rgba(15, 23, 42, 0.16)',
  color: '#0f172a',
  fontFamily: FONT_FAMILY,
  fontSize: '0.94rem',
  fontWeight: 600,
  lineHeight: 1.2,
  maxWidth: '100%',
  pointerEvents: 'auto',
  transition: 'transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease',
  textAlign: 'left',
  '&:hover': {
    background: 'linear-gradient(135deg, rgba(236, 242, 247, 0.98), rgba(255, 255, 255, 0.98))',
    transform: 'translateY(-1px)',
    boxShadow: '0 12px 22px rgba(15, 23, 42, 0.22)',
  },
  '&:active': {
    transform: 'translateY(0)',
    boxShadow: '0 8px 18px rgba(15, 23, 42, 0.18)',
    background: 'linear-gradient(135deg, rgba(229, 238, 246, 0.98), rgba(245, 248, 252, 0.96))',
  },
  '& svg': {
    transition: 'transform 0.2s ease',
    flexShrink: 0,
    color: '#0F9D58',
  },
  '&[aria-expanded="true"] svg': {
    transform: 'rotate(-180deg)',
  },
}));

const SubmitButton = styled(IconButton)(({ theme }) => ({
  width: 'var(--scope-button-size)',
  height: 'var(--scope-button-size)',
  borderRadius: '999px',
  border: '1px solid transparent',
  background: '#0f172a',
  color: theme.palette.common.white,
  boxShadow: '0 10px 20px rgba(15, 23, 42, 0.28)',
  transition: 'transform 180ms ease, box-shadow 180ms ease, background 180ms ease',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: '0 12px 22px rgba(15, 23, 42, 0.4)',
    background: '#111827',
  },
  '&:active': {
    transform: 'translateY(0)',
    boxShadow: '0 8px 18px rgba(15, 23, 42, 0.32)',
    background: '#0b1220',
  },
  '&.Mui-disabled': {
    background: '#374151',
    color: '#e5e7eb',
    boxShadow: 'none',
    transform: 'none',
    borderColor: 'transparent',
  },
}));

function buildCurrentLabel(currentValueId: string, shows: SeriesItem[], savedCids: SeriesItem[]): string {
  if (currentValueId === '_universal') return '🌈 All Shows & Movies';
  if (currentValueId === '_favorites') return '⭐ All Favorites';
  const found = shows.find((s) => s.id === currentValueId) || savedCids.find((s) => s.id === currentValueId);
  if (!found) return 'Select show or movie';
  const emojiPrefix = found.emoji ? `${found.emoji} ` : '';
  return `${emojiPrefix}${found.title}`;
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
}) => {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [scopeExpanded, setScopeExpanded] = useState(false);
  const [shellHasFocus, setShellHasFocus] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const skipBlurCollapseRef = useRef(false);
  const railId = useId();
  const scopeButtonSx = useMemo(() => {
    const palette = DEFAULT_SCOPE_STYLING;
    return {
      background: palette.background,
      color: palette.color,
      borderColor: palette.borderColor,
      boxShadow: palette.boxShadow,
      '&:hover': {
        background: palette.hoverBackground,
        boxShadow: palette.hoverBoxShadow,
        borderColor: palette.borderColor,
      },
      '&:active': {
        boxShadow: palette.activeBoxShadow,
        borderColor: palette.borderColor,
      },
    } as const;
  }, []);
  const currentLabel = useMemo(
    () => buildCurrentLabel(currentValueId, shows, savedCids),
    [currentValueId, shows, savedCids],
  );

  const scopeGlyph = useMemo(() => {
    const trimmed = currentLabel.trim();
    if (!trimmed) return '∙';
    const [glyph] = Array.from(trimmed);
    if (!glyph) return '∙';
    const upper = glyph.toLocaleUpperCase();
    const lower = glyph.toLocaleLowerCase();
    if (upper !== lower) return upper;
    return glyph;
  }, [currentLabel]);

  useEffect(() => {
    if (selectorOpen) {
      setScopeExpanded(true);
    }
  }, [selectorOpen]);

  const handleFilterClick = useCallback(() => {
    setScopeExpanded(true);
    setSelectorOpen(true);
  }, []);

  const handleScopeToggle = useCallback(() => {
    setScopeExpanded((prev) => {
      const next = !prev;
      if (next) {
        skipBlurCollapseRef.current = true;
        requestAnimationFrame(() => {
          skipBlurCollapseRef.current = false;
          inputRef.current?.focus();
        });
      } else {
        setSelectorOpen(false);
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
      }
      return next;
    });
  }, []);

  const handleShellFocus = useCallback(() => {
    setShellHasFocus(true);
  }, []);

  const handleShellBlur = useCallback(() => {
    requestAnimationFrame(() => {
      if (shellRef.current && shellRef.current.contains(document.activeElement)) {
        return;
      }
      if (skipBlurCollapseRef.current) {
        return;
      }
      setShellHasFocus(false);
      if (!selectorOpen) {
        setScopeExpanded(false);
      }
    });
  }, [selectorOpen]);

  const handleSelect: OnSelectSeries = useCallback(
    (selectedId) => {
      onSelectSeries(selectedId);
      setSelectorOpen(false);
      setScopeExpanded(false);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    },
    [onSelectSeries],
  );

  const handleClear = useCallback(() => {
    onClear();
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
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

  const handleRandomClick = useCallback(() => {
    onRandom?.();
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [onRandom]);

  const trimmedValue = value.trim();
  const hasInput = trimmedValue.length > 0;
  const showRandomButton = !hasInput;
  const controlsAlignment = scopeExpanded ? 'flex-end' : 'center';
  // SubmitButton now uses consistent black styling; disabled state is dark grey
  const isRailVisible = scopeExpanded || selectorOpen;
  const isShellActive = shellHasFocus || scopeExpanded || selectorOpen;
  const scopeButtonLabel = scopeExpanded
    ? 'Hide filter options'
    : `Show filter options for ${currentLabel}`;

  return (
    <FormRoot onSubmit={onSubmit} noValidate>
      <FieldShell
        ref={shellRef}
        onFocus={handleShellFocus}
        onBlur={handleShellBlur}
        data-expanded={scopeExpanded ? 'true' : 'false'}
      >
        <FieldRow data-expanded={scopeExpanded ? 'true' : 'false'}>
          {!scopeExpanded && (
            <ScopeFlipButton
              type="button"
              onClick={handleScopeToggle}
              aria-expanded={scopeExpanded}
              aria-pressed={scopeExpanded}
              aria-label={scopeButtonLabel}
              aria-controls={railId}
              title={currentLabel}
              sx={{
                ...scopeButtonSx,
                alignSelf: controlsAlignment,
              }}
            >
              <span className="flipInner">
                <span className="flipFace flipFront">
                  <ScopeGlyph>{scopeGlyph}</ScopeGlyph>
                </span>
                <span className="flipFace flipBack">
                  <TuneRoundedIcon fontSize="small" />
                </span>
              </span>
            </ScopeFlipButton>
          )}
          <StyledInput
            value={value}
            inputRef={inputRef}
            placeholder={placeholder}
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={handleInputKeyDown}
            sx={{
              '& input': (theme) => ({
                padding: scopeExpanded ? theme.spacing(0.72, 0.66) : theme.spacing(0.9, 1),
                transition: 'padding 180ms ease',
              }),
            }}
          />
          {showRandomButton && (
            <RandomButton
              type="button"
              aria-label="Show something random"
              onClick={handleRandomClick}
              disabled={isRandomLoading}
              aria-busy={isRandomLoading}
              sx={{ alignSelf: controlsAlignment }}
            >
              <ShuffleIcon fontSize="small" />
            </RandomButton>
          )}
          <SubmitButton
            type="submit"
            aria-label="Search"
            disabled={!hasInput}
            sx={{
              alignSelf: controlsAlignment,
            }}
          >
            <ArrowForwardRoundedIcon fontSize="small" />
          </SubmitButton>
        </FieldRow>
        <FilterRail id={railId} data-expanded={isRailVisible ? 'true' : 'false'}>
          {scopeExpanded && (
            <ScopeButton
              type="button"
              onClick={handleScopeToggle}
              aria-expanded={scopeExpanded}
              aria-pressed={scopeExpanded}
              aria-label={scopeButtonLabel}
              aria-controls={railId}
              title={currentLabel}
              sx={scopeButtonSx}
            >
              <KeyboardArrowUpRoundedIcon fontSize="small" />
            </ScopeButton>
          )}
          <FilterTrigger
            type="button"
            onClick={handleFilterClick}
            aria-haspopup="dialog"
            aria-expanded={selectorOpen}
          >
            <Typography
              component="span"
              noWrap
              sx={{
                fontFamily: FONT_FAMILY,
                fontSize: '0.94rem',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: '#0f172a',
              }}
            >
              {currentLabel}
            </Typography>
            <ArrowDropDownIcon fontSize="small" />
          </FilterTrigger>
        </FilterRail>
      </FieldShell>
      <SeriesSelectorDialog
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={handleSelect}
        shows={shows}
        savedCids={savedCids}
        currentValueId={currentValueId}
        includeAllFavorites={includeAllFavorites}
      />
    </FormRoot>
  );
};

export default UnifiedSearchBar;
