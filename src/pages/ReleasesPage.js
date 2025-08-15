import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Link as MUILink,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Skeleton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DownloadIcon from '@mui/icons-material/Download';
import { format } from 'date-fns';

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

  const header = useMemo(() => (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Releases
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Version history sourced from GitHub Releases for
        {' '}
        <MUILink href={`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`} target="_blank" rel="noopener noreferrer">
          {GITHUB_OWNER}/{GITHUB_REPO}
        </MUILink>
        .
      </Typography>
    </Box>
  ), []);

  return (
    <>
      <Helmet>
        <title>Releases - memeSRC</title>
      </Helmet>
      <Container maxWidth="md" sx={{ py: 4 }}>
        {header}

        {isLoading && (
          <Box>
            <LinearProgress sx={{ mb: 2 }} />
            <Stack spacing={2}>
              {[...Array(4)].map((_, idx) => (
                <Skeleton key={idx} variant="rectangular" height={120} />
              ))}
            </Stack>
          </Box>
        )}

        {!!errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        )}

        {!isLoading && releases.length === 0 && !errorMessage && (
          <Alert severity="info">No releases found.</Alert>
        )}

        <Stack spacing={2}>
          {releases.map((release) => {
            const title = release.name || release.tag_name;
            const published = release.published_at ? format(new Date(release.published_at), 'PPP') : 'Unpublished';
            const isDraft = Boolean(release.draft);
            const isPrerelease = Boolean(release.prerelease);

            return (
              <Accordion key={release.id} disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%', pr: 1 }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                      {published}
                    </Typography>
                    {isDraft && <Chip size="small" label="Draft" color="default" />}
                    {isPrerelease && <Chip size="small" label="Pre-release" color="warning" />}
                    <Button
                      component={MUILink}
                      href={release.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      endIcon={<OpenInNewIcon />}
                      onClick={(e) => e.stopPropagation()}
                    >
                      View
                    </Button>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ mb: 2 }}>
                    <ReactMarkdown>{release.body || ''}</ReactMarkdown>
                  </Box>

                  {Array.isArray(release.assets) && release.assets.length > 0 && (
                    <Box>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Assets
                      </Typography>
                      <List dense>
                        {release.assets.map((asset) => (
                          <ListItem key={asset.id} disableGutters secondaryAction={
                            <Button
                              component={MUILink}
                              href={asset.browser_download_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="small"
                              startIcon={<DownloadIcon />}
                            >
                              Download
                            </Button>
                          }>
                            <ListItemText
                              primary={asset.name}
                              secondary={`Downloads: ${asset.download_count}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Stack>

        {hasMore && !isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button variant="contained" onClick={handleLoadMore} disabled={isLoadingMore}>
              {isLoadingMore ? 'Loading…' : 'Load more'}
            </Button>
          </Box>
        )}
      </Container>
    </>
  );
}