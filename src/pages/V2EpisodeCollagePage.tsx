import { Buffer } from 'buffer';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { Storage } from 'aws-amplify';
import JSZip from 'jszip';
import sanitizeHtml from 'sanitize-html';
import getV2Metadata from '../utils/getV2Metadata';
import { extractVideoFrames } from '../utils/videoFrameExtractor';
import { UserContext } from '../UserContext';

type EpisodeRouteParams = {
  cid?: string;
  season?: string;
  episode?: string;
};

type EpisodeSubtitle = {
  startFrame: number;
  endFrame: number;
  subtitle: string;
};

type CollagePanel = {
  frameId: number;
  imageUrl: string;
  timecode: string;
  subtitle?: string;
};

type CollageResult = {
  startFrame: number;
  endFrame: number;
  panels: CollagePanel[];
};

type BulkZipStatus = {
  running: boolean;
  completed: number;
  total: number;
  percent: number;
  error: string;
  zipUrl?: string;
};

const PANEL_COUNT = 6;
const GRID_COLUMNS = 2;
const GRID_ROWS = 3;
const PANEL_SPACING_SECONDS = 5;
const FIRST_FRAME = 1;

const formatTimecode = (frameId: number, fps: number) => {
  const totalSeconds = Math.floor(frameId / fps);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
};

const parseSubtitles = (csvText: string): EpisodeSubtitle[] => {
  return csvText
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split(','))
    .map((parts) => {
      const subtitleText = parts[3] || '';
      const startFrame = parseInt(parts[4], 10);
      const endFrame = parseInt(parts[5], 10);

      if (!Number.isFinite(startFrame) || !Number.isFinite(endFrame)) {
        return null;
      }

      let subtitle = '';

      try {
        const decodedSubtitle = Buffer.from(subtitleText, 'base64').toString();
        subtitle = sanitizeHtml(decodedSubtitle, { allowedTags: [], allowedAttributes: {} });
      } catch (error) {
        console.error('Error decoding subtitle:', error);
      }

      return {
        startFrame,
        endFrame,
        subtitle,
      };
    })
    .filter((row): row is EpisodeSubtitle => Boolean(row));
};

const buildCollageFramePlan = (startFrame: number, endFrame: number, fps: number): number[][] => {
  const spacing = PANEL_SPACING_SECONDS * fps;
  const stride = spacing * PANEL_COUNT;
  const frames: number[][] = [];

  for (
    let currentStart = startFrame;
    currentStart + spacing * (PANEL_COUNT - 1) <= endFrame;
    currentStart += stride
  ) {
    const panelFrames = Array.from({ length: PANEL_COUNT }, (_, index) => currentStart + index * spacing);
    frames.push(panelFrames);
  }

  return frames;
};

const findSubtitleForFrame = (frameId: number, subtitles: EpisodeSubtitle[]): string | undefined => {
  const match = subtitles.find((subtitle) => frameId >= subtitle.startFrame && frameId <= subtitle.endFrame);
  return match?.subtitle || undefined;
};

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (event) => reject(event);
    img.src = src;
  });
};

const buildStackedDataUrl = async (panels: CollagePanel[]): Promise<string> => {
  const images = await Promise.all(panels.map((panel) => loadImage(panel.imageUrl)));
  const widths = images.map((img) => img.naturalWidth || img.width || 1);
  const heights = images.map((img) => img.naturalHeight || img.height || 1);

  const cellWidth = Math.max(...widths);
  const scaled = widths.map((width, index) => {
    const scale = width === 0 ? 1 : cellWidth / width;
    return {
      width: cellWidth,
      height: heights[index] * scale,
    };
  });

  const rowHeights: number[] = [];
  for (let row = 0; row < GRID_ROWS; row += 1) {
    const start = row * GRID_COLUMNS;
    const rowHeightsForRow = scaled.slice(start, start + GRID_COLUMNS).map((entry) => entry.height);
    rowHeights.push(Math.max(...rowHeightsForRow));
  }

  const canvasWidth = cellWidth * GRID_COLUMNS;
  const canvasHeight = Math.round(rowHeights.reduce((sum, h) => sum + h, 0));

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context unavailable');
  }

  let yOffset = 0;
  for (let row = 0; row < GRID_ROWS; row += 1) {
    const rowHeight = rowHeights[row];
    for (let col = 0; col < GRID_COLUMNS; col += 1) {
      const index = row * GRID_COLUMNS + col;
      const img = images[index];
      const targetWidth = cellWidth;
      const targetHeight = scaled[index]?.height ?? rowHeight;
      const x = col * cellWidth;
      ctx.drawImage(img, x, yOffset, targetWidth, targetHeight);
    }
    yOffset += rowHeight;
  }

  return canvas.toDataURL('image/jpeg', 0.92);
};

export default function V2EpisodeCollagePage() {
  const { user } = useContext(UserContext);
  const isAdmin = Boolean(user?.['cognito:groups']?.includes('admins'));
  const { cid, season, episode } = useParams<EpisodeRouteParams>();
  const [searchParams] = useSearchParams();
  const [confirmedCid, setConfirmedCid] = useState<string>();
  const [collages, setCollages] = useState<CollageResult[]>([]);
  const [subtitles, setSubtitles] = useState<EpisodeSubtitle[]>([]);
  const [lastFrame, setLastFrame] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedFrames, setLoadedFrames] = useState<Record<number, boolean>>({});
  const [stackedImages, setStackedImages] = useState<Record<number, string>>({});
  const [stackedLoading, setStackedLoading] = useState<Record<number, boolean>>({});
  const [stackedErrors, setStackedErrors] = useState<Record<number, string>>({});
  const [bulkStatus, setBulkStatus] = useState<BulkZipStatus>({
    running: false,
    completed: 0,
    total: 0,
    percent: 0,
    error: '',
    zipUrl: '',
  });
  const zipUrlRef = useRef<string | null>(null);

  const fps = useMemo(() => {
    const fpsFromQuery = Number.parseFloat(searchParams.get('fps') || '');
    if (Number.isFinite(fpsFromQuery) && fpsFromQuery > 0) {
      return fpsFromQuery;
    }
    return 10;
  }, [searchParams]);

  const startFrame = useMemo(() => {
    const startFromQuery = Number.parseInt(searchParams.get('startFrame') || '', 10);
    if (Number.isFinite(startFromQuery) && startFromQuery > 0) {
      return startFromQuery;
    }
    return FIRST_FRAME;
  }, [searchParams]);

  useEffect(() => {
    if (!cid || !isAdmin) return;

    getV2Metadata(cid)
      .then((metadata) => setConfirmedCid(metadata.id))
      .catch((err) => {
        console.error(err);
        setError('Unable to resolve series id');
        setIsLoading(false);
      });
  }, [cid, isAdmin]);

  useEffect(() => () => {
    if (zipUrlRef.current) {
      URL.revokeObjectURL(zipUrlRef.current);
    }
  }, []);

  useEffect(() => {
    if (!confirmedCid || !season || !episode || !isAdmin) return;

    const fetchSubtitles = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const subtitlesDownload = (await Storage.get(`src/${confirmedCid}/${season}/${episode}/_docs.csv`, {
          level: 'public',
          download: true,
          customPrefix: { public: 'protected/' },
        })) as { Body?: { text: () => Promise<string> } };

        if (!subtitlesDownload?.Body?.text) {
          throw new Error('Subtitle file body missing');
        }

        const subtitlesCsv = await subtitlesDownload.Body.text();
        const parsed = parseSubtitles(subtitlesCsv);

        setSubtitles(parsed);

        const maxEndFrame = parsed.reduce((max, row) => Math.max(max, row.endFrame), 0);
        const safeLastFrame = Math.max(FIRST_FRAME, maxEndFrame - fps); // Small margin to avoid trailing gaps
        setLastFrame(safeLastFrame);
      } catch (err) {
        console.error(err);
        setError('Failed to load episode docs');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubtitles().catch(console.error);
  }, [confirmedCid, season, episode, fps, isAdmin]);

  useEffect(() => {
    if (!confirmedCid || !subtitles.length || lastFrame <= 0 || !season || !episode || !isAdmin) {
      return;
    }

    const buildCollages = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const safeStartFrame = Math.max(FIRST_FRAME, Math.min(startFrame, lastFrame));
        const plan = buildCollageFramePlan(safeStartFrame, lastFrame, fps);

        if (plan.length === 0) {
          setError('No frames available to build collages for this episode.');
          setCollages([]);
          return;
        }

        const framesNeeded = Array.from(new Set(plan.flat()));
        const frameUrls = await extractVideoFrames(confirmedCid, season as string, episode as string, framesNeeded);

        const frameUrlMap = new Map<number, string>();
        framesNeeded.forEach((frameId, index) => {
          frameUrlMap.set(frameId, frameUrls[index]);
        });

        const resolvedCollages: CollageResult[] = plan.map((frames) => {
          const panels = frames.map((frameId) => ({
            frameId,
            imageUrl: frameUrlMap.get(frameId) || '',
            timecode: formatTimecode(frameId, fps),
            subtitle: findSubtitleForFrame(frameId, subtitles),
          }));

          return {
            startFrame: frames[0],
            endFrame: frames[frames.length - 1],
            panels,
          };
        });

        setCollages(resolvedCollages);
      } catch (err) {
        console.error(err);
        setError('Unable to build collages for this episode.');
        setCollages([]);
      } finally {
        setIsLoading(false);
      }
    };

    buildCollages().catch(console.error);
  }, [confirmedCid, subtitles, lastFrame, fps, startFrame, season, episode]);

  const handleImageLoad = (frameId: number) => {
    setLoadedFrames((prev) => ({ ...prev, [frameId]: true }));
  };

  const handleGenerateStacked = async (collage: CollageResult) => {
    const key = collage.startFrame;
    if (stackedImages[key]) {
      return;
    }

    setStackedLoading((prev) => ({ ...prev, [key]: true }));
    setStackedErrors((prev) => ({ ...prev, [key]: '' }));

    try {
      const dataUrl = await buildStackedDataUrl(collage.panels);
      setStackedImages((prev) => ({ ...prev, [key]: dataUrl }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to build collage image';
      setStackedErrors((prev) => ({ ...prev, [key]: message }));
    } finally {
      setStackedLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const buildDownloadName = (collage: CollageResult) => {
    const id = confirmedCid || cid || 'series';
    return `collage-${id}-s${season}-e${episode}-${collage.startFrame}-${collage.endFrame}.jpg`;
  };

  const handleBuildAllAndZip = async () => {
    if (!collages.length || bulkStatus.running || !isAdmin) {
      return;
    }

    setBulkStatus({
      running: true,
      completed: 0,
      total: collages.length,
      percent: 0,
      error: '',
      zipUrl: '',
    });

    const zip = new JSZip();
    const newImages: Record<number, string> = {};

    try {
      for (let i = 0; i < collages.length; i += 1) {
        const collage = collages[i];
        const key = collage.startFrame;

        let dataUrl = stackedImages[key];
        if (!dataUrl) {
          dataUrl = await buildStackedDataUrl(collage.panels);
          newImages[key] = dataUrl;
        }

        const base64Data = dataUrl.split(',')[1];
        zip.file(buildDownloadName(collage), base64Data, { base64: true });

        const completed = i + 1;
        const percent = Math.round((completed / collages.length) * 70);
        setBulkStatus((prev) => ({ ...prev, completed, percent }));
      }

      if (Object.keys(newImages).length > 0) {
        setStackedImages((prev) => ({ ...prev, ...newImages }));
      }

      const blob = await zip.generateAsync(
        { type: 'blob' },
        (metadata) => {
          const zipPercent = 70 + Math.round((metadata.percent / 100) * 30);
          setBulkStatus((prev) => ({ ...prev, percent: Math.max(prev.percent, zipPercent) }));
        }
      );

      if (zipUrlRef.current) {
        URL.revokeObjectURL(zipUrlRef.current);
      }
      const blobUrl = URL.createObjectURL(blob);
      zipUrlRef.current = blobUrl;

      setBulkStatus((prev) => ({
        ...prev,
        running: false,
        percent: 100,
        zipUrl: blobUrl,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to build zip';
      setBulkStatus((prev) => ({
        ...prev,
        running: false,
        error: message,
      }));
    }
  };

  const collageStrideSeconds = PANEL_COUNT * PANEL_SPACING_SECONDS;

  if (!isAdmin) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="warning">This collage generator is restricted to admins.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Episode Collage Preview
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        {confirmedCid || cid} — Season {season}, Episode {episode}
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
        <Chip label={`${PANEL_COUNT} panels`} />
        <Chip label={`Spacing: ${PANEL_SPACING_SECONDS}s`} />
        <Chip label={`Stride: ${collageStrideSeconds}s`} />
        <Chip label={`FPS: ${fps}`} />
        <Chip label={`Start frame: ${startFrame}`} />
        {lastFrame > 0 && <Chip label={`Last frame: ${lastFrame}`} />}
        <Chip label={`${GRID_COLUMNS} x ${GRID_ROWS} layout`} />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} mb={2}>
        <Button
          variant="contained"
          disabled={!collages.length || isLoading || bulkStatus.running}
          onClick={handleBuildAllAndZip}
        >
          {bulkStatus.running ? 'Building zip…' : 'Build & zip all collages'}
        </Button>
        {bulkStatus.total > 0 && (
          <Typography variant="body2" color="text.secondary">
            {bulkStatus.completed}/{bulkStatus.total} built
          </Typography>
        )}
      </Stack>

      {(bulkStatus.running || bulkStatus.percent > 0 || bulkStatus.error || bulkStatus.zipUrl) && (
        <Box mb={2}>
          {bulkStatus.percent > 0 && (
            <LinearProgress variant="determinate" value={Math.min(bulkStatus.percent, 100)} sx={{ mb: 1 }} />
          )}
          {bulkStatus.error && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {bulkStatus.error}
            </Alert>
          )}
          {bulkStatus.zipUrl && (
            <Button component="a" href={bulkStatus.zipUrl} download="episode-collages.zip" variant="outlined" fullWidth>
              Download zip
            </Button>
          )}
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {isLoading && (
        <Grid container spacing={2}>
          {[...Array(3)].map((_, index) => (
            <Grid item xs={12} md={6} key={`skeleton-${index}`}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" />
                  <Stack spacing={1} mt={2}>
                    {[...Array(PANEL_COUNT)].map((__, panelIndex) => (
                      <Skeleton
                        key={`panel-skeleton-${panelIndex}`}
                        variant="rectangular"
                        height={140}
                        sx={{ borderRadius: 1 }}
                      />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {!isLoading && collages.length === 0 && !error && (
        <Alert severity="info">No collages could be generated for this episode.</Alert>
      )}

      <Grid container spacing={2}>
        {collages.map((collage, collageIndex) => (
          <Grid item xs={12} md={6} key={`collage-${collage.startFrame}-${collageIndex}`}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Collage {collageIndex + 1}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Frames {collage.startFrame}–{collage.endFrame} (
                  {formatTimecode(collage.startFrame, fps)} → {formatTimecode(collage.endFrame, fps)})
                </Typography>

                <Stack
                  spacing={1}
                  mt={2}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
                    gap: 1,
                  }}
                >
                  {collage.panels.map((panel) => {
                    const isLoaded = loadedFrames[panel.frameId];
                    return (
                      <Box
                        key={`panel-${panel.frameId}`}
                        sx={{
                          borderRadius: 1,
                          overflow: 'hidden',
                          bgcolor: '#101010',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <Box sx={{ position: 'relative', paddingTop: '56.25%', bgcolor: '#0d0d0d' }}>
                          <Box
                            component="img"
                            src={panel.imageUrl}
                            alt={`Frame ${panel.frameId}`}
                            loading="lazy"
                            onLoad={() => handleImageLoad(panel.frameId)}
                            onError={() => handleImageLoad(panel.frameId)}
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: isLoaded ? 'block' : 'none',
                            }}
                          />
                          {!isLoaded && (
                            <Skeleton
                              variant="rectangular"
                              sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                            />
                          )}
                        </Box>
                        <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Frame {panel.frameId} • {panel.timecode}
                          </Typography>
                          {panel.subtitle && (
                            <Typography variant="caption" color="text.primary" noWrap>
                              {panel.subtitle}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center" mt={2}>
                  <Button
                    variant="contained"
                    size="small"
                    disabled={Boolean(stackedLoading[collage.startFrame])}
                    onClick={() => handleGenerateStacked(collage)}
                  >
                    {stackedImages[collage.startFrame] ? 'Rebuild stacked image' : 'Build stacked image'}
                  </Button>
                  {stackedLoading[collage.startFrame] && (
                    <Typography variant="body2" color="text.secondary">
                      Building...
                    </Typography>
                  )}
                  {stackedErrors[collage.startFrame] && (
                    <Typography variant="body2" color="error">
                      {stackedErrors[collage.startFrame]}
                    </Typography>
                  )}
                </Stack>

                {stackedImages[collage.startFrame] && (
                  <Box mt={2}>
                    <Box
                      component="img"
                      src={stackedImages[collage.startFrame]}
                      alt={`Collage ${collageIndex + 1} stacked`}
                      sx={{
                        width: '100%',
                        borderRadius: 1,
                        border: '1px solid rgba(255,255,255,0.08)',
                        display: 'block',
                      }}
                    />
                    <Button
                      sx={{ mt: 1.5 }}
                      component="a"
                      href={stackedImages[collage.startFrame]}
                      download={buildDownloadName(collage)}
                      variant="outlined"
                      fullWidth
                    >
                      Download JPG
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
