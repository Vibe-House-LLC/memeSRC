import React, { useState, useEffect, useMemo } from 'react';
import { Grid, CircularProgress, Card, Chip } from '@mui/material';
import styled from '@emotion/styled';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import useSearchDetails from '../hooks/useSearchDetails';
import IpfsSearchBar from '../sections/search/ipfs-search-bar';

const StyledCircularProgress = styled(CircularProgress)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
`;

const StyledCard = styled(Card)`
  border: 3px solid transparent;
  box-sizing: border-box;
  position: relative;

  &:hover {
    border: 3px solid orange;
  }
`;

const StyledCardMediaContainer = styled.div`
  width: 100%;
  height: 0;
  padding-bottom: ${props => props.aspectRatio};
  overflow: hidden;
  position: relative;
  background-color: black;
`;

const StyledCardMedia = styled.img`
  width: 100%;
  height: 100%;
  position: absolute;
  object-fit: contain;
`;

const BottomCardCaption = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  ${props => props.theme.breakpoints.up("xs")} {
    font-size: clamp(1em, 1.5vw, 1.5em);
    }
  ${props => props.theme.breakpoints.up("md")} {
  font-size: clamp(1em, 1.5vw, 1.5em);
  }
  font-weight: 800;
  padding: 18px 10px;
  text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
`;

const BottomCardLabel = styled.div`
  position: absolute;
  top: 10px; // Adjust as needed
  left: 10px; // Adjust as needed
  padding: 3px 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${props => props.theme.palette.common.white};
  text-align: left;
`;

export default function SearchPage() {
  const params = useParams();
  const { show, setShow, searchQuery, setSearchQuery } = useSearchDetails();

  const [searchTerm, setSearchTerm] = useState(searchQuery || params.searchTerms);
  const [results, setResults] = useState(null);
  const [aspectRatio, setAspectRatio] = useState('56.25%'); // Default to 16:9 aspect ratio
  const memoizedAspectRatio = useMemo(() => aspectRatio, [aspectRatio]);


  /* ---------------------------- Image from Video -------------------------- */

  async function extractFramesFromVideo(videoUrl, frameRequirements) {
    console.log(`Starting to extract frames from: ${videoUrl}`); // Log the video URL being processed
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';
    await video.load();

    return Promise.all(frameRequirements.map(frameReq => 
      new Promise((resolve, reject) => {
        console.log(`Seeking to frame: ${frameReq.frameIndex / 10}`); // Log the frame being sought
        video.currentTime = frameReq.frameIndex / 10;
        video.addEventListener('seeked', function onSeeked() {
          console.log(`Frame seeked: ${frameReq.frameIndex / 10}`); // Log after successfully seeking to the frame
          video.removeEventListener('seeked', onSeeked);
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(blob => {
            const imageUrl = URL.createObjectURL(blob);
            console.log(`Frame captured: ${imageUrl}`); // Log the URL of the captured image
            resolve({
              subtitle: frameReq.subtitle,
              episode: frameReq.episode,
              season: frameReq.season,
              image: imageUrl
            });
          }, 'image/jpeg');
        }, { once: true });
      })
    ));
  }
  

  /* -------------------------------- New Stuff ------------------------------- */

  const [loadingCsv, setLoadingCsv] = useState(true);
  const [csvLines, setCsvLines] = useState();
  const [newResults, setNewResults] = useState();

  useEffect(() => {
    async function loadFile(cid, filename) {
      const url = `http://ipfs.davis.pub/ipfs/${cid}/_docs.csv`;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const text = await response.text();
        const lines = text.split("\n");
        const headers = lines[0].split(",").map((header) => header.trim());
        return lines.slice(1).map((line) => {
          const values = line.split(",").map((value) => value.trim());
          return headers.reduce((obj, header, index) => {
            obj[header] = values[index] ? values[index] : "";
            if (header === "subtitle_text" && obj[header]) {
              obj.base64_subtitle = obj[header]; // Store the base64 version
              obj[header] = atob(obj[header]); // Decode to regular text
            }
            return obj;
          }, {});
        });
      } catch (error) {
        console.error("Failed to load file:", error);
        return [];
      }
    }

    async function initialize(cid = null) {
      const selectedCid = cid
      if (!selectedCid) {
        alert("Please enter a valid CID.");
        return;
      }
      const filename = "1-1.csv";
      const lines = await loadFile(cid, filename);
      if (lines?.length > 0) {
        setLoadingCsv(false)
        setCsvLines(lines)
      } else {
        alert('error')
      }
    }

    initialize(params.cid);


  }, []);

  useEffect(() => {

    async function displayResults(results) {
      console.log(`Displaying results...`); // Initial log to indicate the start of the process
      const urlParamCid = params.cid;
  
      // Calculate frame requirements
      const frameRequirements = results.flatMap(result => {
        const startThumbnailIndex = Math.ceil(result.start_frame / 10);
        const endThumbnailIndex = Math.ceil(result.end_frame / 10);
        return Array.from({ length: endThumbnailIndex - startThumbnailIndex + 1 }, (_, i) => ({
          videoUrl: `http://ipfs.davis.pub/ipfs/${urlParamCid}/${result.season}/${result.episode}/${Math.floor((startThumbnailIndex + i) / 10)}.mp4`,
          frameIndex: (startThumbnailIndex + i) % 10 * 10,
          subtitle: result.subtitle_text,
          episode: result.episode,
          season: result.season
        }));
      }).slice(0, 50); // Limit to the first 50 frame requirements
  
      console.log(`Frame requirements calculated: ${frameRequirements.length}`); // Log the number of frame requirements
  
      // Group by MP4 file
      const groupedByVideoUrl = frameRequirements.reduce((acc, curr) => {
        (acc[curr.videoUrl] = acc[curr.videoUrl] || []).push(curr);
        return acc;
      }, {});
  
      const fetchPromises = Object.entries(groupedByVideoUrl).map(([videoUrl, frames]) => 
        extractFramesFromVideo(videoUrl, frames).catch(error => {
          console.error("Error processing video: ", error);
          return []; // Return an empty array in case of error
        })
      );
  
      Promise.all(fetchPromises).then((allFrames) => {
        const validFrames = allFrames.flat().filter(frame => frame !== null);
        console.log(`Frames processed: ${validFrames.length}`); // Log the number of valid frames processed
        setNewResults(validFrames); // Update state with the loaded frames
      }).catch(error => console.error("Error processing frames: ", error));
    }

    async function searchText() {
      setNewResults(null)
      const searchTerm = params.searchTerms
        .trim()
        .toLowerCase();
      if (searchTerm === "") {
        console.log("Search term is empty.");
        return;
      }

      const searchTerms = searchTerm.split(" ");
      let results = [];
      csvLines.forEach((line) => {
        let score = 0;
        if (line.subtitle_text.toLowerCase().includes(searchTerm)) {
          score += 10; // Higher score for the entire search term
        }
        searchTerms.forEach((term) => {
          if (line.subtitle_text.toLowerCase().includes(term)) {
            score += 1; // Increment score for each individual word match
          }
        });
        if (score > 0) {
          results.push({ ...line, score });
        }
      });

      // Sort results by score and limit to top 25
      results.sort((a, b) => b.score - a.score);
      results = results.slice(0, 25);

      displayResults(results);
    }


    if (!loadingCsv && csvLines) {
      searchText();
    }
  }, [loadingCsv, csvLines, params?.searchTerms]);

  return (
    <>
      <Helmet>
        <title>{`${searchTerm} • Search • memeSRC`}</title>
      </Helmet>
      <IpfsSearchBar />

      {loadingCsv ? <StyledCircularProgress /> : ''}

      {newResults && newResults.length > 0 ?
        <Grid container spacing={2} alignItems="stretch" paddingX={{ xs: 2, md: 6 }}>
          {newResults?.map((result) => (
            <Grid item xs={12} sm={6} md={3} key={result.fid}>
              <Link to={`/frame/${''}`} style={{ textDecoration: 'none' }}>
                <StyledCard>
                  <StyledCardMediaContainer aspectRatio={memoizedAspectRatio}>
                    <StyledCardMedia
                      component="img"
                      src={result.image}
                      alt={result.subtitle}
                      title={result.subtitle}
                    />
                  </StyledCardMediaContainer>
                  <BottomCardCaption>{result.subtitle}</BottomCardCaption>
                  <BottomCardLabel>
                    <Chip
                      size="small"
                      label={`S${result.season} E${result.episode}`}
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', color: 'white', fontWeight: 'bold' }}
                      sx={{
                        marginLeft: '5px',
                        '& .MuiChip-label': {
                          fontWeight: 'bold',
                        },
                      }}
                    />
                  </BottomCardLabel>
                </StyledCard>
              </Link>
            </Grid>
          ))}
        </Grid>
        :
        <StyledCircularProgress />
      }
    </>
  );
}
