import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Link as MUILink,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
  Skeleton,
  useTheme,
  alpha,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DownloadIcon from '@mui/icons-material/Download';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import BugReportIcon from '@mui/icons-material/BugReport';
import FeaturesIcon from '@mui/icons-material/AutoAwesome';
import { formatDistanceToNow } from 'date-fns';

const GITHUB_OWNER = 'Vibe-House-LLC';
const GITHUB_REPO = 'memeSRC';
const PAGE_SIZE = 20;

export default function ReleasesPage() {
  const [releases, setReleases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);


  const fetchReleases = useCallback(async (pageNumber) => {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases?per_page=${PAGE_SIZE}&page=${pageNumber}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GitHub API error ${response.status}: ${text}`);
    }

    return response.json();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const pageOne = await fetchReleases(1);
        if (!isMounted) return;
        setReleases(pageOne);
        setHasMore(pageOne.length === PAGE_SIZE);
        setCurrentPage(1);
      } catch (err) {
        if (!isMounted) return;
        setErrorMessage(err instanceof Error ? err.message : 'Failed to load releases');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [fetchReleases]);

  const handleLoadMore = useCallback(async () => {
    setIsLoadingMore(true);
    setErrorMessage('');
    try {
      const nextPage = currentPage + 1;
      const next = await fetchReleases(nextPage);
      setReleases((prev) => [...prev, ...next]);
      setHasMore(next.length === PAGE_SIZE);
      setCurrentPage(nextPage);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load more releases');
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchReleases, currentPage]);

  // Helper functions for release categorization
  const getReleaseType = (tagName) => {
    if (!tagName) return 'patch';
    const version = tagName.replace(/^v/, '');
    const parts = version.split('.');
    if (parts.length >= 3) {
      const [major, minor, patch] = parts;
      if (patch === '0' && minor === '0') return 'major';
      if (patch === '0') return 'minor';
    }
    return 'patch';
  };

  const getReleaseIcon = (type, isPrerelease, isDraft) => {
    if (isDraft) return <BugReportIcon />;
    if (isPrerelease) return <FeaturesIcon />;
    switch (type) {
      case 'major': return <NewReleasesIcon sx={{ color: '#ff4444' }} />;
      case 'minor': return <NewReleasesIcon sx={{ color: '#44ff44' }} />;
      default: return <NewReleasesIcon sx={{ color: '#4488ff' }} />;
    }
  };

  const getReleaseColor = (type, isPrerelease, isDraft) => {
    if (isDraft) return 'error';
    if (isPrerelease) return 'warning';
    switch (type) {
      case 'major': return 'error';
      case 'minor': return 'success';
      default: return 'info';
    }
  };

  const theme = useTheme();



  // Process GitHub-style links in markdown
  const processGitHubLinks = useCallback((text) => {
    if (!text) return text;
    
    // Replace GitHub PR/issue references
    return text
      .replace(/https:\/\/github\.com\/Vibe-House-LLC\/memeSRC\/pull\/(\d+)/g, 
        `[#$1](https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/pull/$1)`)
      .replace(/https:\/\/github\.com\/Vibe-House-LLC\/memeSRC\/issues\/(\d+)/g, 
        `[#$1](https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/issues/$1)`)
      // Also handle simple #123 references that might already be in the text
      .replace(/\b#(\d+)\b/g, 
        `[#$1](https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/pull/$1)`);
  }, []);

  const header = useMemo(() => (
    <Box sx={{ mb: { xs: 6, md: 8 }, textAlign: 'center' }}>
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} sx={{ mb: 3 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(155, 89, 204, 0.2) 0%, rgba(131, 71, 184, 0.1) 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(155, 89, 204, 0.2)',
          }}
        >
          <NewReleasesIcon sx={{ fontSize: 48, color: 'primary.main' }} />
        </Box>
      </Stack>
      
      <Typography 
        variant="h2" 
        component="h1"
        sx={{
          fontWeight: 700,
          fontSize: { xs: '2.5rem', md: '3.5rem' },
          background: 'linear-gradient(135deg, #F0E6FF 0%, #D4A5FF 50%, #9B59CC 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          mb: 2,
        }}
      >
        Release Timeline
      </Typography>
      
      <Typography 
        variant="h5" 
        color="text.secondary" 
        sx={{ 
          mb: 3,
          fontWeight: 300,
          opacity: 0.9,
        }}
      >
        Discover the evolution of memeSRC
      </Typography>
      
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          px: 3,
          py: 1.5,
          borderRadius: 25,
          background: 'rgba(155, 89, 204, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(155, 89, 204, 0.2)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px rgba(155, 89, 204, 0.3)',
          },
        }}
      >
        <MUILink 
          href={`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`} 
          target="_blank" 
          rel="noopener noreferrer"
          sx={{ 
            textDecoration: 'none',
            color: 'primary.light',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          View on GitHub <OpenInNewIcon sx={{ fontSize: 16 }} />
        </MUILink>
      </Box>
    </Box>
  ), []);

  return (
    <>
      <Helmet>
        <title>Releases - memeSRC</title>
      </Helmet>
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          position: 'relative',
        }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
          {header}

        {isLoading && (
          <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
            <Box sx={{ mb: 4, position: 'relative' }}>
              <LinearProgress 
                sx={{ 
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 2,
                    background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                  },
                }} 
              />
            </Box>
            <Stack spacing={4}>
              {[...Array(3)].map((_, idx) => (
                <Box key={idx} sx={{ position: 'relative', pl: { xs: 8, md: 12 } }}>
                  <Skeleton 
                    variant="circular" 
                    width={52} 
                    height={52} 
                    sx={{ 
                      position: 'absolute',
                      left: { xs: 14, md: 24 },
                      top: 12,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                    }} 
                  />
                  <Skeleton 
                    variant="rounded" 
                    height={160} 
                    sx={{ 
                      bgcolor: alpha(theme.palette.background.paper, 0.3),
                      backdropFilter: 'blur(10px)',
                      borderRadius: 3,
                    }} 
                  />
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {!!errorMessage && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 4,
              maxWidth: '900px',
              mx: 'auto',
              background: `linear-gradient(135deg, ${alpha('#ff4444', 0.1)} 0%, ${alpha('#ff4444', 0.05)} 100%)`,
              backdropFilter: 'blur(10px)',
              border: `1px solid ${alpha('#ff4444', 0.2)}`,
              borderRadius: 2,
            }}
          >
            {errorMessage}
          </Alert>
        )}

        {!isLoading && releases.length === 0 && !errorMessage && (
          <Alert 
            severity="info"
            sx={{
              maxWidth: '900px',
              mx: 'auto',
              background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
              backdropFilter: 'blur(10px)',
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              borderRadius: 2,
            }}
          >
            No releases found.
          </Alert>
        )}

        {/* Timeline */}
        <Box 
          sx={{ position: 'relative', maxWidth: '900px', mx: 'auto' }}
          role="main"
          aria-label="Release timeline"
        >
          {/* Enhanced Timeline line with gradient */}
          <Box
            sx={{
              position: 'absolute',
              left: { xs: 30, md: 40 },
              top: 0,
              bottom: 0,
              width: 3,
              background: `linear-gradient(to bottom, 
                ${alpha(theme.palette.primary.main, 0.8)} 0%, 
                ${alpha(theme.palette.primary.main, 0.4)} 50%, 
                ${alpha(theme.palette.primary.main, 0.2)} 100%
              )`,
              borderRadius: 1.5,
              boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.3)}`,
              zIndex: 0,
            }}
          />

          <Stack spacing={3}>
            {releases.map((release, index) => {
              const title = release.name || release.tag_name;
              const timeAgo = release.published_at 
                ? formatDistanceToNow(new Date(release.published_at), { addSuffix: true })
                : 'Draft';
              const isDraft = Boolean(release.draft);
              const isPrerelease = Boolean(release.prerelease);
              const releaseType = getReleaseType(release.tag_name);
              const isLatest = index === 0;

              const processedBody = processGitHubLinks(release.body);

              return (
                <Box key={release.id} sx={{ position: 'relative', pl: { xs: 8, md: 12 } }}>
                  {/* Enhanced Timeline dot */}
                  <Avatar
                    aria-label={`${title} release indicator`}
                    sx={{
                      position: 'absolute',
                      left: { xs: 14, md: 24 },
                      top: 12,
                      width: { xs: 44, md: 52 },
                      height: { xs: 44, md: 52 },
                      background: isLatest 
                        ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
                        : theme.palette.background.paper,
                      border: `3px solid ${theme.palette[getReleaseColor(releaseType, isPrerelease, isDraft)].main}`,
                      boxShadow: isLatest 
                        ? `0 8px 25px ${alpha(theme.palette.primary.main, 0.4)}, 0 0 0 4px ${alpha(theme.palette.primary.main, 0.1)}`
                        : `0 4px 15px ${alpha(theme.palette[getReleaseColor(releaseType, isPrerelease, isDraft)].main, 0.2)}`,
                      transform: isLatest ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      zIndex: 3,
                      color: isLatest 
                        ? theme.palette.primary.contrastText 
                        : theme.palette[getReleaseColor(releaseType, isPrerelease, isDraft)].main,
                      '&::before': isLatest ? {
                        content: '""',
                        position: 'absolute',
                        top: -8,
                        left: -8,
                        right: -8,
                        bottom: -8,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, transparent 100%)`,
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                        zIndex: -1,
                      } : {},
                    }}
                  >
                    {getReleaseIcon(releaseType, isPrerelease, isDraft)}
                  </Avatar>

                  {/* Enhanced Release card with glass morphism */}
                  <Card
                    elevation={0}
                    role="article"
                    aria-labelledby={`release-title-${release.id}`}
                    sx={{
                      position: 'relative',
                      background: isLatest 
                        ? `linear-gradient(135deg, 
                            ${alpha(theme.palette.background.paper, 0.9)} 0%, 
                            ${alpha(theme.palette.background.paper, 0.8)} 100%
                          )`
                        : `linear-gradient(135deg, 
                            ${alpha(theme.palette.background.paper, 0.7)} 0%, 
                            ${alpha(theme.palette.background.paper, 0.5)} 100%
                          )`,
                      backdropFilter: 'blur(20px)',
                      border: isLatest 
                        ? `2px solid ${alpha(theme.palette.primary.main, 0.5)}` 
                        : `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                      borderRadius: 3,
                      boxShadow: isLatest
                        ? `0 20px 40px ${alpha(theme.palette.primary.main, 0.15)}, 0 0 0 1px ${alpha(theme.palette.primary.main, 0.1)}`
                        : `0 10px 30px ${alpha('#000', 0.2)}`,
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '100%',
                        background: isLatest 
                          ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 50%)`
                          : 'transparent',
                        pointerEvents: 'none',
                      },

                    }}
                  >
                    <CardContent sx={{ pb: 3 }}>
                      {/* Header */}
                      <Stack direction="row" alignItems="flex-start" spacing={2} sx={{ mb: 3 }}>
                        <Box sx={{ flexGrow: 1 }}>
                          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                            <Typography 
                              id={`release-title-${release.id}`}
                              variant={isLatest ? "h5" : "h6"} 
                              component="h2"
                              sx={{ 
                                fontWeight: isLatest ? 700 : 600,
                                color: isLatest ? 'primary.main' : 'text.primary',
                                mb: 0
                              }}
                            >
                              {title}
                            </Typography>
                            {isLatest && (
                              <Chip
                                label="Latest"
                                size="small"
                                color="primary"
                                sx={{
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                  height: 24,
                                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                                  boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
                                }}
                              />
                            )}
                          </Stack>
                          <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ 
                              fontSize: '0.875rem',
                              fontWeight: 500
                            }}
                          >
                            {timeAgo}
                          </Typography>
                          
                          {/* Chips row - moved below title for better spacing */}
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
                            {isDraft && (
                              <Chip 
                                size="small" 
                                label="Draft" 
                                sx={{
                                  bgcolor: alpha(theme.palette.error.main, 0.15),
                                  color: theme.palette.error.main,
                                  border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                                  fontWeight: 500,
                                  fontSize: '0.7rem',
                                  height: 24,
                                }}
                              />
                            )}
                            {isPrerelease && (
                              <Chip 
                                size="small" 
                                label="Pre-release" 
                                sx={{
                                  bgcolor: alpha(theme.palette.warning.main, 0.15),
                                  color: theme.palette.warning.main,
                                  border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                                  fontWeight: 500,
                                  fontSize: '0.7rem',
                                  height: 24,
                                }}
                              />
                            )}
                            <Chip 
                              size="small" 
                              label={releaseType.toUpperCase()} 
                              sx={{
                                bgcolor: alpha(theme.palette[getReleaseColor(releaseType, isPrerelease, isDraft)].main, 0.15),
                                color: theme.palette[getReleaseColor(releaseType, isPrerelease, isDraft)].main,
                                border: `1px solid ${alpha(theme.palette[getReleaseColor(releaseType, isPrerelease, isDraft)].main, 0.3)}`,
                                fontWeight: 600,
                                fontSize: '0.7rem',
                                height: 24,
                                letterSpacing: '0.5px',
                              }}
                            />
                          </Stack>
                        </Box>

                        <Button
                          component={MUILink}
                          href={release.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="small"
                          variant="contained"
                          color={isLatest ? "primary" : "secondary"}
                          endIcon={<OpenInNewIcon />}
                          sx={{
                            borderRadius: 2,
                            fontWeight: 500,
                            textTransform: 'none',
                            minWidth: 80,
                            px: 2.5,
                            py: 1,
                            boxShadow: isLatest 
                              ? `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`
                              : `0 2px 8px ${alpha(theme.palette.secondary.main, 0.2)}`,
                            '&:hover': {
                              boxShadow: isLatest 
                                ? `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`
                                : `0 4px 12px ${alpha(theme.palette.secondary.main, 0.3)}`,
                              transform: 'translateY(-1px)',
                            }
                          }}
                        >
                          View
                        </Button>
                      </Stack>

                      {/* Release notes - integrated as core content */}
                      {release.body && (
                        <Box sx={{ mt: 4, mb: 3 }}>
                          <Divider sx={{ mb: 4, opacity: 0.12, background: 'linear-gradient(90deg, transparent, currentColor, transparent)' }} />
                          <Box 
                            sx={{ 
                              '& h1, & h2, & h3': { 
                                fontSize: '1.1rem', 
                                fontWeight: 600, 
                                mb: 2.5, 
                                color: 'primary.main',
                                lineHeight: 1.4,
                                '&:first-of-type': {
                                  mt: 0
                                }
                              },
                              '& p': { 
                                mb: 2.5, 
                                fontSize: '0.9rem', 
                                lineHeight: 1.7,
                                color: 'text.primary',
                                opacity: 0.95,
                                '&:last-child': {
                                  mb: 0
                                }
                              },
                              '& ul, & ol': { 
                                pl: 2.5, 
                                mb: 2.5,
                                '& li': {
                                  fontSize: '0.9rem',
                                  lineHeight: 1.7,
                                  mb: 1,
                                  color: 'text.primary',
                                  opacity: 0.95,
                                  position: 'relative',
                                  '&::marker': {
                                    color: 'primary.main',
                                  }
                                }
                              },
                              '& code': { 
                                background: alpha(theme.palette.primary.main, 0.1),
                                color: 'primary.main',
                                px: 1.2,
                                py: 0.4,
                                borderRadius: 1,
                                fontSize: '0.82rem',
                                fontFamily: '"JetBrains Mono", Monaco, Consolas, "Roboto Mono", monospace',
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                                fontWeight: 500,
                              },
                              '& pre': {
                                background: alpha(theme.palette.background.paper, 0.5),
                                borderRadius: 2,
                                p: 2,
                                overflow: 'auto',
                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                mb: 2.5,
                                '& code': {
                                  background: 'transparent',
                                  border: 'none',
                                  p: 0,
                                }
                              },
                              '& strong': {
                                color: 'text.primary',
                                fontWeight: 600,
                                opacity: 1,
                              },
                              '& a': {
                                color: 'primary.main',
                                textDecoration: 'none',
                                fontWeight: 500,
                                borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  borderBottom: `1px solid ${theme.palette.primary.main}`,
                                  transform: 'translateY(-1px)',
                                },
                              },
                              '& blockquote': {
                                borderLeft: `3px solid ${theme.palette.primary.main}`,
                                pl: 2,
                                ml: 0,
                                py: 1,
                                background: alpha(theme.palette.primary.main, 0.05),
                                borderRadius: 1,
                                mb: 2.5,
                                '& p': {
                                  mb: 0,
                                  fontStyle: 'italic',
                                  opacity: 0.9,
                                }
                              }
                            }}
                          >
                            <ReactMarkdown 
                              components={{
                                a: ({ href, children, ...props }) => (
                                  <MUILink 
                                    href={href} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    {...props}
                                  >
                                    {children}
                                  </MUILink>
                                ),
                              }}
                            >
                              {processedBody}
                            </ReactMarkdown>
                          </Box>
                        </Box>
                      )}

                      {/* Assets */}
                      {Array.isArray(release.assets) && release.assets.length > 0 && (
                        <Box sx={{ mt: 3, pt: 3, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              mb: 2, 
                              fontWeight: 600,
                              color: 'primary.light',
                              fontSize: '0.9rem'
                            }}
                          >
                            Downloads ({release.assets.length})
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {release.assets.slice(0, 5).map((asset) => (
                              <Chip
                                key={asset.id}
                                label={`${asset.name} (${asset.download_count})`}
                                size="small"
                                variant="outlined"
                                icon={<DownloadIcon />}
                                clickable
                                component={MUILink}
                                href={asset.browser_download_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ 
                                  textDecoration: 'none',
                                  fontWeight: 500,
                                  '&:hover': { 
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    borderColor: 'primary.main'
                                  }
                                }}
                              />
                            ))}
                            {release.assets.length > 5 && (
                              <Chip
                                label={`+${release.assets.length - 5} more`}
                                size="small"
                                variant="outlined"
                                sx={{ opacity: 0.7 }}
                              />
                            )}
                          </Stack>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Box>
              );
            })}
          </Stack>
        </Box>

        {hasMore && !isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
            <Button 
              variant="contained" 
              size="large"
              onClick={handleLoadMore} 
              disabled={isLoadingMore}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 25,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.3)}`,
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 12px 35px ${alpha(theme.palette.primary.main, 0.4)}`,
                },
                '&:disabled': {
                  background: alpha(theme.palette.primary.main, 0.5),
                  transform: 'none',
                },
              }}
            >
              {isLoadingMore ? 'Loading…' : 'Load More Releases'}
            </Button>
          </Box>
        )}
        </Container>
      </Box>
    </>
  );
}
