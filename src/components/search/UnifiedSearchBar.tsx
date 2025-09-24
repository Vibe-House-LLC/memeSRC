import React, { useCallback, useMemo, useRef, useState } from 'react';
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
  border: '1px solid rgba(148, 163, 184, 0.2)',
  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.86))',
  boxShadow: '0 22px 44px rgba(15, 23, 42, 0.32)',
  padding: theme.spacing(1.75, 2.25, 2.75),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
  overflow: 'hidden',
  '&[data-active="true"]': {
    borderColor: 'rgba(20, 184, 166, 0.45)',
  },
  '&:focus-within': {
    borderColor: 'rgba(20, 184, 166, 0.6)',
    boxShadow: '0 0 0 3px rgba(15, 157, 88, 0.18), 0 26px 48px rgba(15, 23, 42, 0.4)',
    transform: 'translateY(-1px)',
  },
  [theme.breakpoints.down('sm')]: {
    '--scope-button-size': '38px',
    '--scope-gap': theme.spacing(0.75),
    padding: theme.spacing(1.25, 1.5, 2.5),
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
  color: '#f8fafc',
  '& input': {
    padding: theme.spacing(1, 1.1),
    border: 'none',
    outline: 'none',
    background: 'transparent',
    caretColor: '#0F9D58',
    '::placeholder': {
      color: 'rgba(148, 163, 184, 0.68)',
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
  color: '#e2e8f0',
  backgroundColor: 'rgba(148, 163, 184, 0.18)',
  backdropFilter: 'blur(14px)',
  transition: 'background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
  '&:hover': {
    backgroundColor: 'rgba(148, 163, 184, 0.28)',
    transform: 'translateY(-1px)',
    boxShadow: '0 12px 24px rgba(15, 23, 42, 0.35)',
  },
}));

const ScopeButton = styled(IconButton)(({ theme }) => ({
  width: 'var(--scope-button-size)',
  height: 'var(--scope-button-size)',
  borderRadius: '999px',
  backgroundColor: 'rgba(148, 163, 184, 0.18)',
  boxShadow: '0 14px 28px rgba(15, 23, 42, 0.32)',
  color: '#f8fafc',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
  '&:hover': {
    backgroundColor: 'rgba(148, 163, 184, 0.3)',
    transform: 'translateY(-1px)',
    boxShadow: '0 18px 32px rgba(15, 23, 42, 0.4)',
  },
  '&:active': {
    transform: 'translateY(0)',
    boxShadow: '0 12px 20px rgba(15, 23, 42, 0.3)',
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
  color: '#f8fafc',
  [theme.breakpoints.down('sm')]: {
    fontSize: '0.95rem',
  },
}));

const FilterRail = styled('div')(({ theme }) => ({
  position: 'relative',
  alignSelf: 'stretch',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  marginTop: theme.spacing(1.25),
  paddingTop: theme.spacing(1),
  paddingLeft: `calc(var(--scope-button-size) + var(--scope-gap))`,
  paddingRight: theme.spacing(0.75),
  maxHeight: 96,
  opacity: 1,
  transition: 'max-height 0.25s ease, opacity 0.2s ease, margin-top 0.2s ease, padding-top 0.2s ease',
  overflow: 'hidden',
  [theme.breakpoints.down('sm')]: {
    flexWrap: 'wrap',
    gap: theme.spacing(1),
  },
  '::before': {
    content: "''",
    position: 'absolute',
    left: `calc(var(--scope-button-size) + ${theme.spacing(0.4)})`,
    right: theme.spacing(0.75),
    top: 0,
    height: 1,
    background: 'linear-gradient(90deg, rgba(148, 163, 184, 0), rgba(148, 163, 184, 0.5), rgba(148, 163, 184, 0))',
    transition: 'opacity 0.2s ease',
  },
  '&[data-expanded="false"]': {
    maxHeight: 0,
    opacity: 0,
    marginTop: 0,
    paddingTop: 0,
    pointerEvents: 'none',
  },
  '&[data-expanded="false"]::before': {
    opacity: 0,
  },
}));

const FilterTrigger = styled(ButtonBase)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(1),
  padding: theme.spacing(0.72, 1.4),
  borderRadius: 18,
  background: 'rgba(30, 41, 59, 0.82)',
  border: '1px solid rgba(148, 163, 184, 0.35)',
  boxShadow: '0 12px 32px rgba(15, 23, 42, 0.36)',
  color: '#e2e8f0',
  fontFamily: FONT_FAMILY,
  fontSize: '0.9rem',
  fontWeight: 600,
  lineHeight: 1.2,
  maxWidth: '100%',
  pointerEvents: 'auto',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
  textAlign: 'left',
  '&:hover': {
    backgroundColor: 'rgba(46, 60, 78, 0.92)',
    transform: 'translateY(-1px)',
    boxShadow: '0 18px 34px rgba(15, 23, 42, 0.42)',
  },
  '&:active': {
    transform: 'translateY(0)',
    boxShadow: '0 10px 22px rgba(15, 23, 42, 0.32)',
    backgroundColor: 'rgba(33, 43, 57, 0.92)',
  },
  '& svg': {
    transition: 'transform 0.2s ease',
    flexShrink: 0,
    color: '#38bdf8',
  },
  '&[aria-expanded="true"] svg': {
    transform: 'rotate(-180deg)',
  },
}));

const SubmitButton = styled(IconButton)(({ theme }) => ({
  width: 'var(--scope-button-size)',
  height: 'var(--scope-button-size)',
  borderRadius: '999px',
  background: 'linear-gradient(135deg, #0F9D58, #14b8a6)',
  color: theme.palette.common.white,
  boxShadow: '0 16px 32px rgba(15, 23, 42, 0.38)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: '0 20px 38px rgba(15, 23, 42, 0.46)',
    background: 'linear-gradient(135deg, #0c8c4a, #10a395)',
  },
  '&:active': {
    transform: 'translateY(0)',
    boxShadow: '0 12px 22px rgba(15, 23, 42, 0.32)',
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
  const [shellHasFocus, setShellHasFocus] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
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
    });
  }, []);

  const handleSelect: OnSelectSeries = useCallback(
    (selectedId) => {
      onSelectSeries(selectedId);
      setSelectorOpen(false);
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

  const isRailVisible = selectorOpen || shellHasFocus || value.trim().length > 0;

  return (
    <FormRoot onSubmit={onSubmit} noValidate>
      <FieldShell ref={shellRef} onFocus={handleShellFocus} onBlur={handleShellBlur} data-active={isRailVisible ? 'true' : 'false'}>
        <FieldRow>
          <ScopeButton
            type="button"
            onClick={handleFilterClick}
            aria-haspopup="dialog"
            aria-expanded={selectorOpen}
            aria-label={`Change search scope (currently ${currentLabel})`}
          >
            <ScopeGlyph>{scopeGlyph}</ScopeGlyph>
          </ScopeButton>
          <StyledInput
            value={value}
            inputRef={inputRef}
            placeholder={placeholder}
            onChange={(event) => onValueChange(event.target.value)}
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
        <FilterRail data-expanded={isRailVisible ? 'true' : 'false'}>
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
                color: '#f8fafc',
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
