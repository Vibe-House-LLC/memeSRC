import React, { useCallback, useContext, useEffect, useMemo, useRef, useState, memo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { styled, alpha } from '@mui/material/styles';
import {
	Alert,
	Box,
	Button,
	Card,
	CardMedia,
	Chip,
	CircularProgress,
	Container,
	Fab,
	FormControl,
	FormLabel,
	Grid,
	IconButton,
	List,
	ListItem,
	ListItemIcon,
	ListItemText,
	Popover,
	Select,
	MenuItem,
	Skeleton,
	Slider,
	Snackbar,
	Stack,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Tooltip,
	Typography,
	useMediaQuery,
	useTheme,
} from '@mui/material';
import {
	ArrowBackIos,
	ArrowForwardIos,
	BrowseGallery,
	Close,
	Collections,
	ContentCopy,
	Edit,
	FontDownloadOutlined,
	FormatBold,
	FormatColorFill,
	FormatItalic,
	GpsFixed,
	GpsNotFixed,
	HistoryToggleOffRounded,
	Menu,
	OpenInNew,
} from '@mui/icons-material';
import { TwitterPicker } from 'react-color';

import useSearchDetails from '../hooks/useSearchDetails';
import useSearchDetailsV2 from '../hooks/useSearchDetailsV2';
import { UserContext } from '../UserContext';
import { fetchFrameInfo, fetchFramesFineTuning, fetchFramesSurroundingPromises } from '../utils/frameHandlerV2';
import getV2Metadata from '../utils/getV2Metadata';
import { saveImageToLibrary } from '../utils/library/saveImageToLibrary';

import FramePageBottomBannerAd from '../ads/FramePageBottomBannerAd';
import HomePageBannerAd from '../ads/HomePageBannerAd';
import FixedMobileBannerAd from '../ads/FixedMobileBannerAd';

// Styles
const StyledCard = styled(Card)`
	border: 1px solid ${props => alpha(props.theme.palette.divider, 0.16)};
	box-sizing: border-box;
	background: ${props => alpha(props.theme.palette.background.paper, 0.9)};
	backdrop-filter: blur(10px);
	transition: border-color 0.2s ease;
	&:hover {
		border: 1px solid ${props => alpha(props.theme.palette.primary.main, 0.3)};
	}
`;

const StyledCardMedia = styled('img')`
	width: 100%;
	height: auto;
	background-color: black;
`;

const StyledTwitterPicker = styled(TwitterPicker)`
	span div {
		border: 1px solid rgb(240, 240, 240);
	}
`;
const TwitterPickerWrapper = memo(StyledTwitterPicker as unknown as React.ComponentType<any>);

// Helpers and types
function getContrastColor(hexColor: string): string {
	const r = parseInt(hexColor.slice(1, 3), 16);
	const g = parseInt(hexColor.slice(3, 5), 16);
	const b = parseInt(hexColor.slice(5, 7), 16);
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

function frameToTimeCode(frame: number | string, frameRate = 10): string {
	const frameNum = typeof frame === 'string' ? Number(frame) : frame;
	const totalSeconds = frameNum / frameRate;
	const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
	const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
	const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
	return `${hours}:${minutes}:${seconds}`;
}

function wrapText(
	context: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	maxWidth: number,
	lineHeight: number,
	shouldDraw = true,
): number {
	const paragraphs = text.split('\n');
	let totalLines = 0;
	paragraphs.forEach((paragraph) => {
		if (paragraph.trim() === '') {
			if (shouldDraw) y += lineHeight;
			totalLines += 1;
		} else {
			const words = paragraph.split(' ');
			let line = '';
			words.forEach((word, n) => {
				const testLine = `${line}${word} `;
				const metrics = context.measureText(testLine);
				const testWidth = metrics.width;
				if (testWidth > maxWidth && n > 0) {
					if (shouldDraw) {
						context.strokeText(line, x, y);
						context.fillText(line, x, y);
					}
					y += lineHeight;
					totalLines += 1;
					line = `${word} `;
				} else {
					line = testLine;
				}
			});
			if (line.trim() !== '') {
				if (shouldDraw) {
					context.strokeText(line, x, y);
					context.fillText(line, x, y);
				}
				y += lineHeight;
				totalLines += 1;
			}
		}
	});
	return totalLines;
}

// Component
export default function FramePage(): React.ReactElement {
	const theme = useTheme();
	const navigate = useNavigate();
	const { setFrame } = useSearchDetails();
	const { user } = useContext(UserContext) as any;
	const [searchParams] = useSearchParams();
	const { cid, season, episode, frame, fineTuningIndex } = useParams<{
		cid: string;
		season: string;
		episode: string;
		frame: string;
		fineTuningIndex?: string;
	}>();
	const searchQuery = searchParams.get('searchTerm') || '';

	const isSm = useMediaQuery((t: any) => t.breakpoints.down('md'));
	const isMdUp = useMediaQuery((t: any) => t.breakpoints.up('md'));
	const isMobile = useMediaQuery((t: any) => t.breakpoints.down('sm'));
	const hasCollageAccess = Boolean(user?.['cognito:groups']?.includes('admins'));

	const [frameData, setFrameData] = useState<any | null>(null);
	const [fineTuningFrames, setFineTuningFrames] = useState<string[]>([]);
	const [fineTuningBlobs, setFineTuningBlobs] = useState<string[]>([]);
	const [surroundingFrames, setSurroundingFrames] = useState<Array<any | 'loading'>>([]);
	const [surroundingSubtitles, setSurroundingSubtitles] = useState<any[] | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [loadingFineTuning, setLoadingFineTuning] = useState<boolean>(false);
	const [fineTuningLoadStarted, setFineTuningLoadStarted] = useState<boolean>(false);
	const [confirmedCid, setConfirmedCid] = useState<string | undefined>();
	const [displayImage, setDisplayImage] = useState<string | undefined>();
	const [subtitlesExpanded, setSubtitlesExpanded] = useState<boolean>(false);
	const [imgSrc, setImgSrc] = useState<string | undefined>();
	const [mainImageLoaded, setMainImageLoaded] = useState<boolean>(false);
	const [imagesLoaded, setImagesLoaded] = useState<Record<string, boolean>>({});
	const [textFieldFocused, setTextFieldFocused] = useState<boolean>(false);

	// caption state
	const [showText, setShowText] = useState<boolean>(false);
	const [loadedSubtitle, setLoadedSubtitle] = useState<string>('');
	const [, setOriginalSubtitle] = useState<string>('');
	const [, setSubtitleUserInteracted] = useState<boolean>(false);
	const [, setLoadedSeason] = useState<string>('');
	const [, setLoadedEpisode] = useState<string>('');

	const [fontSizeScaleFactor, setFontSizeScaleFactor] = useState<number>(1);
	const [fontLineHeightScaleFactor, setFontLineHeightScaleFactor] = useState<number>(1);
	const [fontBottomMarginScaleFactor, setFontBottomMarginScaleFactor] = useState<number>(1);
	const [isBold, setIsBold] = useState<boolean>(() => {
		const storedValue = localStorage.getItem(`formatting-${user?.username}-${cid}`);
		return storedValue ? JSON.parse(storedValue).isBold : false;
	});
	const [isItalic, setIsItalic] = useState<boolean>(() => {
		const storedValue = localStorage.getItem(`formatting-${user?.username}-${cid}`);
		return storedValue ? JSON.parse(storedValue).isItalic : false;
	});
	const [colorPickerColor, setColorPickerColor] = useState<any>(() => {
		const storedValue = localStorage.getItem(`formatting-${user?.username}-${cid}`);
		return storedValue ? JSON.parse(storedValue).colorPickerColor : {
			r: '255', g: '255', b: '255', a: '100'
		};
	});
	const [fontFamily, setFontFamily] = useState<string>(() => {
		const storedValue = localStorage.getItem(`formatting-${user?.username}-${cid}`);
		return storedValue ? JSON.parse(storedValue).fontFamily : 'Arial';
	});
	const [isLowercaseFont, setIsLowercaseFont] = useState<boolean>(() => {
		const storedValue = localStorage.getItem(`formatting-${user?.username}-${cid}`);
		return storedValue ? JSON.parse(storedValue).fontFamily === 'Star Jedi' : false;
	});

	// snackbar and library state
	const [snackbarOpen, setSnackBarOpen] = useState<boolean>(false);
	const [librarySnackbarOpen, setLibrarySnackbarOpen] = useState<boolean>(false);
	const [savingToLibrary, setSavingToLibrary] = useState<boolean>(false);

	// refs
	const throttleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const textFieldRef = useRef<any>(null);
	const colorPicker = useRef<any>(null);

	// hooks
	const { selectedFrameIndex, setSelectedFrameIndex } = useSearchDetailsV2() as any;

	// fonts
	const fonts = useMemo(() => [
		"Arial", "Courier New", "Georgia", "Verdana", "Akbar", "Baveuse", "PULPY", "scrubs", "South Park", "SPIDEY", "HORROR", "IMPACT", "Star Jedi", "twilight", "zuume"
	], []);

	// Font selector component
	type FontSelectorProps = { selectedFont: string; onSelectFont: (value: string) => void };
	const FontSelector = ({ selectedFont, onSelectFont }: FontSelectorProps) => (
		<Select
			value={selectedFont}
			onChange={(e) => {
				const newFont = String(e.target.value);
				onSelectFont(newFont);
				setIsLowercaseFont(newFont === 'Star Jedi');
			}}
			displayEmpty
			inputProps={{ 'aria-label': 'font-selector' }}
			size='small'
			startAdornment={<FontDownloadOutlined sx={{ mr: 0.5 }} />}
			sx={{ '& .MuiSelect-select': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }}
		>
			{fonts.map((font) => (
				<MenuItem key={font} value={font} sx={{ fontFamily: font }}>{font}</MenuItem>
			))}
		</Select>
	);

	// effects
	useEffect(() => {
		getV2Metadata(cid as string).then((metadata: any) => {
			setConfirmedCid(metadata.id);
		}).catch((error: any) => console.log(error));
	}, [cid]);

	const handleSnackbarOpen = () => setSnackBarOpen(true);
	const handleSnackbarClose = () => setSnackBarOpen(false);
	const handleLibrarySnackbarClose = () => setLibrarySnackbarOpen(false);

	const handleClearCaption = () => {
		setLoadedSubtitle('');
		updateCanvas();
	};

	const updateLocalStorage = useCallback(() => {
		const formattingOptions = { isBold, isItalic, colorPickerColor, fontFamily };
		localStorage.setItem(`formatting-${user?.username}-${cid}`, JSON.stringify(formattingOptions));
	}, [cid, colorPickerColor, fontFamily, isBold, isItalic, user?.username]);

	const handleImageLoad = (frameId: string | number) => {
		setImagesLoaded((prev) => ({ ...prev, [String(frameId)]: true }));
	};

	const handleMainImageLoad = () => setMainImageLoaded(true);

	const changeColor = (color: any) => {
		setColorPickerColor(color.hex);
		setColorPickerShowing(false);
	};

	const [colorPickerShowing, setColorPickerShowing] = useState<boolean>(false);

	useEffect(() => { window.scrollTo(0, 0); }, []);

	useEffect(() => { updateCanvas(); }, [showText, frameData, fontSizeScaleFactor, fontLineHeightScaleFactor, fontBottomMarginScaleFactor]);
	useEffect(() => { updateCanvasUnthrottled(); }, [displayImage, loadedSubtitle, frame, fineTuningBlobs, selectedFrameIndex, fontFamily, isBold, isItalic, colorPickerColor]);
	useEffect(() => { updateLocalStorage(); }, [isBold, isItalic, colorPickerColor, fontFamily]);

	useEffect(() => {
		if (frames && frames.length > 0) {
			setSelectedFrameIndex?.(fineTuningIndex ? Number(fineTuningIndex) : Math.floor(frames.length / 2));
			setDisplayImage(fineTuningIndex ? frames[Number(fineTuningIndex)] : frames[Math.floor(frames.length / 2)]);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [/* frames set below */]);

	// main data loading
	const [frames, setFrames] = useState<string[] | undefined>();
	useEffect(() => {
		if (!confirmedCid) return;

		const loadInitialFrameInfo = async () => {
			setLoading(true);
			try {
				const initialInfo = await fetchFrameInfo(confirmedCid, season, episode, frame, { mainImage: true });
				setFrame(initialInfo.frame_image);
				setFrameData(initialInfo);
				setDisplayImage(initialInfo.frame_image);
				setLoadedSubtitle(initialInfo.subtitle);
				setOriginalSubtitle(initialInfo.subtitle);
				setLoadedSeason(season as string);
				setLoadedEpisode(episode as string);
				if (initialInfo.fontFamily && fonts.includes(initialInfo.fontFamily)) setFontFamily(initialInfo.fontFamily);
			} catch (error) {
				console.error('Failed to fetch initial frame info:', error);
			} finally {
				setLoading(false);
			}
		};

		const loadSurroundingSubtitles = async () => {
			try {
				const subtitlesSurrounding = (await fetchFrameInfo(confirmedCid, season, episode, frame, { subtitlesSurrounding: true })).subtitles_surrounding;
				setSurroundingSubtitles(subtitlesSurrounding);
			} catch (error) {
				console.error('Failed to fetch surrounding subtitles:', error);
			}
		};

		const loadSurroundingFrames = async () => {
			try {
				const surroundingFramePromises = fetchFramesSurroundingPromises(confirmedCid, season, episode, frame);
				surroundingFramePromises.forEach((promise: Promise<any>, index: number) => {
					promise.then(resolvedFrame => {
						resolvedFrame.cid = confirmedCid;
						resolvedFrame.season = parseInt(season as string, 10);
						resolvedFrame.episode = parseInt(episode as string, 10);
						setSurroundingFrames(prev => {
							const updated = [...prev];
							updated[index] = resolvedFrame;
							return updated;
						});
					}).catch(error => console.error('Failed to fetch a frame:', error));
				});
			} catch (error) {
				console.error('Failed to fetch surrounding frames:', error);
			}
		};

		setLoading(true);
		setFrame(null as any);
		setFrameData(null);
		setDisplayImage(undefined);
		setLoadedSubtitle('');
		setOriginalSubtitle('');
		setSubtitleUserInteracted(false);
		setSelectedFrameIndex?.(5);
		setFineTuningFrames([]);
		setFrames(undefined);
		setSurroundingSubtitles([] as any);
		setSurroundingFrames(new Array(9).fill('loading'));
		setImgSrc(undefined);
		setLoadingFineTuning(false);
		setFineTuningLoadStarted(false);
		setFineTuningBlobs([]);

		loadInitialFrameInfo().then(() => {
			loadFineTuningFrames();
			loadSurroundingSubtitles();
			loadSurroundingFrames();
		});
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [confirmedCid, season, episode, frame]);

	const loadFineTuningFrames = async () => {
		try {
			const fineTuningImageUrls = await fetchFramesFineTuning(confirmedCid, season, episode, frame);
			setFineTuningFrames(fineTuningImageUrls);
			setFrames(fineTuningImageUrls);
		} catch (error) {
			console.error('Failed to fetch fine tuning frames:', error);
		}
	};

	const loadFineTuningImages = () => {
		if (fineTuningFrames && !fineTuningLoadStarted) {
			setFineTuningLoadStarted(true);
			setLoadingFineTuning(true);
			const blobPromises = fineTuningFrames.map((url) => fetch(url).then((res) => res.blob()).catch(() => null));
			Promise.all(blobPromises).then((blobs) => {
				const valid = blobs.filter(Boolean) as Blob[];
				const blobUrls = valid.map((blob) => URL.createObjectURL(blob));
				setFineTuningBlobs(blobUrls);
				setLoadingFineTuning(false);
			}).catch((error) => {
				console.error('Error loading fine-tuning images:', error);
				setLoadingFineTuning(false);
			});
		}
	};

	useEffect(() => {
		if (fineTuningBlobs && fineTuningBlobs.length > 0) {
			setDisplayImage(fineTuningBlobs?.[selectedFrameIndex] || undefined);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fineTuningBlobs]);

	// Canvas compose
	const updateCanvasUnthrottled = (scaleDown?: boolean) => {
		if (!displayImage) return;
		const offScreenCanvas = document.createElement('canvas');
		const ctx = offScreenCanvas.getContext('2d');
		if (!ctx) return;
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.src = displayImage;
		img.onload = () => {
			if (throttleTimeoutRef.current !== null) clearTimeout(throttleTimeoutRef.current);
			throttleTimeoutRef.current = setTimeout(() => {
				const maxCanvasWidth = 1000;
				const canvasAspectRatio = img.width / img.height;
				const maxCanvasHeight = maxCanvasWidth / canvasAspectRatio;
				const referenceWidth = 1000;
				const referenceFontSizeDesktop = 40;
				const referenceFontSizeMobile = 40;
				const referenceBottomAnch = 25;
				const referenceBottomAnchMobile = 25;
				const scaleFactor = 1000 / referenceWidth;
				const scaledFontSizeDesktop = referenceFontSizeDesktop * scaleFactor * fontSizeScaleFactor;
				const scaledFontSizeMobile = referenceFontSizeMobile * scaleFactor * fontSizeScaleFactor;
				const scaledBottomAnch = isMdUp ? referenceBottomAnch * scaleFactor * fontBottomMarginScaleFactor : referenceBottomAnchMobile * scaleFactor * fontBottomMarginScaleFactor;
				const referenceLineHeight = 50;
				const scaledLineHeight = referenceLineHeight * scaleFactor * fontLineHeightScaleFactor * fontSizeScaleFactor;

				offScreenCanvas.width = maxCanvasWidth;
				offScreenCanvas.height = maxCanvasHeight;
				ctx.drawImage(img, 0, 0, maxCanvasWidth, maxCanvasHeight);
				setLoading(false);

				if (showText && loadedSubtitle) {
					const fontStyle = isItalic ? 'italic' : 'normal';
					const fontWeight = isBold ? 'bold' : 'normal';
					const fontColor = (typeof colorPickerColor === 'object') ? '#FFFFFF' : String(colorPickerColor);
					ctx.font = `${fontStyle} ${fontWeight} ${isMdUp ? scaledFontSizeDesktop : scaledFontSizeMobile}px ${fontFamily}`;
					ctx.textAlign = 'center';
					ctx.fillStyle = fontColor;
					ctx.strokeStyle = getContrastColor(fontColor);
					ctx.lineWidth = offScreenCanvas.width * 0.0044;
					ctx.lineJoin = 'round';
					const x = offScreenCanvas.width / 2;
					const maxWidth = offScreenCanvas.width - 60;
					const startY = offScreenCanvas.height - 48;
					const text = isLowercaseFont ? loadedSubtitle.toLowerCase() : loadedSubtitle;
					const numOfLines = wrapText(ctx, text, x, startY, maxWidth, scaledLineHeight, false);
					const totalTextHeight = numOfLines * scaledLineHeight;
					const startYAdjusted = offScreenCanvas.height - totalTextHeight - scaledBottomAnch + 40;
					wrapText(ctx, text, x, startYAdjusted, maxWidth, scaledLineHeight);
				}

				if (scaleDown) {
					const scaledCanvas = document.createElement('canvas');
					const scaledCtx = scaledCanvas.getContext('2d');
					if (!scaledCtx) return;
					const scaledWidth = offScreenCanvas.width / 3;
					const scaledHeight = offScreenCanvas.height / 3;
					scaledCanvas.width = scaledWidth;
					scaledCanvas.height = scaledHeight;
					scaledCtx.drawImage(offScreenCanvas, 0, 0, scaledWidth, scaledHeight);
					scaledCanvas.toBlob((blob) => {
						if (blob) {
							const imageUrl = URL.createObjectURL(blob);
							setImgSrc(imageUrl);
							img.onload = () => URL.revokeObjectURL(imageUrl);
						}
					}, 'image/jpeg', 0.9);
				} else {
					offScreenCanvas.toBlob((blob) => {
						if (blob) {
							const imageUrl = URL.createObjectURL(blob);
							setImgSrc(imageUrl);
							img.onload = () => URL.revokeObjectURL(imageUrl);
						}
					}, 'image/jpeg', 0.9);
				}
				throttleTimeoutRef.current = null;
			}, 10);
		};
	};

	const updateCanvas = () => {
		if (throttleTimeoutRef.current === null) updateCanvasUnthrottled();
	};

	const handleSliderChange = (newSliderValue: number) => {
		setSelectedFrameIndex?.(newSliderValue);
		setDisplayImage(fineTuningBlobs?.[newSliderValue] || undefined);
	};

	// Save to library
	const [showTitle] = useState<string>('');
	const handleSaveToLibrary = async () => {
		if (!displayImage || savingToLibrary) return;
		setSavingToLibrary(true);
		try {
			const offScreenCanvas = document.createElement('canvas');
			const ctx = offScreenCanvas.getContext('2d');
			if (!ctx) throw new Error('Canvas 2D context not available');
			const img = new Image();
			img.crossOrigin = 'anonymous';
			img.src = displayImage;
			await new Promise<void>((resolve, reject) => {
				img.onload = () => {
					try {
						const maxCanvasWidth = 1000;
						const canvasAspectRatio = img.width / img.height;
						const maxCanvasHeight = maxCanvasWidth / canvasAspectRatio;
						offScreenCanvas.width = maxCanvasWidth;
						offScreenCanvas.height = maxCanvasHeight;
						ctx.drawImage(img, 0, 0, maxCanvasWidth, maxCanvasHeight);
						resolve();
					} catch (error) {
						reject(error);
					}
				};
				img.onerror = () => reject(new Error('Failed to load image for library save'));
			});
			const blob = await new Promise<Blob | null>((resolve) => offScreenCanvas.toBlob(resolve, 'image/jpeg', 0.9));
			if (!blob) throw new Error('Failed to produce blob');
			const showTitleSafe = (showTitle || (frameData?.showTitle as string) || 'frame').replace(/[^a-zA-Z0-9]/g, '-');
			const filename = `${showTitleSafe}-S${season}E${episode}-${frameToTimeCode(frame as string).replace(/:/g, '-')}`;
			await saveImageToLibrary(blob, filename);
			setLibrarySnackbarOpen(true);
		} catch (error) {
			console.error('Error saving frame to library:', error);
		} finally {
			setSavingToLibrary(false);
		}
	};

	const aspectRatio = '16/9';

	const renderFineTuningFrames = (imgSrcUrl?: string) => (
		<>
			<div style={{ position: 'relative' }}>
				{!mainImageLoaded && (
					<Skeleton variant='rounded' sx={{ width: '100%', height: 'auto', aspectRatio, paddingTop: '56.25%' }} />
				)}
				<CardMedia
					component={'img'}
					alt={`Fine-tuning ${selectedFrameIndex}`}
					image={imgSrcUrl}
					id='frameImage'
					onLoad={handleMainImageLoad}
					onError={() => { console.error('Failed to load main image'); handleMainImageLoad(); }}
					sx={{ display: mainImageLoaded ? 'block' : 'none' }}
				/>
				{loadingFineTuning && (
					<div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
						<CircularProgress size={60} />
					</div>
				)}
				<IconButton
					aria-label="previous frame"
					style={{ position: 'absolute', top: '50%', left: '2%', transform: 'translateY(-50%)', backgroundColor: 'transparent', color: 'white', padding: '20px', margin: '-10px' }}
					onClick={() => { navigate(`/frame/${cid}/${season}/${episode}/${Number(frame) - 10}${searchQuery ? `?searchTerm=${searchQuery}` : ''}`); }}
				>
					<ArrowBackIos style={{ fontSize: '2rem' }} />
				</IconButton>
				<IconButton
					aria-label="next frame"
					disabled={Number(frame) - 1 === 0}
					style={{ position: 'absolute', top: '50%', right: '2%', transform: 'translateY(-50%)', backgroundColor: 'transparent', color: 'white', padding: '20px', margin: '-10px' }}
					onClick={() => { navigate(`/frame/${cid}/${season}/${episode}/${Number(frame) + 10}${searchQuery ? `?searchTerm=${searchQuery}` : ''}`); }}
				>
					<ArrowForwardIos style={{ fontSize: '2rem' }} />
				</IconButton>
			</div>

			{frames && frames?.length > 0 ? (
				<Stack spacing={2} direction="row" p={0} pr={3} pl={3} alignItems={'center'}>
					<Tooltip title="Fine Tuning">
						<IconButton aria-label="fine tuning">
							{loadingFineTuning ? (<CircularProgress size={24} />) : (<HistoryToggleOffRounded />)}
						</IconButton>
					</Tooltip>
					<Slider
						size="small"
						defaultValue={selectedFrameIndex || Math.floor(frames?.length / 2)}
						min={0}
						max={frames?.length - 1}
						value={selectedFrameIndex}
						step={1}
						onMouseDown={loadFineTuningImages}
						onTouchStart={loadFineTuningImages}
						onChange={(_e, newValue) => handleSliderChange(newValue as number)}
						onChangeCommitted={(_e, value) => { navigate(`/frame/${cid}/${season}/${episode}/${frame}/${value}${searchQuery ? `?searchTerm=${searchQuery}` : ''}`); }}
						valueLabelFormat={(value) => `Fine Tuning: ${(((value as number) - 4) / 10).toFixed(1)}s`}
						marks
						componentsProps={{
							track: { style: { ...(isSm && { pointerEvents: 'none' }), backgroundColor: 'white', height: 6 } },
							rail: { style: { backgroundColor: 'white', height: 6 } },
							thumb: { style: { ...(isSm && { pointerEvents: 'auto' }), backgroundColor: '#2079fe', width: 20, height: 20 } },
						}}
					/>
				</Stack>
			) : (
				<Stack spacing={2} direction="row" p={0} pr={3} pl={3} alignItems={'center'}>
					<Tooltip title="Fine Tuning">
						<IconButton aria-label="fine tuning">
							<HistoryToggleOffRounded />
						</IconButton>
					</Tooltip>
					<Slider size="small" defaultValue={5} min={0} max={10} value={5} step={1} disabled marks />
				</Stack>
			)}
		</>
	);

	return (
		<>
			<Helmet>
				<title>Frame Details | memeSRC 2.0</title>
			</Helmet>
			<Box sx={{ minHeight: '100vh', bgcolor: 'background.default', position: 'relative' }}>
				<Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3, md: 5 } }}>
					{/* Header */}
					<Box sx={{ mb: { xs: 2, sm: 3 }, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between', gap: 1.5 }}>
						<Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
							<Chip
								icon={<OpenInNew />}
								label={`Season ${season} / Episode ${episode}`}
								onClick={() => {
									const frameRate = 10; const totalSeconds = Math.round(Number(frame) / frameRate); const nearestSecondFrame = totalSeconds * frameRate;
									navigate(`/episode/${cid}/${season}/${episode}/${nearestSecondFrame}${searchQuery ? `?searchTerm=${searchQuery}` : ''}`);
								}}
								sx={{ '& .MuiChip-label': { fontWeight: 700 } }}
							/>
							<Chip
								icon={<BrowseGallery />}
								label={`${frameToTimeCode(frame as string)}`}
								onClick={() => {
									const frameRate = 10; const totalSeconds = Math.round(Number(frame) / frameRate); const nearestSecondFrame = totalSeconds * frameRate;
									navigate(`/episode/${cid}/${season}/${episode}/${nearestSecondFrame}${searchQuery ? `?searchTerm=${searchQuery}` : ''}`);
								}}
							/>
						</Stack>
						<Stack direction="row" spacing={1}>
							{hasCollageAccess && (
								<>
									<Button
										variant="contained"
										onClick={handleSaveToLibrary}
										disabled={!confirmedCid || !displayImage || savingToLibrary}
										sx={{
											px: 2.5,
											background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.9)} 0%, ${alpha(theme.palette.primary.light, 0.85)} 100%)`,
											border: `1px solid ${alpha(theme.palette.primary.light, 0.6)}`,
											'&:hover': { background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)` },
											'&.Mui-disabled': { opacity: 0.5 },
										}}
										startIcon={<Collections />}
									>
										{savingToLibrary ? 'Saving…' : 'Save to Library'}
									</Button>
									<Button component={RouterLink} to="/library" variant="outlined" sx={{ borderColor: alpha(theme.palette.primary.main, 0.4) }}>
										Open Library
									</Button>
								</>
							)}
							<Button
								component={RouterLink}
								to={`/editor/${cid}/${season}/${episode}/${frame}${(fineTuningIndex || fineTuningLoadStarted) ? `/${selectedFrameIndex}` : ''}${searchQuery ? `?searchTerm=${searchQuery}` : ''}`}
								variant="outlined"
								startIcon={<Edit />}
								sx={{ borderColor: alpha(theme.palette.text.primary, 0.25) }}
							>
								Advanced Editor
							</Button>
						</Stack>
					</Box>

					<Grid container spacing={2}>
						<Grid item xs={12} md={6}>
							<StyledCard>
								{renderFineTuningFrames(imgSrc)}
							</StyledCard>
						</Grid>

						<Grid item xs={12} md={6}>
							<Box sx={{ width: '100%' }}>
								{showText && (
									<Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
										<ToggleButtonGroup
											value={[isBold && 'bold', isItalic && 'italic'].filter(Boolean)}
											onChange={(_event, newFormats) => {
												setIsBold(newFormats.includes('bold'));
												setIsItalic(newFormats.includes('italic'));
												setShowText(true);
											}}
											aria-label="text formatting"
											sx={{ flexShrink: 0 }}
										>
											<ToggleButton size='small' value="bold" aria-label="bold"><FormatBold /></ToggleButton>
											<ToggleButton size='small' value="italic" aria-label="italic"><FormatItalic /></ToggleButton>
										</ToggleButtonGroup>
										<ToggleButtonGroup
											sx={{ mx: 1, flexShrink: 0 }}
											value={[isBold && 'bold', isItalic && 'italic'].filter(Boolean)}
											onChange={(_event, newFormats) => { setColorPickerShowing(newFormats.includes('fontColor')); setShowText(true); }}
											aria-label="text color"
										>
											<ToggleButton ref={colorPicker} size='small' value="fontColor" aria-label="font color">
												<FormatColorFill sx={{ color: typeof colorPickerColor === 'string' ? colorPickerColor : '#FFFFFF' }} />
											</ToggleButton>
										</ToggleButtonGroup>
										<FontSelector selectedFont={fontFamily} onSelectFont={setFontFamily} />
										<Popover
											open={colorPickerShowing}
											anchorEl={colorPicker.current}
											onClose={() => setColorPickerShowing(false)}
											id="colorPicker"
											anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
											transformOrigin={{ vertical: 'top', horizontal: 'center' }}
										>
											<div>
												<TwitterPickerWrapper
													onChangeComplete={(c: any) => changeColor(c)}
													color={colorPickerColor}
													colors={[ '#FFFFFF', '#FFFF00', '#000000', '#FF4136', '#2ECC40', '#0052CC', '#FF851B', '#B10DC9', '#39CCCC', '#F012BE' ]}
													width="280px"
												/>
											</div>
										</Popover>
									</Box>
								)}

								{loading ? (
									<Skeleton variant='text' height={150} width={'max(100px, 50%)'} />
								) : (
									<>
										<Stack direction='row' spacing={1} alignItems='center'>
											<Stack direction='row' alignItems='center' sx={{ width: '100%' }}>
												<TextField
													multiline
													minRows={2}
													fullWidth
													variant="outlined"
													size="small"
													placeholder="Type a caption..."
													value={loadedSubtitle}
													onMouseDown={() => { setShowText(true); setSubtitleUserInteracted(true); }}
													onChange={(e) => setLoadedSubtitle(e.target.value)}
													onFocus={() => { setTextFieldFocused(true); setSubtitleUserInteracted(true); }}
													onBlur={() => setTextFieldFocused(false)}
													InputProps={{
														style: { fontWeight: isBold ? 'bold' : 'normal', fontStyle: isItalic ? 'italic' : 'normal', fontFamily },
													}}
													inputProps={{ style: { textTransform: isLowercaseFont ? 'lowercase' : 'none' } }}
													sx={{
														'& .MuiOutlinedInput-root': {
															backgroundColor: 'white', color: 'black',
															'& fieldset': { borderColor: 'rgba(0, 0, 0, 0.23)' },
															'&:hover fieldset': { borderColor: 'rgba(0, 0, 0, 0.87)' },
															'&.Mui-focused fieldset': { borderColor: 'primary.main' },
														},
														'& .MuiInputBase-input': { color: 'black' },
													}}
													inputRef={textFieldRef}
												/>
											</Stack>
										</Stack>

										{showText && loadedSubtitle?.trim() !== '' && (
											<Button size="medium" fullWidth variant="contained" onClick={handleClearCaption} sx={{ mt: 2, backgroundColor: '#f44336', '&:hover': { backgroundColor: '#d32f2f' } }} startIcon={<Close />}>
												Clear Caption
											</Button>
										)}

										{textFieldFocused && user?.userDetails?.subscriptionStatus !== 'active' && (
											<Box sx={{ mt: 2 }}><FixedMobileBannerAd /></Box>
										)}

										{showText && (
											<>
												<FormControl fullWidth variant="outlined" sx={{ mt: 2, border: '1px solid rgba(191, 191, 191, 0.57)', borderRadius: '8px', py: 1, px: 2 }}>
													<FormLabel sx={{ fontSize: '0.875rem', fontWeight: 'bold', mb: 1, textAlign: 'center' }}>Bottom Margin</FormLabel>
													<Stack spacing={2} direction="row" p={0} alignItems={'center'}>
														<Slider
															size="small"
															defaultValue={1}
															min={1}
															max={10}
															step={0.2}
															value={fontBottomMarginScaleFactor}
															onChange={(e, newValue) => { if ((e as any).type === 'mousedown') return; setFontBottomMarginScaleFactor(newValue as number); }}
															onChangeCommitted={() => updateCanvas()}
															marks
															valueLabelFormat='Bottom Margin'
															valueLabelDisplay="auto"
															onMouseDown={() => setShowText(true)}
															onTouchStart={() => setShowText(true)}
														/>
													</Stack>
												</FormControl>

												<FormControl fullWidth variant="outlined" sx={{ mt: 2, border: '1px solid rgba(191, 191, 191, 0.57)', borderRadius: '8px', py: 1, px: 2 }}>
													<FormLabel sx={{ fontSize: '0.875rem', fontWeight: 'bold', mb: 1, textAlign: 'center' }}>Font Size</FormLabel>
													<Stack spacing={2} direction="row" p={0} alignItems={'center'}>
														<Slider
															size="small"
															defaultValue={25}
															min={0.25}
															max={50}
															step={1}
															value={fontSizeScaleFactor * 25}
															onChange={(e, newValue) => { if ((e as any).type === 'mousedown') return; setFontSizeScaleFactor((newValue as number) / 25); }}
															onChangeCommitted={() => updateCanvas()}
															marks
															valueLabelFormat='Font Size'
															valueLabelDisplay="auto"
															onMouseDown={() => setShowText(true)}
															onTouchStart={() => setShowText(true)}
														/>
													</Stack>
												</FormControl>

												<FormControl fullWidth variant="outlined" sx={{ mt: 2, border: '1px solid rgba(191, 191, 191, 0.57)', borderRadius: '8px', py: 1, px: 2 }}>
													<FormLabel sx={{ fontSize: '0.875rem', fontWeight: 'bold', mb: 1, textAlign: 'center' }}>Line Height</FormLabel>
													<Stack spacing={2} direction="row" p={0} alignItems={'center'}>
														<Slider
															size="small"
															defaultValue={1}
															min={1}
															max={5}
															step={0.2}
															value={fontLineHeightScaleFactor}
															onChange={(e, newValue) => { if ((e as any).type === 'mousedown') return; setFontLineHeightScaleFactor(newValue as number); }}
															onChangeCommitted={() => updateCanvas()}
															valueLabelFormat='Line Height'
															valueLabelDisplay="auto"
															onMouseDown={() => setShowText(true)}
															onTouchStart={() => setShowText(true)}
															marks
														/>
													</Stack>
												</FormControl>
											</>
										)}
									</>
								)}
							</Box>
						</Grid>

						<Grid item xs={12} md={6}>
							<Card sx={{ mt: 0, background: alpha(theme.palette.background.paper, 0.85), border: `1px solid ${alpha(theme.palette.divider, 0.12)}`, backdropFilter: 'blur(10px)' }}>
								<Box sx={{ px: 1.5 }} onClick={() => setSubtitlesExpanded(!subtitlesExpanded)}>
									<Typography marginRight="auto" fontWeight="bold" color="#CACACA" fontSize={14.8} sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
										{subtitlesExpanded ? (<Close sx={{ mr: 1 }} />) : (<Menu sx={{ mr: 1 }} />)}
										{subtitlesExpanded ? 'Hide' : 'View'} Nearby Subtitles
									</Typography>
								</Box>
								{subtitlesExpanded && (
									<Box sx={{ py: 0, px: 0 }}>
										<List sx={{ p: '.5em 0' }}>
											{surroundingSubtitles?.map((result: any) => (
												<ListItem key={result?.id} disablePadding sx={{ p: '0 0 .6em 0' }}>
													<ListItemIcon sx={{ pl: 0 }}>
														<Fab size="small" sx={{ backgroundColor: theme.palette.background.paper, boxShadow: 'none', ml: '5px', '&:hover': { xs: { backgroundColor: 'inherit' }, md: { backgroundColor: 'ButtonHighlight' } } }} onClick={() => navigate(`/frame/${cid}/${season}/${episode}/${result?.frame}${searchQuery ? `?searchTerm=${searchQuery}` : ''}`)}>
															{loading ? (<CircularProgress size={20} sx={{ color: '#565656' }} />) : (
																(result?.subtitle?.replace(/\n/g, ' ') === frameData?.subtitle?.replace(/\n/g, ' ')) ? (
																	<GpsFixed sx={{ color: 'rgb(202,202,202)', cursor: 'pointer' }} />
																) : (
																	<GpsNotFixed sx={{ color: 'rgb(89, 89, 89)', cursor: 'pointer' }} />
																)
															)}
														</Fab>
													</ListItemIcon>
													<ListItemText sx={{ color: 'rgb(173, 173, 173)' }}>
														<Typography component="p" variant="body2" color={(result?.subtitle?.replace(/\n/g, ' ') === frameData?.subtitle?.replace(/\n/g, ' ')) ? 'rgb(202, 202, 202)' : ''} fontWeight={(result?.subtitle?.replace(/\n/g, ' ') === frameData?.subtitle?.replace(/\n/g, ' ')) ? 700 : 400}>
															{result?.subtitle?.replace(/\n/g, ' ')}
														</Typography>
													</ListItemText>
													<ListItemIcon sx={{ pr: 0, ml: 'auto' }}>
														<Fab size="small" sx={{ backgroundColor: theme.palette.background.paper, boxShadow: 'none', mr: '2px', '&:hover': { xs: { backgroundColor: 'inherit' }, md: { backgroundColor: 'ButtonHighlight' } } }} onClick={() => { navigator.clipboard.writeText(result?.subtitle.replace(/\n/g, ' ')); handleSnackbarOpen(); }}>
															<ContentCopy sx={{ color: 'rgb(89, 89, 89)' }} />
														</Fab>
													</ListItemIcon>
												</ListItem>
											))}
										</List>
									</Box>
								)}
							</Card>
						</Grid>

						<Grid item xs={12}>
							<Typography variant="h6">Surrounding Frames</Typography>
							<Grid container spacing={2} mt={0}>
								{surroundingFrames.filter((f, idx, self) => {
									const identifier = `${(f as any)?.cid}-${(f as any)?.season}-${(f as any)?.episode}-${(f as any)?.frame}`;
									return (self.findIndex(ff => `${(ff as any)?.cid}-${(ff as any)?.season}-${(ff as any)?.episode}-${(ff as any)?.frame}` === identifier) === idx) || f === 'loading';
								}).map((surroundingFrame, index) => (
									<Grid item xs={4} sm={4} md={12 / 9} key={`surrounding-frame-${index}`}>
										{surroundingFrame !== 'loading' ? (
											<Box component="div" sx={{ textDecoration: 'none' }}>
												<StyledCard sx={{ cursor: (parseInt(frame as string, 10) === (surroundingFrame as any).frame) ? 'default' : 'pointer', border: (parseInt(frame as string, 10) === (surroundingFrame as any).frame) ? `2px solid ${alpha(theme.palette.warning.main, 0.6)}` : undefined }}>
																											<StyledCardMedia
															alt={`${(surroundingFrame as any).frame}`}
															src={`${(surroundingFrame as any).frameImage}`}
															title={(surroundingFrame as any).subtitle || 'No subtitle'}
															onClick={() => navigate(`/frame/${cid}/${season}/${episode}/${(surroundingFrame as any).frame}${searchQuery ? `?searchTerm=${searchQuery}` : ''}`)}
															onLoad={() => handleImageLoad((surroundingFrame as any).frame)}
															onError={() => { console.error(`Failed to load image for frame ${(surroundingFrame as any).frame}`); handleImageLoad((surroundingFrame as any).frame); }}
															sx={{ display: imagesLoaded[String((surroundingFrame as any).frame)] ? 'block' : 'none' }}
														/>
{!imagesLoaded[String((surroundingFrame as any).frame)] && (
														<Skeleton variant='rounded' sx={{ width: '100%', height: 0, paddingTop: '56.25%' }} />
													)}
												</StyledCard>
											</Box>
										) : (
											<Skeleton variant='rounded' sx={{ width: '100%', height: 0, paddingTop: '56.25%' }} />
										)}
									</Grid>
								))}
							</Grid>

							<Grid item xs={12} mt={3}>
								<Button
									variant="contained"
									fullWidth
									href={`/episode/${cid}/${season}/${episode}/${Math.round(Number(frame) / 10) * 10}${searchQuery ? `?searchTerm=${searchQuery}` : ''}`}
									sx={{ color: '#e5e7eb', background: 'linear-gradient(45deg, #1f2937 30%, #374151 90%)', border: '1px solid rgba(255, 255, 255, 0.16)', '&:hover': { background: 'linear-gradient(45deg, #253042 30%, #3f4856 90%)', borderColor: 'rgba(255, 255, 255, 0.24)' } }}
								>
									View Episode
								</Button>
							</Grid>

							{user?.userDetails?.subscriptionStatus !== 'active' && (
								<Grid item xs={12} mt={2}>
									<center>
										<Box sx={{ maxWidth: '800px' }}>
											<FramePageBottomBannerAd />
										</Box>
									</center>
								</Grid>
							)}
														</Grid>

							</Grid>

								<Snackbar open={snackbarOpen} autoHideDuration={2000} onClose={handleSnackbarClose} message="Copied to clipboard!">
							<Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
								Copied to clipboard!
							</Alert>
						</Snackbar>

						<Snackbar open={librarySnackbarOpen} autoHideDuration={3000} onClose={handleLibrarySnackbarClose} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
							<Alert onClose={handleLibrarySnackbarClose} severity="success" sx={{ width: '100%' }}>
								Frame saved to library!
							</Alert>
						</Snackbar>

						{user?.userDetails?.subscriptionStatus !== 'active' && (
							<Grid item xs={12} mb={3}>
								<center>
									<Box>
										{isMobile ? <FixedMobileBannerAd /> : <HomePageBannerAd />}
										<RouterLink to="/pro" style={{ textDecoration: 'none' }}>
											<Typography variant="body2" textAlign="center" color="white" sx={{ mt: 1 }}>
												☝️ Remove ads with <span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>memeSRC Pro</span>
											</Typography>
										</RouterLink>
									</Box>
								</center>
							</Grid>
						)}
					</Container>
			</Box>
		</>
	);
}