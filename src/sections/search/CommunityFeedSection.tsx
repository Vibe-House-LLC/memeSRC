import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactElement,
} from 'react';
import { Storage } from 'aws-amplify';
import {
  Alert,
  Avatar,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import { Link as RouterLink } from 'react-router-dom';
import { UserContext } from '../../UserContext';

type UserDetails = {
  username?: string;
  displayName?: string;
  fullName?: string;
  avatarUrl?: string;
  picture?: string;
  [key: string]: unknown;
};

type AppUser = {
  sub?: string;
  email?: string;
  ['cognito:username']?: string;
  userDetails?: UserDetails | null;
  [key: string]: unknown;
};

type MaybeAppUser = AppUser | null | false;

function isAppUser(candidate: unknown): candidate is AppUser {
  return Boolean(candidate) && typeof candidate === 'object' && !Array.isArray(candidate);
}

export type CommunityPost = {
  id: string;
  caption?: string;
  imageKey: string;
  imageUrl: string;
  createdAt: string;
  authorId?: string;
  authorName?: string;
  authorAvatar?: string;
};

type FeedState = {
  loading: boolean;
  error: string | null;
};

type UploadProgress = {
  stage: 'idle' | 'uploading' | 'saving';
  value: number;
};

const COMMUNITY_PREFIX = 'community/posts/';
const METADATA_SUFFIX = '.json';
const MAX_CAPTION_LENGTH = 140;
const FEED_PAGE_SIZE = 12;

const DEFAULT_ERROR_MESSAGE = 'Unable to load the community feed right now. Please try again shortly.';

function resolveDisplayName(user: MaybeAppUser): string {
  if (!user) return 'Anonymous';
  const details = user.userDetails ?? {};
  return (
    (typeof details.displayName === 'string' && details.displayName) ||
    (typeof details.username === 'string' && details.username) ||
    (typeof details.fullName === 'string' && details.fullName) ||
    (typeof details.name === 'string' && details.name) ||
    (typeof details.given_name === 'string' && typeof details.family_name === 'string'
      ? `${details.given_name} ${details.family_name}`
      : undefined) ||
    (typeof user.email === 'string' && user.email.split('@')[0]) ||
    (typeof user['cognito:username'] === 'string' && user['cognito:username']) ||
    'Anonymous'
  );
}

function resolveAvatarUrl(user: MaybeAppUser): string | undefined {
  if (!user) return undefined;
  const details = user.userDetails ?? {};
  const candidates = [details.avatarUrl, details.picture, (details as Record<string, unknown>).avatar];
  return candidates.find((value): value is string => typeof value === 'string' && value.length > 3);
}

async function toBlob(result: unknown): Promise<Blob | null> {
  if (!result) return null;
  if (result instanceof Blob) return result;
  const anyResult = result as Record<string, unknown>;
  const body = (anyResult.Body ?? anyResult.body) as unknown;
  if (!body) return null;
  if (body instanceof Blob) return body;
  if (body instanceof ArrayBuffer) return new Blob([body]);
  if (typeof (body as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer === 'function') {
    const buffer = await (body as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer();
    return new Blob([buffer]);
  }
  if (typeof (body as { text?: () => Promise<string> }).text === 'function') {
    const text = await (body as { text: () => Promise<string> }).text();
    return new Blob([text]);
  }
  return null;
}

async function getJsonFromStorage(key: string): Promise<Record<string, unknown> | null> {
  try {
    const result = await Storage.get(key, { level: 'public', download: true });
    const blob = await toBlob(result);
    if (!blob) return null;
    const text = await blob.text();
    return JSON.parse(text);
  } catch (error) {
    console.error('Failed to fetch metadata', key, error);
    return null;
  }
}

function createPostId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now()}-${random}`;
}

function formatRelativeTime(isoDate: string): string {
  const dateMs = Number.isNaN(Date.parse(isoDate)) ? Date.now() : Date.parse(isoDate);
  const diffMs = dateMs - Date.now();
  const diffSeconds = Math.round(diffMs / 1000);
  const divisions: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
    { amount: 60, unit: 'second' },
    { amount: 60, unit: 'minute' },
    { amount: 24, unit: 'hour' },
    { amount: 7, unit: 'day' },
    { amount: 4.34524, unit: 'week' },
    { amount: 12, unit: 'month' },
    { amount: Number.POSITIVE_INFINITY, unit: 'year' },
  ];
  let duration = diffSeconds;
  let unit: Intl.RelativeTimeFormatUnit = 'second';
  for (const division of divisions) {
    if (Math.abs(duration) < division.amount) {
      unit = division.unit;
      break;
    }
    duration /= division.amount;
  }
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  return formatter.format(Math.round(duration), unit);
}

async function uploadCommunityPost(
  file: File,
  caption: string,
  user: MaybeAppUser,
  setProgress: (progress: UploadProgress) => void,
): Promise<CommunityPost> {
  const resolvedUser = isAppUser(user) ? user : null;
  const safeCaption = caption.trim().slice(0, MAX_CAPTION_LENGTH);
  const id = createPostId();
  const extensionMatch = file.name.match(/\.[a-zA-Z0-9]+$/);
  const extension = extensionMatch ? extensionMatch[0].toLowerCase() : '.jpg';
  const imageKey = `${COMMUNITY_PREFIX}${id}${extension}`;
  const metadataKey = `${COMMUNITY_PREFIX}${id}${METADATA_SUFFIX}`;

  setProgress({ stage: 'uploading', value: 5 });

  await Storage.put(imageKey, file, {
    level: 'public',
    contentType: file.type || 'image/jpeg',
    cacheControl: 'max-age=86400',
    progressCallback: (event) => {
      if (!event?.loaded || !event?.total) return;
      const pct = Math.min(99, Math.round((event.loaded / event.total) * 100));
      setProgress({ stage: 'uploading', value: pct });
    },
  });

  setProgress({ stage: 'saving', value: 99 });

  const metadata = {
    id,
    caption: safeCaption,
    imageKey,
    createdAt: new Date().toISOString(),
    authorId: resolvedUser?.sub,
    authorName: resolveDisplayName(resolvedUser),
    authorAvatar: resolveAvatarUrl(resolvedUser),
  };

  await Storage.put(metadataKey, JSON.stringify(metadata), {
    level: 'public',
    contentType: 'application/json',
  });

  const imageUrl = await Storage.get(imageKey, { level: 'public' });

  setProgress({ stage: 'idle', value: 0 });

  return {
    ...metadata,
    imageUrl: typeof imageUrl === 'string' ? imageUrl : String(imageUrl),
  };
}

interface CommunityComposerProps {
  user: AppUser;
  onPostCreated: (post: CommunityPost) => void;
  onError: (message: string) => void;
}

function CommunityComposer({ user, onPostCreated, onError }: CommunityComposerProps) {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [progress, setProgress] = useState<UploadProgress>({ stage: 'idle', value: 0 });
  const [composerError, setComposerError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl('');
      return undefined;
    }
    const nextPreviewUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [selectedFile]);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      const message = 'Please choose an image file (jpeg, png, gif, or webp).';
      setComposerError(message);
      event.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      const message = 'Please choose an image smaller than 10 MB.';
      setComposerError(message);
      event.target.value = '';
      return;
    }
    setComposerError(null);
    setSelectedFile(file);
  }, []);

  const resetComposer = useCallback(() => {
    setSelectedFile(null);
    setCaption('');
    setProgress({ stage: 'idle', value: 0 });
    setComposerError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedFile) {
      setComposerError('Pick an image before posting.');
      return;
    }
    try {
      setComposerError(null);
      const post = await uploadCommunityPost(selectedFile, caption, user, setProgress);
      onPostCreated(post);
      resetComposer();
    } catch (error) {
      console.error('Failed to publish community post', error);
      const message = 'We could not publish your image. Please try again in a bit.';
      setComposerError(message);
      onError(message);
      setProgress({ stage: 'idle', value: 0 });
    }
  }, [caption, onError, onPostCreated, resetComposer, selectedFile, user]);

  return (
    <Box
      sx={{
        borderRadius: { xs: 4, md: 5 },
        border: '1px solid rgba(148,163,184,0.18)',
        background: 'linear-gradient(160deg, rgba(15,23,42,0.88) 0%, rgba(2,6,23,0.96) 100%)',
        backdropFilter: 'blur(18px)',
        p: { xs: 3, md: 4 },
        boxShadow: '0 32px 72px rgba(2,6,23,0.55)',
      }}
    >
      <Stack direction={isSmall ? 'column' : 'row'} spacing={{ xs: 3, md: 4 }} alignItems="flex-start">
        <Avatar
          src={resolveAvatarUrl(user)}
          alt={resolveDisplayName(user)}
          sx={{
            width: 56,
            height: 56,
            border: '2px solid rgba(191,219,254,0.45)',
            backgroundColor: 'rgba(15,23,42,0.6)',
            boxShadow: '0 22px 44px rgba(2,6,23,0.55)',
          }}
        >
          {resolveDisplayName(user).charAt(0).toUpperCase()}
        </Avatar>
        <Stack spacing={2.5} flex={1} width="100%">
          <TextField
            value={caption}
            onChange={(event) => setCaption(event.target.value.slice(0, MAX_CAPTION_LENGTH))}
            placeholder="Add a quick caption (optional)"
            multiline
            minRows={2}
            maxRows={4}
            variant="outlined"
            InputProps={{
              sx: {
                backgroundColor: 'rgba(15,23,42,0.72)',
                borderRadius: 3,
                '& fieldset': { borderColor: 'transparent' },
                '&:hover fieldset': { borderColor: 'rgba(148,163,184,0.35)' },
                color: 'rgba(226,232,240,0.96)',
              },
            }}
            sx={{ width: '100%' }}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<AddPhotoAlternateIcon />}
              sx={{
                borderRadius: 999,
                borderColor: 'rgba(148,163,184,0.35)',
                color: 'rgba(226,232,240,0.92)',
                textTransform: 'none',
                fontWeight: 600,
                px: 2.5,
                flexShrink: 0,
              }}
            >
              {selectedFile ? 'Change image' : 'Add image'}
              <input hidden accept="image/*" type="file" onChange={handleFileChange} />
            </Button>
            <Box flex={1} minHeight={0}>
              {selectedFile ? (
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                  <Typography variant="body2" color="rgba(226,232,240,0.85)" noWrap>
                    {selectedFile.name}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setSelectedFile(null)}
                    sx={{ color: 'rgba(226,232,240,0.65)' }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ) : (
                <Typography variant="body2" color="rgba(148,163,184,0.7)">
                  PNG, JPG, GIF, or WebP up to 10 MB.
                </Typography>
              )}
            </Box>
            <LoadingButton
              variant="contained"
              color="secondary"
              onClick={handleSubmit}
              loading={progress.stage !== 'idle'}
              sx={{
                borderRadius: 3,
                px: 3,
                textTransform: 'none',
                fontWeight: 600,
                alignSelf: { xs: 'stretch', sm: 'center' },
                boxShadow: '0 14px 34px rgba(2,6,23,0.45)',
              }}
            >
              Share it
            </LoadingButton>
          </Stack>
          {progress.stage !== 'idle' && (
            <LinearProgress
              variant="determinate"
              value={progress.value}
              sx={{
                borderRadius: 999,
                height: 6,
                backgroundColor: 'rgba(15,23,42,0.55)',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg, #60a5fa 0%, #f472b6 100%)',
                },
              }}
            />
          )}
          {composerError && (
            <Alert
              severity="error"
              sx={{ borderRadius: 3, backgroundColor: 'rgba(239,68,68,0.14)', color: '#fecaca' }}
            >
              {composerError}
            </Alert>
          )}
          {previewUrl && (
            <Box
              sx={{
                position: 'relative',
                borderRadius: { xs: 3, md: 4 },
                overflow: 'hidden',
                border: '1px solid rgba(148,163,184,0.25)',
                maxHeight: '60dvh',
                maxWidth: isSmall ? '100%' : 420,
                boxShadow: '0 20px 48px rgba(2,6,23,0.55)',
                backgroundColor: 'rgba(15,23,42,0.85)',
              }}
            >
              <Box
                component="img"
                src={previewUrl}
                alt="Selected preview"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
              <IconButton
                size="small"
                onClick={() => setSelectedFile(null)}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'rgba(2,6,23,0.7)',
                  color: 'rgba(226,232,240,0.92)',
                  '&:hover': {
                    backgroundColor: 'rgba(2,6,23,0.9)',
                  },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

interface FeedGridProps {
  posts: CommunityPost[];
  loading: boolean;
  onReload: () => void;
  error: string | null;
  onSelectPost: (post: CommunityPost) => void;
}

function FeedGrid({ posts, loading, onReload, error, onSelectPost }: FeedGridProps) {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress size={36} sx={{ color: 'rgba(226,232,240,0.85)' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Stack spacing={2} alignItems="center" py={6}>
        <Alert severity="error" sx={{ borderRadius: 2, backgroundColor: 'rgba(239,68,68,0.12)', color: '#fecaca' }}>
          {error}
        </Alert>
        <Button
          variant="outlined"
          onClick={onReload}
          startIcon={<RefreshIcon />}
          sx={{ borderRadius: 2, borderColor: 'rgba(255,255,255,0.24)', color: 'rgba(255,255,255,0.92)' }}
        >
          Retry loading
        </Button>
      </Stack>
    );
  }

  if (!posts.length) {
    return (
      <Stack spacing={2.5} alignItems="center" py={8}>
        <Typography variant="h6" color="rgba(226,232,240,0.88)" textAlign="center">
          Be the first to share something epic.
        </Typography>
        <Typography variant="body2" color="rgba(226,232,240,0.65)" textAlign="center">
          Upload a meme above and it will appear here instantly.
        </Typography>
        <Button
          variant="outlined"
          onClick={onReload}
          sx={{ borderRadius: 2, borderColor: 'rgba(255,255,255,0.24)', color: 'rgba(255,255,255,0.92)' }}
        >
          Refresh feed
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={{ xs: 3.5, md: 4 }} mt={0.5}>
      {posts.map((post) => (
        <Box
          component="article"
          key={post.id}
          sx={{
            borderRadius: { xs: 4, md: 5 },
            border: '1px solid rgba(148,163,184,0.14)',
            background: 'linear-gradient(155deg, rgba(8,12,28,0.96) 0%, rgba(2,6,23,0.98) 100%)',
            overflow: 'hidden',
            boxShadow: '0 36px 80px rgba(2,6,23,0.55)',
          }}
        >
          <ButtonBase
            onClick={() => onSelectPost(post)}
            sx={{
              display: 'block',
              width: '100%',
              p: 0,
              borderRadius: 0,
              overflow: 'hidden',
              backgroundColor: 'rgba(2,6,23,0.85)',
              '&:hover': {
                backgroundColor: 'rgba(15,23,42,0.65)',
              },
            }}
          >
            <Box
              component="img"
              src={post.imageUrl}
              alt={post.caption || 'Community meme'}
              sx={{
                width: '100%',
                height: 'auto',
                maxHeight: { xs: '75dvh', md: '90dvh' },
                objectFit: 'contain',
                display: 'block',
                backgroundColor: 'rgba(2,6,23,0.95)',
              }}
            />
          </ButtonBase>
          <Stack
            spacing={1.5}
            sx={{
              px: { xs: 2.5, md: 3 },
              py: { xs: 2.25, md: 2.75 },
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar
                src={post.authorAvatar}
                alt={post.authorName}
                sx={{
                  width: 42,
                  height: 42,
                  backgroundColor: 'rgba(37,99,235,0.18)',
                  color: 'rgba(191,219,254,0.92)',
                }}
              >
                {post.authorName?.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="subtitle2" color="rgba(226,232,240,0.92)">
                  {post.authorName || 'Anonymous'}
                </Typography>
                <Typography variant="caption" color="rgba(148,163,184,0.85)">
                  {formatRelativeTime(post.createdAt)}
                </Typography>
              </Box>
            </Stack>
            {post.caption && (
              <Typography variant="body2" color="rgba(226,232,240,0.88)" sx={{ wordBreak: 'break-word' }}>
                {post.caption}
              </Typography>
            )}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

export default function CommunityFeedSection(): ReactElement | null {
  const { user: rawUser } = useContext(UserContext);
  const user = isAppUser(rawUser) ? rawUser : null;
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [{ loading, error }, setFeedState] = useState<FeedState>({ loading: true, error: null });
  const [composerNotice, setComposerNotice] = useState<string | null>(null);
  const [previewPost, setPreviewPost] = useState<CommunityPost | null>(null);

  const loadFeed = useCallback(async () => {
    if (typeof window === 'undefined') return;
    setFeedState({ loading: true, error: null });
    try {
      const result = await Storage.list(COMMUNITY_PREFIX, {
        level: 'public',
        pageSize: 100,
      });
      const items = Array.isArray(result)
        ? (result as Array<Record<string, unknown>>)
        : Array.isArray((result as { results?: unknown[] }).results)
        ? ((result as { results: unknown[] }).results as Array<Record<string, unknown>>)
        : [];

      const normalized = items
        .map((entry) => {
          const key =
            typeof entry?.key === 'string'
              ? (entry.key as string)
              : typeof entry?.Key === 'string'
              ? (entry.Key as string)
              : '';
          const lastModifiedRaw =
            (entry?.lastModified as string | undefined) ??
            (entry?.LastModified as string | undefined) ??
            new Date().toISOString();
          return {
            key,
            lastModified: lastModifiedRaw,
          };
        })
        .filter((entry) => entry.key);

      const metadataEntries = normalized
        .filter((entry) => entry.key.endsWith(METADATA_SUFFIX))
        .sort((a, b) => {
          const dateA = new Date(a.lastModified).getTime() || 0;
          const dateB = new Date(b.lastModified).getTime() || 0;
          return dateB - dateA;
        })
        .slice(0, FEED_PAGE_SIZE);

      const fetchedPosts = await Promise.all(
        metadataEntries.map(async (entry): Promise<CommunityPost | null> => {
          const metadata = await getJsonFromStorage(entry.key);
          if (!metadata) return null;
          const imageKey = typeof metadata.imageKey === 'string' ? metadata.imageKey : null;
          if (!imageKey) return null;
          const imageUrl = await Storage.get(imageKey, { level: 'public' });
          const post: CommunityPost = {
            id: typeof metadata.id === 'string' ? metadata.id : createPostId(),
            caption: typeof metadata.caption === 'string' ? metadata.caption : undefined,
            imageKey,
            imageUrl: typeof imageUrl === 'string' ? imageUrl : String(imageUrl),
            createdAt:
              typeof metadata.createdAt === 'string' && !Number.isNaN(Date.parse(metadata.createdAt))
                ? metadata.createdAt
                : new Date().toISOString(),
            authorId: typeof metadata.authorId === 'string' ? metadata.authorId : undefined,
            authorName: typeof metadata.authorName === 'string' ? metadata.authorName : 'Anonymous',
            authorAvatar: typeof metadata.authorAvatar === 'string' ? metadata.authorAvatar : undefined,
          };
          return post;
        })
      );

      const validPosts = fetchedPosts.filter(
        (post): post is CommunityPost => Boolean(post && typeof post.id === 'string')
      );
      setPosts(validPosts);
      setFeedState({ loading: false, error: null });
    } catch (err) {
      console.error('Failed to load community feed', err);
      setFeedState({ loading: false, error: DEFAULT_ERROR_MESSAGE });
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handlePostCreated = useCallback(
    (post: CommunityPost) => {
      setPosts((prev) => [post, ...prev]);
      setComposerNotice(null);
    },
    []
  );

  const handleComposerError = useCallback((message: string) => {
    setComposerNotice(message);
  }, []);

  const handlePreviewPost = useCallback((post: CommunityPost) => {
    setPreviewPost(post);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewPost(null);
  }, []);

  const headingAccent = useMemo(
    () => ({
      background: 'linear-gradient(90deg, rgba(191,219,254,0.95) 0%, rgba(244,114,182,0.9) 100%)',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
    }),
    []
  );

  return (
    <Box
      component="section"
      sx={{
        width: '100%',
        maxWidth: 'min(1120px, 100%)',
        mx: 'auto',
        mt: { xs: 8, md: 12 },
        mb: { xs: 6, md: 10 },
        px: { xs: 0, sm: 2 },
        color: '#f8fafc',
      }}
    >
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.02em', ...headingAccent }}>
            Community spotlight
          </Typography>
          <Typography variant="body1" color="rgba(226,232,240,0.75)" mt={1} maxWidth={520}>
            Drop your latest creations and browse what the memeSRC community is remixing in real time.
          </Typography>
        </Box>

        {user ? (
          <CommunityComposer user={user} onPostCreated={handlePostCreated} onError={handleComposerError} />
        ) : (
          <Box
            sx={{
              borderRadius: 3,
              border: '1px dashed rgba(255,255,255,0.18)',
              backgroundColor: 'rgba(15,23,42,0.35)',
              backdropFilter: 'blur(12px)',
              p: { xs: 3, md: 4 },
              textAlign: 'center',
            }}
          >
            <Typography variant="h6" color="rgba(226,232,240,0.88)">
              Sign in to share your memes
            </Typography>
            <Typography variant="body2" color="rgba(226,232,240,0.65)" mt={1.5} mb={2.5}>
              Upload originals, add captions, and see them land in the feed instantly.
            </Typography>
            <Button
              component={RouterLink}
              to="/login"
              variant="contained"
              color="secondary"
              sx={{
                borderRadius: 999,
                px: 3.5,
                py: 1,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Sign in to post
            </Button>
          </Box>
        )}

        {composerNotice && (
          <Alert
            severity="warning"
            onClose={() => setComposerNotice(null)}
            sx={{
              borderRadius: 2,
              backgroundColor: 'rgba(253,186,116,0.16)',
              color: '#fed7aa',
            }}
          >
            {composerNotice}
          </Alert>
        )}

        <FeedGrid
          posts={posts}
          loading={loading}
          error={error}
          onReload={loadFeed}
          onSelectPost={handlePreviewPost}
        />
      </Stack>

      <Dialog
        open={Boolean(previewPost)}
        onClose={handleClosePreview}
        fullScreen
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(2,6,23,0.94)',
            backdropFilter: 'blur(24px)',
          },
        }}
      >
        <DialogContent
          sx={{
            p: 0,
            height: '100%',
            width: '100%',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: { xs: 3, md: 4 },
          }}
        >
          <IconButton
            onClick={handleClosePreview}
            sx={{
              position: 'absolute',
              top: { xs: 16, md: 28 },
              right: { xs: 16, md: 32 },
              backgroundColor: 'rgba(15,23,42,0.55)',
              color: 'rgba(248,250,252,0.92)',
              '&:hover': {
                backgroundColor: 'rgba(15,23,42,0.8)',
              },
            }}
            aria-label="Close preview"
          >
            <CloseIcon />
          </IconButton>

          {previewPost && (
            <>
              <Box
                component="img"
                src={previewPost.imageUrl}
                alt={previewPost.caption || 'Community meme full view'}
                sx={{
                  width: '100%',
                  maxWidth: 'min(980px, 100%)',
                  maxHeight: '92dvh',
                  objectFit: 'contain',
                  display: 'block',
                  borderRadius: { xs: 0, md: 3 },
                  boxShadow: '0 40px 100px rgba(2,6,23,0.65)',
                }}
              />
              <Stack spacing={1.5} alignItems="center" sx={{ textAlign: 'center', px: { xs: 4, md: 0 } }}>
                {previewPost.caption && (
                  <Typography variant="body1" color="rgba(226,232,240,0.92)">
                    {previewPost.caption}
                  </Typography>
                )}
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar
                    src={previewPost.authorAvatar}
                    alt={previewPost.authorName}
                    sx={{
                      width: 44,
                      height: 44,
                      backgroundColor: 'rgba(37,99,235,0.18)',
                      color: 'rgba(191,219,254,0.92)',
                    }}
                  >
                    {previewPost.authorName?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" color="rgba(226,232,240,0.92)">
                      {previewPost.authorName || 'Anonymous'}
                    </Typography>
                    <Typography variant="caption" color="rgba(148,163,184,0.8)">
                      {formatRelativeTime(previewPost.createdAt)}
                    </Typography>
                  </Box>
                </Stack>
                <Button
                  variant="outlined"
                  href={previewPost.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    borderRadius: 999,
                    borderColor: 'rgba(148,163,184,0.4)',
                    color: 'rgba(226,232,240,0.92)',
                    textTransform: 'none',
                    px: 3,
                  }}
                >
                  Open original
                </Button>
              </Stack>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
