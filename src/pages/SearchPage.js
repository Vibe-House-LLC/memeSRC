import React, { useState, useEffect } from 'react';
import { Grid, CircularProgress, Card } from '@mui/material';
import styled from '@emotion/styled';

const StyledCircularProgress = styled(CircularProgress)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
`;

const StyledForm = styled.form`
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
`;

const StyledLabel = styled.label(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
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
    <StyledForm onSubmit={e => handleSearch(e)}>
      <StyledLabel htmlFor="search-term">
        Search:
        <StyledInput
          type="text"
          id="search-term"
          value={searchTerm}
          placeholder="What's the quote?"
          onChange={e => setSearchTerm(e.target.value)}
        />
      </StyledLabel>
      <StyledLabel htmlFor="series-title">
        <StyledInput
          type="text"
          id="series-title"
          value={seriesTitle}
          placeholder="Series ID (optional)"
          onChange={e => setSeriesTitle(e.target.value)}
        />
      </StyledLabel>
      <StyledButton type="submit">Search</StyledButton>
      <br /><br />
      <Grid container spacing={2}>
        {loading ? (
          <StyledCircularProgress />
        ) : results && results.map(result => (
          <Grid item xs={12} sm={6} md={4} key={result.fid}>
            <a href={`/dashboard/editor/${result.fid}`}>
            <StyledCard>
                <StyledCardMedia
                  component="img"
                  src={`https://memesrc.com${result.frame_image}`}
                  alt={result.subtitle}
                  title={result.subtitle}
                />
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
      </Grid>
    </StyledForm>

  );
}
