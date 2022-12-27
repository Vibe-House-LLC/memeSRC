import styled from "@emotion/styled";
import { Button, Fab, Grid, Typography } from "@mui/material";
import { Favorite, MapsUgc, MapsUgcRounded, MessageTwoTone, Shuffle } from "@mui/icons-material";
import { API, graphqlOperation } from 'aws-amplify';
import { useEffect, useState } from "react";
import { searchPropTypes } from "./SearchPropTypes";
import Logo from "../../components/logo/Logo";
import { listContentMetadata } from '../../graphql/queries';

// Define constants for colors and fonts
const PRIMARY_COLOR = '#4285F4';
const SECONDARY_COLOR = '#0F9D58';
const FONT_FAMILY = 'Roboto, sans-serif';

// Create a search form component
const StyledSearchForm = styled.form`
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 800px;
`;

const StyledSearchSelector = styled.select`
  font-family: ${FONT_FAMILY};
  font-size: 14px;
  color: #333;
  background-color: #fff;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  height: 40px;
  width: 100%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: box-shadow 0.3s;
  appearance: none;
  cursor: pointer;

  &:focus {
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    outline: none;
  }
`;


// Create a search button component
const StyledSearchButton = styled(Button)`
  font-family: ${FONT_FAMILY};
  font-size: 14px;
  color: #fff;
  background-color: ${SECONDARY_COLOR};
  border-radius: 4px;
  padding: 8px 12px;
`;

// Create a grid container component
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

// Create a label component
const StyledLabel = styled.label`
    margin-bottom: 8px;
    color: ${SECONDARY_COLOR};
    font-family: ${FONT_FAMILY};
    font-size: 14px;
  `;

// Create a button component
const StyledButton = styled(Button)`
    font-family: ${FONT_FAMILY};
    font-size: 14px;
    color: #fff;
    background-color: ${SECONDARY_COLOR};
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
    transition: background-color 0.3s;

    &:hover {
      background-color: ${PRIMARY_COLOR};
    }
`;

const StyledSearchInput = styled.input`
  font-family: ${FONT_FAMILY};
  font-size: 14px;
  color: #333;
  background-color: #fff;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  width: 100%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: box-shadow 0.3s;
  height: 40px;

  &:focus {
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    outline: none;
  }
`;


// Create a footer component
const StyledFooter = styled('footer')`
    bottom: 10px;
    left: 0;
    line-height: 0;
    width: 100%;
    position: fixed;
    padding: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: transparent;
`;

async function fetchShows() {
  const result = await API.graphql(graphqlOperation(listContentMetadata, { filter: {}, limit: 10 }));
  return result.data.listContentMetadata.items;
}

FullScreenSearch.propTypes = searchPropTypes;

export default function FullScreenSearch(props) {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const { searchTerms, setSearchTerm, seriesTitle, setSeriesTitle, searchFunction } = props

  useEffect(() => {
    async function getData() {
      const data = await fetchShows();
      setShows(data);
      setLoading(false);
    }
    getData();
  }, []);

  useEffect(() => {
    if (shows.length > 0) {
      setSeriesTitle(shows[0].id)
      console.log(shows)
    }
  }, [shows, setSeriesTitle])

  return (
    <StyledGridContainer container paddingX={3}>
      <Grid container marginY='auto' justifyContent='center'>
        <Grid container justifyContent='center'>
          <Grid item textAlign='center' marginBottom={5}>
          <Typography component='h1' variant='h1' sx={{ color: '#FFFFFF' }}>
            <Logo sx={{ display: 'inline', width: '300px', height: 'auto' }} color="white" />
            <br />
            memeSRC
          </Typography>
          </Grid>
        </Grid>
        <StyledSearchForm onSubmit={e => searchFunction(e)}>
          <Grid container justifyContent='center'>
            <Grid item sm={3} xs={12} paddingX={0.25} paddingBottom={{xs: 1, sm: 0}}>
              <StyledSearchSelector onChange={(x) => { setSeriesTitle(x.target.value) }} value={seriesTitle}>
                {(loading) ? <option key="loading" value="loading" disabled>Loading...</option> : shows.map((item) => (
                  <option key={item.id} value={item.id}>{item.emoji} {item.title}</option>
                ))}
              </StyledSearchSelector>
            </Grid>
            <Grid item sm={5} xs={12} paddingX={0.25} paddingBottom={{xs: 1, sm: 0}}>
              <StyledLabel htmlFor="search-term">
                <StyledSearchInput
                  type="text"
                  id="search-term"
                  value={searchTerms}
                  placeholder="What's the quote?"
                  onChange={e => setSearchTerm(e.target.value)} />
              </StyledLabel>
            </Grid>
            <Grid item sm={2} xs={12} paddingX={0.25} paddingBottom={{xs: 1, sm: 0}} display={{xs: 'flex', sm: 'none'}}>
              <StyledSearchButton type="submit" style={{ backgroundColor: "black" }} fullWidth={{xs: true, sm: false}}>Search</StyledSearchButton>
            </Grid>
          </Grid>
        </StyledSearchForm>
      </Grid>
      <StyledFooter >
        <Fab color="primary" aria-label="feedback" style={{ margin: "0 10px 0 0", backgroundColor: "black" }} size='small'>
          <MapsUgc color="white" />
        </Fab>
        <Fab color="primary" aria-label="donate" style={{ backgroundColor: "black" }} size='small'>
          <Favorite fontSize="10px" />
        </Fab>
        <a href={`https://api.memesrc.com/random/generate${seriesTitle ? `?series=${seriesTitle}` : ''}`} style={{ marginLeft: 'auto', textDecoration: 'none' }}>
          <StyledButton startIcon={<Shuffle />} variant="contained" style={{ backgroundColor: "black" }}>Random</StyledButton>
        </a>
      </StyledFooter>
    </StyledGridContainer>
  )
}
