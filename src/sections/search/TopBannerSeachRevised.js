import styled from "@emotion/styled";
import { Box, Button, Container, Fab, FormControl, Grid, InputBase, Link, MenuItem, Select, Stack, Typography } from "@mui/material";
import { ArrowBack, Favorite, MapsUgc, Search, Shuffle } from "@mui/icons-material";
import { API, graphqlOperation } from 'aws-amplify';
import { cloneElement, useCallback, useEffect, useState } from "react";
import { LoadingButton } from "@mui/lab";
import { Link as RouterLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { searchPropTypes } from "./SearchPropTypes";
import Logo from "../../components/logo/Logo";
import { listContentMetadata } from '../../graphql/queries';
import useSearchDetails from "../../hooks/useSearchDetails";

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
    ...graphqlOperation(listContentMetadata, { filter: {}, limit: 50 }),
    authMode: "API_KEY"
  });
  const sortedMetadata = result.data.listContentMetadata.items.sort((a, b) => {
    if (a.title < b.title) return -1;
    if (a.title > b.title) return 1;
    return 0;
  });
  return sortedMetadata;
}

TopBannerSearchRevised.propTypes = searchPropTypes;


export default function TopBannerSearchRevised(props) {
  const { show, searchQuery, frame, setFrame, setFineTuningFrame } = useSearchDetails();
  const { search, pathname } = useLocation();
  const { fid } = useParams();
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRandom, setLoadingRandom] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [seriesTitle, setSeriesTitle] = useState('_universal');

  const searchFunction = useCallback((e) => {
    if (e) {
      e.preventDefault();
    }
    const encodedSearchTerms = encodeURI(searchTerm)
    console.log(`Navigating to: '${`/search/${seriesTitle}/${encodedSearchTerms}`}'`)
    navigate(`/search/${seriesTitle}/${encodedSearchTerms}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesTitle, searchTerm]);

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
    if (!(pathname.startsWith("/frame") || pathname.startsWith("/editor"))) {
      console.log('PATH', pathname)
      console.log(pathname.startsWith("/frame"))
      setFineTuningFrame(null)
    }
  }, [pathname])

  // useEffect(() => {
  //   searchFunction()
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [seriesTitle])

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

  const loadRandomFrame = useCallback(() => {
    setLoadingRandom(true);
    getSessionID().then(sessionId => {
      const apiName = 'publicapi';
      const path = '/random';
      const myInit = {
        queryStringParameters: {
          series: show,
          sessionId
        }
      }

      API.get(apiName, path, myInit)
        .then(response => {
          const fid = response.frame_id;
          console.log(fid)
          navigate(`/frame/${fid}`);
          setLoadingRandom(false);
        })
        .catch(error => {
          console.error(error);
          setLoadingRandom(false);
        });
    })
  }, [navigate, seriesTitle]);

  const handleBackToFramePage = () => {
    navigate(`/frame/${frame || fid}`)
    setFrame(null)
  }

  return (
    <>
      {
        pathname.startsWith("/search") &&
        <>
          <StyledHeader>
            <Grid container marginY={3} paddingX={2}>
              {/* <Grid item marginX={{ xs: 'auto', md: 0 }} marginY='auto'>
            <Grid display='flex' xs={12} marginBottom={{ xs: 3, md: 0 }}>
              <Link to="/" component={RouterLink} sx={{ display: 'contents' }}>
                <Logo style={{ float: 'left' }} />
                <Typography component='h6' variant='h6' marginY='auto' sx={{ color: '#FFFFFF', textShadow: '1px 1px 3px rgba(0, 0, 0, 0.30);', marginLeft: '6px', display: 'inline' }}>
                  memeSRC
                </Typography>
              </Link>
            </Grid>


          </Grid> */}
              <Grid item xs={12} md={6} paddingLeft={{ xs: 0, md: 2 }}>
                <form onSubmit={e => searchFunction(e)}>
                  <StyledSearchInput
                    label="With normal TextField"
                    id="outlined-start-adornment"
                    // InputProps={{
                    //   endAdornment: <InputAdornment position="end"><Typography variant="caption"><Search /></Typography></InputAdornment>,
                    // }}
                    endAdornment={<Search onClick={() => searchFunction()} style={{ cursor: 'pointer' }} />}
                    sx={{ width: '100%' }}
                    value={searchTerm}
                    onChange={(event) => { setSearchTerm(event.target.value); }}
                  />
                </form>
              </Grid>
            </Grid>
            <Grid container wrap="nowrap" sx={{ overflowX: "scroll", flexWrap: "nowrap", scrollbarWidth: 'none', '&::-webkit-scrollbar': { height: '0 !important', width: '0 !important', display: 'none' } }} paddingX={2}>
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
                <Typography fontSize={13}><a href="/vote" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Request a show</a></Typography>
              </Grid>
              <Grid item marginLeft={{ xs: 3 }} marginY='auto' display='flex' style={{ whiteSpace: 'nowrap' }}>
                <Typography fontSize={13}><a href="https://forms.gle/8CETtVbwYoUmxqbi7" target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Report issues</a></Typography>
              </Grid>
              <Grid item marginLeft={{ xs: 3 }} marginY='auto' display='flex' style={{ whiteSpace: 'nowrap' }}>
                <Typography fontSize={13}><a href="https://memesrc.com/donate" target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Support the team</a></Typography>
              </Grid>
            </Grid>
          </StyledHeader>
          {cloneElement(props.children, { setSeriesTitle, shows })}
          <StyledLeftFooter className="bottomBtn">
            <a href="https://forms.gle/8CETtVbwYoUmxqbi7" target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>
              <Fab color="primary" aria-label="feedback" style={{ margin: "0 10px 0 0", backgroundColor: "black", zIndex: '1300' }} size='medium'>
                <MapsUgc color="white" />
              </Fab>
            </a>
            <a href="https://memesrc.com/donate" target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>
              <Fab color="primary" aria-label="donate" style={{ backgroundColor: "black", zIndex: '1300' }} size='medium'>
                <Favorite />
              </Fab>
            </a>
          </StyledLeftFooter>
          <StyledRightFooter className="bottomBtn">
            <StyledButton onClick={loadRandomFrame} loading={loadingRandom} startIcon={<Shuffle />} variant="contained" style={{ backgroundColor: "black", marginLeft: 'auto', zIndex: '1300' }} >Random</StyledButton>
          </StyledRightFooter>
        </>
      }

      {pathname.startsWith("/frame") &&
        <Container maxWidth="xl" sx={{ pt: 2 }} disableGutters>
          <Box
            sx={{ width: '100%', px: 3 }}
          >
            <Link
              component={RouterLink}
              to={searchTerm ? `/search/${show}/${searchTerm}` : `/${(show && show !== '_universal') ? show : ''}`}
              sx={{
                color: 'white',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              <Stack direction='row' alignItems='center'>
                <ArrowBack fontSize="small" />
                <Typography variant="body1" ml={1}>
                  Back to {searchQuery ? 'search' : 'home'}
                </Typography>
              </Stack>
            </Link>
          </Box>
          {cloneElement(props.children, { setSeriesTitle, shows })}
          <StyledLeftFooter className="bottomBtn">
            <a href="https://forms.gle/8CETtVbwYoUmxqbi7" target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>
              <Fab color="primary" aria-label="feedback" style={{ margin: "0 10px 0 0", backgroundColor: "black", zIndex: '1300' }} size='medium'>
                <MapsUgc color="white" />
              </Fab>
            </a>
            <a href="https://memesrc.com/donate" target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>
              <Fab color="primary" aria-label="donate" style={{ backgroundColor: "black", zIndex: '1300' }} size='medium'>
                <Favorite />
              </Fab>
            </a>
          </StyledLeftFooter>
          <StyledRightFooter className="bottomBtn">
            <StyledButton onClick={loadRandomFrame} loading={loadingRandom} startIcon={<Shuffle />} variant="contained" style={{ backgroundColor: "black", marginLeft: 'auto', zIndex: '1300' }} >Random</StyledButton>
          </StyledRightFooter>
        </Container>
      }

      {pathname.startsWith("/editor") &&
        <Container maxWidth="xl" sx={{ pt: 2 }} disableGutters>
          <Box
            sx={{ width: '100%', px: 3 }}
          >
            <Link
              onClick={handleBackToFramePage}
              sx={{
                color: 'white',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
                cursor: 'pointer'
              }}
            >
              <Stack direction='row' alignItems='center'>
                <ArrowBack fontSize="small" />
                <Typography variant="body1" ml={1}>
                  Back to frame
                </Typography>
              </Stack>
            </Link>
          </Box>
          {cloneElement(props.children, { setSeriesTitle, shows })}
          
        </Container>
      }

      {(pathname.startsWith("/episode") || pathname.startsWith("/vote")) &&
        <Container maxWidth="xl" sx={{ pt: 2 }} disableGutters>
          {cloneElement(props.children, { setSeriesTitle, shows })}
          <StyledLeftFooter className="bottomBtn">
            <a href="https://forms.gle/8CETtVbwYoUmxqbi7" target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>
              <Fab color="primary" aria-label="feedback" style={{ margin: "0 10px 0 0", backgroundColor: "black", zIndex: '1300' }} size='medium'>
                <MapsUgc color="white" />
              </Fab>
            </a>
            <a href="https://memesrc.com/donate" target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>
              <Fab color="primary" aria-label="donate" style={{ backgroundColor: "black", zIndex: '1300' }} size='medium'>
                <Favorite />
              </Fab>
            </a>
          </StyledLeftFooter>
          <StyledRightFooter className="bottomBtn">
            <StyledButton onClick={loadRandomFrame} loading={loadingRandom} startIcon={<Shuffle />} variant="contained" style={{ backgroundColor: "black", marginLeft: 'auto', zIndex: '1300' }} >Random</StyledButton>
          </StyledRightFooter>
        </Container>
      }
    </>
  )
}
