import React, { useState, useEffect } from 'react';
import { Grid, CircularProgress, Card, Chip } from '@mui/material';
import styled from '@emotion/styled';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
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
  const [results, setResults] = useState(null);
  const [aspectRatio, setAspectRatio] = useState('56.25%'); // Default to 16:9 aspect ratio

  /* -------------------------------- New Stuff ------------------------------- */

  const [loadingCsv, setLoadingCsv] = useState(true);
  const [csvLines, setCsvLines] = useState();
  const [newResults, setNewResults] = useState();
  const { showObj, setShowObj, cid } = useSearchDetailsV2();

  useEffect(() => {
    async function loadFile(cid, filename) {
      const url = `http://ipfs.memesrc.com/ipfs/${cid}/_docs.csv`;
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

      // Sort results by score and limit to top 5
      results.sort((a, b) => b.score - a.score);
      results = results.slice(0, 5);

      // Directly use the video URL for autoplay videos
      const videoResults = results.map(result => ({
        ...result,
        videoUrl: `http://ipfs.memesrc.com/ipfs/${params.cid}/${result.season}/${result.episode}/s${parseInt(result.subtitle_index, 10)+1}.mp4` // Adjust the URL pattern as needed
      }));

      setNewResults(videoResults); // Update state with the video URLs
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
      <Helmet>
        <title>{`Search • memeSRC`}</title>
      </Helmet>

      {loadingCsv ? <StyledCircularProgress /> : ''}

      {newResults && newResults.length > 0 ?
        <Grid container spacing={2} alignItems="stretch" paddingX={{ xs: 2, md: 6 }}>
          {newResults.map((result, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Link to={`/v2/frame/${cid}/${result.subtitle_index}`} style={{ textDecoration: 'none' }}>
              <StyledCard>
                <StyledCardMediaContainer aspectRatio="56.25%">
                  <StyledCardMedia
                    component="video"
                    src={result.videoUrl}
                    autoPlay
                    loop
                    muted
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
        <StyledCircularProgress />
      }
    </>
  );
}
