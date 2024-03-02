import React, { useState, useEffect, useRef } from 'react';
import { Grid, CircularProgress, Card, Chip, Typography } from '@mui/material';
import styled from '@emotion/styled';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import JSZip from 'jszip';
import useSearchDetails from '../hooks/useSearchDetails';
import IpfsSearchBar from '../sections/search/ipfs-search-bar';
import useSearchDetailsV2 from '../hooks/useSearchDetailsV2';

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

const StyledCardMedia = styled.video`
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
  top: 10px;
  left: 10px;
  padding: 3px 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${props => props.theme.palette.common.white};
  text-align: left;
`;

export default function SearchPage() {
  const params = useParams();

  /* -------------------------------- New Stuff ------------------------------- */

  const [loadingCsv, setLoadingCsv] = useState(true);
  const [csvLines, setCsvLines] = useState();
  const [newResults, setNewResults] = useState();
  const { showObj, setShowObj, cid } = useSearchDetailsV2();
  const [loadingResults, setLoadingResults] = useState(true);

  // Ref to keep track of video elements
  const videoRefs = useRef([]);

  // Add videos to the refs array
  const addVideoRef = (element) => {
    if (element && !videoRefs.current.includes(element)) {
      videoRefs.current.push(element);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          // If the video is in the viewport, play it, otherwise pause
          if (entry.isIntersecting) {
            entry.target.play();
          } else {
            entry.target.pause();
          }
        });
      },
      {
        // Use whatever root margin you see fit
        rootMargin: '0px',
        threshold: 0.1 // Adjust this threshold to when you want the callback to be executed
      }
    );

    // Observe each video
    videoRefs.current.forEach(video => observer.observe(video));

    // Cleanup function to unobserve videos when the component is unmounted or newResults change
    return () => {
      videoRefs.current.forEach(video => observer.unobserve(video));
    };
  }, [newResults]); // Depend on newResults so this runs whenever the results change

  useEffect(() => {
    async function loadFile(cid, filename) {
      const url = `https://ipfs.memesrc.com/ipfs/${cid}/_docs.csv`;
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
        // Decode base64 subtitle and assign to a new property
        const decodedLines = lines.map(line => ({
          ...line,
          subtitle: line.base64_subtitle ? atob(line.base64_subtitle) : "" // Ensure you decode the subtitle and assign it here
        }));
        setLoadingCsv(false);
        setShowObj(decodedLines); // Use decodedLines with subtitle property
      } else {
        alert('error');
      }
    }

    initialize(params.cid);


  }, []);

  useEffect(() => {
    async function searchText() {
      setNewResults(null); // Reset the current results state
      setLoadingResults(true)
      const searchTerm = params?.searchTerms.trim().toLowerCase();
      if (searchTerm === "") {
        console.log("Search term is empty.");
        return;
      }

      const searchTerms = searchTerm.split(" ");
      let results = [];
      showObj.forEach((line) => {
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

      results.sort((a, b) => b.score - a.score);
      results = results.slice(0, 10);

      // Load the ZIP file and extract the relevant video file
      try {
        const videoResultsPromises = results.map(async (result, index) => {
          const groupIndex = Math.floor((parseInt(result.subtitle_index, 10)) / 15);
          const zipUrl = `https://ipfs.memesrc.com/ipfs/${params.cid}/${result.season}/${result.episode}/s${groupIndex}.zip`;

          try {
            const zipResponse = await fetch(zipUrl);
            if (!zipResponse.ok) throw new Error(`Failed to fetch ZIP: ${zipResponse.statusText}`);
            const zipBlob = await zipResponse.blob();
            const zip = await JSZip.loadAsync(zipBlob);

            const videoPath = `s${parseInt(result.subtitle_index, 10)}.mp4`;
            const videoFile = zip.file(videoPath) ? await zip.file(videoPath).async("blob") : null;

            if (!videoFile) throw new Error(`File not found in ZIP: ${videoPath}`);

            // Create a new Blob with the correct MIME type
            const videoBlob = new Blob([videoFile], { type: 'video/mp4' });
            const videoUrl = URL.createObjectURL(videoBlob);

            console.log(`videoUrl for result ${index}:`, videoUrl); // Direct logging
            return { ...result, videoUrl };
          } catch (error) {
            console.error("Error loading or processing ZIP file for result:", JSON.stringify(result), error);
            return { ...result, videoUrl: "", error: error.toString() };
          }
        });

        const videoResults = await Promise.all(videoResultsPromises);
        console.log("videoResults with videoUrls:", videoResults); // Ensure logging here
        setNewResults(videoResults); // Update state with the video URLs
        setLoadingResults(false)
      } catch (error) {
        console.error("Error preparing video results:", error);
      }


    }

    if (!loadingCsv && showObj) {
      searchText();
    }
  }, [loadingCsv, showObj, params?.searchTerms]);


  useEffect(() => {
    console.log(newResults)
  }, [newResults]);

  return (
    <>
      {newResults && newResults.length > 0 ?
        <Grid container spacing={2} alignItems="stretch" paddingX={{ xs: 2, md: 6 }}>
          {newResults.map((result, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Link to={`/v2/frame/${cid}/${result.season}/${result.episode}/${Math.round((parseInt(result.start_frame, 10) + parseInt(result.end_frame, 10)) / 2)}`} style={{ textDecoration: 'none' }}>
                <StyledCard
                // onMouseEnter={(e) => {
                //   e.currentTarget.querySelector('video').play();
                // }}
                // onMouseLeave={(e) => {
                //   e.currentTarget.querySelector('video').pause();
                // }}
                // onTouchStart={(e) => {
                //   // Play the video for the current card
                //   const currentVideo = e.currentTarget.querySelector('video');
                //   currentVideo.play();

                //   // Pause all other videos
                //   videoRefs.current.forEach(video => {
                //     if (video !== currentVideo) {
                //       video.pause();
                //     }
                //   });
                // }}
                >

                  <StyledCardMediaContainer aspectRatio="56.25%">
                    <StyledCardMedia
                      ref={addVideoRef}
                      src={result.videoUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="auto"
                      onError={(e) => console.error("Error loading video:", JSON.stringify(result))}
                    />
                  </StyledCardMediaContainer>
                  <BottomCardCaption>{result.subtitle}</BottomCardCaption>
                  <BottomCardLabel>
                    <Chip
                      size="small"
                      label={`S${result.season} E${result.episode}`}
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', color: 'white', fontWeight: 'bold' }}
                    />
                  </BottomCardLabel>
                </StyledCard>
              </Link>
            </Grid>
          ))}
        </Grid>
        :
        <>
          {newResults?.length <= 0 && !loadingResults ?
            <Typography textAlign='center' fontSize={30} fontWeight={700} my={8}>
              No Results
            </Typography>
            :
            <StyledCircularProgress />
          }

        </>
      }
    </>
  );
}