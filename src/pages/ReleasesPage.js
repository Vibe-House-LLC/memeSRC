import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Link as MUILink,
  LinearProgress,
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
import GitHubIcon from '@mui/icons-material/GitHub';
import FavoriteIcon from '@mui/icons-material/Favorite';
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
    if (!tagName || typeof tagName !== 'string') return 'patch';
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
      case 'major': return <NewReleasesIcon />;
      case 'minor': return <NewReleasesIcon />;
      default: return <NewReleasesIcon />;
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

  // Compact relative time formatter (e.g., "1h ago")
  const formatRelativeTimeCompact = useCallback((dateString) => {
    if (!dateString) return 'Draft';
    const then = new Date(dateString).getTime();
    const now = Date.now();
    const seconds = Math.max(1, Math.floor((now - then) / 1000));
    if (seconds < 60) return '<1m ago';
    const units = [
      { label: 'y', secs: 31536000 },
      { label: 'mo', secs: 2592000 },
      { label: 'w', secs: 604800 },
      { label: 'd', secs: 86400 },
      { label: 'h', secs: 3600 },
      { label: 'm', secs: 60 },
    ];
    const matchingUnit = units.find((u) => seconds >= u.secs);
    if (matchingUnit) {
      const value = Math.floor(seconds / matchingUnit.secs);
      return `${value}${matchingUnit.label} ago`;
    }
    return '<1m ago';
  }, []);



  // Process GitHub-style links in markdown
  const processGitHubLinks = useCallback((text) => {
    if (!text || typeof text !== 'string') return text || '';
    
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
    <Box sx={{ mb: { xs: 4, sm: 5, md: 6 }, textAlign: { xs: 'left', md: 'center' } }}>
      
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
        Version History
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
        memeSRC is open source and powered by community support
      </Typography>
      
      <Stack 
        direction="row" 
        spacing={{ xs: 1, sm: 2 }} 
        alignItems={{ xs: 'stretch', md: 'center' }} 
        justifyContent={{ xs: 'stretch', md: 'center' }}
        sx={{ width: { xs: '100%', md: 'auto' } }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            px: 3,
            py: 1.75,
            borderRadius: 2,
            background: alpha(theme.palette.text.primary, 0.04),
            backdropFilter: 'blur(10px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
            transition: 'all 0.2s ease',
            minHeight: 48,
            flex: { xs: 1, md: 'none' },
            '&:hover': {
              background: alpha(theme.palette.text.primary, 0.08),
              transform: 'translateY(-1px)',
              borderColor: alpha(theme.palette.text.primary, 0.2),
            },
          }}
        >
          <MUILink 
            href={`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`} 
            target="_blank" 
            rel="noopener noreferrer"
            sx={{ 
              textDecoration: 'none',
              color: 'text.primary',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              fontSize: '1rem',
              width: '100%',
            }}
          >
            <GitHubIcon sx={{ fontSize: 20 }} /> GitHub
          </MUILink>
        </Box>
        
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            px: 3,
            py: 1.75,
            borderRadius: 2,
            background: alpha(theme.palette.text.primary, 0.04),
            backdropFilter: 'blur(10px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
            transition: 'all 0.2s ease',
            minHeight: 48,
            flex: { xs: 1, md: 'none' },
            '&:hover': {
              background: alpha(theme.palette.text.primary, 0.08),
              transform: 'translateY(-1px)',
              borderColor: alpha(theme.palette.text.primary, 0.2),
            },
          }}
        >
          <MUILink 
            href="/donate" 
            sx={{ 
              textDecoration: 'none',
              color: 'text.primary',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              fontSize: '1rem',
              width: '100%',
            }}
          >
            <FavoriteIcon sx={{ fontSize: 20, color: '#e91e63' }} /> Donate
          </MUILink>
        </Box>
      </Stack>
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
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4, md: 6 }, px: { xs: 1.5, sm: 2, md: 3 } }}>
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

        {/* Releases */}
        <Box 
          sx={{ maxWidth: '900px', mx: 'auto' }}
          role="main"
          aria-label="Releases list"
        >
          <Stack spacing={{ xs: 3, sm: 3.5, md: 4 }}>
            {releases.map((release, index) => {
              const title = String(release.name || release.tag_name || 'Untitled Release');
              const timeAgo = release.published_at 
                ? formatDistanceToNow(new Date(release.published_at), { addSuffix: true })
                : 'Draft';
              const timeAgoCompact = formatRelativeTimeCompact(release.published_at);
              const isDraft = Boolean(release.draft);
              const isPrerelease = Boolean(release.prerelease);
              const releaseType = getReleaseType(release.tag_name);
              const isLatest = index === 0;

              const processedBody = processGitHubLinks(release.body);

              return (
                <Box key={release.id}>
                  {/* Section Headers */}
                  {index === 0 && (
                    <Box sx={{ mb: { xs: 2, sm: 3 } }}>
                      <Typography 
                        variant="h4"
                        component="h2"
                        sx={{
                          fontWeight: 600,
                          fontSize: { xs: '1.35rem', sm: '1.5rem', md: '1.75rem' },
                          color: 'text.primary',
                          textAlign: { xs: 'left', md: 'center' },
                          mb: 1,
                        }}
                      >
                        Latest Update
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ 
                          textAlign: { xs: 'left', md: 'center' },
                          fontSize: { xs: '0.9rem', sm: '1rem' },
                          opacity: 0.8,
                        }}
                      >
                        Most recent changes and improvements
                      </Typography>
                    </Box>
                  )}
                  
                  {index === 1 && (
                    <Box sx={{ mb: { xs: 2, sm: 3 }, mt: { xs: 4, sm: 5 } }}>
                      <Typography 
                        variant="h4"
                        component="h2"
                        sx={{
                          fontWeight: 600,
                          fontSize: { xs: '1.35rem', sm: '1.5rem', md: '1.75rem' },
                          color: 'text.primary',
                          textAlign: { xs: 'left', md: 'center' },
                          mb: 1,
                        }}
                      >
                        Update History
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ 
                          textAlign: { xs: 'left', md: 'center' },
                          fontSize: { xs: '0.85rem', sm: '0.9rem' },
                          opacity: 0.7,
                        }}
                      >
                        Previous releases and changelog
                      </Typography>
                    </Box>
                  )}

                  {/* Release card */}
                  <Card
                    elevation={0}
                    role="article"
                    aria-labelledby={`release-title-${release.id}`}
                    sx={{
                      background: isLatest 
                        ? `linear-gradient(135deg, 
                            ${alpha(theme.palette.background.paper, 0.95)} 0%, 
                            ${alpha(theme.palette.background.paper, 0.9)} 100%
                          )`
                        : alpha(theme.palette.background.paper, 0.85),
                      backdropFilter: 'blur(10px)',
                      border: isLatest 
                        ? `2px solid ${alpha(theme.palette.primary.main, 0.3)}` 
                        : `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                      borderRadius: { xs: 2, sm: 3 },
                      boxShadow: isLatest
                        ? `0 4px 20px ${alpha(theme.palette.primary.main, 0.15)}`
                        : `0 2px 12px ${alpha('#000', 0.06)}`,
                      transition: 'box-shadow 0.3s ease'
                    }}
                  >
                    <CardContent sx={{ p: { xs: 2.5, sm: 3, md: 3.5 } }}>
                      {/* Header - Compact, single-row layout (like GitHub) */}
                      <Box
                        sx={{
                          mb: { xs: 2, sm: 2.5 },
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: { xs: 1, sm: 1.25 }
                        }}
                      >
                        {/* Left: Version title (and optional name) */}
                        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, gap: { xs: 1, sm: 1.25 } }}>
                          <Typography 
                            id={`release-title-${release.id}`}
                            variant="h4"
                            component="h2"
                            sx={{ 
                              fontWeight: 700,
                              color: isLatest 
                                ? (theme.palette.mode === 'dark' ? '#B794F6' : '#805AD5') 
                                : 'text.primary',
                              fontSize: { 
                                xs: isLatest ? '1.9rem' : '1.6rem', 
                                sm: isLatest ? '2.1rem' : '1.8rem',
                                md: isLatest ? '2.35rem' : '2rem'
                              },
                              lineHeight: 1.2,
                              letterSpacing: '-0.02em',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {release.tag_name || title}
                          </Typography>
                          {isLatest && (
                            <Chip
                              label="Latest"
                              size="small"
                              sx={{
                                height: { xs: 20, sm: 22 },
                                fontSize: { xs: '0.62rem', sm: '0.68rem' },
                                fontWeight: 700,
                                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                                color: 'white',
                                boxShadow: `0 1px 4px ${alpha(theme.palette.primary.main, 0.35)}`,
                                '& .MuiChip-label': { px: { xs: 0.75, sm: 1 } },
                                transform: 'translateY(-2px)'
                              }}
                            />
                          )}
                          {release.name && release.name !== release.tag_name && (
                            <Typography 
                              component="span"
                              variant="body2"
                              color="text.secondary"
                              sx={{ 
                                fontSize: { xs: '0.85rem', sm: '0.95rem' },
                                fontWeight: 500,
                                opacity: 0.85,
                                whiteSpace: 'nowrap'
                              }}
                            >
                              — {release.name}
                            </Typography>
                          )}
                        </Box>

                        {/* Right: Time + chips */}
                        <Stack 
                          direction="row" 
                          alignItems="center" 
                          spacing={{ xs: 0.75, sm: 1 }}
                          sx={{ 
                            flexWrap: 'wrap',
                            rowGap: { xs: 0.5, sm: 0.75 }
                          }}
                        >
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ 
                              fontSize: { xs: '0.75rem', sm: '0.8rem' },
                              fontWeight: 600,
                              letterSpacing: '0.2px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {timeAgoCompact}
                          </Typography>

                          {isDraft && (
                            <Chip 
                              size="small" 
                              label="Draft" 
                              sx={{
                                height: { xs: 20, sm: 22 },
                                fontSize: { xs: '0.62rem', sm: '0.68rem' },
                                fontWeight: 600,
                                bgcolor: alpha(theme.palette.error.main, 0.12),
                                color: theme.palette.error.main,
                                border: `1px solid ${alpha(theme.palette.error.main, 0.25)}`,
                                '& .MuiChip-label': {
                                  px: { xs: 0.75, sm: 1 }
                                }
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
                                bgcolor: alpha(theme.palette.warning.main, 0.12),
                                color: theme.palette.warning.main,
                                border: `1px solid ${alpha(theme.palette.warning.main, 0.25)}`,
                                '& .MuiChip-label': {
                                  px: { xs: 0.75, sm: 1 }
                                }
                              }}
                            />
                          )}
                          <Chip 
                            size="small" 
                            label={String(releaseType || 'patch').toUpperCase()} 
                            sx={{
                              height: { xs: 20, sm: 22 },
                              fontSize: { xs: '0.62rem', sm: '0.68rem' },
                              fontWeight: 700,
                              letterSpacing: '0.4px',
                              bgcolor: alpha(theme.palette[getReleaseColor(releaseType, isPrerelease, isDraft)].main, 0.12),
                              color: theme.palette[getReleaseColor(releaseType, isPrerelease, isDraft)].main,
                              border: `1px solid ${alpha(theme.palette[getReleaseColor(releaseType, isPrerelease, isDraft)].main, 0.25)}`,
                              '& .MuiChip-label': {
                                px: { xs: 0.75, sm: 1 }
                              }
                            }}
                          />
                        </Stack>
                      </Box>

                      {/* Release Description - Main Content */}
                      {release.body && (
                        <Box sx={{ mt: { xs: 2.5, sm: 3.5 }, mb: { xs: 2.5, sm: 3.5 } }}>
                          <Divider sx={{ 
                            mb: { xs: 2.5, sm: 3.5 }, 
                            opacity: 0.12, 
                            background: 'linear-gradient(90deg, transparent, currentColor, transparent)' 
                          }} />
                          <Box 
                            sx={{ 
                              '& h1, & h2, & h3': { 
                                fontSize: { xs: '1.25rem', sm: '1.35rem', md: '1.45rem' },
                                fontWeight: 700, 
                                mb: { xs: 2, sm: 2.5 },
                                color: 'primary.main',
                                lineHeight: 1.25,
                                '&:first-of-type': {
                                  mt: 0
                                }
                              },
                              '& p': { 
                                mb: { xs: 2, sm: 2.5 },
                                fontSize: { xs: '0.95rem', sm: '1rem', md: '1.05rem' },
                                lineHeight: { xs: 1.65, sm: 1.7 },
                                color: 'text.primary',
                                opacity: 0.95,
                                '&:last-child': {
                                  mb: 0
                                }
                              },
                              '& ul, & ol': { 
                                pl: { xs: 2.5, sm: 3 },
                                mb: { xs: 2, sm: 2.5 },
                                '& li': {
                                  fontSize: { xs: '0.95rem', sm: '1rem', md: '1.05rem' },
                                  lineHeight: { xs: 1.65, sm: 1.7 },
                                  mb: { xs: 0.75, sm: 1 },
                                  color: 'text.primary',
                                  opacity: 0.95,
                                  position: 'relative',
                                  '&::marker': {
                                    color: 'primary.main',
                                  }
                                }
                              },
                              '& code': { 
                                background: alpha(theme.palette.primary.main, 0.08),
                                color: 'primary.main',
                                px: { xs: 1, sm: 1.2 },
                                py: { xs: 0.3, sm: 0.4 },
                                borderRadius: 1,
                                fontSize: { xs: '0.78rem', sm: '0.82rem' },
                                fontFamily: '"JetBrains Mono", Monaco, Consolas, "Roboto Mono", monospace',
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                                fontWeight: 500,
                              },
                              '& pre': {
                                background: alpha(theme.palette.background.paper, 0.4),
                                borderRadius: { xs: 1.5, sm: 2 },
                                p: { xs: 1.5, sm: 2 },
                                overflow: 'auto',
                                border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                                mb: { xs: 1.5, sm: 2 },
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
                                borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  borderBottom: `1px solid ${theme.palette.primary.main}`,
                                  opacity: 0.8,
                                },
                              },
                              '& blockquote': {
                                borderLeft: `3px solid ${theme.palette.primary.main}`,
                                pl: { xs: 2, sm: 2.5 },
                                ml: 0,
                                py: { xs: 1, sm: 1.25 },
                                background: alpha(theme.palette.primary.main, 0.05),
                                borderRadius: 1.5,
                                mb: { xs: 2, sm: 2.5 },
                                '& p': {
                                  mb: 0,
                                  fontStyle: 'italic',
                                  opacity: 0.9,
                                  fontSize: { xs: '0.9rem', sm: '0.95rem', md: '1rem' }
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

                      {/* Assets - Compact */}
                      {Array.isArray(release.assets) && release.assets.length > 0 && (
                        <Box sx={{ mt: { xs: 3, sm: 3.5 }, pt: { xs: 2.5, sm: 3 }, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              mb: { xs: 2, sm: 2.5 }, 
                              fontWeight: 600,
                              color: 'primary.main',
                              fontSize: { xs: '0.85rem', sm: '0.9rem' },
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}
                          >
                            Downloads ({release.assets.length})
                          </Typography>
                          <Stack 
                            direction="row" 
                            spacing={{ xs: 0.5, sm: 0.75 }} 
                            flexWrap="wrap" 
                            useFlexGap
                          >
                            {release.assets.slice(0, 3).map((asset) => (
                              <Chip
                                key={asset.id}
                                label={`${String(asset.name || 'Download')} (${asset.download_count || 0})`}
                                size="small"
                                variant="outlined"
                                icon={<DownloadIcon sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }} />}
                                clickable
                                component={MUILink}
                                href={asset.browser_download_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ 
                                  textDecoration: 'none',
                                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                  height: { xs: 24, sm: 28 },
                                  fontWeight: 500,
                                  '& .MuiChip-label': {
                                    px: { xs: 1, sm: 1.5 }
                                  },
                                  '&:hover': { 
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    borderColor: 'primary.main'
                                  }
                                }}
                              />
                            ))}
                            {release.assets.length > 3 && (
                              <Chip
                                label={`+${release.assets.length - 3} more`}
                                size="small"
                                variant="outlined"
                                sx={{ 
                                  opacity: 0.6,
                                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                  height: { xs: 24, sm: 28 }
                                }}
                              />
                            )}
                          </Stack>
                        </Box>
                      )}
                      
                      {/* Actions - Compact */}
                      <Box sx={{ 
                        mt: { xs: 3, sm: 3.5 }, 
                        pt: { xs: 2.5, sm: 3 }, 
                        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` 
                      }}>
                        <Stack direction="row" spacing={{ xs: 1, sm: 1.5 }}>
                          <Button
                            component={MUILink}
                            href={release.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            size={isLatest ? "large" : "medium"}
                            variant={isLatest ? "contained" : "outlined"}
                            color={isLatest ? "primary" : "primary"}
                            endIcon={<OpenInNewIcon sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }} />}
                            fullWidth
                            sx={{
                              borderRadius: { xs: 1.5, sm: 2 },
                              fontWeight: 600,
                              textTransform: 'none',
                              py: { xs: 1, sm: 1.25 },
                              fontSize: { xs: '0.85rem', sm: '0.9rem' },
                              boxShadow: isLatest 
                                ? `0 2px 12px ${alpha(theme.palette.primary.main, 0.25)}`
                                : 'none',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                boxShadow: isLatest 
                                  ? `0 4px 16px ${alpha(theme.palette.primary.main, 0.35)}`
                                  : `0 2px 8px ${alpha(theme.palette.primary.main, 0.15)}`,
                                transform: 'translateY(-1px)',
                              }
                            }}
                          >
                            View on GitHub
                          </Button>
                        </Stack>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              );
            })}
          </Stack>
        </Box>

        {hasMore && !isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: { xs: 4, sm: 5, md: 6 } }}>
            <Button 
              variant="contained" 
              size="large"
              onClick={handleLoadMore} 
              disabled={isLoadingMore}
              sx={{
                px: { xs: 3, sm: 4 },
                py: { xs: 1.25, sm: 1.5 },
                borderRadius: { xs: 20, sm: 25 },
                fontSize: { xs: '0.9rem', sm: '1rem' },
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.25)}`,
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
                  transform: 'translateY(-1px)',
                  boxShadow: `0 6px 28px ${alpha(theme.palette.primary.main, 0.35)}`,
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

