import React, { useState, useEffect } from 'react';
import { Grid, CircularProgress, Card, Typography } from '@mui/material';
import styled from '@emotion/styled';

const StyledCircularProgress = styled(CircularProgress)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
`;

const StyledForm = styled.form`
  display: 'flex'
`;

const StyledGridContainer = styled(Grid)`
  min-height: 100vh;
  background-image: linear-gradient(45deg,
    #5461c8 12.5% /* 1*12.5% */,
    #c724b1 0, #c724b1 25%   /* 2*12.5% */,
    #e4002b 0, #e4002b 37.5% /* 3*12.5% */,
    #ff6900 0, #ff6900 50%   /* 4*12.5% */,
    #f6be00 0, #f6be00 62.5% /* 5*12.5% */,
    #97d700 0, #97d700 75%   /* 6*12.5% */,
    #00ab84 0, #00ab84 87.5% /* 7*12.5% */,
    #00a3e0 0);

`;

const StyledLabel = styled.label(({ theme }) => ({
  marginBottom: '8px',
  color: theme.palette.text.secondary,
}));

const StyledInput = styled.input(({ theme }) => ({
  fontSize: '16px',
  padding: '8px',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: '4px',
}));

const StyledButton = styled.button(({ theme }) => ({
  fontSize: '16px',
  padding: '8px 16px',
  border: 'none',
  borderRadius: '4px',
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
  cursor: 'pointer',

  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));

const StyledCard = styled(Card)`
  
  border: 3px solid transparent;
  box-sizing: border-box;

  &:hover {
    border: 3px solid orange;
  }
`;

const StyledCardMedia = styled.img`
  width: 100%;
  height: 300px;
  aspect-ratio: '16/9';
  object-fit: contain;
  object-position: center;
  background-color: black;
`;

const StyledTypography = styled.p(({ theme }) => ({
  fontSize: '14px',
  color: theme.palette.text.secondary,
  padding: '10px 10px 10px 25px'
}));

function getSessionID() {
  if ("sessionID" in sessionStorage) {
    return Promise.resolve(sessionStorage.getItem("sessionID"));
  }
  return fetch(`https://api.memesrc.com/?uuidGen`)
    .then(response => response.text())
    .then(sessionID => {
      sessionStorage.setItem("sessionID", sessionID);
      return sessionID;
    });
}

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [seriesTitle, setSeriesTitle] = useState('');
  const [results, setResults] = useState(null);
  const [sessionID, setSessionID] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSessionID().then(id => setSessionID(id));
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    setLoading(true);
    let apiSearchUrl;
    if (seriesTitle) {
      apiSearchUrl = `https://api.memesrc.com/?series=${seriesTitle}&search=${searchTerm}&sessionID=${sessionID}`;
    } else {
      apiSearchUrl = `https://api.memesrc.com/?search=${searchTerm}&sessionID=${sessionID}`;
    }

    fetch(apiSearchUrl)
      .then(response => response.json())
      .then(data => {
        setResults(data);
        setLoading(false);
      })
      .catch(error => {
        console.error(error);
        setLoading(false);
      });
  }

  // const classes = useStyles();

  return (

    <><StyledGridContainer container>
      <Grid container marginY='auto' justifyContent='center'>
        <Grid xs={12} textAlign='center' marginBottom={5}>
          <Typography component='h1' variant='h1' sx={{color: '#FFFFFF'}}>
            memeSRC
          </Typography>
        </Grid>
        <StyledForm onSubmit={e => handleSearch(e)}>
          <Grid container alignItems={'center'}>
            <Grid item md={5} sm='auto'>
              <StyledLabel htmlFor="search-term">
                <StyledInput
                  type="text"
                  id="search-term"
                  value={searchTerm}
                  placeholder="What's the quote?"
                  onChange={e => setSearchTerm(e.target.value)} />
              </StyledLabel>
            </Grid>
            <Grid item md={5} sm='auto'>
              <StyledLabel htmlFor="series-title">
                <StyledInput
                  type="text"
                  id="series-title"
                  value={seriesTitle}
                  placeholder="Series ID (optional)"
                  onChange={e => setSeriesTitle(e.target.value)} />
              </StyledLabel>
            </Grid>
            <Grid item md={2} sm={12}>
              <StyledButton type="submit">Search</StyledButton>
            </Grid>
          </Grid>
        </StyledForm>
      </Grid>
    </StyledGridContainer>
      <br /><br />
      <Grid container spacing={2}>
        {loading ? (
          <StyledCircularProgress />
        ) : results && results.map(result => (
          <Grid item xs={12} sm={6} md={4} key={result.fid}>
            <a href={`/dashboard/editor/${result.fid}`} style={{ textDecoration: 'none' }}>
              <StyledCard>
                <StyledCardMedia
                  component="img"
                  src={`https://memesrc.com${result.frame_image}`}
                  alt={result.subtitle}
                  title={result.subtitle} />
                <StyledTypography variant="body2">
                  Subtitle: {result.subtitle}<br />
                  Series: {result.series_name}<br />
                  Season: {result.season_number}<br />
                  Episode: {result.episode_number}
                </StyledTypography>
              </StyledCard>
            </a>
          </Grid>
        ))}
      </Grid></>

  );
}
