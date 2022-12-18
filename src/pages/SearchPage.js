import React, { useState, useEffect } from 'react';
import { Card, CardMedia, Grid, Typography } from '@mui/material';
import styled from '@emotion/styled';

const useStyles = styled((theme) => ({
  root: {
    flexGrow: 1,
    margin: theme.spacing(2),
  },
  searchForm: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  input: {
    margin: theme.spacing(1),
  },
  thumbnailContainer: {
    width: 200,
    height: 300,
  },
  thumbnailImage: {
    width: '100%',
    height: 200,
  },
  info: {
    padding: theme.spacing(1),
  },
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

function SearchBox() {
  const [searchTerm, setSearchTerm] = useState('');
  const [seriesTitle, setSeriesTitle] = useState('');
  const [results, setResults] = useState(null);
  const [sessionID, setSessionID] = useState(null);

  useEffect(() => {
    getSessionID().then(id => setSessionID(id));
  }, []);

  function handleSearch(e) {
    e.preventDefault();

    let apiSearchUrl;
    if (seriesTitle) {
      apiSearchUrl = `https://api.memesrc.com/?series=${seriesTitle}&search=${searchTerm}&sessionID=${sessionID}`;
    } else {
      apiSearchUrl = `https://api.memesrc.com/?search=${searchTerm}&sessionID=${sessionID}`;
    }

    fetch(apiSearchUrl)
      .then(response => response.json())
      .then(data => setResults(data))
      .catch(error => console.error(error));
  }

  const classes = useStyles();

  return (
    <div>
      <form onSubmit={handleSearch}>
        <label htmlFor="search-term">Search Term:
          <input
            type="text"
            id="search-term"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </label>
        <label htmlFor="series-title">
          Series Title:
          <input
            type="text"
            id="series-title"
            value={seriesTitle}
            onChange={e => setSeriesTitle(e.target.value)}
          />
        </label>
        <button type="submit">Search</button>
      </form>
      <Grid container spacing={2} className={classes.root}>
        {results && results.map(result => (
          <Grid item xs={12} sm={6} md={4} key={result.fid}>
            <div className={classes.thumbnailContainer}>
              <Card>
                <CardMedia
                  className={classes.thumbnailImage}
                  component="img"
                  src={`https://memesrc.com${result.frame_image}`}
                  alt={result.subtitle}
                  title={result.subtitle}
                />
                <Typography className={classes.info} variant="body2">
                  Series Name: {result.series_name}<br />
                  Season: {result.season_number}<br />
                  Episode: {result.episode_number}
                </Typography>
              </Card>
            </div>
          </Grid>
        ))}
      </Grid>
    </div>
  );
}

export default SearchBox;
