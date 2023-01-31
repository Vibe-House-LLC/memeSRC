import styled from "@emotion/styled";
import { Fab, FormControl, Grid, InputBase, MenuItem, Select, Typography } from "@mui/material";
import { Favorite, MapsUgc, Search, Shuffle } from "@mui/icons-material";
import { API, graphqlOperation } from 'aws-amplify';
import { useCallback, useEffect, useState } from "react";
import { LoadingButton } from "@mui/lab";
import { useNavigate } from "react-router-dom";
import { searchPropTypes } from "./SearchPropTypes";
import Logo from "../../components/logo/Logo";
import { listContentMetadata } from '../../graphql/queries';

// Define constants for colors and fonts
const PRIMARY_COLOR = '#4285F4';
const SECONDARY_COLOR = '#0F9D58';
const FONT_FAMILY = 'Roboto, sans-serif';

// Create a button component
const StyledButton = styled(LoadingButton)`
    font-family: ${FONT_FAMILY};
    font-size: 18px;
    color: #fff;
    background-color: ${SECONDARY_COLOR};
    border-radius: 8px;
    padding: 8px 16px;
    cursor: pointer;
    transition: background-color 0.3s;

    &:hover {
      background-color: ${PRIMARY_COLOR};
    }
`;

const StyledSearchInput = styled(InputBase)`
  font-family: ${FONT_FAMILY};
  font-size: 16px;
  color: #FFFFFF;
  background-color: #2b2b2b;
  border-radius: 12px;
  padding: 8px 12px;
  height: 50px;
  margin-top: auto;
  margin-bottom: auto;
`;

const StyledLeftFooter = styled('footer')`
    bottom: 0;
    left: 0;
    line-height: 0;
    position: fixed;
    padding: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: transparent;
    z-index: 1300;
`;

const StyledRightFooter = styled('footer')`
    bottom: 0;
    right: 0;
    line-height: 0;
    position: fixed;
    padding: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: transparent;
    z-index: 1300;
`;

const StyledHeader = styled('header')(() => ({
  lineHeight: 0,
  width: '100%',
  zIndex: '1000',
  paddingBottom: '20px'
}));

async function fetchShows() {
  const result = await API.graphql({
    ...graphqlOperation(listContentMetadata, { filter: {}, limit: 10 }),
    authMode: "API_KEY"
  });
  return result.data.listContentMetadata.items;
}

TopBannerSearch.propTypes = searchPropTypes;


export default function TopBannerSearch(props) {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRandom, setLoadingRandom] = useState(false);
  const { searchTerm, setSearchTerm, seriesTitle, setSeriesTitle, searchFunction } = props

  const navigate = useNavigate();

  useEffect(() => {
    async function getData() {
      // Get shows
      const shows = await fetchShows();
      setShows(shows);
      setLoading(false);
    }
    getData();
  }, []);

  useEffect(() => {
    searchFunction()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.seriesTitle])

  const loadRandomFrame = useCallback(() => {
    const apiEpisodeLookupUrl = `https://api.memesrc.com/random/generate${seriesTitle === '_universal' ? '' : `?series=${seriesTitle}`}`
    setLoadingRandom(true);
    fetch(apiEpisodeLookupUrl)
      .then(response => {
        const fid = response.url.split('=')[1];
        console.log(fid)
        navigate(`/editor/${fid}`);
        setLoadingRandom(false);
      })
      .catch(error => {
        console.error(error);
        setLoadingRandom(false);
      });
  }, [navigate, seriesTitle]);

  return (
    <>
      <StyledHeader>
        <Grid container marginY={3} paddingX={2}>
          <Grid item marginX={{ xs: 'auto', md: 0 }} marginY='auto'>
            <Grid display='flex' xs={12} marginBottom={{ xs: 3, md: 0 }}>
              <Logo style={{ float: 'left' }} />
              <Typography component='h6' variant='h6' marginY='auto' sx={{ color: '#FFFFFF', textShadow: '1px 1px 3px rgba(0, 0, 0, 0.30);', marginLeft: '6px', display: 'inline' }}>
                memeSRC
              </Typography>
            </Grid>
            {/* <Fab onClick={toggleDrawer} variant="text" style={{ color: "white", textDecoration: 'none', backgroundColor: 'rgb(0,0,0,0)', boxShadow: 'none' }}>
          <Search />
        </Fab> */}


          </Grid>
          <Grid item xs={12} md={6} paddingLeft={{ xs: 0, md: 2 }}>
            <form onSubmit={e => searchFunction(e)}>
            <StyledSearchInput
              label="With normal TextField"
              id="outlined-start-adornment"
              // InputProps={{
              //   endAdornment: <InputAdornment position="end"><Typography variant="caption"><Search /></Typography></InputAdornment>,
              // }}
              endAdornment={<Search />}
              sx={{ width: '100%' }}
              value={searchTerm}
              onChange={(event) => {setSearchTerm(event.target.value);}}
            />
            </form>
          </Grid>
        </Grid>
        <Grid container wrap="nowrap" style={{ overflowX: "scroll", flexWrap: "nowrap" }} paddingX={2} >
          <Grid item marginLeft={{ md: 6 }}>

            <FormControl variant="standard" sx={{ minWidth: 120 }}>
              <Select
                labelId="demo-simple-select-standard-label"
                id="demo-simple-select-standard"
                value={seriesTitle}
                onChange={(x) => { setSeriesTitle(x.target.value); }}
                label="Age"
                size="small"
                autoWidth
                disableUnderline
              >

                <MenuItem key='_universal' value='_universal' selected>🌈 All Shows</MenuItem>
                {(loading) ? <MenuItem key="loading" value="loading" disabled>Loading...</MenuItem> : shows.map((item) => (
                  <MenuItem key={item.id} value={item.id}>{item.emoji} {item.title}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item marginLeft={{ xs: 3 }} marginY='auto' display='flex' style={{ whiteSpace: 'nowrap' }}>
            <Typography fontSize={13}>Request a show</Typography>
          </Grid>
          <Grid item marginLeft={{ xs: 3 }} marginY='auto' display='flex' style={{ whiteSpace: 'nowrap' }}>
            <Typography fontSize={13}>Report issues</Typography>
          </Grid>
          <Grid item marginLeft={{ xs: 3 }} marginY='auto' display='flex' style={{ whiteSpace: 'nowrap' }}>
            <Typography fontSize={13}>Support the team</Typography>
          </Grid>
        </Grid>
      </StyledHeader>
      <StyledLeftFooter className="bottomBtn">
        <Fab color="primary" aria-label="feedback" style={{ margin: "0 10px 0 0", backgroundColor: "black", zIndex: '1300' }} size='medium'>
          <MapsUgc color="white" />
        </Fab>
        <Fab color="primary" aria-label="donate" style={{ backgroundColor: "black", zIndex: '1300' }} size='medium'>
          <Favorite />
        </Fab>
      </StyledLeftFooter>
      <StyledRightFooter className="bottomBtn">
        <StyledButton onClick={loadRandomFrame} loading={loadingRandom} startIcon={<Shuffle />} variant="contained" style={{ backgroundColor: "black", marginLeft: 'auto', zIndex: '1300' }} >Random</StyledButton>
      </StyledRightFooter>
    </>
  )
}
