import styled from "@emotion/styled";
import { Box, Button, Fab, FormControl, Grid, IconButton, Input, InputAdornment, InputBase, InputLabel, MenuItem, Select, SwipeableDrawer, TextField, Typography, useTheme } from "@mui/material";
import { Favorite, MapsUgc, Search, SettingsSuggest, Shuffle } from "@mui/icons-material";
import { API, graphqlOperation } from 'aws-amplify';
import { useCallback, useEffect, useState } from "react";
import { LoadingButton } from "@mui/lab";
import { Link, useNavigate } from "react-router-dom";
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
  padding-bottom: 15px;
`;

const StyledSearchSelector = styled.select`
  font-family: ${FONT_FAMILY};
  font-size: 18px;
  color: #333;
  background-color: #fff;
  border: none;
  border-radius: 8px;
  padding: 5px 12px;
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
const StyledSearchButton = styled(LoadingButton)`
  font-family: ${FONT_FAMILY};
  font-size: 18px;
  color: #fff;
  background-color: ${SECONDARY_COLOR};
  border-radius: 8px;
  padding: 5px 6px;
`;

// Create a grid container component
const StyledGridContainer = styled(Grid)`
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

const StyledHeader = styled('header')(({ theme }) => ({
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { searchTerm, setSearchTerm, seriesTitle, setSeriesTitle, searchFunction } = props
  const [searchField, setSearchField] = useState(searchTerm);

  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    async function getData() {
      // Get shows
      const shows = await fetchShows();
      setShows(shows);
      setLoading(false);
    }
    getData();
  }, []);

  const toggleDrawer = () => {
    setDrawerOpen((!drawerOpen))
  }

  useEffect(() => {
    if (props.loading === false) {
      setDrawerOpen(false);
    }
  }, [props.loading])

  useEffect(() => {
    searchFunction()
  }, [props.seriesTitle])

  // useEffect(() => {
  //   if (shows.length > 0) {
  //     setSeriesTitle(shows[0].id)
  //     console.log(shows)
  //   }
  // }, [setSeriesTitle])


  const loadRandomFrame = useCallback(() => {
    const apiEpisodeLookupUrl = `https://api.memesrc.com/random/generate${seriesTitle ? `?series=${seriesTitle}` : ''}`
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
        <Grid container marginY={3} >
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
              value={searchField}
              onChange={(event) => {setSearchField(event.target.value); setSearchTerm(event.target.value);}}
            />
            </form>
          </Grid>
        </Grid>
        <Grid container>
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
          <Grid item marginLeft={{ xs: 3 }} marginY='auto' display='flex'>
            <Typography fontSize={13}>Request a show</Typography>
          </Grid>
          <Grid item marginLeft={{ xs: 3 }} marginY='auto' display='flex'>
            <Typography fontSize={13}>Report issues</Typography>
          </Grid>
          <Grid item marginLeft={{ xs: 3 }} marginY='auto' display='flex'>
            <Typography fontSize={13}>Support the team</Typography>
          </Grid>
        </Grid>

      </StyledHeader>
      {/* <SwipeableDrawer
        anchor="top"
        open={drawerOpen}
        onClose={toggleDrawer}
        onOpen={toggleDrawer}
      >
        <StyledGridContainer container paddingX={3} paddingY={1}>
          <Grid container marginY='auto' justifyContent='center'>
            <Grid container justifyContent='center'>
              <Grid item textAlign='center'>
                <Typography component='h2' variant='h2' sx={{ color: '#FFFFFF', textShadow: '1px 1px 3px rgba(0, 0, 0, 0.30);' }}>
                  memeSRC
                </Typography>
              </Grid>
            </Grid>
            <StyledSearchForm onSubmit={e => searchFunction(e)}>
              <Grid container justifyContent='center'>
                <Grid item sm={3.5} xs={12} paddingX={0.25} paddingBottom={{ xs: 1, sm: 0 }}>
                  <StyledSearchSelector onChange={(x) => { setSeriesTitle(x.target.value); }} value={seriesTitle}>
                    <option key='_universal' value='_universal' selected>🌈 All Shows</option>
                    {(loading) ? <option key="loading" value="loading" disabled>Loading...</option> : shows.map((item) => (
                      <option key={item.id} value={item.id}>{item.emoji} {item.title}</option>
                    ))}
                  </StyledSearchSelector>
                </Grid>
                <Grid item sm={7} xs={12} paddingX={0.25} paddingBottom={{ xs: 1, sm: 0 }}>
                  <StyledLabel htmlFor="search-term">
                    <StyledSearchInput
                      type="text"
                      id="search-term"
                      value={searchTerms}
                      placeholder="What's the quote?"
                      onChange={e => setSearchTerm(e.target.value)} />
                  </StyledLabel>
                </Grid>
                <Grid item sm={1.5} xs={12} paddingX={0.25} paddingBottom={{ xs: 1, sm: 0 }}>
                  <StyledSearchButton type="submit" loading={props.loading} style={{ backgroundColor: "black" }} fullWidth={{ xs: true, sm: false }}>Search</StyledSearchButton>
                </Grid>
              </Grid>
            </StyledSearchForm>
          </Grid>
        </StyledGridContainer>
      </SwipeableDrawer> */}


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
      {/* <HomePageSection 
        backgroundColor="#ff6900" 
        textColor="#FFFFFF"
        title="This is a title"
        subtitle="This is a subtitle to tell you more about the title"
        buttons={[
          {
            title: "Title One",
            icon: <Favorite />,
            destination: "http://www.example.com"
          },
          {
            title: "Title Two",
            icon: <Favorite />,
            destination: "http://www.example.com"
          }
        ]}
        bottomImage={{
          alt: "testing",
          src: '/assets/illustrations/girl-looking-at-stars-and-moon-with-telescope.svg',
          bottomMargin: 8
        }}
        buttonSubtext={{
          text: 'Click me to go',
          href: 'http://www.example.com'
        }}
      /> */}
    </>
  )
}
