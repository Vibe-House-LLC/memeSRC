import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { API } from 'aws-amplify';
import { Grid, CircularProgress, Card, Chip } from '@mui/material';
import styled from '@emotion/styled';
import { useNavigate, useParams } from 'react-router-dom';
import TopBannerSearch from '../sections/search/TopBannerSearch';

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

const StyledCardMedia = styled.img`
  width: 100%;
  height: auto;
  background-color: black;
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

  const [searchTerm, setSearchTerm] = useState(params.searchTerms);
  const [seriesTitle, setSeriesTitle] = useState(params.seriesId);
  const [loadedSearchTerm, setLoadedSearchTerm] = useState(null);
  const [loadedSeriesTitle, setLoadedSeriesTitle] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  const memoizedResults = useMemo(() => results, [results]);

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
    if (params) {
      console.log(`'${params.seriesId}' !== '${loadedSeriesTitle}' || '${params.searchTerms}' !== '${loadedSearchTerm}'`)
      if (params.seriesId !== loadedSeriesTitle || params.searchTerms !== loadedSearchTerm) {
        setSearchTerm(params.searchTerms)
        setSeriesTitle(params.seriesId)
        console.log(params)
        setLoading(true);
        // TODO: switch to using amplify to access the publicapi
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
              console.log(data)
              setResults(data);
              setLoading(false);
              setLoadedSearchTerm(searchTerm);
              setLoadedSeriesTitle(seriesTitle);
            })
            .catch(error => {
              console.error(error);
              setLoading(false);
            });
        })
      }
    }
  }, [params, searchTerm, seriesTitle, loadedSeriesTitle, loadedSearchTerm])

  const handleSearch = useCallback((e) => {
    if (e) {
      e.preventDefault();
    }
    const encodedSearchTerms = encodeURI(searchTerm)
    console.log(`Navigating to: '${`/search/${seriesTitle}/${encodedSearchTerms}`}'`)
    navigate(`/search/${seriesTitle}/${encodedSearchTerms}`)
  }, [seriesTitle, searchTerm, navigate]);

  return (
    <>
      {(memoizedResults || loading) && <TopBannerSearch searchFunction={handleSearch} setSearchTerm={setSearchTerm} setSeriesTitle={setSeriesTitle} searchTerm={searchTerm} seriesTitle={seriesTitle} loading={loading} />}
      <Grid container spacing={2} alignItems='stretch' paddingX={{ xs: 2, md: 6 }}>
        {loading ? (
          <StyledCircularProgress />
        ) : memoizedResults && memoizedResults.map(result => (
          <Grid item xs={12} sm={6} md={3} key={result.fid}>
            <a href={`/frame/${result.fid}?search=${encodeURI(searchTerm)}`} style={{ textDecoration: 'none' }}>
              <StyledCard>
                <StyledCardMedia
                  component="img"
                  src={`https://memesrc.com${result.frame_image}`}
                  alt={result.subtitle}
                  title={result.subtitle} />
                <BottomCardCaption>
                  {result.subtitle}
                </BottomCardCaption>
                <BottomCardLabel>
                <Chip
                    size='small'
                    label={result.series_name}
                    style={{ backgroundColor: 'white', color: 'black', fontWeight: 'bold' }}
                    sx={{
                      "& .MuiChip-label": {
                        fontWeight: 'bold',
                      },
                    }}
                  />
                  <Chip
                    size='small'
                    label={`S${result.season_number} E${result.episode_number}`}
                    sx={{
                      marginLeft: '5px', // Adjust as needed for space between chips
                      "& .MuiChip-label": {
                        fontWeight: 'bold',
                      },
                    }}
                  />
                </BottomCardLabel>
              </StyledCard>
            </a>
          </Grid>
        ))}
      </Grid>
    </>
  );
}