import styled from "@emotion/styled";
import { Box, Button, Container, Divider, Fab, FormControl, Grid, InputBase, Link, MenuItem, Select, Stack, Typography, useMediaQuery } from "@mui/material";
import { ArrowBack, Close, Favorite, MapsUgc, Search, Shuffle } from "@mui/icons-material";
import { API, graphqlOperation } from 'aws-amplify';
import { cloneElement, useCallback, useContext, useEffect, useState } from "react";
import { LoadingButton } from "@mui/lab";
import { Link as RouterLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { searchPropTypes } from "./SearchPropTypes";
import Logo from "../../components/logo/Logo";
import { contentMetadataByStatus, listContentMetadata } from '../../graphql/queries';
import useSearchDetails from "../../hooks/useSearchDetails";
import useSearchDetailsV2 from "../../hooks/useSearchDetailsV2";
import AddCidPopup from "../../components/ipfs/add-cid-popup";
import { UserContext } from "../../UserContext";
import fetchShows from "../../utils/fetchShows";
import useLoadRandomFrame from "../../utils/loadRandomFrame";

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
  border-radius: 7px;
  padding: 8px 12px;
  height: 40px;
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
  paddingBottom: '10px',
}));

TopBannerSearchRevised.propTypes = searchPropTypes;


export default function TopBannerSearchRevised(props) {
  const { show, searchQuery, setSearchQuery, frame, setFrame, setFineTuningFrame, setShow } = useSearchDetails();
  const { savedCids, loadingSavedCids } = useSearchDetailsV2();
  const { search, pathname } = useLocation();
  const { fid, searchTerms } = useParams();
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const { loadRandomFrame, loadingRandom, error } = useLoadRandomFrame();
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [seriesTitle, setSeriesTitle] = useState('_universal');
  const [addNewCidOpen, setAddNewCidOpen] = useState(false);
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('md'));
  const { user } = useContext(UserContext)

  const searchFunction = useCallback((e) => {
    if (e) {
      e.preventDefault();
    }
    const encodedSearchTerms = encodeURI(searchQuery)
    console.log(`Navigating to: '${`/search/${show}/${encodedSearchTerms}`}'`)
    navigate(`/search/${show}/${encodedSearchTerms}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, searchQuery]);

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

    if ((pathname.startsWith("/frame") || pathname.startsWith("/editor"))) {
      window.scrollTo(0, 0);
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

  const handleBackToFramePage = () => {
    navigate(`/frame/${frame || fid}`)
    setFrame(null)
  }

  const handleSelectSeries = (data) => {

    navigate(`/search/${data}/${encodeURIComponent(searchTerm || searchTerms)}`)

    // if (data?.addNew) {
    //   setAddNewCidOpen(true)
    // } else {
    //   const savedCid = shows?.find(obj => obj.id === data && obj.version === 2) || savedCids?.find(obj => obj.id === data)
    //   if (savedCid) {
    //     navigate(`/v2/search/${savedCid.id}/${encodeURIComponent(searchTerm || searchTerms)}`)
    //   } else {
    //     setShow(data); 
    //     setSeriesTitle(data);
    //   }
    // }
  }

  return (
    <>
      {
        pathname.startsWith("/search") &&
        <>
          <StyledHeader>
            <Grid container mb={1.5} mt={0} paddingX={2}>
              <Grid item xs={12} md={6} paddingLeft={{ xs: 0, md: 2 }}>
                <form onSubmit={e => searchFunction(e)}>
                  <StyledSearchInput
                    label="With normal TextField"
                    id="outlined-start-adornment"
                    // InputProps={{
                    //   endAdornment: <InputAdornment position="end"><Typography variant="caption"><Search /></Typography></InputAdornment>,
                    // }}
                    endAdornment={<>{(searchTerm || searchTerms) && <Close onClick={() => { setSearchTerm(''); setSearchQuery(''); }} sx={{cursor: 'pointer', mr: 1}} />}<Search onClick={() => searchFunction()} style={{ cursor: 'pointer' }} /></>}
                    sx={{ width: '100%' }}
                    value={searchTerm || searchTerms}
                    onChange={(e) => {
                      let value = e.target.value;

                      // Replace curly single quotes with straight single quotes
                      value = value.replace(/[\u2018\u2019]/g, "'");

                      // Replace curly double quotes with straight double quotes
                      value = value.replace(/[\u201C\u201D]/g, '"');

                      // Replace en-dash and em-dash with hyphen
                      value = value.replace(/[\u2013\u2014]/g, '-');

                      setSearchTerm(value);
                      setSearchQuery(value);
                    }}
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
                    value={show}
                    onChange={(x) => { handleSelectSeries(x.target.value) }}
                    label="Age"
                    size="small"
                    autoWidth
                    disableUnderline
                  >

                    <MenuItem key='_universal' value='_universal' selected>🌈 All Shows & Movies</MenuItem>
                    {(loading) ? <MenuItem key="loading" value="loading" disabled>Loading...</MenuItem> : shows.map((item) => (
                      <MenuItem key={item.id} value={item.id}>{item.emoji} {item.title}</MenuItem>
                    ))}
                    {/* <Divider />
                    <MenuItem disabled value=''>IPFS</MenuItem>
                    <Divider />
                    {user && loadingSavedCids &&
                      <MenuItem value='' disabled>Loading saved CIDs...</MenuItem>
                    }
                    {!loading && savedCids && savedCids.map(obj =>
                      <MenuItem key={obj.id} value={obj.id}>{obj.emoji} {obj.title}</MenuItem>
                    )}
                    <MenuItem key='addNew' value={{ addNew: true }}>+ Add New CID</MenuItem> */}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item marginLeft={{ xs: 3 }} marginY='auto' display='flex' style={{ whiteSpace: 'nowrap' }}>
                <Typography fontSize={13}><a href="/vote" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Request a show</a></Typography>
              </Grid>
              <Grid item marginLeft={{ xs: 3 }} marginY='auto' display='flex' style={{ whiteSpace: 'nowrap' }}>
                <Typography fontSize={13}><a href="/support" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Report issues</a></Typography>
              </Grid>
              <Grid item marginLeft={{ xs: 3 }} marginY='auto' display='flex' style={{ whiteSpace: 'nowrap' }}>
                <Typography fontSize={13}><a href="https://memesrc.com/donate" target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Support the team</a></Typography>
              </Grid>
            </Grid>
          </StyledHeader>
          {cloneElement(props.children, { setSeriesTitle, shows })}
          <StyledLeftFooter className="bottomBtn">
            <a href="/support" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>
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
            <StyledButton onClick={() => { loadRandomFrame(show) }} loading={loadingRandom} startIcon={<Shuffle />} variant="contained" style={{ backgroundColor: "black", marginLeft: 'auto', zIndex: '1300' }} >Random</StyledButton>
          </StyledRightFooter>
        </>
      }

      {pathname.startsWith("/frame") &&
        <>
          <Container maxWidth disableGutters sx={{ mt: isMobile ? 2 : 0 }}>
            <StyledHeader>
              <Grid container mb={1.5} mt={0} paddingX={2}>
                <Grid item xs={12} md={6} paddingLeft={{ xs: 0, md: 2 }}>
                  <form onSubmit={e => searchFunction(e)}>
                    <StyledSearchInput
                      label="With normal TextField"
                      id="outlined-start-adornment"
                      // InputProps={{
                      //   endAdornment: <InputAdornment position="end"><Typography variant="caption"><Search /></Typography></InputAdornment>,
                      // }}
                      endAdornment={<>{(searchTerm || searchTerms) && <Close onClick={() => { setSearchTerm(''); setSearchQuery(''); }} sx={{cursor: 'pointer', mr: 1}} />}<Search onClick={() => searchFunction()} style={{ cursor: 'pointer' }} /></>}
                      sx={{ width: '100%' }}
                      value={searchTerm}
                      onChange={(e) => {
                        let value = e.target.value;

                        // Replace curly single quotes with straight single quotes
                        value = value.replace(/[\u2018\u2019]/g, "'");

                        // Replace curly double quotes with straight double quotes
                        value = value.replace(/[\u201C\u201D]/g, '"');

                        // Replace en-dash and em-dash with hyphen
                        value = value.replace(/[\u2013\u2014]/g, '-');

                        setSearchTerm(value);
                        setSearchQuery(value);
                      }}
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
                    value={show}
                    onChange={(x) => { handleSelectSeries(x.target.value) }}
                    label="Age"
                    size="small"
                    autoWidth
                    disableUnderline
                  >

                    <MenuItem key='_universal' value='_universal' selected>🌈 All Shows & Movies</MenuItem>
                    {(loading) ? <MenuItem key="loading" value="loading" disabled>Loading...</MenuItem> : shows.map((item) => (
                      <MenuItem key={item.id} value={item.id}>{item.emoji} {item.title}</MenuItem>
                    ))}
                    {/* <Divider />
                    <MenuItem disabled value=''>IPFS</MenuItem>
                    <Divider />
                    {user && loadingSavedCids &&
                      <MenuItem value='' disabled>Loading saved CIDs...</MenuItem>
                    }
                    {!loading && savedCids && savedCids.map(obj =>
                      <MenuItem key={obj.id} value={obj.id}>{obj.emoji} {obj.title}</MenuItem>
                    )}
                    <MenuItem key='addNew' value={{ addNew: true }}>+ Add New CID</MenuItem> */}
                  </Select>
                </FormControl>
                </Grid>
                <Grid item marginLeft={{ xs: 3 }} marginY='auto' display='flex' style={{ whiteSpace: 'nowrap' }}>
                  <Typography fontSize={13}><a href="/vote" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Request a show</a></Typography>
                </Grid>
                <Grid item marginLeft={{ xs: 3 }} marginY='auto' display='flex' style={{ whiteSpace: 'nowrap' }}>
                  <Typography fontSize={13}><a href="/support" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Report issues</a></Typography>
                </Grid>
                <Grid item marginLeft={{ xs: 3 }} marginY='auto' display='flex' style={{ whiteSpace: 'nowrap' }}>
                  <Typography fontSize={13}><a href="https://memesrc.com/donate" target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Support the team</a></Typography>
                </Grid>
              </Grid>
            </StyledHeader>
          </Container>
          <Divider />
          <Container maxWidth="xl" sx={{ pt: 2 }} disableGutters>
            <Box
              sx={{ width: '100%', px: 2 }}
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
                    Back to {searchQuery ? 'search results' : 'home'}
                  </Typography>
                </Stack>
              </Link>
            </Box>
            {cloneElement(props.children, { setSeriesTitle, shows })}
            <StyledLeftFooter className="bottomBtn">
              <a href="/support" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>
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
              <StyledButton onClick={() => { loadRandomFrame(show) }} loading={loadingRandom} startIcon={<Shuffle />} variant="contained" style={{ backgroundColor: "black", marginLeft: 'auto', zIndex: '1300' }} >Random</StyledButton>
            </StyledRightFooter>
          </Container>
        </>
      }

      {pathname.startsWith("/editor") &&
        <>
          <Container maxWidth disableGutters sx={{ mt: isMobile ? 2 : 0 }}>
            <StyledHeader>
              <Grid container mb={1.5} mt={0} paddingX={2}>
                <Grid item xs={12} md={6} paddingLeft={{ xs: 0, md: 2 }}>
                  <form onSubmit={e => searchFunction(e)}>
                    <StyledSearchInput
                      label="With normal TextField"
                      id="outlined-start-adornment"
                      // InputProps={{
                      //   endAdornment: <InputAdornment position="end"><Typography variant="caption"><Search /></Typography></InputAdornment>,
                      // }}
                      endAdornment={<>{(searchTerm || searchTerms) && <Close onClick={() => { setSearchTerm(''); setSearchQuery(''); }} sx={{cursor: 'pointer', mr: 1}} />}<Search onClick={() => searchFunction()} style={{ cursor: 'pointer' }} /></>}
                      sx={{ width: '100%' }}
                      value={searchTerm}
                      onChange={(e) => {
                        let value = e.target.value;

                        // Replace curly single quotes with straight single quotes
                        value = value.replace(/[\u2018\u2019]/g, "'");

                        // Replace curly double quotes with straight double quotes
                        value = value.replace(/[\u201C\u201D]/g, '"');

                        // Replace en-dash and em-dash with hyphen
                        value = value.replace(/[\u2013\u2014]/g, '-');

                        setSearchTerm(value);
                        setSearchQuery(value);
                      }}
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
                    value={show}
                    onChange={(x) => { handleSelectSeries(x.target.value) }}
                    label="Age"
                    size="small"
                    autoWidth
                    disableUnderline
                  >

                    <MenuItem key='_universal' value='_universal' selected>🌈 All Shows & Movies</MenuItem>
                    {(loading) ? <MenuItem key="loading" value="loading" disabled>Loading...</MenuItem> : shows.map((item) => (
                      <MenuItem key={item.id} value={item.id}>{item.emoji} {item.title}</MenuItem>
                    ))}
                    {/* <Divider />
                    <MenuItem disabled value=''>IPFS</MenuItem>
                    <Divider />
                    {user && loadingSavedCids &&
                      <MenuItem value='' disabled>Loading saved CIDs...</MenuItem>
                    }
                    {!loading && savedCids && savedCids.map(obj =>
                      <MenuItem key={obj.id} value={obj.id}>{obj.emoji} {obj.title}</MenuItem>
                    )}
                    <MenuItem key='addNew' value={{ addNew: true }}>+ Add New CID</MenuItem> */}
                  </Select>
                </FormControl>
                </Grid>
                <Grid item marginLeft={{ xs: 3 }} marginY='auto' display='flex' style={{ whiteSpace: 'nowrap' }}>
                  <Typography fontSize={13}><a href="/vote" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Request a show</a></Typography>
                </Grid>
                <Grid item marginLeft={{ xs: 3 }} marginY='auto' display='flex' style={{ whiteSpace: 'nowrap' }}>
                  <Typography fontSize={13}><a href="/support" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Report issues</a></Typography>
                </Grid>
                <Grid item marginLeft={{ xs: 3 }} marginY='auto' display='flex' style={{ whiteSpace: 'nowrap' }}>
                  <Typography fontSize={13}><a href="https://memesrc.com/donate" target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Support the team</a></Typography>
                </Grid>
              </Grid>
            </StyledHeader>
          </Container>
          <Divider />
          <Container maxWidth="xl" sx={{ pt: 2 }} disableGutters>
            <Box
              sx={{ width: '100%', px: 2 }}
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
        </>
      }

      {pathname.startsWith("/vote") &&
        <>
          <Container maxWidth disableGutters sx={{ mt: isMobile ? 2 : 0 }}>
            <StyledHeader>
              <Grid container mb={1.5} mt={0} paddingX={2}>
                <Grid item xs={12} md={6} paddingLeft={{ xs: 0, md: 2 }}>
                  <form onSubmit={e => searchFunction(e)}>
                    <StyledSearchInput
                      label="With normal TextField"
                      id="outlined-start-adornment"
                      // InputProps={{
                      //   endAdornment: <InputAdornment position="end"><Typography variant="caption"><Search /></Typography></InputAdornment>,
                      // }}
                      endAdornment={<>{(searchTerm || searchTerms) && <Close onClick={() => { setSearchTerm(''); setSearchQuery(''); }} sx={{cursor: 'pointer', mr: 1}} />}<Search onClick={() => searchFunction()} style={{ cursor: 'pointer' }} /></>}
                      sx={{ width: '100%' }}
                      value={searchTerm}
                      onChange={(e) => {
                        let value = e.target.value;

                        // Replace curly single quotes with straight single quotes
                        value = value.replace(/[\u2018\u2019]/g, "'");

                        // Replace curly double quotes with straight double quotes
                        value = value.replace(/[\u201C\u201D]/g, '"');

                        // Replace en-dash and em-dash with hyphen
                        value = value.replace(/[\u2013\u2014]/g, '-');

                        setSearchTerm(value);
                        setSearchQuery(value);
                      }}
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
                    value={show}
                    onChange={(x) => { handleSelectSeries(x.target.value) }}
                    label="Age"
                    size="small"
                    autoWidth
                    disableUnderline
                  >

                    <MenuItem key='_universal' value='_universal' selected>🌈 All Shows & Movies</MenuItem>
                    {(loading) ? <MenuItem key="loading" value="loading" disabled>Loading...</MenuItem> : shows.map((item) => (
                      <MenuItem key={item.id} value={item.id}>{item.emoji} {item.title}</MenuItem>
                    ))}
                    {/* <Divider />
                    <MenuItem disabled value=''>IPFS</MenuItem>
                    <Divider /> */}
                    {/* {user && loadingSavedCids &&
                      <MenuItem value='' disabled>Loading saved CIDs...</MenuItem>
                    }
                    {!loading && savedCids && savedCids.map(obj =>
                      <MenuItem key={obj.id} value={obj.id}>{obj.emoji} {obj.title}</MenuItem>
                    )}
                    <MenuItem key='addNew' value={{ addNew: true }}>+ Add New CID</MenuItem> */}
                  </Select>
                </FormControl>
                </Grid>
                <Grid item marginLeft={{ xs: 3 }} marginY='auto' display='flex' style={{ whiteSpace: 'nowrap' }}>
                  <Typography fontSize={13}><a href="/vote" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Request a show</a></Typography>
                </Grid>
                <Grid item marginLeft={{ xs: 3 }} marginY='auto' display='flex' style={{ whiteSpace: 'nowrap' }}>
                  <Typography fontSize={13}><a href="/support" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Report issues</a></Typography>
                </Grid>
                <Grid item marginLeft={{ xs: 3 }} marginY='auto' display='flex' style={{ whiteSpace: 'nowrap' }}>
                  <Typography fontSize={13}><a href="https://memesrc.com/donate" target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Support the team</a></Typography>
                </Grid>
              </Grid>
            </StyledHeader>
          </Container>
          <Divider sx={{ mb: 2.5 }} />
          <Container maxWidth="xl" sx={{ pt: 0 }} disableGutters>
            {cloneElement(props.children, { setSeriesTitle, shows })}
            <StyledLeftFooter className="bottomBtn">
              <a href="/support" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>
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
              <StyledButton onClick={() => { loadRandomFrame(show) }} loading={loadingRandom} startIcon={<Shuffle />} variant="contained" style={{ backgroundColor: "black", marginLeft: 'auto', zIndex: '1300' }} >Random</StyledButton>
            </StyledRightFooter>
          </Container>
        </>
      }

      {pathname.startsWith("/episode") &&
        <>
          <Container maxWidth disableGutters sx={{ mt: isMobile ? 8 : 8 }}>
            <StyledHeader>
              <Grid container mb={1.5} mt={0} paddingX={2}>
                <Grid item xs={12} md={6} paddingLeft={{ xs: 0, md: 2 }}>
                  <form onSubmit={e => searchFunction(e)}>
                    <StyledSearchInput
                      label="With normal TextField"
                      id="outlined-start-adornment"
                      // InputProps={{
                      //   endAdornment: <InputAdornment position="end"><Typography variant="caption"><Search /></Typography></InputAdornment>,
                      // }}
                      endAdornment={<>{(searchTerm || searchTerms) && <Close onClick={() => { setSearchTerm(''); setSearchQuery(''); }} sx={{cursor: 'pointer', mr: 1}} />}<Search onClick={() => searchFunction()} style={{ cursor: 'pointer' }} /></>}
                      sx={{ width: '100%' }}
                      value={searchTerm}
                      onChange={(e) => {
                        let value = e.target.value;

                        // Replace curly single quotes with straight single quotes
                        value = value.replace(/[\u2018\u2019]/g, "'");

                        // Replace curly double quotes with straight double quotes
                        value = value.replace(/[\u201C\u201D]/g, '"');

                        // Replace en-dash and em-dash with hyphen
                        value = value.replace(/[\u2013\u2014]/g, '-');

                        setSearchTerm(value);
                        setSearchQuery(value);
                      }}
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
                    value={show}
                    onChange={(x) => { handleSelectSeries(x.target.value) }}
                    label="Age"
                    size="small"
                    autoWidth
                    disableUnderline
                  >

                    <MenuItem key='_universal' value='_universal' selected>🌈 All Shows & Movies</MenuItem>
                    {(loading) ? <MenuItem key="loading" value="loading" disabled>Loading...</MenuItem> : shows.map((item) => (
                      <MenuItem key={item.id} value={item.id}>{item.emoji} {item.title}</MenuItem>
                    ))}
                    {/* <Divider />
                    <MenuItem disabled value=''>IPFS</MenuItem>
                    <Divider />
                    {user && loadingSavedCids &&
                      <MenuItem value='' disabled>Loading saved CIDs...</MenuItem>
                    }
                    {!loading && savedCids && savedCids.map(obj =>
                      <MenuItem key={obj.id} value={obj.id}>{obj.emoji} {obj.title}</MenuItem>
                    )}
                    <MenuItem key='addNew' value={{ addNew: true }}>+ Add New CID</MenuItem> */}
                  </Select>
                </FormControl>
                </Grid>
                <Grid item marginLeft={{ xs: 3 }} marginY='auto' display='flex' style={{ whiteSpace: 'nowrap' }}>
                  <Typography fontSize={13}><a href="/vote" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Request a show</a></Typography>
                </Grid>
                <Grid item marginLeft={{ xs: 3 }} marginY='auto' display='flex' style={{ whiteSpace: 'nowrap' }}>
                  <Typography fontSize={13}><a href="/support" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Report issues</a></Typography>
                </Grid>
                <Grid item marginLeft={{ xs: 3 }} marginY='auto' display='flex' style={{ whiteSpace: 'nowrap' }}>
                  <Typography fontSize={13}><a href="https://memesrc.com/donate" target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Support the team</a></Typography>
                </Grid>
              </Grid>
            </StyledHeader>
          </Container>
          <Divider sx={{ mb: 2.5 }} />
          <Container maxWidth="xl" sx={{ pt: 0 }} disableGutters>
            {cloneElement(props.children, { setSeriesTitle, shows })}
            <StyledLeftFooter className="bottomBtn">
              <a href="/support" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>
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
              <StyledButton onClick={() => { loadRandomFrame(show) }} loading={loadingRandom} startIcon={<Shuffle />} variant="contained" style={{ backgroundColor: "black", marginLeft: 'auto', zIndex: '1300' }} >Random</StyledButton>
            </StyledRightFooter>
          </Container>
        </>
      }
      <AddCidPopup open={addNewCidOpen} setOpen={setAddNewCidOpen} />
    </>
  )
}
