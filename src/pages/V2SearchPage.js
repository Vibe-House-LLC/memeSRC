import React, { useState, useEffect, useRef } from 'react';
import { Grid, CircularProgress, Card, Chip, Typography, Button, Collapse, IconButton, FormControlLabel, Switch } from '@mui/material';
import styled from '@emotion/styled';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import JSZip from 'jszip';
import { ReportProblem, Settings } from '@mui/icons-material';
import useSearchDetails from '../hooks/useSearchDetails';
import IpfsSearchBar from '../sections/search/ipfs-search-bar';
import useSearchDetailsV2 from '../hooks/useSearchDetailsV2';
import getV2Metadata from '../utils/getV2Metadata';

const AutoplaySettingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #37383a;
  padding: 10px 20px;
  border-radius: 8px;
  margin: 20px;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);
  color: #fff;
`;

const SettingsButton = styled(IconButton)`
  position: absolute;
  top: 10px;
  right: 10px;
  color: #fff;
  z-index: 1;
`;

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
  margin: 0 20px 20px 20px;
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
  font-size: 30px;
  font-weight: bold;
  margin-bottom: 10px;
  color: #fff;
  position: relative;
  z-index: 1;
`;

const UpgradedIndexSubtext = styled(Typography)`
  font-size: 16px;
  font-weight: 600;
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

  const [loadingCsv, setLoadingCsv] = useState(true);
  const [csvLines, setCsvLines] = useState();
  const [displayedResults, setDisplayedResults] = useState(4);
  const [newResults, setNewResults] = useState();
  const { showObj, setShowObj, cid } = useSearchDetailsV2();
  const [loadingResults, setLoadingResults] = useState(true);
  const [videoUrls, setVideoUrls] = useState({});
  const [showBanner, setShowBanner] = useState(true);

  const [autoplay, setAutoplay] = useState(true);
  const [showSettings, setShowSettings] = useState(true);

  const handleAutoplayChange = (event) => {
    const isAutoplayEnabled = event.target.checked;
    setAutoplay(isAutoplayEnabled);

    videoRefs.current.forEach(video => {
      if (isAutoplayEnabled && video.getBoundingClientRect().top < window.innerHeight) {
        video.play();
      } else {
        video.pause();
      }
    });
  };

  const videoRefs = useRef([]);

  const addVideoRef = (element) => {
    if (element && !videoRefs.current.includes(element)) {
      videoRefs.current.push(element);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            if (autoplay) {
              entry.target.play();
            }
          } else {
            entry.target.pause();
          }
        });
      },
      {
        rootMargin: '0px',
        threshold: 0.1
      }
    );

    videoRefs.current.forEach(video => observer.observe(video));

    return () => {
      videoRefs.current.forEach(video => observer.unobserve(video));
    };
  }, [newResults, autoplay]);

  const checkBannerDismissed = (selectedCid) => {
    const dismissedBanner = sessionStorage.getItem(`dismissedBanner_${selectedCid}`);
    if (dismissedBanner) {
      setShowBanner(false);
    } else {
      setShowBanner(true);
    }
  };

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
              obj.base64_subtitle = obj[header];
              obj[header] = atob(obj[header]);
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
      const selectedCid = cid;
      if (!selectedCid) {
        alert("Please enter a valid CID.");
        return;
      }
      const filename = "1-1.csv";
      const lines = await loadFile(cid, filename);
      if (lines?.length > 0) {
        const decodedLines = lines.map(line => ({
          ...line,
          subtitle: line.base64_subtitle ? atob(line.base64_subtitle) : ""
        }));
        setLoadingCsv(false);
        setShowObj(decodedLines);

        checkBannerDismissed(selectedCid);
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

  useEffect(() => {
    if (cid) {
      checkBannerDismissed(cid);
    }
  }, [cid]);

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
      setNewResults(null);
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
          score += 10;
        }
        searchTerms.forEach((term) => {
          if (line.subtitle_text.toLowerCase().includes(term)) {
            score += 1;
          }
        });
        if (score > 0) {
          results.push({ ...line, score });
        }
      });
  
      results.sort((a, b) => b.score - a.score);
      results = results.slice(0, 150);
  
      const metadataCid = (await getV2Metadata(params.cid)).id;
  
      setNewResults(results);
      setLoadingResults(false);
  
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
  }, [loadingCsv, showObj, params?.searchTerms, cid]);

  useEffect(() => {
    console.log(newResults);
  }, [newResults]);

  return (
    <>
      <Collapse in={showBanner}>
        <UpgradedIndexBanner>
          <UpgradedIndexText>Upgraded!</UpgradedIndexText>
          <UpgradedIndexSubtext>
            You're testing '{cid}' on the new data model.{' '}
            <a href="https://forms.gle/8CETtVbwYoUmxqbi7" target="_blank" rel="noopener noreferrer">
              Report&nbsp;a&nbsp;problem
            </a>.
          </UpgradedIndexSubtext>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <DismissButton variant="contained" onClick={() => {
              setShowBanner(false);
              sessionStorage.setItem(`dismissedBanner_${cid}`, true);
            }}>
              Sounds good
            </DismissButton>
            <Button
              variant="contained"
              component={Link}
              to={`/search/${cid}/${params?.searchTerms}`}
              style={{
                marginTop: '15px',
                borderRadius: '20px',
                padding: '6px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                color: '#000',
                position: 'relative',
                zIndex: 1,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                },
              }}
            >
              Switch back
            </Button>
          </div>
        </UpgradedIndexBanner>
      </Collapse>
      {!showBanner && (
        <ReportProblemButton color="primary" onClick={() => {
          setShowBanner(true);
          sessionStorage.removeItem(`dismissedBanner_${cid}`);
        }}>
          <ReportProblem />
        </ReportProblemButton>
      )}
      {/* <Collapse in={showSettings}>
        <AutoplaySettingContainer>
          <FormControlLabel
            control={<Switch checked={autoplay} onChange={handleAutoplayChange} />}
            label="Animated Thumbnails"
          />
        </AutoplaySettingContainer>
      </Collapse>
      {!showSettings && (
        <SettingsButton color="primary" onClick={() => setShowSettings(true)}>
          <Settings />
        </SettingsButton>
      )} */}
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
                          autoPlay={autoplay}
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
                onClick={() => setDisplayedResults(displayedResults + 4)}
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
