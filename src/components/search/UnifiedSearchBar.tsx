import React, { useCallback, useEffect, useMemo, useRef, useState, useId } from 'react';
import { styled } from '@mui/material/styles';
import { ButtonBase, IconButton, InputBase, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import SeriesSelectorDialog, { type SeriesItem } from '../SeriesSelectorDialog';

type SeriesSelectorDialogProps = React.ComponentProps<typeof SeriesSelectorDialog>;

type OnSelectSeries = SeriesSelectorDialogProps['onSelect'];

export interface UnifiedSearchBarProps {
  value: string;
  placeholder?: string;
  onValueChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
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
  gap: theme.spacing(2),
}));

const FieldShell = styled('div')(({ theme }) => ({
  '--scope-button-size': '44px',
  '--scope-gap': theme.spacing(1),
  position: 'relative',
  width: '100%',
  borderRadius: 24,
  border: '1px solid rgba(15, 23, 42, 0.08)',
  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.94))',
  boxShadow: '0 18px 36px rgba(15, 23, 42, 0.14)',
  padding: theme.spacing(1.75, 2.25, 2.5),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
  overflow: 'hidden',
  '&[data-active="true"]': {
    borderColor: 'rgba(15, 157, 88, 0.35)',
  },
  '&:focus-within': {
    borderColor: '#0F9D58',
    boxShadow: '0 0 0 4px rgba(15, 157, 88, 0.12), 0 24px 42px rgba(15, 23, 42, 0.18)',
    transform: 'translateY(-1px)',
  },
  [theme.breakpoints.down('sm')]: {
    '--scope-button-size': '38px',
    '--scope-gap': theme.spacing(0.75),
    padding: theme.spacing(1.35, 1.5, 2.25),
    borderRadius: 20,
  },
}));

const FieldRow = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--scope-gap)',
}));

const StyledInput = styled(InputBase)(({ theme }) => ({
  flex: 1,
  fontFamily: FONT_FAMILY,
  fontSize: '1.125rem',
  fontWeight: 500,
  color: '#0f172a',
  '& input': {
    padding: theme.spacing(1, 1.1),
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
    fontSize: '1.05rem',
    '& input': {
      padding: theme.spacing(0.65, 0.75),
    },
  },
}));

const ClearButton = styled(IconButton)(({ theme }) => ({
  width: 'var(--scope-button-size)',
  height: 'var(--scope-button-size)',
  borderRadius: '999px',
  color: '#475569',
  background: 'linear-gradient(180deg, rgba(248, 250, 252, 0.92), rgba(241, 245, 249, 0.86))',
  border: '1px solid rgba(148, 163, 184, 0.26)',
  transition: 'background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
  '&:hover': {
    background: 'linear-gradient(180deg, rgba(236, 242, 247, 0.98), rgba(248, 250, 252, 0.92))',
    transform: 'translateY(-1px)',
    boxShadow: '0 12px 22px rgba(15, 23, 42, 0.18)',
  },
}));

const ScopeButton = styled(IconButton)(({ theme }) => ({
  width: 'var(--scope-button-size)',
  height: 'var(--scope-button-size)',
  borderRadius: '999px',
  background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(255, 255, 255, 0.96))',
  border: '1px solid rgba(148, 163, 184, 0.32)',
  boxShadow: '0 12px 24px rgba(15, 23, 42, 0.15)',
  color: '#0f172a',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
  '&:hover': {
    background: 'linear-gradient(135deg, rgba(236, 242, 247, 0.98), rgba(255, 255, 255, 0.96))',
    transform: 'translateY(-1px)',
    boxShadow: '0 14px 26px rgba(15, 23, 42, 0.2)',
  },
  '&:active': {
    transform: 'translateY(0)',
    boxShadow: '0 10px 20px rgba(15, 23, 42, 0.16)',
  },
}));

const ScopeGlyph = styled('span')(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  fontFamily: FONT_FAMILY,
  fontWeight: 600,
  fontSize: '1.05rem',
  letterSpacing: 0.25,
  color: '#0f172a',
  [theme.breakpoints.down('sm')]: {
    fontSize: '0.95rem',
  },
}));

const FilterRail = styled('div')(({ theme }) => ({
  alignSelf: 'stretch',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.25),
  marginTop: 0,
  maxHeight: 0,
  opacity: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
  transition: 'max-height 0.3s ease, opacity 0.2s ease, margin-top 0.2s ease',
  [theme.breakpoints.down('sm')]: {
    flexWrap: 'wrap',
    gap: theme.spacing(1),
  },
  '&[data-expanded="true"]': {
    marginTop: theme.spacing(1.5),
    maxHeight: 160,
    opacity: 1,
    pointerEvents: 'auto',
  },
}));

const FilterTrigger = styled(ButtonBase)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(1),
  padding: theme.spacing(0.72, 1.4),
  borderRadius: 18,
  background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 0.96))',
  border: '1px solid rgba(148, 163, 184, 0.32)',
  boxShadow: '0 12px 24px rgba(15, 23, 42, 0.16)',
  color: '#0f172a',
  fontFamily: FONT_FAMILY,
  fontSize: '0.9rem',
  fontWeight: 600,
  lineHeight: 1.2,
  maxWidth: '100%',
  pointerEvents: 'auto',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
  textAlign: 'left',
  '&:hover': {
    background: 'linear-gradient(135deg, rgba(236, 242, 247, 0.98), rgba(255, 255, 255, 0.98))',
    transform: 'translateY(-1px)',
    boxShadow: '0 16px 28px rgba(15, 23, 42, 0.22)',
  },
  '&:active': {
    transform: 'translateY(0)',
    boxShadow: '0 10px 20px rgba(15, 23, 42, 0.18)',
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
  background: 'linear-gradient(135deg, #0F9D58, #22C55E)',
  color: theme.palette.common.white,
  boxShadow: '0 14px 28px rgba(15, 23, 42, 0.24)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: '0 18px 32px rgba(15, 23, 42, 0.28)',
    background: 'linear-gradient(135deg, #0c8c4a, #16a34a)',
  },
  '&:active': {
    transform: 'translateY(0)',
    boxShadow: '0 12px 20px rgba(15, 23, 42, 0.22)',
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
  const railId = useId();
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
      if (!prev) {
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
        data-active={isShellActive ? 'true' : 'false'}
        data-expanded={scopeExpanded ? 'true' : 'false'}
      >
        <FieldRow>
          {!scopeExpanded && (
            <ScopeButton
              type="button"
              onClick={handleScopeToggle}
              aria-expanded={scopeExpanded}
              aria-pressed={scopeExpanded}
              aria-label={scopeButtonLabel}
              aria-controls={railId}
              title={currentLabel}
            >
              <ScopeGlyph>{scopeGlyph}</ScopeGlyph>
            </ScopeButton>
          )}
          <StyledInput
            value={value}
            inputRef={inputRef}
            placeholder={placeholder}
            onChange={(event) => onValueChange(event.target.value)}
            sx={{
              '& input': (theme) => ({
                padding: scopeExpanded ? theme.spacing(1.05, 0.75) : theme.spacing(1, 1.1),
                transition: 'padding 0.2s ease',
              }),
            }}
          />
          {value && (
            <ClearButton aria-label="Clear search" size="small" onClick={handleClear}>
              <CloseRoundedIcon fontSize="small" />
            </ClearButton>
          )}
          <SubmitButton type="submit" aria-label="Search">
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
            >
              <ScopeGlyph>{scopeGlyph}</ScopeGlyph>
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
                fontSize: '0.88rem',
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
