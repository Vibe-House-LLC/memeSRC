import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { API } from 'aws-amplify';
import { Grid, CircularProgress, Card, Chip } from '@mui/material';
import styled from '@emotion/styled';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import TopBannerSearch from '../sections/search/TopBannerSearch';
import useSearchDetails from '../hooks/useSearchDetails';

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

const TopCardInfo = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background-color: rgb(0, 0, 0, 0.6);
  padding: 3px 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

const SeasonEpisodeText = styled.span`
  color: #919191;
  font-size: 0.8em;
`;

export default function SearchPage() {
  const params = useParams();
  const { show, setShow, searchQuery, setSearchQuery } = useSearchDetails();

  const [searchTerm, setSearchTerm] = useState(searchQuery || params.searchTerms);
  const [seriesTitle, setSeriesTitle] = useState(params.seriesId);
  const [loadedSearchTerm, setLoadedSearchTerm] = useState(null);
  const [loadedSeriesTitle, setLoadedSeriesTitle] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('56.25%'); // Default to 16:9 aspect ratio

  const memoizedResults = useMemo(() => results, [results]);
  const memoizedAspectRatio = useMemo(() => aspectRatio, [aspectRatio]);

  const navigate = useNavigate();

  const getSessionID = async () => {
    let sessionID;
    if ("sessionID" in sessionStorage) {
      sessionID = sessionStorage.getItem("sessionID");
      return Promise.resolve(sessionID);
    }
    return API.get('publicapi', '/uuid')
      .then(generatedSessionID => {
        sessionStorage.setItem("sessionID", generatedSessionID);
        return generatedSessionID;
      })
      .catch(err => {
        console.log(`UUID Gen Fetch Error:  ${err}`);
        throw err;
      });
  };

  useEffect(() => {
    if (params && !loading) {
      if (params.seriesId !== loadedSeriesTitle || searchQuery !== loadedSearchTerm) {
        setSearchTerm(searchQuery)
        setLoading(true);
        getSessionID().then(sessionId => {
          const apiName = 'publicapi';
          const path = '/search';
          const myInit = {
            queryStringParameters: {
              q: searchTerm,
              series: seriesTitle,
              sessionId
            }
          }
          API.get(apiName, path, myInit)
            .then(data => {
              setResults(data);
              setSeriesTitle(params.seriesId)
              setLoading(false);
              setLoadedSearchTerm(searchTerm);
              setLoadedSeriesTitle(seriesTitle);

              let maxAspectRatio = 0;
              data.forEach(item => {
                const img = new Image();
                img.src = `https://memesrc.com${item.frame_image}`;

                img.onload = function (event) {
                  const aspectRatio = event.target.width / event.target.height;
                  if (aspectRatio > maxAspectRatio) {
                    maxAspectRatio = aspectRatio;
                    setAspectRatio(`${100 / maxAspectRatio}%`); // Adjust the value to the max aspect ratio.
                  }
                }
              });
            })
            .catch(error => {
              console.error(error);
              setLoading(false);
            });
        })
      }
    }
  }, [params, searchTerm, seriesTitle, loadedSeriesTitle, loadedSearchTerm, loading])

  const handleSearch = useCallback((e) => {
    if (e) {
      e.preventDefault();
    }
    const encodedSearchTerms = encodeURI(searchTerm)
    setSearchQuery(searchTerm)
    navigate(`/search/${seriesTitle}/${encodedSearchTerms}`)
  }, [seriesTitle, searchTerm, navigate]);

  return (
    <>
      <Helmet>
        <title>{`${searchTerm} • Search • memeSRC`}</title>
      </Helmet>
      <TopBannerSearch
        searchFunction={handleSearch}
        setSearchTerm={setSearchTerm}
        setSeriesTitle={setSeriesTitle}
        searchTerm={searchTerm}
        seriesTitle={seriesTitle}
        resultsLoading={loading}
      />
      <Grid container spacing={2} alignItems="stretch" paddingX={{ xs: 2, md: 6 }}>
        {loading ? (
          <StyledCircularProgress />
        ) : (
          memoizedResults &&
          memoizedResults.map((result) => (
            <Grid item xs={12} sm={6} md={3} key={result.fid}>
              <Link to={`/frame/${result.fid}`} style={{ textDecoration: 'none' }}>
                <StyledCard>
                  <StyledCardMediaContainer aspectRatio={memoizedAspectRatio}>
                    <StyledCardMedia
                      component="img"
                      src={`https://memesrc.com${result.frame_image}`}
                      alt={result.subtitle}
                      title={result.subtitle}
                    />
                  </StyledCardMediaContainer>
                  <BottomCardCaption>{result.subtitle}</BottomCardCaption>
                  <BottomCardLabel>
                    <Chip
                      size="small"
                      label={result.series_name}
                      style={{ backgroundColor: 'white', color: 'black', fontWeight: 'bold' }}
                      sx={{
                        '& .MuiChip-label': {
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '110px',
                        },
                      }}
                    />
                    <Chip
                      size="small"
                      label={`S${result.season_number} E${result.episode_number}`}
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
          ))
        )}
      </Grid>
    </>
  );
}
