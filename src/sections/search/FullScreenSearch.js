// FullScreenSearch.js

import styled from '@emotion/styled';
import { Alert, AlertTitle, Button, Fab, Grid, Typography, IconButton, Stack, useMediaQuery, Select, MenuItem, Chip, Container, ListSubheader, useTheme } from '@mui/material';
import { Box } from '@mui/system';
import { ArrowDownwardRounded, Favorite, MapsUgc, Shuffle } from '@mui/icons-material';
import { API, Auth, graphqlOperation } from 'aws-amplify';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { LoadingButton } from '@mui/lab';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import CloseIcon from '@mui/icons-material/Close';
import { UserContext } from '../../UserContext';
import useSearchDetails from '../../hooks/useSearchDetails';
import { searchPropTypes } from './SearchPropTypes';
// import Logo from '../../components/logo/Logo';
import { contentMetadataByStatus, listContentMetadata, listFavorites, listHomepageSections } from '../../graphql/queries';
import HomePageSection from './HomePageSection';
import HomePageBannerAd from '../../ads/HomePageBannerAd';
import useSearchDetailsV2 from '../../hooks/useSearchDetailsV2';
import AddCidPopup from '../../components/ipfs/add-cid-popup';
import FavoriteToggle from '../../components/FavoriteToggle';
import fetchShows from '../../utils/fetchShows';
import useLoadRandomFrame from '../../utils/loadRandomFrame';
import { useSubscribeDialog } from '../../contexts/useSubscribeDialog';
import EditorUpdates from '../../components/v2-feature-section/sections/editor-updates';
import PlatformUpdates from '../../components/v2-feature-section/sections/platform-updates';
import MemeSrcPro from '../../components/v2-feature-section/sections/memesrc-pro';
import Logo from '../../logo/logo';
// import FavoritesResetDialog from './FavoritesResetDialog';

const seriesOptions = [
  { id: '_universal', title: 'All Shows & Movies', emoji: '🌈' },
  { id: 'seinfeld', title: 'Seinfeld', emoji: '🥨' },
  { id: 'friends', title: 'Friends', emoji: '👫' },
  { id: 'breakingbad', title: 'Breaking Bad', emoji: '🧪' },
  { id: 'game_of_thrones', title: 'Game of Thrones', emoji: '🐉' },
];

/* --------------------------------- GraphQL -------------------------------- */

const listAliases = /* GraphQL */ `
  query ListAliases(
    $filter: ModelAliasFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listAliases(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        createdAt
        updatedAt
        aliasV2ContentMetadataId
        v2ContentMetadata {
          colorMain
          colorSecondary
          createdAt
          description
          emoji
          frameCount
          title
          updatedAt
          status
          id
          version
        }
        __typename
      }
      nextToken
      __typename
    }
  }
`;

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
  font-size: 18px;
  color: #333;
  background-color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  height: 50px;
  width: 100%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s;
  appearance: none;
  cursor: pointer;

  &:focus {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    outline: none;
  }
`;

// Create a search button component
const StyledSearchButton = styled(Button)`
  font-family: ${FONT_FAMILY};
  font-size: 18px;
  color: #fff;
  background-color: ${SECONDARY_COLOR};
  border-radius: 8px;
  padding: 10px 12px;
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

const StyledSearchInput = styled.input`
  font-family: ${FONT_FAMILY};
  font-size: 18px;
  color: #333;
  background-color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  width: 100%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s;
  height: 50px;
  &:focus {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    outline: none;
  }
`;

// Create a footer component
const StyledFooter = styled('footer')`
  bottom: 0;
  left: 0;
  line-height: 0;
  width: 100%;
  position: fixed;
  padding: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: transparent;
  z-index: 1200;
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

async function fetchSections() {
  const result = await API.graphql({
    ...graphqlOperation(listHomepageSections, { filter: {}, limit: 10 }),
    authMode: 'API_KEY',
  });
  return result.data.listHomepageSections.items;
}

FullScreenSearch.propTypes = searchPropTypes;

// Create a grid container component
const StyledGridContainer = styled(Grid)`
  min-height: 100vh;
`;

// Theme Defaults
const defaultTitleText = 'memeSRC';
const defaultBragText = 'Search 70 million+ templates';
const defaultFontColor = '#FFFFFF';
const defaultBackground = `linear-gradient(45deg,
  #5461c8 12.5% /* 1*12.5% */,
  #c724b1 0, #c724b1 25%   /* 2*12.5% */,
  #e4002b 0, #e4002b 37.5% /* 3*12.5% */,
  #ff6900 0, #ff6900 50%   /* 4*12.5% */,
  #f6be00 0, #f6be00 62.5% /* 5*12.5% */,
  #97d700 0, #97d700 75%   /* 6*12.5% */,
  #00ab84 0, #00ab84 87.5% /* 7*12.5% */,
  #00a3e0 0)`;

export default function FullScreenSearch({ searchTerm, setSearchTerm, seriesTitle, setSeriesTitle, searchFunction, metadata }) {
  const { localCids, setLocalCids, savedCids, cid, setCid, searchQuery: cidSearchQuery, setSearchQuery: setCidSearchQuery, setShowObj, loadingSavedCids } = useSearchDetailsV2()
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  // const [loadingRandom, setLoadingRandom] = useState(false);
  const [scrollToSections, setScrollToSections] = useState();
  const { show, setShow, searchQuery, setSearchQuery } = useSearchDetails();
  const isMd = useMediaQuery((theme) => theme.breakpoints.up('sm'));
  const [addNewCidOpen, setAddNewCidOpen] = useState(false);
  const { user, setUser, shows, setShows, defaultShow, handleUpdateDefaultShow } = useContext(UserContext);
  const { pathname } = useLocation();
  const { loadRandomFrame, loadingRandom, error } = useLoadRandomFrame();

  const [alertOpen, setAlertOpen] = useState(true);

  const location = useLocation();

  const [aliasesWithMetadata, setAliasesWithMetadata] = useState([]);
  const [aliasesLoading, setAliasesLoading] = useState(true);
  const [aliasesError, setAliasesError] = useState(null);

  const { openSubscriptionDialog } = useSubscribeDialog();

  const [favoritesInfoOpen, setFavoritesInfoOpen] = useState(true);

  // Scroll to top when arriving at this page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [])

  // useEffect(() => {
  //   const fetchAliasesRecursive = async (nextToken = null, accumulator = []) => {
  //     try {
  //       const result = await API.graphql(graphqlOperation(listAliases, {
  //         limit: 10,
  //         nextToken,
  //       }));

  //       const fetchedAliases = result.data.listAliases.items;
  //       const updatedAccumulator = [...accumulator, ...fetchedAliases];

  //       if (result.data.listAliases.nextToken) {
  //         return fetchAliasesRecursive(result.data.listAliases.nextToken, updatedAccumulator);
  //       }

  //       setAliasesWithMetadata(updatedAccumulator);
  //       setAliasesLoading(false);
  //       return updatedAccumulator;
  //     } catch (error) {
  //       console.error('Error fetching aliases:', error);
  //       setAliasesError('Failed to fetch aliases.');
  //       setAliasesLoading(false);
  //       return []; // Return an empty array in case of an error
  //     }
  //   };

  //   fetchAliasesRecursive();
  // }, []);

  // Theme States
  const theme = useTheme();
  const [currentThemeBragText, setCurrentThemeBragText] = useState(metadata?.frameCount ? `Search over ${metadata?.frameCount.toLocaleString('en-US')} meme templates from ${metadata?.title}` : defaultBragText);
  const [currentThemeTitleText, setCurrentThemeTitleText] = useState(metadata?.title || defaultTitleText);
  const [currentThemeFontFamily, setCurrentThemeFontFamily] = useState(metadata?.fontFamily || theme?.typography?.fontFamily);
  const [currentThemeFontColor, setCurrentThemeFontColor] = useState(metadata?.colorSecondary || defaultFontColor);
  const [currentThemeBackground, setCurrentThemeBackground] = useState(metadata?.colorMain ? { backgroundColor: `${metadata?.colorMain}` }
    :
    {
      backgroundImage: defaultBackground,
    }
  );

  const { sectionIndex, seriesId } = useParams();

  const navigate = useNavigate();

  // The handleChangeSeries function now only handles theme updates
  const handleChangeSeries = useCallback((newSeriesTitle) => {
    const selectedSeriesProperties = shows.find((object) => object.id === newSeriesTitle) || savedCids.find((object) => object.id === newSeriesTitle);

    if (!selectedSeriesProperties) {
      // setCurrentThemeBackground({ backgroundColor: `${selectedSeriesProperties.colorMain}` });
      // setCurrentThemeFontColor(selectedSeriesProperties.colorSecondary);
      // setCurrentThemeTitleText(selectedSeriesProperties.title);
      // setCurrentThemeBragText(
      //   `Search over ${selectedSeriesProperties.frameCount.toLocaleString('en-US')} meme templates from ${selectedSeriesProperties.title}`
      // );
      navigate('/')
    }
    // else {
    //   navigate('/')
    // }
  }, [shows, savedCids]);

  // useEffect(() => {
  //   console.log(metadata)
  // }, [metadata]);

  // This useEffect handles the data fetching
  useEffect(() => {
    async function getData() {
      // Get shows
      // const fetchedShows = await fetchShows();
      // console.log(fetchedShows)
      // setShows(fetchedShows);
      // setAliasesWithMetadata(fetchedShows);
      setLoading(false);
      setAliasesLoading(false);

      // Get homepage sections
      const fetchedSections = await fetchSections();
      setSections(fetchedSections);
    }
    getData();
  }, []);

  // This useEffect ensures the theme is applied based on the seriesId once the data is loaded
  useEffect(() => {
    // Check if shows have been loaded
    // console.log(defaultShow)
    if (shows.length > 0) {
      // Determine the series to use based on the URL or default to '_universal'
      const currentSeriesId = seriesId || (shows.some(show => show.isFavorite) ? defaultShow : '_universal');
      // console.log(seriesId || shows.some(show => show.isFavorite) ? defaultShow : '_universal')
      setShow(currentSeriesId)

      if (currentSeriesId !== seriesTitle) {
        setSeriesTitle(currentSeriesId); // Update the series title based on the URL parameter
        handleChangeSeries(currentSeriesId); // Update the theme

        // Navigation logic
        navigate((currentSeriesId === '_universal') ? '/' : `/${currentSeriesId}`);
      }
    }
  }, [seriesId, seriesTitle, shows, handleChangeSeries, navigate, defaultShow]);

  useEffect(() => {
    if (pathname === '/_favorites') {
      setCurrentThemeBragText(defaultBragText)
      setCurrentThemeTitleText(defaultTitleText)
      setCurrentThemeFontColor(defaultFontColor)
      setCurrentThemeFontFamily(theme?.typography?.fontFamily)
      setCurrentThemeBackground({
        backgroundImage: defaultBackground,
      })
    }
  }, [pathname])


  useEffect(() => {
    const handleScroll = () => {
      // Find the height of the entire document
      const { body } = document;
      const html = document.documentElement;
      const height = Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight
      );

      // Calculate how far from bottom the scroll down button should start fading out
      const scrollBottom = height - window.innerHeight - window.scrollY - 300;

      window.requestAnimationFrame(() => {
        const scrollDownBtn = document.getElementById('scroll-down-btn');

        // Fade out scroll down button towards bottom of the screen
        const op = scrollBottom / 100;
        scrollDownBtn.style.opacity = `${Math.min(Math.max(op, 0.0), 1)}`;

        // Hide scroll down button container once it's reached the bottom of the screen
        if (scrollBottom <= 0) {
          scrollDownBtn.parentElement.style.display = 'none';
        } else {
          scrollDownBtn.parentElement.style.display = 'flex';
        }

        // Change the background color of the scroll down button
        const windowHeight = window.innerHeight / 2;
        const scrollAmount = 1 - window.scrollY / windowHeight;
        const scrollRGB = Math.round(scrollAmount * 255);
        if (scrollRGB >= 0 && scrollRGB <= 255) {
          scrollDownBtn.style.backgroundColor = `rgb(${scrollRGB}, ${scrollRGB}, ${scrollRGB}, 0.50)`;
        }

        // Handle the fade in and out of the bottom buttons
        const bottomButtons = document.querySelectorAll('.bottomBtn');
        bottomButtons.forEach((elm) => {
          if (scrollAmount < 0) {
            elm.style.display = 'none';
          } else {
            if (elm.style.display !== 'flex') {
              elm.style.display = 'flex';
            }
            elm.style.opacity = scrollAmount;
          }
        });
      });
    };

    // Add event listener
    document.addEventListener('scroll', handleScroll);

    // Return a cleanup function to remove the event listener
    return () => {
      document.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    // Set the scrollSections state to contain all elements we want the scroll down button
    // to scroll to once they have all loaded
    setScrollToSections(document.querySelectorAll('[data-scroll-to]'));
    if (sections.length > 0 && sectionIndex) {
      const sectionElement = sectionIndex.toString();
      scrollToSection(sectionElement);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, sectionIndex]);

  const scrollToSection = (element) => {
    if (!element) {
      const nextScroll = {
        scrollPos: window.innerHeight,
        element: null,
      };

      let sectionChosen = false;
      scrollToSections.forEach((section) => {
        if (section.getBoundingClientRect().top > 0 && sectionChosen === false) {
          nextScroll.scrollPos = section.getBoundingClientRect().top;
          nextScroll.element = section;
          sectionChosen = true;
        }
      });

      if (nextScroll.element != null) {
        nextScroll.element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      const scrolltoelm = document.getElementById(element);
      // console.log(scrolltoelm);
      scrolltoelm.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getSessionID = async () => {
    let sessionID;
    if ('sessionID' in sessionStorage) {
      sessionID = sessionStorage.getItem('sessionID');
      return Promise.resolve(sessionID);
    }
    return API.get('publicapi', '/uuid')
      .then((generatedSessionID) => {
        sessionStorage.setItem('sessionID', generatedSessionID);
        return generatedSessionID;
      })
      .catch((err) => {
        console.log(`UUID Gen Fetch Error:  ${err}`);
        throw err;
      });
  };

  // const loadRandomFrame = useCallback(() => {
  //   setLoadingRandom(true);
  //   getSessionID().then((sessionId) => {
  //     const apiName = 'publicapi';
  //     const path = '/random';
  //     const myInit = {
  //       queryStringParameters: {
  //         series: show,
  //         sessionId,
  //       },
  //     };

  //     API.get(apiName, path, myInit)
  //       .then((response) => {
  //         const fid = response.frame_id;
  //         console.log(fid);
  //         navigate(`/frame/${fid}`);
  //         setSearchQuery(null)
  //         setLoadingRandom(false);
  //       })
  //       .catch((error) => {
  //         console.error(error);
  //         setLoadingRandom(false);
  //       });
  //   });
  // }, [navigate, seriesTitle]);

  // useEffect(() => {
  //   // Function to check and parse the local storage value
  //   const checkAndParseLocalStorage = (key) => {
  //     const storedValue = localStorage.getItem(key);
  //     if (!storedValue) {
  //       return null;
  //     }

  //     try {
  //       const parsedValue = JSON.parse(storedValue);
  //       return Array.isArray(parsedValue) ? parsedValue : null;
  //     } catch (e) {
  //       // If parsing fails, return null
  //       return null;
  //     }
  //   };

  //   if (!localCids) {
  //     // Attempt to retrieve and parse the 'custom_cids' from local storage
  //     const savedCids = checkAndParseLocalStorage('custom_cids');

  //     // If savedCids is an array, use it; otherwise, default to an empty array
  //     setLocalCids(savedCids || []);
  //   }
  //   console.log(localCids)

  // }, [localCids]);

  const searchCid = (e) => {
    e.preventDefault()
    setCidSearchQuery(searchTerm)
    navigate(`/search/${cid}/${encodeURIComponent(searchTerm)}`)
    return false
  }

  useEffect(() => {

    setCid(seriesId || metadata?.id || (shows.some(show => show.isFavorite) ? defaultShow : '_universal'))
    // console.log(seriesId || metadata?.id || shows.some(show => show.isFavorite) ? defaultShow : '_universal')


    return () => {
      if (pathname === '/') {
        // setCid(defaultShow || '_universal')
        setShowObj(null)
        setSearchQuery(null)
        setCidSearchQuery('')
        // console.log('Unset CID')
      }
    }
  }, [pathname, defaultShow]);

  // useEffect(() => {
  //   console.log('CHANGING DEFAULT: ', defaultShow)
  // }, [defaultShow]);

  return (
    <>
      {/* {user?.userDetails?.subscriptionStatus === 'active' && (
        <FavoritesResetDialog
          open={favoritesInfoOpen}
          onClose={() => setFavoritesInfoOpen(false)}
        />
      )} */}
      <StyledGridContainer container paddingX={3} sx={currentThemeBackground}>
        <Grid container marginY="auto" justifyContent="center" pb={isMd ? 0 : 8}>
          <Grid container justifyContent="center">
            <Grid item textAlign="center" marginBottom={2}>
              <Box onClick={() => handleChangeSeries(window.localStorage.getItem(`defaultsearch${user?.sub}`) || '_universal')}>
                <Box
                  component="img"
                  src={Logo({ color: currentThemeFontColor || 'white' })}
                  sx={{ objectFit: 'contain', cursor: 'pointer', display: 'block', width: '130px', height: 'auto', margin: '-10px auto 0px', color: 'yellow' }}
                />
              </Box>
              <Typography
                component="h1"
                variant="h1"
                fontSize={34}
                fontFamily={currentThemeFontFamily}
                sx={{ 
                  color: currentThemeFontColor, 
                  textShadow: '1px 1px 1px rgba(0, 0, 0, 0.20);', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                }}
              >
                {cid && cid !== '_universal' && cid !== '_favorites' && shows.length > 0 ? (
                  <Box sx={{ marginRight: 1 }}>
                    <FavoriteToggle
                      indexId={cid}
                      initialIsFavorite={shows.find(show => show.id === cid)?.isFavorite || false}
                    />
                  </Box>
                ) : (
                  <Box sx={{ marginX: 1, width: '36px' }} />
                )}
                {`${currentThemeTitleText} ${currentThemeTitleText === 'memeSRC' ? (user?.userDetails?.magicSubscription === 'true' ? 'Pro' : '') : ''}`}
                <Box sx={{ marginX: 1, width: '36px' }} /> {/* Invisible spacer on the right */}
              </Typography>
              {/* {!localStorage.getItem('alertDismissed-EARLY-ACCESS-COLLAGE-8fs667') && (
                <Alert
                  severity="info"
                  action={
                    <>
                      <Button
                        variant="outlined"
                        color="inherit"
                        size="small"
                        style={{ marginRight: '5px' }}
                        onClick={async () => {
                          navigate('/collage');
                        }}
                      >
                        Early Access
                      </Button>
                      <IconButton
                        color="inherit"
                        size="small"
                        onClick={() => {
                          localStorage.setItem('alertDismissed-EARLY-ACCESS-COLLAGE-8fs667', 'true');
                          setAlertOpen(false);
                        }}
                      >
                        <CloseIcon fontSize="inherit" />
                      </IconButton>
                    </>
                  }
                  sx={{
                    opacity: 0.9,
                    maxWidth: 400,
                    marginY: 1,
                  }}
                >
                  <b>New:</b> Collages!
                </Alert>
              )} */}
            </Grid>
          </Grid>
          <StyledSearchForm onSubmit={(e) => searchFunction(e)}>
            <Grid container justifyContent="center">
              <Grid item sm={3.5} xs={12} paddingX={0.25} paddingBottom={{ xs: 1, sm: 0 }}>
                <Select
                  value={cid || seriesTitle || (shows.some(show => show.isFavorite) ? defaultShow : '_universal')}
                  onChange={(e) => {
                    const selectedId = e.target.value;

                    if (selectedId === 'addNewCid') {
                      setAddNewCidOpen(true);
                    } else if (selectedId === 'editFavorites') {
                      navigate('/favorites'); // Navigate to the favorites editing page
                    } else {
                      const newSeriesTitle = e.target.value;
                      setCid(selectedId || '_universal');
                      setSeriesTitle(newSeriesTitle);
                      handleChangeSeries(newSeriesTitle);
                      if (newSeriesTitle === '_universal' || newSeriesTitle === '_favorites') {
                        handleUpdateDefaultShow(newSeriesTitle)
                      }
                      navigate((newSeriesTitle === '_universal') ? '/' : `/${newSeriesTitle}`);
                    }
                  }}
                  displayEmpty
                  inputProps={{ 'aria-label': 'series selection' }}
                  sx={{
                    fontFamily: FONT_FAMILY,
                    fontSize: '16px',
                    color: '#333',
                    backgroundColor: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    height: '50px',
                    width: '100%',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    transition: 'box-shadow 0.3s',
                    '&:focus': {
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                      outline: 'none',
                    },
                  }}
                >
                  {/* {console.log(shows || 'WAITING ON SHOWS')}
                  {console.log(cid || seriesTitle || defaultShow)}
                  {console.log(shows.some(show => show.isFavorite))} */}
                  <MenuItem value="_universal">🌈 All Shows & Movies</MenuItem>

                  {shows.some(show => show.isFavorite) ? (
                    <MenuItem value="_favorites">⭐ All Favorites</MenuItem>
                  ) : null}

                  {/* Check if user is subscribed or has favorites and directly render each item */}
                  {shows.some(show => show.isFavorite) ? (
                    <ListSubheader key="favorites-subheader">Favorites</ListSubheader>
                  ) : null}

                  {shows.some(show => show.isFavorite) ? (
                    shows.filter(show => show.isFavorite).map(show => (
                      <MenuItem key={show.id} value={show.id}>
                        ⭐ {show.emoji} {show.title}
                      </MenuItem>
                    ))
                  ) : null}

                  {user?.userDetails?.subscriptionStatus === 'active' || shows.some(show => show.isFavorite) ? (
                    <MenuItem value="editFavorites" style={{ fontSize: '0.9rem', opacity: 0.7 }}>
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
              </Grid>
              <Grid item sm={7} xs={12} paddingX={0.25} paddingBottom={{ xs: 1, sm: 0 }}>
                <StyledLabel htmlFor="search-term">
                  <StyledSearchInput
                    type="text"
                    id="search-term"
                    value={searchTerm}
                    placeholder="What's the quote?"
                    onChange={(e) => {
                      let value = e.target.value;

                      // Replace curly single quotes with straight single quotes
                      value = value.replace(/[\u2018\u2019]/g, "'");

                      // Replace curly double quotes with straight double quotes
                      value = value.replace(/[\u201C\u201D]/g, '"');

                      // Replace en-dash and em-dash with hyphen
                      value = value.replace(/[\u2013\u2014]/g, '-');

                      setSearchTerm(value);
                    }}
                  />
                </StyledLabel>
              </Grid>
              <Grid item sm={1.5} xs={12} paddingX={0.25} paddingBottom={{ xs: 1, sm: 0 }}>
                <StyledSearchButton
                  type="submit"
                  style={{ backgroundColor: 'black' }}
                  fullWidth={window.innerWidth <= 600}
                >
                  Search
                </StyledSearchButton>
              </Grid>
            </Grid>
          </StyledSearchForm>
          <Grid item xs={12} textAlign="center" color={currentThemeFontColor} marginTop={4}>
            <Typography component="h4" variant="h4" sx={{ marginTop: -2 }}>
              {currentThemeBragText}
            </Typography>
            {/* <Stack justifyContent='center'>
              <Box sx={{ width: isMd ? '600px' : '100%', mx: 'auto', maxHeight: '150px' }}>
                <HomePageBannerAd />
              </Box>
            </Stack> */}
            {/* <Button
              onClick={() => scrollToSection()}
              startIcon="🚀"
              sx={[{ marginTop: '12px', backgroundColor: 'unset', '&:hover': { backgroundColor: 'unset' } }]}
            >
              <Typography
                sx={{ textDecoration: 'underline', fontSize: '1em', fontWeight: '800', color: currentThemeFontColor }}
              >
                Beta: Layer editor and more!
              </Typography>
            </Button> */}
          </Grid>
          {user?.userDetails?.subscriptionStatus !== 'active' &&
            <Grid item xs={12} mt={2} mb={-8}>
              <center>
                <Box>
                  <Link to="/pro" style={{ textDecoration: 'none', marginBottom: 1 }}>
                    <Typography variant="body2" textAlign="center" color="white">
                      😎 Remove ads with <span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>memeSRC Pro</span>
                    </Typography>
                  </Link>
                  <HomePageBannerAd />
                </Box>
              </center>
            </Grid>
          }
        </Grid>
        <StyledLeftFooter className="bottomBtn">
          <a
            href="https://forms.gle/8CETtVbwYoUmxqbi7"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'white', textDecoration: 'none' }}
          >
            <Fab
              color="primary"
              aria-label="feedback"
              style={{ margin: '0 10px 0 0', backgroundColor: 'black', zIndex: '1300' }}
              size="medium"
            >
              <MapsUgc color="white" />
            </Fab>
          </a>
          <a
            href="https://memesrc.com/donate"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'white', textDecoration: 'none' }}
          >
            <Fab color="primary" aria-label="donate" style={{ backgroundColor: 'black', zIndex: '1300' }} size="medium">
              <Favorite />
            </Fab>
          </a>
        </StyledLeftFooter>
        <StyledRightFooter className="bottomBtn">
          <StyledButton
            onClick={() => { loadRandomFrame(show) }}
            loading={loadingRandom}
            startIcon={<Shuffle />}
            variant="contained"
            style={{ backgroundColor: 'black', marginLeft: 'auto', zIndex: '1300' }}
          >
            Random
          </StyledButton>
        </StyledRightFooter>
        <StyledFooter>
          <Fab
            color="primary"
            onClick={() => scrollToSection()}
            aria-label="donate"
            style={{
              backgroundColor: 'rgb(255, 255, 255, 0.50)',
              marginLeft: 'auto',
              marginRight: 'auto',
              marginBottom: '4px',
            }}
            size="small"
            id="scroll-down-btn"
          >
            <ArrowDownwardRounded />
          </Fab>
        </StyledFooter>
      </StyledGridContainer>
      {/* {sections.map((section) => (
        <HomePageSection
          key={section.id}
          index={section.index}
          backgroundColor={section.backgroundColor}
          textColor={section.textColor}
          title={section.title}
          subtitle={section.subtitle}
          buttons={JSON.parse(section.buttons)}
          bottomImage={JSON.parse(section.bottomImage)}
          buttonSubtext={JSON.parse(section.buttonSubtext)}
        />
      ))} */}
      <Container data-scroll-to id='editor-updates' maxWidth='true' sx={{ height: '100vh', backgroundColor: '#34933f' }}>
        <EditorUpdates backgroundColor='#34933f' textColor='white' large />
      </Container>

      <Container data-scroll-to id='platform-updates' maxWidth='true' sx={{ height: '100vh', backgroundColor: '#ff8d0a' }}>
        <PlatformUpdates backgroundColor='#ff8d0a' textColor='white' large />
      </Container>

      <Container data-scroll-to id='memesrc-pro' maxWidth='true' sx={{ height: '100vh', backgroundColor: '#0069cc' }}>
        <MemeSrcPro backgroundColor='#0069cc' textColor='white' large />
      </Container>
      <AddCidPopup open={addNewCidOpen} setOpen={setAddNewCidOpen} />
    </>
  );
}
