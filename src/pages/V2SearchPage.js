import React, { useState, useEffect, useRef } from 'react';
import { Grid, CircularProgress, Card, Chip, Typography, Button, Collapse, IconButton } from '@mui/material';
import styled from '@emotion/styled';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import JSZip from 'jszip';
import { ReportProblem } from '@mui/icons-material';
import useSearchDetails from '../hooks/useSearchDetails';
import IpfsSearchBar from '../sections/search/ipfs-search-bar';
import useSearchDetailsV2 from '../hooks/useSearchDetailsV2';
import getV2Metadata from '../utils/getV2Metadata';

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

const UpgradedIndexBanner = styled.div`
  background-image: url('https://api-prod-minimal-v510.vercel.app/assets/images/cover/cover_3.jpg');
  background-size: cover;
  background-position: center;
  padding: 40px 20px;
  text-align: center;
  position: relative;
  border-radius: 8px;
  margin: 20px;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 8px;
  }
`;

const UpgradedIndexText = styled(Typography)`
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 10px;
  color: #fff;
  position: relative;
  z-index: 1;
`;

const UpgradedIndexSubtext = styled(Typography)`
  font-size: 16px;
  font-weight: bold;
  color: #E2e2e3;
  position: relative;
  z-index: 1;
  margin-bottom: 10px;
  margin-left: 10px;
  margin-right: 10px;

  a {
    color: #f0f0f0;
    text-decoration: underline;

    &:hover {
      color: #fff;
    }
  }
`;

const DismissButton = styled(Button)`
  margin-top: 15px;
  border-radius: 20px;
  padding: 6px 16px;
  background-color: #fff;
  color: #000;
  position: relative;
  z-index: 1;

  &:hover {
    background-color: #eee;
  }
`;

const ReportProblemButton = styled(IconButton)`
  position: absolute;
  top: 10px;
  right: 10px;
  color: #fff;
  z-index: 1;
`;

export default function SearchPage() {
  const params = useParams();

  /* -------------------------------- New Stuff ------------------------------- */

  const [loadingCsv, setLoadingCsv] = useState(true);
  const [csvLines, setCsvLines] = useState();
  const [displayedResults, setDisplayedResults] = useState(8);
  const [newResults, setNewResults] = useState();
  const { showObj, setShowObj, cid } = useSearchDetailsV2();
  const [loadingResults, setLoadingResults] = useState(true);
  const [videoUrls, setVideoUrls] = useState({});
  const [showBanner, setShowBanner] = useState(true);

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
      const url = `https://memesrc.com/v2/${cid}/_docs.csv`;
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

    getV2Metadata(params.cid).then(metadata => {
      initialize(metadata.id);
    }).catch(error => {
      alert(error)
    })
  }, []);

  const loadVideoUrl = async (result, metadataCid) => {
    const groupIndex = Math.floor(parseInt(result.subtitle_index, 10) / 15);
    const zipUrl = `https://memesrc.com/v2/${metadataCid}/${result.season}/${result.episode}/s${groupIndex}.zip`;
  
    try {
      const zipResponse = await fetch(zipUrl);
      if (!zipResponse.ok) throw new Error(`Failed to fetch ZIP: ${zipResponse.statusText}`);
      const zipBlob = await zipResponse.blob();
      const zip = await JSZip.loadAsync(zipBlob);
  
      const videoPath = `s${parseInt(result.subtitle_index, 10)}.mp4`;
      const videoFile = zip.file(videoPath) ? await zip.file(videoPath).async("blob") : null;
  
      if (!videoFile) throw new Error(`File not found in ZIP: ${videoPath}`);
  
      const videoBlob = new Blob([videoFile], { type: 'video/mp4' });
      const videoUrl = URL.createObjectURL(videoBlob);
  
      setVideoUrls((prevVideoUrls) => ({ ...prevVideoUrls, [result.subtitle_index]: videoUrl }));
    } catch (error) {
      console.error("Error loading or processing ZIP file for result:", JSON.stringify(result), error);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const resultIndex = entry.target.getAttribute("data-result-index");
            if (resultIndex && !videoUrls[resultIndex]) {
              loadVideoUrl(newResults[resultIndex]);
            }
          }
        });
      },
      {
        rootMargin: "0px",
        threshold: 0.1,
      }
    );

    const resultElements = document.querySelectorAll(".result-item");
    resultElements.forEach((element) => observer.observe(element));

    return () => {
      resultElements.forEach((element) => observer.unobserve(element));
    };
  }, [newResults, videoUrls]);

  useEffect(() => {
    async function searchText() {
      setNewResults(null); // Reset the current results state
      setLoadingResults(true);
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
      results = results.slice(0, 150);
  
      // Get the metadataCid using getV2Metadata
      const metadataCid = (await getV2Metadata(params.cid)).id;
  
      setNewResults(results);
      setLoadingResults(false);
  
      // Pass metadataCid to the loadVideoUrl function
      results.forEach((result) => loadVideoUrl(result, metadataCid));
    }
  
    if (!loadingCsv && showObj) {
      if (params?.searchTerms) {
        searchText();
      } else {
        setLoadingResults(false);
        setNewResults([]);
      }
    }
  }, [loadingCsv, showObj, params?.searchTerms]);

  useEffect(() => {
    console.log(newResults);
  }, [newResults]);

  return (
    <>
      <Collapse in={showBanner}>
      <UpgradedIndexBanner>
        <UpgradedIndexText>Upgraded Index!</UpgradedIndexText>
        <UpgradedIndexSubtext>
          You're testing {JSON.stringify(cid)} on the new memeSRC V2 data model! {' '}
          <a href="https://forms.gle/8CETtVbwYoUmxqbi7" target="_blank" rel="noopener noreferrer">
            Submit&nbsp;feedback
          </a>.
        </UpgradedIndexSubtext>
        <DismissButton variant="contained" onClick={() => setShowBanner(false)}>
          Dismiss
        </DismissButton>
      </UpgradedIndexBanner>
      </Collapse>
      {!showBanner && (
        <ReportProblemButton color="primary" onClick={() => setShowBanner(true)}>
          <ReportProblem />
        </ReportProblemButton>
      )}
      {newResults && newResults.length > 0 ? (
        <>
          <Grid container spacing={2} alignItems="stretch" paddingX={{ xs: 2, md: 6 }}>
            {newResults.slice(0, displayedResults).map((result, index) => (
              <Grid item xs={12} sm={6} md={3} key={index} className="result-item" data-result-index={index}>
                <Link to={`/v2/frame/${cid}/${result.season}/${result.episode}/${Math.round((parseInt(result.start_frame, 10) + parseInt(result.end_frame, 10)) / 2)}`} style={{ textDecoration: 'none' }}>
                  <StyledCard>
                    <StyledCardMediaContainer aspectRatio="56.25%">
                      {videoUrls[result.subtitle_index] && (
                        <StyledCardMedia
                          ref={addVideoRef}
                          src={videoUrls[result.subtitle_index]}
                          autoPlay
                          loop
                          muted
                          playsInline
                          preload="auto"
                          onError={(e) => console.error("Error loading video:", JSON.stringify(result))}
                        />
                      )}
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
          {newResults.length > displayedResults && (
            <Grid item xs={12} textAlign="center" mt={4}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{
                  padding: '10px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  maxWidth: { xs: '90%', sm: '40%', md: '25%' },
                  margin: '0 auto',
                }}
                onClick={() => setDisplayedResults(displayedResults + 8)}
              >
                Load More
              </Button>
            </Grid>
          )}
        </>
      ) : (
        <>
          {newResults?.length <= 0 && !loadingResults ? (
            <Typography textAlign='center' fontSize={30} fontWeight={700} my={8}>
              No Results
            </Typography>
          ) : (
            <StyledCircularProgress />
          )}
        </>
      )}
    </>
  );
}
