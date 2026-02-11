import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Alert,
  Box,
  Button,
  Container,
  Link as MUILink,
  LinearProgress,
  Stack,
  Typography,
  Skeleton,
  useTheme,
  alpha,
} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import FavoriteIcon from '@mui/icons-material/Favorite';
import {
  DEFAULT_GITHUB_OWNER,
  DEFAULT_GITHUB_REPO,
  DEFAULT_PAGE_SIZE,
  fetchReleases as fetchReleasesApi,
  GitHubRelease,
} from '../utils/githubReleases';
import { ReleaseDetailsCard } from '../sections/search/cards/ReleaseDetailsCard';
 

const GITHUB_OWNER = DEFAULT_GITHUB_OWNER;
const GITHUB_REPO = DEFAULT_GITHUB_REPO;
const PAGE_SIZE = DEFAULT_PAGE_SIZE;

export default function ReleasesPage(): React.ReactElement {
  const [releases, setReleases] = useState<GitHubRelease[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const fetchReleases = useCallback(
    async (pageNumber: number): Promise<GitHubRelease[]> =>
      fetchReleasesApi({ owner: GITHUB_OWNER, repo: GITHUB_REPO, perPage: PAGE_SIZE, page: pageNumber }),
    []
  );

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
      } catch (err: unknown) {
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
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load more releases');
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchReleases, currentPage]);

  const theme = useTheme();

  const header = useMemo(() => (
    <Box sx={{ mb: { xs: 4, sm: 5, md: 6 }, textAlign: { xs: 'left', md: 'center' } }}>
      <Typography 
        variant="h2" 
        component="h1"
        sx={{
          fontWeight: 700,
          fontSize: { xs: '2.5rem', md: '3.5rem' },
          color: 'common.white',
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
  ), [theme.palette.divider, theme.palette.primary.dark, theme.palette.primary.light, theme.palette.primary.main, theme.palette.text.primary]);

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

          <Box 
            sx={{ maxWidth: '900px', mx: 'auto' }}
            role="main"
            aria-label="Releases list"
          >
            <Stack spacing={{ xs: 2, sm: 2.5, md: 3 }}>
              {releases.map((release, index) => {
                const isLatest = index === 0;

                return (
                  <Box key={release.id}>
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
                    <ReleaseDetailsCard
                      release={release}
                      isLatest={isLatest}
                      owner={GITHUB_OWNER}
                      repo={GITHUB_REPO}
                    />
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
