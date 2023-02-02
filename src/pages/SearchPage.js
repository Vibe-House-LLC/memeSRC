import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Grid, CircularProgress, Card } from '@mui/material';
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

  &:hover img, &:active img, &:focus img{
    animation: bgmve 15s;
    animation-iteration-count: infinite;
    animation-timing-function: ease-in-out;
    }

  &:hover {
    border: 3px solid orange;
  }
`;

const StyledCardMedia = styled.img`
  width: 100%;
  height: 230px;
  aspect-ratio: '16/9';
  object-fit: cover;
  object-position: 100% 0;
  background-color: black;

  @keyframes bgmve {
    0% {object-position: 100% 0;}
    50% {object-position: 0 0;}
    100% {object-position: 100% 0;}
  }
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

const SeasonEpisodeText = styled.span`
  color: #919191;
  font-size: 0.8em;
`;

const StyledTypography = styled.p(({ theme }) => ({
  fontSize: '14px',
  color: theme.palette.text.secondary,
  padding: '10px 10px 10px 25px'
}));

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
    } else {
      await fetch(`https://api.memesrc.com/?uuidGen`)
        .then(response => {
          response.json()
            .then(generatedSessionID => {
              sessionStorage.setItem("sessionID", generatedSessionID);
              sessionID = generatedSessionID
            }).catch(err => console.log(`JSON Parse Error:  ${err}`));
        }).catch(err => console.log(`UUID Gen Fetch Error:  ${err}`));
    }
    return sessionID;
  }

  useEffect(() => {
    if (params) {
      console.log(`'${params.seriesId}' !== '${loadedSeriesTitle}' || '${params.searchTerms}' !== '${loadedSearchTerm}'`)
      if (params.seriesId !== loadedSeriesTitle || params.searchTerms !== loadedSearchTerm) {
        setSearchTerm(params.searchTerms)
        setSeriesTitle(params.seriesId)
        console.log(params)
        setLoading(true);
        let apiSearchUrl;
        if (seriesTitle && seriesTitle !== '_universal') {
          apiSearchUrl = `https://api.memesrc.com/?series=${seriesTitle}&search=${searchTerm}`;
        } else {
          apiSearchUrl = `https://api.memesrc.com/?search=${searchTerm}`;
        }

        getSessionID().then(sessionID => {
          fetch(`${apiSearchUrl}&sessionID=${sessionID}`)
            .then(response => response.json())
            .then(data => {
              setResults(data);
              setLoading(false);
              setLoadedSearchTerm(searchTerm);
              setLoadedSeriesTitle(seriesTitle);
            })
            .catch(error => {
              console.error(error);
              setLoading(false);
            });
        }).catch(err => console.log(`Error with sessionID: ${err}`))
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
  }, [seriesTitle, searchTerm]);

  return (

    <>
      {(memoizedResults || loading) && <TopBannerSearch searchFunction={handleSearch} setSearchTerm={setSearchTerm} setSeriesTitle={setSeriesTitle} searchTerm={searchTerm} seriesTitle={seriesTitle} loading={loading} />}
      <Grid container spacing={2} alignItems='stretch' paddingX={{ xs: 2, md: 6 }}>
        {loading ? (
          <StyledCircularProgress />
        ) : memoizedResults && memoizedResults.map(result => (
          <Grid item xs={6} sm={6} md={3} key={result.fid}>
            <a href={`/editor/${result.fid}?search=${encodeURI(searchTerm)}`} style={{ textDecoration: 'none' }}>
              <StyledCard>
                <StyledCardMedia
                  component="img"
                  src={`https://memesrc.com${result.frame_image}`}
                  alt={result.subtitle}
                  title={result.subtitle} />
                <TopCardInfo>
                  <SeasonEpisodeText><b>S.</b>{result.season_number} <b>E.</b>{result.episode_number}</SeasonEpisodeText> <b>{result.series_name}</b>
                </TopCardInfo>
                <BottomCardCaption>
                {result.subtitle}
                </BottomCardCaption>
                  
                {/* <StyledTypography variant="body2">
                  Subtitle: {result.subtitle}<br />
                  Series: {result.series_name}<br />
                  Season: {result.season_number}<br />
                  Episode: {result.episode_number}
                </StyledTypography> */}
              </StyledCard>
            </a>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
