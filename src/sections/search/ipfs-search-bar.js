// ipfs-search-bar.js

import styled from "@emotion/styled";
import { Link, Fab, FormControl, Grid, InputBase, MenuItem, Select, Typography, Divider, Box, Stack, Container, ListSubheader } from "@mui/material";
import { ArrowBack, Close, Favorite, MapsUgc, Search, Shuffle } from "@mui/icons-material";
import { API } from 'aws-amplify';
import { Children, cloneElement, useCallback, useContext, useEffect, useRef, useState } from "react";
import { LoadingButton } from "@mui/lab";
import { Link as RouterLink, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { searchPropTypes } from "./SearchPropTypes";
import useSearchDetailsV2 from "../../hooks/useSearchDetailsV2";
import AddCidPopup from "../../components/ipfs/add-cid-popup";
import { UserContext } from "../../UserContext";
import useLoadRandomFrame from "../../utils/loadRandomFrame";
import FixedMobileBannerAd from '../../ads/FixedMobileBannerAd';
import FloatingActionButtons from "../../components/floating-action-buttons/FloatingActionButtons";

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
    bottom: ${props => props.hasAd ? '50px' : '0'};
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
    bottom: ${props => props.hasAd ? '50px' : '0'};
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
  paddingBottom: '10px'
}));

const StyledAdFooter = styled(Box)`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: black;
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1299;
`;

IpfsSearchBar.propTypes = searchPropTypes;

export default function IpfsSearchBar(props) {
  const params = useParams();
  const { pathname } = useLocation();
  const { user, shows, defaultShow, handleUpdateDefaultShow } = useContext(UserContext);
  const { show, setShow, searchQuery, setSearchQuery, cid = shows.some(show => show.isFavorite) ? params?.cid || defaultShow : params?.cid || '_universal', setCid, localCids, setLocalCids, showObj, setShowObj, selectedFrameIndex, setSelectedFrameIndex, savedCids, loadingSavedCids } = useSearchDetailsV2();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get('searchTerm');

  /* ----------------------------------- New ---------------------------------- */

  const searchInputRef = useRef(null);

  const [search, setSearch] = useState(searchTerm || '');
  const [addNewCidOpen, setAddNewCidOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!cid) {
      setCid(params?.cid || (shows.some(show => show.isFavorite) ? defaultShow : '_universal'))
    }
  }, [cid]);

  useEffect(() => {
    setSearch(searchTerm)
  }, [pathname]);

  useEffect(() => {
    // Function to check and parse the local storage value
    const checkAndParseLocalStorage = (key) => {
      const storedValue = localStorage.getItem(key);
      if (!storedValue) {
        return null;
      }

      try {
        const parsedValue = JSON.parse(storedValue);
        return Array.isArray(parsedValue) ? parsedValue : null;
      } catch (e) {
        // If parsing fails, return null
        return null;
      }
    };
  });

  useEffect(() => {
    if (searchTerm) {
      setSearchQuery(searchTerm);
      setSearch(searchTerm);
    }
  }, [searchTerm]);

  const handleSelectSeries = (data) => {
    if (data === "editFavorites") {
      navigate("/favorites"); // Navigate to the favorites editing page
    } else if (data === "addNewCid") {
      setAddNewCidOpen(true);
    } else if (pathname.split('/')[1] === 'search') {
      navigate(`/search/${data}/${searchTerm ? `?searchTerm=${searchTerm}` : ''}`)
      setCid(data);
    } else {
      setCid(data);
    }
  };

  useEffect(() => {
    setSelectedFrameIndex()
  }, [params?.subtitleIndex]);


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

  const searchFunction = (searchEvent) => {
    searchEvent?.preventDefault();
    // console.log(search)
    navigate(`/search/${cid || params?.cid || (shows.some(show => show.isFavorite) ? defaultShow : '_universal')}/?searchTerm=${encodeURIComponent(search)}`)
    return false
  }

  const showAd = user?.userDetails?.subscriptionStatus !== 'active';

  return (
    <>
      <StyledHeader>
        <Grid container mb={1.5} paddingX={2}>
          <Grid item xs={12} md={6} paddingLeft={{ xs: 0, md: 2 }}>
            <form onSubmit={e => searchFunction(e)}>
              <StyledSearchInput
                label="With normal TextField"
                id="outlined-start-adornment"
                endAdornment={
                  <>
                    {search && (
                      <Close
                        fontSize='small'
                        onClick={() => {
                          setSearch('');
                          searchInputRef.current.focus(); // Focus the text field
                        }}
                        sx={{ cursor: 'pointer', mr: 1, color: 'grey.400' }}
                      />
                    )}
                    <Search onClick={() => searchFunction()} style={{ cursor: 'pointer' }} />
                  </>
                }
                sx={{ width: '100%' }}
                value={search || ''} // Ensure value is never null
                onChange={(e) => {
                  let {value} = e.target;

                  // Replace curly single quotes with straight single quotes
                  value = value.replace(/[\u2018\u2019]/g, "'");

                  // Replace curly double quotes with straight double quotes
                  value = value.replace(/[\u201C\u201D]/g, '"');

                  // Replace en-dash and em-dash with hyphen
                  value = value.replace(/[\u2013\u2014]/g, '-');

                  setSearch(value);
                }}
                inputRef={searchInputRef} // Add the ref to the text field
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
                value={cid}
                onChange={(event) => handleSelectSeries(event.target.value)}
                label="Series"
                size="small"
                autoWidth
                disableUnderline
              >
                <MenuItem key="_universal" value="_universal">
                  🌈 All Shows & Movies
                </MenuItem>

                {shows.some(show => show.isFavorite) ? (
                  <MenuItem value="_favorites">
                    ⭐ All Favorites
                  </MenuItem>
                ) : null}

                {shows.some(show => show.isFavorite) ? (
                  <ListSubheader key="favorites-subheader">Favorites</ListSubheader>
                ) : null}

                {(shows.some(show => show.isFavorite)) && (
                  shows.filter(show => show.isFavorite).map(show => (
                    <MenuItem key={show.id} value={show.id}>
                      ⭐ {show.emoji} {show.title}
                    </MenuItem>
                  ))
                )}

                {user?.userDetails?.subscriptionStatus === 'active' || shows.some(show => show.isFavorite) ? (
                  <MenuItem value="editFavorites" style={{ fontSize: "0.9rem", opacity: 0.7 }}>
                    ⚙ Edit Favorites
                  </MenuItem>
                ) : null}

                {user?.userDetails?.subscriptionStatus === 'active' || shows.some(show => show.isFavorite) ? (
                  <ListSubheader key="other-subheader">Other</ListSubheader>
                ) : null}

                {shows.filter(show => !show.isFavorite).map(show => (
                  <MenuItem key={show.id} value={show.id}>
                    {show.emoji} {show.title}
                  </MenuItem>
                ))}
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
      <Divider sx={{ mb: 2.5 }} />

      {pathname.startsWith("/frame") &&
        <Container maxWidth='xl' disableGutters sx={{ px: 1 }}>
          <Box
            sx={{ width: '100%', px: 2 }}
          >
            <Link
              component={RouterLink}
              to={searchTerm ? `/search/${cid}${searchQuery ? `?searchTerm=${searchQuery}` : ''}` : "/"}
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
                  Back to {searchTerm ? 'search results' : 'home'}
                </Typography>
              </Stack>
            </Link>
          </Box>
          <Typography variant='h2' mt={1} pl={2}>
            {savedCids ? `${shows.find(obj => obj.id === params?.cid)?.emoji || savedCids.find(obj => obj.id === params?.cid)?.emoji} ${shows.find(obj => obj.id === params?.cid)?.title || savedCids.find(obj => obj.id === params?.cid)?.title}` : ''}
          </Typography>
        </Container>
      }
      {pathname.startsWith("/editor") &&
        <Container maxWidth='xl' disableGutters sx={{ px: 1 }}>
          <Box
            sx={{ width: '100%', px: 2 }}
          >
            <Link
              component={RouterLink}
              to={`/frame/${params?.cid}/${params?.season}/${params?.episode}/${params?.frame}${selectedFrameIndex ? `/${selectedFrameIndex}` : ''}${searchQuery ? `?searchTerm=${searchQuery}` : ''}`}
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
                  Back to frame
                </Typography>
              </Stack>
            </Link>
          </Box>
        </Container>
      }
      {Children.map(props.children, (child) => cloneElement(child, { shows }))}
      <FloatingActionButtons shows={cid} showAd={showAd} />

      {showAd && (
        <StyledAdFooter>
          <FixedMobileBannerAd />
        </StyledAdFooter>
      )}
      
      <AddCidPopup open={addNewCidOpen} setOpen={setAddNewCidOpen} />
    </>
  )
}
