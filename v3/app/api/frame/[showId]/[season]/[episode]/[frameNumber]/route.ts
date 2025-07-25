import { NextRequest, NextResponse } from 'next/server';

interface FrameData {
  subtitle: string;
  frameImage: string;
  showTitle?: string;
  fontFamily?: string;
}

// Helper function to convert frame to timecode (matching V2 logic)
function frameToTimeCode(frame: number, frameRate = 10) {
  const totalSeconds = frame / frameRate;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds - (hours * 3600)) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { showId: string; season: string; episode: string; frameNumber: string } }
) {
  const { showId, season, episode, frameNumber } = params;
  
  try {
    const targetFrame = parseInt(frameNumber, 10);
    const targetTimeCode = frameToTimeCode(targetFrame);
    
    console.log(`Looking for subtitle for frame ${targetFrame} (timecode: ${targetTimeCode}) in ${showId} S${season}E${episode}`);
    
    // Search for common words to get a larger sample of subtitle data
    const searchTerms = ['the', 'a', 'and', 'is', 'to', 'of', 'in', 'it', 'you', 'that', 'he', 'was', 'for', 'on', 'are', 'as', 'with', 'his', 'they', 'i', 'what', 'have', 'we', 'can', 'do', 'get', 'go', 'see', 'know'];
    let bestMatch: any = null;
    let allSubtitles: any[] = [];
    
    // Collect subtitle data from multiple searches to get better coverage
    for (const searchTerm of searchTerms.slice(0, 5)) { // Limit to first 5 terms for performance
      const searchApiUrl = `https://v2-beta.memesrc.com/search/${showId}/${encodeURIComponent(searchTerm)}`;
      
      try {
        const searchResponse = await fetch(searchApiUrl);
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          
          // Filter results for the correct season and episode
          const episodeSubtitles = searchData.results?.filter((result: any) => 
            result.season === season && result.episode === episode
          ) || [];
          
          allSubtitles.push(...episodeSubtitles);
        }
      } catch (searchError) {
        console.log(`Search failed for term "${searchTerm}":`, searchError);
        continue;
      }
    }
    
    // Remove duplicates based on start_frame and end_frame
    const uniqueSubtitles = allSubtitles.filter((subtitle, index, self) =>
      index === self.findIndex(s => 
        s.start_frame === subtitle.start_frame && 
        s.end_frame === subtitle.end_frame &&
        s.season === subtitle.season &&
        s.episode === subtitle.episode
      )
    );
    
    console.log(`Found ${uniqueSubtitles.length} unique subtitles for S${season}E${episode}`);
    
    // Find the subtitle that contains our target frame
    bestMatch = uniqueSubtitles.find((result: any) => {
      const startFrame = parseInt(result.start_frame, 10);
      const endFrame = parseInt(result.end_frame, 10);
      return targetFrame >= startFrame && targetFrame <= endFrame;
    });
    
    // If no exact match, find the closest subtitle by time
    if (!bestMatch && uniqueSubtitles.length > 0) {
      let closestDistance = Infinity;
      
      uniqueSubtitles.forEach((result: any) => {
        const startFrame = parseInt(result.start_frame, 10);
        const endFrame = parseInt(result.end_frame, 10);
        const midFrame = Math.floor((startFrame + endFrame) / 2);
        const distance = Math.abs(targetFrame - midFrame);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          bestMatch = result;
        }
      });
      
      console.log(`No exact match found. Using closest subtitle (distance: ${closestDistance} frames)`);
    }
    
    let subtitle = '';
    
    if (bestMatch) {
      const startFrame = parseInt(bestMatch.start_frame, 10);
      const endFrame = parseInt(bestMatch.end_frame, 10);
      const startTime = frameToTimeCode(startFrame);
      const endTime = frameToTimeCode(endFrame);
      
      console.log(`Found subtitle: frames ${startFrame}-${endFrame} (${startTime}-${endTime})`);
      
      // Handle subtitle text decoding
      try {
        // Try base64 decoding first
        if (bestMatch.subtitle_text && 
            bestMatch.subtitle_text.length > 0 && 
            /^[A-Za-z0-9+/]*={0,2}$/.test(bestMatch.subtitle_text)) {
          const decodedSubtitle = Buffer.from(bestMatch.subtitle_text, 'base64').toString('utf-8');
          // Validate decoded text
          if (decodedSubtitle && decodedSubtitle.length > 0 && !/[\x00-\x08\x0E-\x1F\x7F-\x9F]/.test(decodedSubtitle)) {
            subtitle = decodedSubtitle;
            console.log(`Decoded subtitle: "${subtitle}"`);
          } else {
            throw new Error('Decoded text appears invalid');
          }
        } else {
          throw new Error('Text does not appear to be base64');
        }
      } catch (decodeError) {
        // Use subtitle text directly if base64 decoding fails
        subtitle = bestMatch.subtitle_text || '';
        console.log(`Using subtitle directly: "${subtitle}"`);
      }
    } else {
      console.log(`No subtitle found for frame ${targetFrame}`);
    }
    
    const frameData: FrameData = {
      subtitle: subtitle,
      frameImage: `https://v2-beta.memesrc.com/frame/${showId}/${season}/${episode}/${frameNumber}`,
      showTitle: showId,
      fontFamily: 'Arial'
    };
    
    console.log(`Returning frame data for frame ${targetFrame}:`, frameData);
    return NextResponse.json(frameData);
    
  } catch (error) {
    console.error('Error fetching frame data:', error);
    
    // Return default frame data on error
    const frameData: FrameData = {
      subtitle: '',
      frameImage: `https://v2-beta.memesrc.com/frame/${showId}/${season}/${episode}/${frameNumber}`,
      showTitle: showId,
      fontFamily: 'Arial'
    };
    
    return NextResponse.json(frameData);
  }
} 