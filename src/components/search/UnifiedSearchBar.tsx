import React, { useCallback, useMemo, useRef, useState } from 'react';
import { styled } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { ButtonBase, IconButton, InputBase, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
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
  borderRadius: 14,
  border: '1px solid rgba(15, 23, 42, 0.08)',
  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.94))',
  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.14)',
  padding: theme.spacing(1.2, 1.65, 1.75),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.66),
  // remove hover/box-shadow animations
  overflow: 'hidden',
  '&[data-expanded="false"]': {
    paddingBottom: theme.spacing(0.66),
    gap: theme.spacing(0.22),
  },
  '&[data-expanded="true"]': {
    paddingBottom: theme.spacing(1.54),
    gap: theme.spacing(0.6),
  },
  [theme.breakpoints.down('sm')]: {
    '--scope-button-size': '37px',
    '--scope-gap': theme.spacing(0.6),
    padding: theme.spacing(1, 1.2, 1.5),
    borderRadius: 12,
    '&[data-expanded="false"]': {
      paddingBottom: theme.spacing(0.6),
      gap: theme.spacing(0.18),
    },
    '&[data-expanded="true"]': {
      paddingBottom: theme.spacing(1.32),
    gap: theme.spacing(0.5),
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
    // no hover/active animations
    '&:hover': {
      background: DEFAULT_SCOPE_STYLING.background,
      boxShadow: DEFAULT_SCOPE_STYLING.boxShadow,
      borderColor: DEFAULT_SCOPE_STYLING.borderColor,
    },
    '&:active': {
      boxShadow: DEFAULT_SCOPE_STYLING.boxShadow,
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
      background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(226, 232, 240, 0.96))',
      boxShadow: '0 12px 24px rgba(15, 23, 42, 0.15)',
    },
    '&:active': {
      boxShadow: '0 12px 24px rgba(15, 23, 42, 0.15)',
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

const ScopeSelectorButton = styled(ButtonBase)(({ theme }) => {
  const base = buildCircleButtonStyles(theme);
  return {
    ...base,
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 'var(--scope-button-size)',
    borderRadius: 999,
    padding: 0,
    border: '1px solid ' + DEFAULT_SCOPE_STYLING.borderColor,
    background: DEFAULT_SCOPE_STYLING.background,
    color: DEFAULT_SCOPE_STYLING.color,
    boxShadow: DEFAULT_SCOPE_STYLING.boxShadow,
    width: 'var(--scope-button-size)',
    transition: 'width 180ms ease, padding 180ms ease',
    // no hover/active animations
    '&:hover': {
      background: DEFAULT_SCOPE_STYLING.background,
      boxShadow: DEFAULT_SCOPE_STYLING.boxShadow,
    },
    '&:active': {
      boxShadow: DEFAULT_SCOPE_STYLING.boxShadow,
    },
    '&[data-expanded="true"]': {
      width: 'auto',
      padding: theme.spacing(0.66, 1.15),
      gap: theme.spacing(0.82),
    },
    '& .scopeLabel': {
      fontFamily: FONT_FAMILY,
      fontWeight: 600,
      fontSize: '0.94rem',
      color: '#0f172a',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      maxWidth: 520,
      [theme.breakpoints.down('sm')]: {
        fontSize: '0.9rem',
        maxWidth: 260,
      },
    },
    '& svg': {
      flexShrink: 0,
      color: '#0F9D58',
    },
  };
});

const ControlsRail = styled('div')(({ theme }) => ({
  alignSelf: 'stretch',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginTop: 0,
  maxHeight: 0,
  opacity: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
  transition: 'max-height 200ms ease, opacity 160ms ease, margin-top 160ms ease',
  [theme.breakpoints.down('sm')]: {
    flexWrap: 'wrap',
    gap: theme.spacing(0.82),
  },
  '&[data-expanded="true"]': {
    marginTop: theme.spacing(0.4),
    maxHeight: 96,
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
}));

const RailRight = styled('div')(({ theme }) => ({
  marginLeft: 'auto',
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const LabeledRandomButton = styled(ButtonBase)(({ theme }) => ({
  height: 'var(--scope-button-size)',
  borderRadius: 999,
  padding: theme.spacing(0.66, 1.15),
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing(0.72),
  border: '1px solid rgba(148, 163, 184, 0.36)',
  background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(226, 232, 240, 0.96))',
  color: '#0f172a',
  boxShadow: '0 12px 24px rgba(15, 23, 42, 0.15)',
  '& .actionLabel': {
    fontFamily: FONT_FAMILY,
    fontWeight: 600,
    fontSize: '0.94rem',
    color: '#0f172a',
    whiteSpace: 'nowrap',
  },
}));

const LabeledSubmitButton = styled(ButtonBase)(({ theme }) => ({
  height: 'var(--scope-button-size)',
  borderRadius: 999,
  padding: theme.spacing(0.66, 1.15),
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing(0.72),
  border: '1px solid transparent',
  background: '#0f172a',
  color: theme.palette.common.white,
  boxShadow: '0 10px 20px rgba(15, 23, 42, 0.28)',
  '& .actionLabel': {
    fontFamily: FONT_FAMILY,
    fontWeight: 700,
    fontSize: '0.94rem',
    color: theme.palette.common.white,
    whiteSpace: 'nowrap',
    paddingLeft: theme.spacing(0.5),
  },
  '&.Mui-disabled': {
    background: '#374151',
    color: '#e5e7eb',
    boxShadow: 'none',
    borderColor: 'transparent',
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
  '&:hover': {
    background: '#0f172a',
    boxShadow: '0 10px 20px rgba(15, 23, 42, 0.28)',
  },
  '&:active': {
    background: '#0f172a',
    boxShadow: '0 10px 20px rgba(15, 23, 42, 0.28)',
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
  // railId and scopeButtonSx removed with inline expansion approach
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

  const handleFilterClick = useCallback(() => {
    // open selector without forcing expansion
    setSelectorOpen(true);
  }, []);

  const handleShellFocus = useCallback(() => {
    setShellHasFocus(true);
  }, []);

  const handleShellBlur = useCallback(() => {
    requestAnimationFrame(() => {
      if (shellRef.current && shellRef.current.contains(document.activeElement)) {
        return;
      }
      setShellHasFocus(false);
      setScopeExpanded(false);
    });
  }, []);

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
  // Controls move to second line when expanded
  // SubmitButton now uses consistent black styling; disabled state is dark grey
  const scopeButtonLabel = scopeExpanded
    ? `Choose series: ${currentLabel}`
    : `Show filter options for ${currentLabel}`;

  const handleScopeClick = useCallback(() => {
    // Always open selector; do not force expansion here
    handleFilterClick();
  }, [handleFilterClick]);

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
            <ScopeSelectorButton
              type="button"
              onClick={handleScopeClick}
              data-expanded="false"
              aria-expanded={scopeExpanded}
              aria-pressed={scopeExpanded}
              aria-label={scopeButtonLabel}
              aria-haspopup="dialog"
              title={currentLabel}
            >
              <ScopeGlyph>{scopeGlyph}</ScopeGlyph>
            </ScopeSelectorButton>
          )}
          <StyledInput
            value={value}
            inputRef={inputRef}
            placeholder={placeholder}
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={handleInputKeyDown}
            onFocus={() => setScopeExpanded(true)}
            sx={{
              '& input': (theme) => ({
                padding: scopeExpanded ? theme.spacing(0.72, 0.66) : theme.spacing(0.9, 1),
                transition: 'padding 180ms ease',
              }),
            }}
          />
          {!scopeExpanded && (
            <>
              <RandomButton
                type="button"
                aria-label="Show something random"
                onClick={handleRandomClick}
                disabled={isRandomLoading}
                aria-busy={isRandomLoading}
                title="Random"
              >
                <ShuffleIcon fontSize="small" />
              </RandomButton>
              <SubmitButton
                type="submit"
                aria-label="Search"
                disabled={!hasInput}
                title="Search"
              >
                <ArrowForwardRoundedIcon fontSize="small" />
              </SubmitButton>
            </>
          )}
        </FieldRow>
        <ControlsRail data-expanded={scopeExpanded ? 'true' : 'false'}>
          {scopeExpanded && (
            <>
              <ScopeSelectorButton
                type="button"
                onClick={handleScopeClick}
                data-expanded="true"
                aria-expanded={scopeExpanded}
                aria-pressed={scopeExpanded}
                aria-label={scopeButtonLabel}
                aria-haspopup="dialog"
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
                  <>
                    <RandomButton
                      className="railButton"
                      type="button"
                      aria-label="Show something random"
                      onClick={handleRandomClick}
                      disabled={isRandomLoading}
                      aria-busy={isRandomLoading}
                      title="Random"
                    >
                      <ShuffleIcon fontSize="small" />
                    </RandomButton>
                    <LabeledSubmitButton
                      type="submit"
                      aria-label="Search"
                      disabled={!hasInput}
                      className="railButton"
                    >
                      <span className="actionLabel">Search</span>
                      <ArrowForwardRoundedIcon fontSize="small" />
                    </LabeledSubmitButton>
                  </>
                ) : (
                  <>
                    <LabeledRandomButton
                      type="button"
                      aria-label="Show something random"
                      onClick={handleRandomClick}
                      disabled={isRandomLoading}
                      aria-busy={isRandomLoading}
                      className="railButton"
                    >
                      <ShuffleIcon fontSize="small" />
                      <span className="actionLabel">Random</span>
                    </LabeledRandomButton>
                    <SubmitButton
                      className="railButton"
                      type="submit"
                      aria-label="Search"
                      disabled={!hasInput}
                      title="Search"
                    >
                      <ArrowForwardRoundedIcon fontSize="small" />
                    </SubmitButton>
                  </>
                )}
              </RailRight>
            </>
          )}
        </ControlsRail>
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
