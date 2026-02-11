import ReactMarkdown from 'react-markdown';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Link as MUILink,
  Stack,
  Typography,
  alpha,
  useTheme,
  type SxProps,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import {
  DEFAULT_GITHUB_OWNER,
  DEFAULT_GITHUB_REPO,
  formatRelativeTimeCompact,
  formatReleaseDisplay,
  getReleaseColor,
  getReleaseType,
  processGitHubLinks,
  type GitHubRelease,
} from '../../../utils/githubReleases';
import { isColorNearBlack } from '../../../utils/colors';
import { FeedCardSurface } from './CardSurface';
import { Link as RouterLink } from 'react-router-dom';

export interface ReleaseDetailsCardProps {
  release: GitHubRelease;
  isLatest?: boolean;
  owner?: string;
  repo?: string;
  sx?: SxProps<Theme>;
  onDismiss?: () => void;
  dismissAriaLabel?: string;
  showViewAllUpdatesButton?: boolean;
  viewAllUpdatesTo?: string;
}

export function ReleaseDetailsCard({
  release,
  isLatest = false,
  owner = DEFAULT_GITHUB_OWNER,
  repo = DEFAULT_GITHUB_REPO,
  sx,
  onDismiss,
  dismissAriaLabel = 'Dismiss release update',
  showViewAllUpdatesButton = false,
  viewAllUpdatesTo = '/releases',
}: ReleaseDetailsCardProps): React.ReactElement {
  const theme = useTheme();
  const title = String(release.name || release.tag_name || 'Untitled Release');
  const timeAgoCompact = formatRelativeTimeCompact(release.published_at);
  const isDraft = Boolean(release.draft);
  const isPrerelease = Boolean(release.prerelease);
  const releaseType = getReleaseType(release.tag_name);
  const releaseColorKey = getReleaseColor(releaseType, isPrerelease, isDraft);
  const releasePalette = theme.palette[releaseColorKey] || theme.palette.info;
  const processedBody = processGitHubLinks(release.body, owner, repo);
  const releaseUrl = String(release.html_url || `https://github.com/${owner}/${repo}/releases`);
  const titleId = `release-title-${release.id}`;
  const toneLabel = isDraft ? 'Draft update' : isPrerelease ? 'Beta update' : isLatest ? 'Latest update' : 'Release';
  const surfaceGradient = alpha('#0f172a', 0.94);
  const actionTextColor = isColorNearBlack(releasePalette.main)
    ? '#f8fafc'
    : theme.palette.getContrastText(releasePalette.main);
  const extraSx = Array.isArray(sx) ? sx : sx ? [sx] : [];

  return (
    <FeedCardSurface
      role="article"
      aria-labelledby={titleId}
      tone="neutral"
      gradient={surfaceGradient}
      sx={[
        {
          width: '100%',
          maxWidth: '100%',
          mx: 0,
          gap: { xs: 1.8, sm: 2.1 },
          border: `1px solid ${alpha('#94a3b8', 0.26)}`,
          boxShadow: 'none',
          backdropFilter: 'none',
          transition: 'box-shadow 0.3s ease',
        },
        ...extraSx,
      ]}
    >
      <Stack spacing={{ xs: 1.6, sm: 1.9 }} sx={{ width: '100%' }}>
        <Box
          sx={{
            mb: { xs: 0.2, sm: 0.3 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: { xs: 1, sm: 1.25 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, gap: { xs: 1, sm: 1.1 } }}>
            <Box
              component="span"
              sx={{
                width: 11,
                height: 11,
                borderRadius: '50%',
                backgroundColor: releasePalette.main,
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                color: 'rgba(226,232,240,0.8)',
                fontSize: { xs: '0.72rem', sm: '0.76rem' },
              }}
            >
              {toneLabel}
            </Typography>
          </Box>
          <Stack
            direction="row"
            alignItems="center"
            spacing={{ xs: 0.75, sm: 1 }}
            sx={{
              flexWrap: 'wrap',
              rowGap: { xs: 0.5, sm: 0.75 },
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontSize: { xs: '0.75rem', sm: '0.8rem' },
                fontWeight: 600,
                letterSpacing: '0.2px',
                whiteSpace: 'nowrap',
                color: 'rgba(226,232,240,0.74)',
              }}
            >
              {timeAgoCompact}
            </Typography>
            <Chip
              size="small"
              label={String(releaseType || 'patch').toUpperCase()}
              sx={{
                height: { xs: 20, sm: 22 },
                fontSize: { xs: '0.62rem', sm: '0.68rem' },
                fontWeight: 700,
                letterSpacing: '0.4px',
                bgcolor: alpha(releasePalette.main, 0.14),
                color: '#f8fafc',
                border: `1px solid ${alpha(releasePalette.main, 0.3)}`,
                '& .MuiChip-label': {
                  px: { xs: 0.75, sm: 1 },
                },
              }}
            />
            {isLatest && (
              <Chip
                label="Latest"
                size="small"
                sx={{
                  height: { xs: 20, sm: 22 },
                  fontSize: { xs: '0.62rem', sm: '0.68rem' },
                  fontWeight: 700,
                  background: alpha('#f8fafc', 0.9),
                  border: `1px solid ${alpha('#ffffff', 0.35)}`,
                  color: '#0b1222',
                  '& .MuiChip-label': { px: { xs: 0.75, sm: 1 } },
                }}
              />
            )}
            {isDraft && (
              <Chip
                size="small"
                label="Draft"
                sx={{
                  height: { xs: 20, sm: 22 },
                  fontSize: { xs: '0.62rem', sm: '0.68rem' },
                  fontWeight: 600,
                  bgcolor: alpha(theme.palette.error.main, 0.24),
                  color: '#f8fafc',
                  border: `1px solid ${alpha(theme.palette.error.main, 0.42)}`,
                  '& .MuiChip-label': {
                    px: { xs: 0.75, sm: 1 },
                  },
                }}
              />
            )}
            {isPrerelease && (
              <Chip
                size="small"
                label="Beta"
                sx={{
                  height: { xs: 20, sm: 22 },
                  fontSize: { xs: '0.62rem', sm: '0.68rem' },
                  fontWeight: 600,
                  bgcolor: alpha(theme.palette.warning.main, 0.24),
                  color: '#f8fafc',
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.42)}`,
                  '& .MuiChip-label': {
                    px: { xs: 0.75, sm: 1 },
                  },
                }}
              />
            )}
            {onDismiss && (
              <IconButton
                aria-label={dismissAriaLabel}
                onClick={onDismiss}
                  size="small"
                  sx={{
                    color: 'rgba(226,232,240,0.84)',
                    backgroundColor: alpha('#94a3b8', 0.14),
                    border: `1px solid ${alpha('#94a3b8', 0.34)}`,
                    '&:hover': {
                      backgroundColor: alpha('#94a3b8', 0.24),
                      color: '#f8fafc',
                    },
                  }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        </Box>

        <Stack spacing={{ xs: 0.5, sm: 0.75 }}>
          <Typography
            id={titleId}
            variant="h3"
            component="h2"
            sx={{
              fontWeight: 800,
              color: '#f8fafc',
              fontSize: { xs: '1.65rem', sm: '1.85rem', md: '2.05rem' },
              lineHeight: 1.12,
              letterSpacing: { xs: '-0.02em', md: '-0.03em' },
              overflowWrap: 'anywhere',
            }}
          >
            {formatReleaseDisplay(release.tag_name || title)}
          </Typography>
          {release.name && release.name !== release.tag_name && (
            <Typography
              component="p"
              sx={{
                color: 'rgba(226,232,240,0.78)',
                fontSize: { xs: '0.9rem', sm: '0.96rem' },
                fontWeight: 500,
              }}
            >
              {release.name}
            </Typography>
          )}
        </Stack>

        {release.body && (
          <Box sx={{ mt: { xs: 1.75, sm: 2.25 }, mb: { xs: 1.75, sm: 2.25 } }}>
            <Divider
              sx={{
                mb: { xs: 1.5, sm: 2 },
                opacity: 0.24,
                background: 'linear-gradient(90deg, transparent, rgba(226,232,240,0.9), transparent)',
              }}
            />
            <Box
              sx={{
                px: { xs: 1, sm: 1.5 },
                '& h1, & h2, & h3': {
                  fontSize: {
                    xs: isLatest ? '1.25rem' : '1.15rem',
                    sm: isLatest ? '1.35rem' : '1.25rem',
                    md: isLatest ? '1.45rem' : '1.35rem',
                  },
                  fontWeight: 700,
                  mb: { xs: 1.25, sm: 1.5 },
                  color: '#f8fafc',
                  lineHeight: 1.25,
                  '&:first-of-type': {
                    mt: 0,
                  },
                },
                '& p': {
                  mb: { xs: 1.25, sm: 1.5 },
                  fontSize: {
                    xs: isLatest ? '0.95rem' : '0.9rem',
                    sm: isLatest ? '1rem' : '0.95rem',
                    md: isLatest ? '1.05rem' : '1rem',
                  },
                  lineHeight: { xs: 1.6, sm: 1.65 },
                  color: 'rgba(226,232,240,0.92)',
                  opacity: 1,
                  '&:last-child': {
                    mb: 0,
                  },
                },
                '& ul, & ol': {
                  pl: { xs: 2.5, sm: 3 },
                  mb: { xs: 1.25, sm: 1.5 },
                  '& li': {
                    fontSize: {
                      xs: isLatest ? '0.95rem' : '0.9rem',
                      sm: isLatest ? '1rem' : '0.95rem',
                      md: isLatest ? '1.05rem' : '1rem',
                    },
                    lineHeight: { xs: 1.6, sm: 1.65 },
                    mb: { xs: 0.5, sm: 0.75 },
                    color: 'rgba(226,232,240,0.92)',
                    opacity: 1,
                    position: 'relative',
                    '&::marker': {
                      color: alpha(releasePalette.main, 0.9),
                    },
                  },
                },
                '& code': {
                  background: alpha(releasePalette.main, 0.14),
                  color: '#f8fafc',
                  px: { xs: 1, sm: 1.2 },
                  py: { xs: 0.3, sm: 0.4 },
                  borderRadius: 1,
                  fontSize: { xs: isLatest ? '0.78rem' : '0.74rem', sm: isLatest ? '0.82rem' : '0.78rem' },
                  fontFamily: '"JetBrains Mono", Monaco, Consolas, "Roboto Mono", monospace',
                  border: `1px solid ${alpha(releasePalette.main, 0.3)}`,
                  fontWeight: 500,
                },
                '& pre': {
                  background: alpha('#0b1222', 0.65),
                  borderRadius: { xs: 1.5, sm: 2 },
                  p: { xs: 1.25, sm: 1.5 },
                  overflow: 'auto',
                  border: `1px solid ${alpha('#94a3b8', 0.24)}`,
                  mb: { xs: 1, sm: 1.25 },
                  '& code': {
                    background: 'transparent',
                    border: 'none',
                    p: 0,
                  },
                },
                '& strong': {
                  color: '#f8fafc',
                  fontWeight: 600,
                  opacity: 1,
                },
                '& a': {
                  color: alpha(releasePalette.light || releasePalette.main, 0.96),
                  textDecoration: 'none',
                  fontWeight: 700,
                  borderBottom: `1px solid ${alpha(releasePalette.main, 0.48)}`,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderBottom: `1px solid ${alpha(releasePalette.light || '#ffffff', 0.9)}`,
                    opacity: 1,
                  },
                },
                '& blockquote': {
                  borderLeft: `3px solid ${alpha(releasePalette.main, 0.9)}`,
                  pl: { xs: 2, sm: 2.5 },
                  ml: 0,
                  py: { xs: 0.75, sm: 1 },
                  background: alpha(releasePalette.main, 0.11),
                  borderRadius: 1.5,
                  mb: { xs: 1.25, sm: 1.5 },
                  '& p': {
                    mb: 0,
                    fontStyle: 'italic',
                    opacity: 0.95,
                    color: 'rgba(226,232,240,0.9)',
                    fontSize: {
                      xs: isLatest ? '0.9rem' : '0.85rem',
                      sm: isLatest ? '0.95rem' : '0.9rem',
                      md: isLatest ? '1rem' : '0.95rem',
                    },
                  },
                },
              }}
            >
              <ReactMarkdown>{processedBody}</ReactMarkdown>
            </Box>
          </Box>
        )}

        {Array.isArray(release.assets) && release.assets.length > 0 && (
          <Box sx={{ mt: { xs: 2, sm: 2.5 }, pt: { xs: 1.5, sm: 2 }, borderTop: `1px solid ${alpha('#94a3b8', 0.22)}` }}>
            <Typography
              variant="subtitle2"
              sx={{
                mb: { xs: 1.25, sm: 1.5 },
                fontWeight: 600,
                color: 'rgba(226,232,240,0.86)',
                fontSize: { xs: '0.85rem', sm: '0.9rem' },
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Downloads ({release.assets.length})
            </Typography>
            <Stack direction="row" spacing={{ xs: 0.5, sm: 0.75 }} flexWrap="wrap" useFlexGap>
              {release.assets.slice(0, 3).map((asset) => (
                <Chip
                  key={asset.id}
                  label={`${String(asset.name || 'Download')} (${asset.download_count || 0})`}
                  size="small"
                  variant="outlined"
                  icon={<DownloadIcon sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }} />}
                  clickable
                  component={MUILink as unknown as React.ElementType}
                  href={asset.browser_download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    textDecoration: 'none',
                    color: 'rgba(226,232,240,0.9)',
                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                    height: { xs: 24, sm: 28 },
                    fontWeight: 500,
                    borderColor: alpha('#94a3b8', 0.42),
                    backgroundColor: alpha('#0b1222', 0.46),
                    '& .MuiChip-label': {
                      px: { xs: 1, sm: 1.5 },
                    },
                    '&:hover': {
                      bgcolor: alpha(releasePalette.main, 0.18),
                      borderColor: alpha(releasePalette.main, 0.64),
                    },
                  }}
                />
              ))}
              {release.assets.length > 3 && (
                <Chip
                  label={`+${release.assets.length - 3} more`}
                  size="small"
                  variant="outlined"
                  sx={{
                    opacity: 0.74,
                    color: 'rgba(226,232,240,0.78)',
                    borderColor: alpha('#94a3b8', 0.35),
                    backgroundColor: alpha('#0b1222', 0.42),
                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                    height: { xs: 24, sm: 28 },
                  }}
                />
              )}
            </Stack>
          </Box>
        )}

        <Box
          sx={{
            mt: { xs: 2, sm: 2.5 },
            pt: { xs: 1.5, sm: 2 },
            borderTop: `1px solid ${alpha('#94a3b8', 0.22)}`,
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 1.25 }}>
            <Button
              component={MUILink as unknown as React.ElementType}
              href={releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              size={isLatest ? 'large' : 'medium'}
              variant="contained"
              color="primary"
              endIcon={<OpenInNewIcon sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }} />}
              fullWidth
              sx={{
                borderRadius: 999,
                fontWeight: 700,
                textTransform: 'none',
                py: { xs: 0.9, sm: 1 },
                color: actionTextColor,
                backgroundColor: releasePalette.main,
                fontSize: { xs: '0.88rem', sm: '0.92rem' },
                boxShadow: 'none',
                transition: 'background-color 0.2s ease',
                '&:hover': {
                  backgroundColor: releasePalette.main,
                  opacity: 0.96,
                },
              }}
            >
              Open on GitHub
            </Button>
            {showViewAllUpdatesButton && (
              <Button
                component={RouterLink}
                to={viewAllUpdatesTo}
                size={isLatest ? 'large' : 'medium'}
                variant="outlined"
                fullWidth
                sx={{
                  borderRadius: 999,
                  fontWeight: 700,
                  textTransform: 'none',
                  py: { xs: 0.9, sm: 1 },
                  color: 'rgba(226,232,240,0.9)',
                  borderColor: alpha('#94a3b8', 0.45),
                  backgroundColor: alpha('#0b1222', 0.28),
                  fontSize: { xs: '0.88rem', sm: '0.92rem' },
                  '&:hover': {
                    borderColor: alpha('#cbd5e1', 0.6),
                    backgroundColor: alpha('#0b1222', 0.4),
                  },
                }}
              >
                View All Updates
              </Button>
            )}
          </Stack>
        </Box>
      </Stack>
    </FeedCardSurface>
  );
}
