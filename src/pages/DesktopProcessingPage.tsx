import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Alert,
  Autocomplete,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  LinearProgress,
  Stack,
  TextField,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { API, graphqlOperation, Storage } from 'aws-amplify';
import { nanoid } from 'nanoid';
import { paramCase } from 'change-case';
import { listSeries } from '../graphql/queries';
import { UserContext } from '../UserContext';
import { SnackbarContext } from '../SnackbarContext';

type GraphQLResult<T> = {
  data?: T;
  errors?: readonly unknown[];
};

interface ListSeriesQueryResult {
  listSeries?: {
    items?: SeriesOption[];
    nextToken?: string | null;
  };
}

interface SeriesOption {
  id: string;
  name: string;
  slug?: string | null;
}

interface ProcessedFileInfo {
  absolutePath: string;
  relativePath: string;
  size: number;
}

interface ProcessedSummary {
  files: ProcessedFileInfo[];
  countsByExtension: Record<string, number>;
  totalSize: number;
}

interface EpisodeSummaryItem {
  season: string;
  episode: string;
  fileCount: number;
}

type ElectronModule = {
  ipcRenderer: {
    invoke: (channel: string, ...args: unknown[]) => Promise<any>;
    send: (channel: string, ...args: unknown[]) => void;
    once: (channel: string, listener: (event: unknown, response: any) => void) => void;
    removeAllListeners: (channel: string) => void;
  };
};

declare global {
  interface Window {
    require?: (module: string) => unknown;
    process?: {
      type?: string;
    };
  }
}

const FILE_PREVIEW_LIMIT = 25;

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  mp4: 'video/mp4',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  json: 'application/json',
  csv: 'text/csv',
  srt: 'application/x-subrip',
  zip: 'application/zip',
};

const DesktopProcessingPage = () => {
  const isElectron = typeof window !== 'undefined' && Boolean(window.process?.type);
  const { user: userContextValue } = useContext(UserContext) as {
    user: unknown;
  };
  const { setMessage, setOpen, setSeverity } = useContext(SnackbarContext);

  const userSub =
    userContextValue && typeof userContextValue === 'object'
      ? (userContextValue as { sub?: string | null }).sub ?? null
      : null;

  const [seriesOptions, setSeriesOptions] = useState<SeriesOption[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<SeriesOption | null>(null);

  const [folderPath, setFolderPath] = useState('');
  const [entryName, setEntryName] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [textColor, setTextColor] = useState('#ffffff');

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [processResponse, setProcessResponse] = useState<unknown>(null);

  const [summary, setSummary] = useState<ProcessedSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedSourceMediaId, setUploadedSourceMediaId] = useState<string | null>(null);

  const processingStatusInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const getElectronModule = useCallback((): ElectronModule | null => {
    if (!isElectron || !window.require) {
      return null;
    }
    try {
      return window.require('electron') as ElectronModule;
    } catch {
      return null;
    }
  }, [isElectron]);

  const loadSeries = useCallback(async () => {
    setSeriesLoading(true);
    try {
      const allSeries: SeriesOption[] = [];
      let nextToken: string | null | undefined;
      do {
        const response = (await API.graphql(
          graphqlOperation(listSeries, { limit: 200, nextToken })
        )) as GraphQLResult<ListSeriesQueryResult>;
        const items = response.data?.listSeries?.items ?? [];
        allSeries.push(
          ...items
            .filter((item): item is SeriesOption => Boolean(item?.id && item?.name))
            .map((item) => ({
              id: item.id,
              name: item.name,
              slug: item.slug ?? null,
            }))
        );
        nextToken = response.data?.listSeries?.nextToken ?? null;
      } while (nextToken);
      setSeriesOptions(allSeries.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Failed to load series list', error);
      setMessage('Unable to load series list. Please retry.');
      setSeverity('error');
      setOpen(true);
    } finally {
      setSeriesLoading(false);
    }
  }, [setMessage, setOpen, setSeverity]);

  useEffect(() => {
    if (isElectron) {
      loadSeries();
    }
  }, [isElectron, loadSeries]);

  useEffect(
    () => () => {
      if (processingStatusInterval.current) {
        clearInterval(processingStatusInterval.current);
      }
    },
    []
  );

  const selectFolder = useCallback(async () => {
    const electronModule = getElectronModule();
    if (!electronModule) {
      setMessage('Folder selection is only available in the desktop app.');
      setSeverity('warning');
      setOpen(true);
      return;
    }
    try {
      const selected = await electronModule.ipcRenderer.invoke('open-directory-dialog');
      if (selected) {
        setFolderPath(selected);
      }
    } catch (error) {
      console.error('Failed to select folder', error);
      setMessage('Unable to select folder. Please try again.');
      setSeverity('error');
      setOpen(true);
    }
  }, [getElectronModule, setMessage, setOpen, setSeverity]);

  const clearProcessState = () => {
    if (processingStatusInterval.current) {
      clearInterval(processingStatusInterval.current);
      processingStatusInterval.current = null;
    }
    setProcessingId(null);
    setProcessResponse(null);
    setProcessingProgress(0);
    setProcessingError(null);
    setSummary(null);
    setSummaryError(null);
    setUploadProgress(0);
    setUploadError(null);
    setUploadedSourceMediaId(null);
  };

  const computeProcessingId = useCallback(
    (nameValue: string) => {
      const base = nameValue ? paramCase(nameValue) : 'index';
      const suffix = nanoid(6).toLowerCase();
      return `${base}-${suffix}`;
    },
    []
  );

  const loadProcessedSummary = useCallback(
    async (id: string): Promise<ProcessedSummary> => {
      if (!isElectron || !window.require) {
        throw new Error('Processed summary is only available in the desktop app.');
      }
      const fs = window.require('fs') as typeof import('fs');
      const path = window.require('path') as typeof import('path');
      const os = window.require('os') as typeof import('os');

      const root = path.join(os.homedir(), '.memesrc', 'processing', id);
      const files: ProcessedFileInfo[] = [];

      const walk = async (directory: string) => {
        const entries = await fs.promises.readdir(directory, { withFileTypes: true });
        for (const entry of entries) {
          const entryPath = path.join(directory, entry.name);
          if (entry.isDirectory()) {
            await walk(entryPath);
          } else {
            const stats = await fs.promises.stat(entryPath);
            const relativePath = path
              .relative(root, entryPath)
              .split(path.sep)
              .join('/');
            files.push({
              absolutePath: entryPath,
              relativePath,
              size: stats.size,
            });
          }
        }
      };

      const directoryExists = await fs.promises
        .access(root)
        .then(() => true)
        .catch(() => false);

      if (!directoryExists) {
        throw new Error('No processed output was found for this run.');
      }

      await walk(root);

      if (files.length === 0) {
        throw new Error('Processing completed but no output files were detected.');
      }

      const countsByExtension = files.reduce<Record<string, number>>((acc, file) => {
        const extension = getExtension(file.relativePath);
        acc[extension] = (acc[extension] || 0) + 1;
        return acc;
      }, {});

      const totalSize = files.reduce((acc, file) => acc + file.size, 0);

      return {
        files,
        countsByExtension,
        totalSize,
      };
    },
    [isElectron]
  );

  const handleProcess = useCallback(async () => {
    if (!isElectron) {
      setMessage('Processing is only available in the desktop app.');
      setSeverity('warning');
      setOpen(true);
      return;
    }

    if (!selectedSeries) {
      setMessage('Select a series before processing.');
      setSeverity('warning');
      setOpen(true);
      return;
    }

    if (!folderPath) {
      setMessage('Select a folder to process.');
      setSeverity('warning');
      setOpen(true);
      return;
    }

    if (!entryName.trim()) {
      setMessage('Enter a name for this submission.');
      setSeverity('warning');
      setOpen(true);
      return;
    }

    const electronModule = getElectronModule();
    if (!electronModule) {
      setMessage('Electron API unavailable. Please restart the desktop app.');
      setSeverity('error');
      setOpen(true);
      return;
    }

    clearProcessState();

    const newProcessingId = computeProcessingId(entryName);
    setProcessingId(newProcessingId);
    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      await electronModule.ipcRenderer.invoke('save-job-folder-path', {
        id: newProcessingId,
        folderPath,
      });
    } catch (error) {
      console.warn('save-job-folder-path failed', error);
    }

    const updateProgressFromStatus = async () => {
      try {
        const statusResponse = await electronModule.ipcRenderer.invoke(
          'fetch-processing-status',
          newProcessingId
        );
        if (statusResponse?.success && statusResponse.status) {
          const seasons = Object.values(statusResponse.status) as Record<string, string>[];
          let done = 0;
          let total = 0;
          seasons.forEach((episodes) => {
            Object.values(episodes).forEach((status) => {
              total += 1;
              if (status === 'done') {
                done += 1;
              } else if (status === 'indexing') {
                done += 0.5;
              }
            });
          });
          if (total > 0) {
            setProcessingProgress(Math.round((done / total) * 100));
          }
        }
      } catch (error) {
        console.warn('Unable to fetch processing status', error);
      }
    };

    processingStatusInterval.current = setInterval(updateProgressFromStatus, 5000);

    electronModule.ipcRenderer.once('javascript-processing-result', async (_event, response) => {
      if (processingStatusInterval.current) {
        clearInterval(processingStatusInterval.current);
        processingStatusInterval.current = null;
      }
      setProcessResponse(response);
      setProcessingProgress(100);
      setIsProcessing(false);

      try {
        const processedSummary = await loadProcessedSummary(newProcessingId);
        setSummary(processedSummary);
      } catch (error: any) {
        console.error('Failed to load processed summary', error);
        setSummaryError(error?.message ?? 'Unable to read processed files.');
      }
    });

    electronModule.ipcRenderer.once('javascript-processing-error', (_event, error) => {
      if (processingStatusInterval.current) {
        clearInterval(processingStatusInterval.current);
        processingStatusInterval.current = null;
      }
      console.error('Processing error', error);
      setProcessingError(
        typeof error === 'string'
          ? error
          : error?.message ?? 'An unexpected error occurred during processing.'
      );
      setIsProcessing(false);
    });

    electronModule.ipcRenderer.send('test-javascript-processing', {
      inputPath: folderPath,
      id: newProcessingId,
      title: entryName.trim(),
      description: '',
      frameCount: 10,
      colorMain: backgroundColor,
      colorSecondary: textColor,
      emoji: '',
      fontFamily: '',
    });
  }, [
    backgroundColor,
    computeProcessingId,
    entryName,
    folderPath,
    getElectronModule,
    isElectron,
    loadProcessedSummary,
    selectedSeries,
    setMessage,
    setOpen,
    setSeverity,
    textColor,
  ]);

  const episodeSummary = useMemo(() => {
    if (!summary) {
      return [];
    }
    const map = new Map<string, EpisodeSummaryItem>();
    summary.files.forEach((file) => {
      const [season, episode] = file.relativePath.split('/');
      if (!season || !episode) {
        return;
      }
      const key = `${season}-${episode}`;
      const existing = map.get(key);
      if (existing) {
        existing.fileCount += 1;
      } else {
        map.set(key, {
          season,
          episode,
          fileCount: 1,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.season === b.season) {
        return Number(a.episode) - Number(b.episode);
      }
      return Number(a.season) - Number(b.season);
    });
  }, [summary]);

  const handleSubmit = useCallback(async () => {
    if (!summary || !processingId || !selectedSeries) {
      return;
    }
    if (!userSub) {
      setMessage('You need to be signed in to submit processed content.');
      setSeverity('error');
      setOpen(true);
      return;
    }

    const fs = window.require?.('fs') as typeof import('fs') | undefined;
    const path = window.require?.('path') as typeof import('path') | undefined;
    const os = window.require?.('os') as typeof import('os') | undefined;

    if (!fs || !path || !os) {
      setMessage('File system APIs are unavailable.');
      setSeverity('error');
      setOpen(true);
      return;
    }

    const root = path.join(os.homedir(), '.memesrc', 'processing', processingId);

    setIsSubmitting(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const sourceMediaInput = {
        sourceMediaSeriesId: selectedSeries.id,
        status: 'uploaded',
        userDetailsSourceMediaId: userSub,
        pendingAlias: entryName.trim(),
      };

      const createResponse = (await API.graphql(
        graphqlOperation(createSourceMediaMutation, { input: sourceMediaInput })
      )) as GraphQLResult<CreateSourceMediaMutationResult>;

      const newSourceMediaId =
        createResponse.data?.createSourceMedia?.id ?? null;

      if (!newSourceMediaId) {
        throw new Error('Failed to create SourceMedia record.');
      }

      setUploadedSourceMediaId(newSourceMediaId);

      let uploadedBytes = 0;
      const totalBytes = summary.totalSize;

      for (const file of summary.files) {
        const filePath = path.join(root, file.relativePath.split('/').join(path.sep));
        const fileBuffer = await fs.promises.readFile(filePath);
        const storageKey = `${newSourceMediaId}/${file.relativePath}`;
        const contentType = CONTENT_TYPE_BY_EXTENSION[getExtension(file.relativePath)] ?? 'application/octet-stream';

        await Storage.put(storageKey, fileBuffer, {
          level: 'protected',
          contentType,
        });

        uploadedBytes += file.size;
        const percent = totalBytes > 0 ? Math.round((uploadedBytes / totalBytes) * 100) : 100;
        setUploadProgress(percent);
      }

      setMessage('Processed files uploaded successfully.');
      setSeverity('success');
      setOpen(true);
    } catch (error) {
      console.error('Failed to submit processed files', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed.');
      setMessage('Upload failed, please review the logs.');
      setSeverity('error');
      setOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    entryName,
    processingId,
    selectedSeries,
    setMessage,
    setOpen,
    setSeverity,
    summary,
    userSub,
  ]);

  if (!isElectron) {
    return (
      <Container sx={{ py: 8 }}>
        <Helmet>
          <title>Desktop Processing - memeSRC Dashboard</title>
        </Helmet>
        <Alert severity="info">
          This tool is only available in the memeSRC desktop application. Please launch the
          desktop app to process and submit content.
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <Helmet>
        <title>Desktop Processing - memeSRC Dashboard</title>
      </Helmet>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Desktop Processing &amp; Upload
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Prepare processed index data locally, review the generated files, and submit them to
              memeSRC in one streamlined flow.
            </Typography>
          </Box>

          <Card>
            <CardContent>
              <Stack spacing={3}>
                <Autocomplete
                  options={seriesOptions}
                  loading={seriesLoading}
                  getOptionLabel={(option) => option.name}
                  value={selectedSeries}
                  onChange={(_event, value) => setSelectedSeries(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Series"
                      placeholder="Select a series"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {seriesLoading ? <CircularProgress size={16} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />

                <TextField
                  label="Submission Name"
                  value={entryName}
                  onChange={(event) => setEntryName(event.target.value)}
                  helperText="Used for metadata and as the pending alias suggestion."
                  fullWidth
                />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Background Color"
                    type="color"
                    value={backgroundColor}
                    onChange={(event) => setBackgroundColor(event.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="Text Color"
                    type="color"
                    value={textColor}
                    onChange={(event) => setTextColor(event.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Stack>

                <Stack spacing={1}>
                  <Typography variant="subtitle2">Selected Folder</Typography>
                  <Typography variant="body2" color={folderPath ? 'text.primary' : 'text.secondary'}>
                    {folderPath || 'No folder selected'}
                  </Typography>
                  <Button variant="outlined" onClick={selectFolder}>
                    Choose Folder
                  </Button>
                </Stack>

                <LoadingButton
                  variant="contained"
                  size="large"
                  onClick={handleProcess}
                  loading={isProcessing}
                  disabled={isProcessing}
                >
                  Process
                </LoadingButton>

                {isProcessing && (
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Processing index…
                    </Typography>
                    <LinearProgress variant="determinate" value={processingProgress} />
                  </Box>
                )}

                {processingError && <Alert severity="error">{processingError}</Alert>}
              </Stack>
            </CardContent>
          </Card>

          {processResponse && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Processing Details
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Raw response from the processing script is available in the developer console for
                  troubleshooting.
                </Typography>
              </CardContent>
            </Card>
          )}

          {summaryError && <Alert severity="error">{summaryError}</Alert>}

          {summary && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Processed Output Summary
                </Typography>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={3}>
                    <Typography variant="body2">
                      Total files: <strong>{summary.files.length}</strong>
                    </Typography>
                    <Typography variant="body2">
                      Total size: <strong>{formatBytes(summary.totalSize)}</strong>
                    </Typography>
                  </Stack>

                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Files by type
                    </Typography>
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                      {Object.entries(summary.countsByExtension).map(([extension, count]) => (
                        <Typography key={extension} variant="body2">
                          {extension.toUpperCase()}: {count}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>

                  {episodeSummary.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Episodes detected
                      </Typography>
                      <List dense disablePadding>
                        {episodeSummary.map((item) => (
                          <ListItem key={`${item.season}-${item.episode}`} disableGutters>
                            <ListItemText
                              primary={`Season ${item.season}, Episode ${item.episode}`}
                              secondary={`${item.fileCount} files`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}

                  <Divider />

                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Sample file list
                    </Typography>
                    <List dense disablePadding sx={{ maxHeight: 280, overflowY: 'auto' }}>
                      {summary.files.slice(0, FILE_PREVIEW_LIMIT).map((file) => (
                        <ListItem key={file.relativePath} disableGutters>
                          <ListItemText
                            primary={file.relativePath}
                            secondary={formatBytes(file.size)}
                          />
                        </ListItem>
                      ))}
                    </List>
                    {summary.files.length > FILE_PREVIEW_LIMIT && (
                      <Typography variant="caption" color="text.secondary">
                        Showing first {FILE_PREVIEW_LIMIT} files.
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )}

          {summary && (
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">Submit to memeSRC</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Submitting will create a SourceMedia entry and upload the processed files using
                    the protected S3 prefix pattern (`&lt;sourceMediaId&gt;/...`).
                  </Typography>

                  <LoadingButton
                    variant="contained"
                    onClick={handleSubmit}
                    loading={isSubmitting}
                    disabled={isSubmitting}
                  >
                    Submit
                  </LoadingButton>

                  {isSubmitting && (
                    <Box>
                      <LinearProgress variant="determinate" value={uploadProgress} />
                      <Typography variant="caption" color="text.secondary">
                        {uploadProgress}% uploaded
                      </Typography>
                    </Box>
                  )}

                  {uploadedSourceMediaId && !isSubmitting && !uploadError && (
                    <Alert severity="success">
                      Upload complete. SourceMedia ID: {uploadedSourceMediaId}
                    </Alert>
                  )}

                  {uploadError && <Alert severity="error">{uploadError}</Alert>}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      </Container>
    </>
  );
};

const formatBytes = (value: number): string => {
  if (value === 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const quotient = value / 1024 ** exponent;
  return `${quotient.toFixed(2)} ${units[exponent]}`;
};

const getExtension = (filePath: string): string => {
  const segments = filePath.split('.');
  if (segments.length <= 1) {
    return 'unknown';
  }
  return segments.pop()?.toLowerCase() ?? 'unknown';
};

const createSourceMediaMutation = /* GraphQL */ `
  mutation CreateSourceMedia(
    $input: CreateSourceMediaInput!
    $condition: ModelSourceMediaConditionInput
  ) {
    createSourceMedia(input: $input, condition: $condition) {
      id
    }
  }
`;

interface CreateSourceMediaMutationResult {
  createSourceMedia?: {
    id: string;
  };
}

export default DesktopProcessingPage;
