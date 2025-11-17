import { Storage } from 'aws-amplify';
import { SeasonEpisodeSelection } from '../types/episodes';

function getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? (parts.pop() as string).toLowerCase() : '';
}

function getVideoDuration(videoUrl: string): Promise<number> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';

        video.onloadedmetadata = () => {
            resolve(video.duration);
        };

        video.onerror = () => {
            reject(new Error('Failed to load video metadata'));
        };

        // Set a timeout to avoid hanging
        setTimeout(() => {
            reject(new Error('Video metadata loading timeout'));
        }, 10000);

        video.src = videoUrl;
    });
}

/**
 * Get frame counts for each episode from a specific base path
 */
async function getEpisodeFrameCountsFromPath(basePath: string): Promise<Record<string, number>> {
    const episodeToClipKeys: Record<string, string[]> = {};

    try {
        const result = await Storage.list(basePath, {
            level: 'public',
            pageSize: 1000
        });

        const items = (result?.results || result || []) as any[];

        items.forEach((item: any) => {
            const key: string = item.key || '';
            const filename = key.split('/').pop() || '';
            const extension = getFileExtension(filename);

            if (extension === 'mp4') {
                // Expecting basePath/<season>/<episode>/<file>.mp4
                const relative = key.startsWith(basePath + '/') 
                    ? key.substring(basePath.length + 1) 
                    : key.replace(basePath, '').replace(/^\//, '');
                const parts = relative.split('/').filter(Boolean);
                
                if (parts.length >= 3) {
                    const seasonMatch = parts[0].match(/^(\d+)$/);
                    const episodeSegment = parts[1];

                    if (seasonMatch && episodeSegment) {
                        const seasonNum = parseInt(seasonMatch[1], 10);
                        const episodeId = episodeSegment;
                        const episodeKey = `S${seasonNum}E${episodeId}`;

                        if (!episodeToClipKeys[episodeKey]) {
                            episodeToClipKeys[episodeKey] = [];
                        }
                        episodeToClipKeys[episodeKey].push(key);
                    }
                }
            }
        });

        const episodeFrameCounts: Record<string, number> = {};

        for (const [episodeKey, clipKeys] of Object.entries(episodeToClipKeys)) {
            const sorted = clipKeys.sort((a, b) => {
                const aNum = parseInt(a.split('/').pop()?.replace(/\D/g, '') || '0');
                const bNum = parseInt(b.split('/').pop()?.replace(/\D/g, '') || '0');
                return aNum - bNum;
            });

            const clipCount = sorted.length;
            let episodeDurationSeconds = 0;

            if (clipCount === 1) {
                try {
                    const url = await Storage.get(sorted[0], { level: 'public', expires: 3600 });
                    episodeDurationSeconds = await getVideoDuration(url);
                } catch (err) {
                    console.warn(`Could not get duration for ${episodeKey}, assuming 25s`, err);
                    episodeDurationSeconds = 25;
                }
            } else if (clipCount > 1) {
                const firstKey = sorted[0];
                const lastKey = sorted[sorted.length - 1];
                const middleCount = clipCount - 2;
                
                // Middle clips are 25s each
                episodeDurationSeconds += middleCount * 25;
                
                // Get first clip duration
                try {
                    const firstUrl = await Storage.get(firstKey, { level: 'public', expires: 3600 });
                    episodeDurationSeconds += await getVideoDuration(firstUrl);
                } catch (err) {
                    console.warn(`Could not get first clip duration for ${episodeKey}, assuming 25s`, err);
                    episodeDurationSeconds += 25;
                }
                
                // Get last clip duration
                try {
                    const lastUrl = await Storage.get(lastKey, { level: 'public', expires: 3600 });
                    episodeDurationSeconds += await getVideoDuration(lastUrl);
                } catch (err) {
                    console.warn(`Could not get last clip duration for ${episodeKey}, assuming 25s`, err);
                    episodeDurationSeconds += 25;
                }
            }

            const frames = Math.round(episodeDurationSeconds * 10); // 10 fps
            episodeFrameCounts[episodeKey] = frames;
        }

        return episodeFrameCounts;
    } catch (error) {
        console.error(`Error listing or processing videos under ${basePath}`, error);
        return {};
    }
}

/**
 * Calculate hybrid frame count for existing aliases
 * Combines current counts from protected/src with replacements from protected/srcPending for selected episodes
 */
async function calculateHybridFrameCount(
    alias: string, 
    selectedEpisodes: SeasonEpisodeSelection[]
): Promise<number> {
    console.log('🔄 Calculating hybrid frame count for existing alias:', alias);
    console.log('📝 Selected episodes:', selectedEpisodes);
    
    const srcPath = `protected/src/${alias}`;
    const pendingPath = `protected/srcPending/${alias}`;

    // Build a set for quick lookup of selected episode keys
    const selectedKeys = new Set<string>(
        selectedEpisodes.map(({ season, episode }) => `S${season}E${episode}`)
    );

    console.log('🎯 Selected episode keys:', Array.from(selectedKeys));

    // Get current counts and pending counts
    const [srcCounts, pendingCounts] = await Promise.all([
        getEpisodeFrameCountsFromPath(srcPath),
        getEpisodeFrameCountsFromPath(pendingPath)
    ]);

    console.log('📊 Current src counts:', srcCounts);
    console.log('📊 Pending counts:', pendingCounts);

    // Start with current counts
    const finalCounts: Record<string, number> = { ...srcCounts };

    // Replace selected episodes with pending counts if available
    selectedKeys.forEach((key) => {
        if (pendingCounts[key] !== undefined) {
            console.log(`🔄 Replacing ${key}: ${finalCounts[key] || 0} → ${pendingCounts[key]}`);
            finalCounts[key] = pendingCounts[key];
        } else {
            console.log(`⚠️ No pending data found for selected episode ${key}`);
        }
    });

    // Add any net-new episodes only present in pending
    Object.entries(pendingCounts).forEach(([key, frames]) => {
        if (!(key in finalCounts)) {
            console.log(`➕ Adding new episode ${key}: ${frames} frames`);
            finalCounts[key] = frames;
        }
    });

    console.log('🎯 Final combined counts:', finalCounts);

    // Sum all frame counts
    const totalFrames = Object.values(finalCounts).reduce((sum, n) => sum + n, 0);
    console.log(`✅ Total hybrid frame count: ${totalFrames.toLocaleString()}`);
    
    return totalFrames;
}

/**
 * Calculate total frame count by inspecting MP4 clips across subfolders.
 * - Middle clips are assumed to be 25s each
 * - First and last clip durations are measured via metadata
 * - Total frames calculated at 10 fps
 * - For existing aliases: combines current counts from protected/src with replacements from protected/srcPending
 */
export async function calculateFrameCountFromSubfolders(
    selectedFileKey: string, 
    selectedEpisodes?: SeasonEpisodeSelection[]
): Promise<number> {
    console.log('🎬 Starting optimized frame count calculation...');

    if (!selectedFileKey) {
        console.log('❌ No selected file key provided');
        return 0;
    }

    try {
        // Check if this is an existing alias scenario (srcPending path with selected episodes)
        const isExistingAlias = selectedFileKey.includes('protected/srcPending/') && 
                               selectedEpisodes && 
                               selectedEpisodes.length > 0;

        if (isExistingAlias) {
            console.log('🔄 Existing alias detected with selected episodes. Using hybrid calculation...');
            // Extract alias from the path: protected/srcPending/alias/...
            const pathParts = selectedFileKey.split('/');
            const aliasIndex = pathParts.findIndex(part => part === 'srcPending') + 1;
            if (aliasIndex > 0 && aliasIndex < pathParts.length) {
                const alias = pathParts[aliasIndex];
                return await calculateHybridFrameCount(alias, selectedEpisodes);
            } else {
                console.warn('⚠️ Could not extract alias from srcPending path, falling back to standard calculation');
            }
        }

        // Standard calculation for new aliases or when no episodes selected
        console.log('📊 Using standard frame count calculation...');

        // Get the directory path from the JSON file key
        const keyParts = selectedFileKey.split('/');
        keyParts.pop(); // Remove filename
        const directoryPath = keyParts.join('/');

        console.log('🔍 Searching for MP4 files in directory:', directoryPath);

        // List all files in the directory and subdirectories
        const result: any = await Storage.list(directoryPath, {
            level: 'public',
            pageSize: 1000
        });

        const resultArray = (result?.results || result || []) as any[];
        console.log(`📂 Found ${resultArray.length} total files/folders`);

        // Group MP4 files by folder
        const folderGroups: { [folder: string]: string[] } = {};

        resultArray.forEach((item: any) => {
            const key = item.key || '';
            const filename = key.split('/').pop() || '';
            const extension = getFileExtension(filename);

            if (extension === 'mp4') {
                // Get the folder path (everything except the filename)
                const folderPath = key.substring(0, key.lastIndexOf('/'));

                if (!folderGroups[folderPath]) {
                    folderGroups[folderPath] = [];
                }
                folderGroups[folderPath].push(key);
                console.log('🎥 Found MP4:', key);
            }
        });

        if (Object.keys(folderGroups).length === 0) {
            console.log('❌ No MP4 files found');
            return 0;
        }

        console.log(`📁 Found MP4 files in ${Object.keys(folderGroups).length} folders`);

        let totalDuration = 0;
        let totalClips = 0;
        let lastClipsProcessed = 0;

        // Process each folder
        for (const [folderPath, mp4Files] of Object.entries(folderGroups)) {
            // Sort files numerically (assuming they're numbered)
            const sortedFiles = mp4Files.sort((a, b) => {
                const aNum = parseInt(a.split('/').pop()?.replace(/\D/g, '') || '0');
                const bNum = parseInt(b.split('/').pop()?.replace(/\D/g, '') || '0');
                return aNum - bNum;
            });

            const clipCount = sortedFiles.length;
            totalClips += clipCount;

            if (clipCount === 0) continue;

            console.log(`📁 ${folderPath}: ${clipCount} clips`);

            if (clipCount === 1) {
                // Only one clip - get its duration
                const singleClipKey = sortedFiles[0];
                try {
                    const videoUrl = await Storage.get(singleClipKey, {
                        level: 'public',
                        expires: 3600
                    });

                    const clipDuration = await getVideoDuration(videoUrl);
                    totalDuration += clipDuration;
                    lastClipsProcessed++;

                    console.log(`⏱️ Single clip ${singleClipKey}: ${clipDuration.toFixed(2)}s`);
                } catch (error) {
                    console.warn(`⚠️ Could not get duration for single clip ${singleClipKey}, assuming 25s:`, error);
                    totalDuration += 25; // Fallback to 25 seconds
                }
            } else {
                // Multiple clips - check first and last, assume 25s for middle ones
                const firstClipKey = sortedFiles[0];
                const lastClipKey = sortedFiles[sortedFiles.length - 1];
                const middleClipsCount = clipCount - 2; // Exclude first and last

                // Middle clips are 25 seconds each
                const middleClipsDuration = middleClipsCount * 25;
                totalDuration += middleClipsDuration;

                console.log(`⏱️ ${middleClipsCount} middle clips × 25s = ${middleClipsDuration}s`);

                // Get duration of the first clip (0.mp4)
                try {
                    const firstVideoUrl = await Storage.get(firstClipKey, {
                        level: 'public',
                        expires: 3600
                    });

                    const firstClipDuration = await getVideoDuration(firstVideoUrl);
                    totalDuration += firstClipDuration;
                    lastClipsProcessed++;

                    console.log(`⏱️ First clip ${firstClipKey}: ${firstClipDuration.toFixed(2)}s`);
                } catch (error) {
                    console.warn(`⚠️ Could not get duration for first clip ${firstClipKey}, assuming 25s:`, error);
                    totalDuration += 25; // Fallback to 25 seconds
                }

                // Get duration of the last clip
                try {
                    const lastVideoUrl = await Storage.get(lastClipKey, {
                        level: 'public',
                        expires: 3600
                    });

                    const lastClipDuration = await getVideoDuration(lastVideoUrl);
                    totalDuration += lastClipDuration;
                    lastClipsProcessed++;

                    console.log(`⏱️ Last clip ${lastClipKey}: ${lastClipDuration.toFixed(2)}s`);
                } catch (error) {
                    console.warn(`⚠️ Could not get duration for last clip ${lastClipKey}, assuming 25s:`, error);
                    totalDuration += 25; // Fallback to 25 seconds
                }
            }
        }

        // Calculate total frames (duration × 10 fps)
        const totalFrames = Math.round(totalDuration * 10);

        console.log(`✅ Processed ${totalClips} clips across ${Object.keys(folderGroups).length} folders`);
        console.log(`📊 ${totalClips - lastClipsProcessed} clips assumed 25s, ${lastClipsProcessed} edge clips measured`);
        console.log(`⏱️ Total duration: ${totalDuration.toFixed(2)} seconds`);
        console.log(`🎞️ Total frame count: ${totalFrames.toLocaleString()} (${totalDuration.toFixed(2)}s × 10 fps)`);

        return totalFrames;
    } catch (error) {
        console.error('❌ Error calculating frame count:', error);
        return 0;
    }
}
