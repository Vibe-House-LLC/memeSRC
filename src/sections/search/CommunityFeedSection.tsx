import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  Collapse,
  Dialog,
  DialogContent,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { UserContext } from '../../UserContext';
import {
  fetchLatestRelease,
  formatRelativeTimeCompact,
  type GitHubRelease,
} from '../../utils/githubReleases';
import { safeGetItem, safeSetItem } from '../../utils/storage';

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
const FEED_SURFACE_COLOR = '#101c38';
const FEED_BORDER_COLOR = 'rgba(84, 97, 200, 0.32)';
const FEED_INTRO_SURFACE_COLOR = '#c724b1';
const FEED_ACCENT_SECONDARY = '#00a3e0';
const FEED_ACTION_BG = 'rgba(84, 97, 200, 0.18)';
const FEED_ACTION_BG_HOVER = 'rgba(84, 97, 200, 0.3)';
const FEED_CARD_WRAPPER_SX = {
  px: { xs: 0, md: 0 },
  mx: { xs: -3, md: 0 },
  pt: { xs: 0, md: 0 },
  pb: { xs: 0, md: 0 },
} as const;
const FEED_UPDATE_DISMISS_PREFIX = 'community-feed-release-dismissed:';
const FEED_UPDATE_RECENCY_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

const DEFAULT_ERROR_MESSAGE = 'Unable to load the community feed right now. Please try again shortly.';
const COMMUNITY_FEED_CACHE_KEY = 'community-feed-cache:v1';
const COMMUNITY_FEED_CACHE_TTL_MS = 5 * 60 * 1000;

function pseudoRandomFromString(source: string, min: number, max: number): number {
  if (max <= min) return min;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(index);
    hash |= 0;
  }
  const range = max - min + 1;
  const value = Math.abs(hash) % range;
  return value + min;
}

function getSimulatedEngagement(postId: string): { reactions: number; comments: number } {
  const safeId = postId || 'seed';
  return {
    reactions: pseudoRandomFromString(safeId, 18, 240),
    comments: pseudoRandomFromString(`${safeId}:comments`, 2, 64),
  };
}

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

function buildReleaseDismissKey(tagName?: string | null): string | null {
  if (!tagName) return null;
  return `${FEED_UPDATE_DISMISS_PREFIX}${tagName}`;
}

function isReleaseRecent(publishedAt?: string | null): boolean {
  if (!publishedAt) return false;
  const publishedTime = new Date(publishedAt).getTime();
  if (Number.isNaN(publishedTime)) return false;
  return Date.now() - publishedTime <= FEED_UPDATE_RECENCY_WINDOW_MS;
}

function extractReleaseSummary(body?: string | null): string | null {
  if (!body) return null;
  const summaryLine = body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*#]+\s*/, ''))
    .find(Boolean);
  return summaryLine ?? null;
}

function releaseTagMatchesName(tagName?: string | null, name?: string | null): boolean {
  if (!tagName || !name) return false;
  return tagName.trim().toLowerCase() === name.trim().toLowerCase();
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

interface CommunityComposerCardProps {
  user: AppUser;
  expanded: boolean;
  onExpandedChange: (next: boolean) => void;
  onPostCreated: (post: CommunityPost) => void;
  onError: (message: string) => void;
}

function CommunityComposerCard({
  user,
  expanded,
  onExpandedChange,
  onPostCreated,
  onError,
}: CommunityComposerCardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [progress, setProgress] = useState<UploadProgress>({ stage: 'idle', value: 0 });
  const [composerError, setComposerError] = useState<string | null>(null);
  const captionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (expanded && captionInputRef.current) {
      captionInputRef.current.focus();
    }
  }, [expanded]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl('');
      return undefined;
    }
    const nextPreviewUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [selectedFile]);

  const resetComposer = useCallback(() => {
    setSelectedFile(null);
    setCaption('');
    setProgress({ stage: 'idle', value: 0 });
    setComposerError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
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
      if (!expanded) {
        onExpandedChange(true);
      }
    },
    [expanded, onExpandedChange],
  );

  const handleCancel = useCallback(() => {
    resetComposer();
    onExpandedChange(false);
  }, [onExpandedChange, resetComposer]);

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
      onExpandedChange(false);
    } catch (error) {
      console.error('Failed to publish community post', error);
      const message = 'We could not publish your image. Please try again in a bit.';
      setComposerError(message);
      onError(message);
      setProgress({ stage: 'idle', value: 0 });
    }
  }, [caption, onError, onPostCreated, onExpandedChange, resetComposer, selectedFile, user]);

  const showPreview = Boolean(previewUrl);

  return (
    <Box
      sx={{
        borderRadius: { xs: '28px', md: 3.5 },
        border: `1px solid ${FEED_BORDER_COLOR}`,
        background: 'linear-gradient(180deg, rgba(10,16,36,0.92) 0%, rgba(12,17,34,0.94) 100%)',
        px: { xs: 3.4, md: 4 },
        py: { xs: 3.2, md: 3.8 },
        boxShadow: '0 28px 64px rgba(10,16,32,0.45)',
      }}
    >
      <Stack spacing={{ xs: 2.4, md: 2.6 }}>
        <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1.8} alignItems="center">
            <Avatar
              src={resolveAvatarUrl(user)}
              alt={resolveDisplayName(user)}
              sx={{
                width: 52,
                height: 52,
                border: '2px solid rgba(148, 163, 234, 0.25)',
                backgroundColor: 'rgba(39,54,112,0.45)',
                color: 'rgba(235,240,255,0.92)',
              }}
            >
              {resolveDisplayName(user).charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'rgba(235,240,255,0.94)' }}>
                Share something with the community
              </Typography>
              <Typography variant="body2" color="rgba(203,213,225,0.74)">
                Drop a meme, add a caption, let Welcome Home know what you're feeling.
              </Typography>
            </Box>
          </Stack>
          {!expanded && (
            <Button
              variant="contained"
              color="inherit"
              onClick={() => onExpandedChange(true)}
              startIcon={<AddPhotoAlternateIcon />}
              sx={{
                borderRadius: 999,
                textTransform: 'none',
                fontWeight: 600,
                px: { xs: 2.6, md: 3 },
                backgroundColor: 'rgba(226,232,240,0.98)',
                color: 'rgba(19,28,55,0.92)',
                boxShadow: '0 18px 42px rgba(11,19,44,0.55)',
                '&:hover': {
                  backgroundColor: '#fff',
                },
              }}
            >
              Share a meme
            </Button>
          )}
        </Stack>

        <Collapse in={expanded} unmountOnExit>
          <Stack spacing={{ xs: 2.4, md: 2.6 }}>
            <TextField
              value={caption}
              onChange={(event) => setCaption(event.target.value.slice(0, MAX_CAPTION_LENGTH))}
              placeholder="Add a caption (optional)"
              multiline
              minRows={2}
              maxRows={4}
              inputRef={captionInputRef}
              variant="outlined"
              InputProps={{
                sx: {
                  backgroundColor: 'rgba(6,10,22,0.92)',
                  borderRadius: 3,
                  '& fieldset': { borderColor: 'rgba(148,163,234,0.32)' },
                  '&:hover fieldset': { borderColor: FEED_ACCENT_SECONDARY },
                  color: 'rgba(236,244,255,0.96)',
                },
              }}
              sx={{ width: '100%' }}
            />

            <Box
              sx={{
                borderRadius: { xs: 3, md: 3 },
                border: selectedFile
                  ? '1px solid rgba(148,163,234,0.42)'
                  : '1px dashed rgba(148,163,234,0.32)',
                backgroundColor: 'rgba(8,12,26,0.85)',
                px: { xs: 3, md: 3.2 },
                py: { xs: 2.6, md: 2.8 },
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.6, sm: 2.2 }} alignItems="center">
                <Button
                  variant={selectedFile ? 'outlined' : 'contained'}
                  color="inherit"
                  component="label"
                  startIcon={<AddPhotoAlternateIcon />}
                  sx={{
                    borderRadius: 999,
                    textTransform: 'none',
                    fontWeight: 600,
                    px: { xs: 2.6, sm: 3 },
                    backgroundColor: selectedFile ? 'transparent' : 'rgba(226,232,240,0.98)',
                    color: selectedFile ? 'rgba(222,230,255,0.92)' : 'rgba(19,28,55,0.92)',
                    boxShadow: selectedFile ? 'none' : '0 16px 36px rgba(11,19,44,0.45)',
                    borderColor: selectedFile ? 'rgba(148,163,234,0.38)' : undefined,
                  }}
                >
                  {selectedFile ? 'Change image' : 'Upload image'}
                  <input
                    hidden
                    accept="image/*"
                    type="file"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                  />
                </Button>

                <Typography
                  variant="body2"
                  color="rgba(192,204,222,0.72)"
                  sx={{ textAlign: { xs: 'center', sm: 'left' }, flex: 1 }}
                >
                  {selectedFile ? selectedFile.name : 'PNG, JPG, GIF, or WebP up to 10 MB.'}
                </Typography>

                {selectedFile && (
                  <IconButton
                    aria-label="Remove image"
                    onClick={() => setSelectedFile(null)}
                    sx={{ color: 'rgba(222,230,255,0.78)' }}
                  >
                    <CloseIcon />
                  </IconButton>
                )}
              </Stack>

              {showPreview && (
                <Box
                  sx={{
                    borderRadius: { xs: 2.6, md: 3 },
                    overflow: 'hidden',
                    border: `1px solid ${FEED_BORDER_COLOR}`,
                    backgroundColor: '#050505',
                    maxHeight: 'min(58vh, 58svh)',
                  }}
                >
                  <Box
                    component="img"
                    src={previewUrl}
                    alt="Selected preview"
                    sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                  />
                </Box>
              )}
            </Box>

            {progress.stage !== 'idle' && (
              <LinearProgress
                variant="determinate"
                value={progress.value}
                sx={{
                  borderRadius: 999,
                  height: 6,
                  backgroundColor: 'rgba(28,36,62,0.72)',
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(90deg, rgba(226,232,240,0.95) 0%, rgba(148,163,234,0.85) 100%)',
                  },
                }}
              />
            )}

            {composerError && (
              <Alert
                severity="error"
                sx={{
                  borderRadius: 2.6,
                  backgroundColor: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.24)',
                  color: '#fecaca',
                }}
              >
                {composerError}
              </Alert>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.6} justifyContent="flex-end">
              <Button
                variant="text"
                onClick={handleCancel}
                sx={{
                  color: 'rgba(203,213,225,0.76)',
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 2,
                }}
              >
                Cancel
              </Button>
              <LoadingButton
                variant="contained"
                color="inherit"
                onClick={handleSubmit}
                loading={progress.stage !== 'idle'}
                disabled={!selectedFile || progress.stage !== 'idle'}
                sx={{
                  borderRadius: 2.6,
                  textTransform: 'none',
                  fontWeight: 700,
                  px: { xs: 3, sm: 3.4 },
                  backgroundColor: selectedFile ? 'rgba(226,232,240,0.98)' : 'rgba(148,163,234,0.22)',
                  color: selectedFile ? 'rgba(19,28,55,0.92)' : 'rgba(202,213,234,0.55)',
                  boxShadow: selectedFile ? '0 16px 36px rgba(11,19,44,0.45)' : 'none',
                  '&:hover': {
                    backgroundColor: selectedFile ? '#fff' : 'rgba(148,163,234,0.22)',
                  },
                }}
              >
                Publish post
              </LoadingButton>
            </Stack>
          </Stack>
        </Collapse>
      </Stack>
    </Box>
  );
}

interface CommunityIntroCardProps {
  onCreatePost: () => void;
}

type FeedGridProps = {
  posts: CommunityPost[];
  loading: boolean;
  onReload: () => void;
  error: string | null;
  onSelectPost: (post: CommunityPost) => void;
};

function CommunityIntroCard({ onCreatePost }: CommunityIntroCardProps) {
  return (
    <Box
      component="article"
      sx={{
        width: '100%',
        borderRadius: { xs: '28px', md: 3.5 },
        border: '1px solid rgba(255,255,255,0.28)',
        background: `linear-gradient(135deg, ${FEED_INTRO_SURFACE_COLOR} 0%, #ff6900 100%)`,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 34px 68px rgba(18,7,36,0.6)',
        display: 'flex',
        flexDirection: 'column',
        px: { xs: 3.6, sm: 4.1, md: 5, lg: 5.8 },
        py: { xs: 5.4, sm: 5.4, md: 5.9, lg: 6.4 },
        gap: { xs: 2.2, sm: 2.3, md: 2.5 },
        maxWidth: { xs: '100%', sm: 640, md: 780 },
        mx: { xs: 0, sm: 'auto' },
      }}
    >
      <Stack
        spacing={{ xs: 2.4, sm: 2.3, md: 2.6 }}
        sx={{
          width: '100%',
          maxWidth: { xs: '100%', sm: 560, md: 660 },
          textAlign: 'left',
          alignItems: 'stretch',
        }}
      >
        <Typography
          component="h3"
          variant="h3"
          sx={{
            fontWeight: 800,
            color: '#fff',
            textShadow: '0 22px 55px rgba(38,7,32,0.7)',
            fontSize: { xs: '1.8rem', sm: '2.4rem', md: '3.12rem', lg: '3.32rem' },
            lineHeight: { xs: 1.14, md: 1.1 },
            letterSpacing: { xs: -0.22, md: -0.3 },
            textAlign: 'left',
            width: '100%',
          }}
        >
          Say hello 👋
        </Typography>
        <Typography
          component="p"
          variant="body1"
          sx={{
            color: 'rgba(255,255,255,0.93)',
            fontWeight: 600,
            letterSpacing: { xs: 0.1, md: 0.14 },
            fontSize: { xs: '1.08rem', sm: '1.16rem', md: '1.24rem' },
            lineHeight: { xs: 1.6, md: 1.68 },
            maxWidth: { xs: '100%', sm: 540 },
            textAlign: 'left',
            width: '100%',
          }}
        >
          You can now post, browse, and react to memes directly on the memeSRC Community.
        </Typography>
        <Button
          variant="contained"
          color="inherit"
          onClick={onCreatePost}
          sx={{
            alignSelf: 'stretch',
            width: '100%',
            mt: { xs: 2.3, sm: 1.6 },
            borderRadius: 999,
            px: { xs: 2.4, sm: 3.4 },
            py: { xs: 1.1, sm: 1.05 },
            textTransform: 'none',
            fontWeight: 700,
            color: 'rgba(18,7,36,0.9)',
            backgroundColor: 'rgba(255,255,255,0.95)',
            boxShadow: '0 16px 32px rgba(18,7,36,0.28)',
            justifyContent: 'center',
            textAlign: 'center',
            gap: 1,
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,1)',
            },
          }}
        >
          Create Post
        </Button>
      </Stack>
    </Box>
  );
}

interface LatestReleaseCardProps {
  release: GitHubRelease;
  onDismiss: () => void;
}

function LatestReleaseCard({ release, onDismiss }: LatestReleaseCardProps) {
  const releaseTitle = (release.name && release.name.trim()) || release.tag_name || 'Latest update';
  const summary = extractReleaseSummary(release.body) ?? 'See the highlights from this fresh update.';
  const publishedLabel = formatRelativeTimeCompact(release.published_at);
  const secondaryHeading =
    release.name && !releaseTagMatchesName(release.tag_name, release.name)
      ? release.name.trim()
      : null;
  const secondaryHeadingDisplay =
    secondaryHeading && !/^what[’']?s changed$/i.test(secondaryHeading.trim()) ? secondaryHeading : null;
  const headline = release.tag_name ? `Updated to ${release.tag_name}` : releaseTitle;

  return (
    <Box
      component="article"
      sx={{
        width: '100%',
        borderRadius: { xs: '28px', md: 3.5 },
        border: '1px solid rgba(255,255,255,0.18)',
        background: 'linear-gradient(135deg, rgba(23,16,52,0.96) 0%, rgba(91,33,182,0.88) 100%)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 30px 66px rgba(10,16,38,0.55)',
        display: 'flex',
        flexDirection: 'column',
        px: { xs: 3.6, sm: 4.2, md: 4.8, lg: 5.2 },
        py: { xs: 4.8, sm: 5, md: 5.4, lg: 5.6 },
        gap: { xs: 2.2, sm: 2.4 },
        maxWidth: { xs: '100%', sm: 640, md: 780 },
        mx: { xs: 0, sm: 'auto' },
      }}
    >
      <Stack spacing={{ xs: 2.4, sm: 2.6 }} sx={{ width: '100%' }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={{ xs: 1.6, sm: 2 }}
        >
          <Stack spacing={{ xs: 1.2, sm: 1.4 }} sx={{ pr: { xs: 0, sm: 1.8 } }}>
            <Typography
              variant="body2"
              sx={{
                textTransform: 'uppercase',
                letterSpacing: 1.1,
                fontWeight: 700,
                fontSize: { xs: '0.88rem', sm: '0.94rem' },
                color: 'rgba(240,244,255,0.86)',
              }}
            >
              {publishedLabel}
            </Typography>
            <Typography
              component="h3"
              variant="h3"
              sx={{
                fontWeight: 800,
                color: '#fff',
                textShadow: '0 22px 54px rgba(9,12,28,0.58)',
                fontSize: { xs: '1.9rem', sm: '2.3rem', md: '2.7rem' },
                lineHeight: { xs: 1.15, md: 1.12 },
                letterSpacing: { xs: -0.22, md: -0.3 },
              }}
            >
              {headline}
            </Typography>
            {secondaryHeadingDisplay && (
              <Typography
                variant="subtitle1"
                sx={{
                  color: 'rgba(230,235,255,0.88)',
                  fontWeight: 600,
                  fontSize: { xs: '1.05rem', sm: '1.12rem' },
                  lineHeight: { xs: 1.4, md: 1.45 },
                }}
              >
                {secondaryHeadingDisplay}
              </Typography>
            )}
          </Stack>
          <IconButton
            aria-label="Dismiss latest update card"
            onClick={onDismiss}
            size="medium"
            sx={{
              backgroundColor: 'rgba(15,18,44,0.35)',
              color: 'rgba(236,240,255,0.88)',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 12px 24px rgba(7,10,28,0.4)',
              '&:hover': {
                backgroundColor: 'rgba(17,20,48,0.48)',
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Typography
          variant="body1"
          sx={{
            color: 'rgba(236,240,255,0.9)',
            fontWeight: 500,
            lineHeight: { xs: 1.62, md: 1.68 },
            letterSpacing: 0.12,
            maxWidth: { xs: '100%', md: 560 },
          }}
        >
          {summary}
        </Typography>

        <Stack
          spacing={{ xs: 1.2, sm: 1.6 }}
          sx={{
            mt: { xs: 1.4, sm: 1.6 },
            alignItems: { xs: 'stretch', sm: 'flex-start' },
          }}
        >
          <Button
            component={RouterLink}
            to="/releases"
            variant="contained"
            color="inherit"
            sx={{
              borderRadius: 999,
              px: { xs: 2.6, sm: 3.4 },
              py: { xs: 1.05, sm: 1.08 },
              textTransform: 'none',
              fontWeight: 700,
              fontSize: { xs: '0.98rem', sm: '1rem' },
              color: '#17092f',
              backgroundColor: 'rgba(255,255,255,0.94)',
              boxShadow: '0 20px 42px rgba(7,12,32,0.48)',
              '&:hover': {
                backgroundColor: '#fff',
              },
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            Learn more
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

type FeedCardItem = {
  id: string;
  element: ReactElement;
};

function FeedCardsArea({ cards }: { cards: FeedCardItem[] }) {
  if (!cards.length) {
    return null;
  }

  return (
    <Stack spacing={{ xs: 1.8, md: 2 }} sx={{ width: '100%' }}>
      {cards.map((card) => (
        <Box key={card.id} sx={FEED_CARD_WRAPPER_SX}>
          {card.element}
        </Box>
      ))}
    </Stack>
  );
}

function FeedGrid({ posts, loading, onReload, error, onSelectPost }: FeedGridProps) {
  return (
    <Stack
      spacing={{ xs: 2.6, md: 2.8 }}
      sx={{
        mt: 0.5,
        px: { xs: 0, md: 0 },
        pr: { md: 0.75 },
        pb: { md: 0.5 },
        mx: { xs: -3, md: 0 },
      }}
    >
      {loading && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress size={36} sx={{ color: FEED_ACCENT_SECONDARY }} />
        </Box>
      )}

      {!loading && error && (
        <Stack spacing={2} alignItems="center" py={6}>
          <Alert severity="error" sx={{ borderRadius: 2, backgroundColor: 'rgba(84,97,200,0.22)', color: '#fca5a5' }}>
            {error}
          </Alert>
          <Button
            variant="outlined"
            onClick={onReload}
            startIcon={<RefreshIcon />}
            sx={{
              borderRadius: 2,
              borderColor: FEED_BORDER_COLOR,
              color: 'rgba(226, 237, 255, 0.92)',
              '&:hover': {
                borderColor: FEED_ACCENT_SECONDARY,
                backgroundColor: FEED_ACTION_BG,
              },
            }}
          >
            Retry loading
          </Button>
        </Stack>
      )}

      {!loading && !error && !posts.length ? (
        <Stack spacing={2.5} alignItems="center" py={8}>
          <Typography variant="h6" color="rgba(226,232,240,0.88)" textAlign="center">
            Be the first to share something epic.
          </Typography>
          <Typography variant="body2" color="rgba(210,210,210,0.7)" textAlign="center">
            Upload a meme below and it will appear here instantly.
          </Typography>
          <Button
            variant="outlined"
            onClick={onReload}
            sx={{
              borderRadius: 2,
              borderColor: FEED_BORDER_COLOR,
              color: 'rgba(226, 237, 255, 0.92)',
              '&:hover': {
                borderColor: FEED_ACCENT_SECONDARY,
                backgroundColor: FEED_ACTION_BG,
              },
            }}
          >
            Refresh feed
          </Button>
        </Stack>
      ) : null}

      {posts.map((post) => {
        const engagement = getSimulatedEngagement(post.id);
        return (
          <Box
            component="article"
            key={post.id}
            sx={{
              width: '100%',
              borderRadius: { xs: '28px', md: 3.5 },
              border: `1px solid ${FEED_BORDER_COLOR}`,
              backgroundColor: FEED_SURFACE_COLOR,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 28px 64px rgba(15,19,40,0.52)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Stack spacing={0} sx={{ position: 'relative', zIndex: 1, flex: 1 }}>
              <Stack
                spacing={post.caption ? 1.2 : 1}
                sx={{
                  px: { xs: 3, md: 2.6 },
                  pt: { xs: 2.6, md: 2.3 },
                  pb: { xs: 1.85, md: 1.45 },
                }}
              >
                <Stack direction="row" spacing={1.45} alignItems="center">
                  <Avatar
                    src={post.authorAvatar}
                    alt={post.authorName}
                    sx={{
                      width: 40,
                      height: 40,
                      backgroundColor: 'rgba(70,70,70,0.3)',
                      color: 'rgba(240,240,240,0.94)',
                    }}
                  >
                    {post.authorName?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography
                      variant="subtitle2"
                      color="rgba(240,240,240,0.94)"
                      sx={{ fontWeight: 600, lineHeight: 1.3 }}
                    >
                      {post.authorName || 'Anonymous'}
                    </Typography>
                    <Typography variant="caption" color="rgba(200,200,200,0.72)">
                      {formatRelativeTime(post.createdAt)}
                    </Typography>
                  </Box>
                </Stack>
                {post.caption && (
                  <Typography
                    variant="body2"
                    color="rgba(235,235,235,0.88)"
                    sx={{ wordBreak: 'break-word', lineHeight: 1.5 }}
                  >
                    {post.caption}
                  </Typography>
                )}
              </Stack>

              <ButtonBase
                onClick={() => onSelectPost(post)}
                sx={{
                  display: 'block',
                  width: '100%',
                  p: 0,
                  borderRadius: 0,
                  overflow: 'hidden',
                  backgroundColor: 'transparent',
                }}
                aria-label="Open post preview"
              >
                <Box
                  component="img"
                  src={post.imageUrl}
                  alt={post.caption || 'Community meme'}
                  sx={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: { xs: 'min(68vh, 70svh)', md: 'min(72vh, 76svh)' },
                    objectFit: 'cover',
                    display: 'block',
                    backgroundColor: '#050505',
                  }}
                />
              </ButtonBase>

              <Box
                sx={{
                  px: { xs: 3, md: 2.6 },
                  pt: { xs: 1.35, md: 1.05 },
                  pb: { xs: 1, md: 0.7 },
                  borderTop: '1px solid rgba(82,82,82,0.26)',
                }}
              >
                <Typography variant="caption" color="rgba(220,220,220,0.78)">
                  {engagement.reactions.toLocaleString()} reactions · {engagement.comments.toLocaleString()} comments
                </Typography>
              </Box>

              <Stack
                direction="row"
                sx={{
                  px: { xs: 3, md: 2.6 },
                  pb: { xs: 1.35, md: 1.1 },
                  gap: { xs: 1.3, md: 1.05 },
                  alignItems: 'stretch',
                }}
              >
                <ButtonBase
                  disableRipple
                  aria-label="React to post"
                  sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.75,
                    px: 1,
                    py: 0.75,
                    borderRadius: 1.75,
                    backgroundColor: FEED_ACTION_BG,
                    color: 'rgba(229,235,255,0.92)',
                    border: `1px solid ${FEED_BORDER_COLOR}`,
                    transition: 'background-color 160ms ease, transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
                    '&:hover': {
                      backgroundColor: FEED_ACTION_BG_HOVER,
                      boxShadow: '0 18px 36px rgba(12,18,50,0.42)',
                      borderColor: FEED_ACCENT_SECONDARY,
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  <FavoriteBorderOutlinedIcon sx={{ fontSize: 20 }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    React
                  </Typography>
                </ButtonBase>
                <ButtonBase
                  disableRipple
                  aria-label="Comment on post"
                  sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.75,
                    px: 1,
                    py: 0.75,
                    borderRadius: 1.75,
                    backgroundColor: FEED_ACTION_BG,
                    color: 'rgba(229,235,255,0.92)',
                    border: `1px solid ${FEED_BORDER_COLOR}`,
                    transition: 'background-color 160ms ease, transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
                    '&:hover': {
                      backgroundColor: FEED_ACTION_BG_HOVER,
                      boxShadow: '0 18px 36px rgba(12,18,50,0.42)',
                      borderColor: FEED_ACCENT_SECONDARY,
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  <ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 20 }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Comment
                  </Typography>
                </ButtonBase>
                <ButtonBase
                  disableRipple
                  aria-label="Share post"
                  sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.75,
                    px: 1,
                    py: 0.75,
                    borderRadius: 1.75,
                    backgroundColor: FEED_ACTION_BG,
                    color: 'rgba(229,235,255,0.92)',
                    border: `1px solid ${FEED_BORDER_COLOR}`,
                    transition: 'background-color 160ms ease, transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
                    '&:hover': {
                      backgroundColor: FEED_ACTION_BG_HOVER,
                      boxShadow: '0 18px 36px rgba(12,18,50,0.42)',
                      borderColor: FEED_ACCENT_SECONDARY,
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  <ShareOutlinedIcon sx={{ fontSize: 20 }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Share
                  </Typography>
                </ButtonBase>
              </Stack>

              <Typography
                variant="caption"
                color="rgba(215,215,215,0.7)"
                sx={{ px: { xs: 3, md: 2.6 }, pb: { xs: 1.6, md: 1.25 } }}
              >
                Tap the image to zoom full screen
              </Typography>
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}

type CommunityFeedSectionProps = {
  onPostsLoaded?: (posts: CommunityPost[]) => void;
};

export default function CommunityFeedSection(props: CommunityFeedSectionProps = {}): ReactElement | null {
  const { onPostsLoaded } = props;
  const { user: rawUser } = useContext(UserContext);
  const user = isAppUser(rawUser) ? rawUser : null;
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [{ loading, error }, setFeedState] = useState<FeedState>({ loading: true, error: null });
  const [composerNotice, setComposerNotice] = useState<string | null>(null);
  const [previewPost, setPreviewPost] = useState<CommunityPost | null>(null);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const composerCardRef = useRef<HTMLDivElement | null>(null);
  const [latestRelease, setLatestRelease] = useState<GitHubRelease | null>(null);
  const [dismissedReleaseTag, setDismissedReleaseTag] = useState<string | null>(null);

  const readCache = useCallback((): { posts: CommunityPost[]; timestamp: number } | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(COMMUNITY_FEED_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { posts?: CommunityPost[]; timestamp?: number };
      if (!Array.isArray(parsed.posts) || typeof parsed.timestamp !== 'number') return null;
      return parsed as { posts: CommunityPost[]; timestamp: number };
    } catch {
      return null;
    }
  }, []);

  const writeCache = useCallback((nextPosts: CommunityPost[]) => {
    if (typeof window === 'undefined') return;
    try {
      const payload = JSON.stringify({ posts: nextPosts, timestamp: Date.now() });
      window.localStorage.setItem(COMMUNITY_FEED_CACHE_KEY, payload);
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    const cached = readCache();
    if (!cached) return;
    const isFresh = Date.now() - cached.timestamp <= COMMUNITY_FEED_CACHE_TTL_MS;
    if (!isFresh || !cached.posts.length) return;
    setPosts(cached.posts);
    setFeedState({ loading: false, error: null });
    if (onPostsLoaded) {
      onPostsLoaded(cached.posts);
    }
  }, [onPostsLoaded, readCache]);

  useEffect(() => {
    let isMounted = true;

    const loadLatestRelease = async () => {
      try {
        const release = await fetchLatestRelease();
        if (isMounted) {
          setLatestRelease(release);
        }
      } catch {
        if (isMounted) {
          setLatestRelease(null);
        }
      }
    };

    loadLatestRelease();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!latestRelease?.tag_name) {
      setDismissedReleaseTag(null);
      return;
    }
    const key = buildReleaseDismissKey(latestRelease.tag_name);
    if (!key) {
      setDismissedReleaseTag(null);
      return;
    }
    const stored = safeGetItem(key);
    setDismissedReleaseTag(stored ? latestRelease.tag_name : null);
  }, [latestRelease?.tag_name]);

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
      writeCache(validPosts);
      if (onPostsLoaded) {
        onPostsLoaded(validPosts);
      }
    } catch (err) {
      console.error('Failed to load community feed', err);
      setFeedState({ loading: false, error: DEFAULT_ERROR_MESSAGE });
      if (onPostsLoaded) {
        onPostsLoaded([]);
      }
    }
  }, [onPostsLoaded]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handlePostCreated = useCallback(
    (post: CommunityPost) => {
      setPosts((prev) => {
        const next = [post, ...prev];
        writeCache(next);
        if (onPostsLoaded) {
          onPostsLoaded(next);
        }
        return next;
      });
      setComposerNotice(null);
    },
    [onPostsLoaded]
  );

  const handleComposerError = useCallback((message: string) => {
    setComposerNotice(message);
    setComposerExpanded(true);
  }, []);

  const handlePreviewPost = useCallback((post: CommunityPost) => {
    setPreviewPost(post);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewPost(null);
  }, []);

  const handleCreatePostRequest = useCallback(() => {
    if (user) {
      setComposerExpanded(true);
      if (composerCardRef.current) {
        composerCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, [user]);

  const handleDismissLatestReleaseCard = useCallback(() => {
    if (!latestRelease?.tag_name) {
      return;
    }
    const key = buildReleaseDismissKey(latestRelease.tag_name);
    if (!key) {
      return;
    }
    safeSetItem(key, 'true');
    setDismissedReleaseTag(latestRelease.tag_name);
  }, [latestRelease?.tag_name]);

  const shouldShowLatestReleaseCard = useMemo(() => {
    if (!latestRelease) return false;
    if (latestRelease.draft) return false;
    if (!latestRelease.published_at) return false;
    if (!latestRelease.tag_name) return false;
    if (!isReleaseRecent(latestRelease.published_at)) return false;
    return dismissedReleaseTag !== latestRelease.tag_name;
  }, [dismissedReleaseTag, latestRelease]);

  const feedCards = useMemo<FeedCardItem[]>(() => {
    const cards: FeedCardItem[] = [];
    if (shouldShowLatestReleaseCard && latestRelease) {
      cards.push({
        id: `latest-release-${latestRelease.id ?? latestRelease.tag_name}`,
        element: <LatestReleaseCard release={latestRelease} onDismiss={handleDismissLatestReleaseCard} />,
      });
    }
    cards.push({
      id: 'intro-card',
      element: <CommunityIntroCard onCreatePost={handleCreatePostRequest} />,
    });
    return cards;
  }, [handleCreatePostRequest, handleDismissLatestReleaseCard, latestRelease, shouldShowLatestReleaseCard]);

  return (
    <>
      <Stack spacing={{ xs: 1.8, md: 2 }} sx={{ width: '100%', color: '#f8fafc', mt: { xs: 1.8, md: 0 } }}>
        <FeedCardsArea cards={feedCards} />
        <Stack spacing={{ xs: 1.8, md: 2 }} sx={{ width: '100%' }}>
          {composerNotice && (
            <Alert
              severity="warning"
              onClose={() => setComposerNotice(null)}
              sx={{
                borderRadius: 2,
                backgroundColor: 'rgba(120,120,120,0.18)',
                color: '#f5f5f5',
                mx: { xs: -3, md: 0 },
                px: { xs: 3, md: 0 },
                mt: { xs: 1.8, md: 0 },
              }}
            >
              {composerNotice}
            </Alert>
          )}

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              px: { xs: 0, md: 0 },
              mx: { xs: -3, md: 0 },
            }}
          >
            <Box sx={{ px: { xs: 3, md: 0 } }}>
              <FeedGrid
                posts={posts}
                loading={loading}
                error={error}
                onReload={loadFeed}
                onSelectPost={handlePreviewPost}
              />
            </Box>
          </Box>

          <Box sx={{ flexShrink: 0, px: { xs: 0, md: 0 }, mx: { xs: -3, md: 0 } }}>
            <Box sx={{ px: { xs: 3, md: 0 } }}>
              {user ? (
                <Box id="community-composer" ref={composerCardRef}>
                  <CommunityComposerCard
                    user={user}
                    expanded={composerExpanded}
                    onExpandedChange={setComposerExpanded}
                    onPostCreated={handlePostCreated}
                    onError={handleComposerError}
                  />
                </Box>
              ) : (
                <Box
                  sx={{
                    borderRadius: { xs: '28px', md: 3.5 },
                    border: '1px dashed rgba(255,255,255,0.08)',
                    backgroundColor: FEED_SURFACE_COLOR,
                    p: { xs: 3.6, md: 3.5 },
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="h6" color="rgba(232,232,232,0.92)">
                    Sign in to share your memes
                  </Typography>
                  <Typography variant="body2" color="rgba(210,210,210,0.7)" mt={1.5} mb={2.5}>
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
            </Box>
          </Box>
        </Stack>
      </Stack>

      <Dialog
        open={Boolean(previewPost)}
        onClose={handleClosePreview}
        fullScreen
        PaperProps={{
          sx: {
            backgroundColor: '#0f0f0f',
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
                  maxHeight: 'min(92vh, 92svh)',
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
    </>
  );
}
