// FullScreenSearch.js

import styled from '@emotion/styled';
import { Button, Fab, Grid, Typography, useMediaQuery, Select, MenuItem, ListSubheader, useTheme } from '@mui/material';
import { Box } from '@mui/system';
import { Favorite, MapsUgc, Shuffle } from '@mui/icons-material';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { LoadingButton } from '@mui/lab';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { UserContext } from '../../UserContext';
import useSearchDetails from '../../hooks/useSearchDetails';
import { searchPropTypes } from './SearchPropTypes';
import HomePageBannerAd from '../../ads/HomePageBannerAd';
import useSearchDetailsV2 from '../../hooks/useSearchDetailsV2';
import AddCidPopup from '../../components/ipfs/add-cid-popup';
import FavoriteToggle from '../../components/FavoriteToggle';
import useLoadRandomFrame from '../../utils/loadRandomFrame';
import Logo from '../../logo/logo';
import FixedMobileBannerAd from '../../ads/FixedMobileBannerAd';

/* --------------------------------- GraphQL -------------------------------- */

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

// Combine footer styles into one component
const StyledFooter = styled('footer')(({ position = 'left' }) => ({
  bottom: 0,
  [position]: 0,
  lineHeight: 0,
  position: 'fixed',
  padding: '10px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'transparent',
  zIndex: 1300
}));

// Simplified grid container
const StyledGridContainer = styled(Grid)`
  ${({ theme }) => `
    min-height: 100vh;
    padding-left: ${theme.spacing(3)};
    padding-right: ${theme.spacing(3)};
  `}
`;

FullScreenSearch.propTypes = searchPropTypes;

// Theme Defaults
const defaultTitleText = 'memeSRC';
const defaultBragText = 'Search 80 million+ templates';
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
  const { savedCids, cid, setCid, setSearchQuery: setCidSearchQuery, setShowObj } = useSearchDetailsV2()
  const { show, setShow, setSearchQuery } = useSearchDetails();
  const isMd = useMediaQuery((theme) => theme.breakpoints.up('sm'));
  const [addNewCidOpen, setAddNewCidOpen] = useState(false);
  const { user, shows, defaultShow, handleUpdateDefaultShow } = useContext(UserContext);
  const { pathname } = useLocation();
  const { loadRandomFrame, loadingRandom, } = useLoadRandomFrame();

  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));

  // Scroll to top when arriving at this page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [])

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

  const { seriesId } = useParams();

  const navigate = useNavigate();

  // The handleChangeSeries function now only handles theme updates
  const handleChangeSeries = useCallback((newSeriesTitle) => {
    const selectedSeriesProperties = shows.find((object) => object.id === newSeriesTitle) || savedCids.find((object) => object.id === newSeriesTitle);
    if (!selectedSeriesProperties) {
      navigate('/')
    }
  }, [shows, savedCids, navigate]);

  // This useEffect ensures the theme is applied based on the seriesId once the data is loaded
  useEffect(() => {
    // Check if shows have been loaded
    if (shows.length > 0) {
      // Determine the series to use based on the URL or default to '_universal'
      const currentSeriesId = seriesId || (shows.some(show => show.isFavorite) ? defaultShow : '_universal');
      setShow(currentSeriesId)

      if (currentSeriesId !== seriesTitle) {
        setSeriesTitle(currentSeriesId); // Update the series title based on the URL parameter
        handleChangeSeries(currentSeriesId); // Update the theme

        // Navigation logic
        navigate((currentSeriesId === '_universal') ? '/' : `/${currentSeriesId}`);
      }
    }
  }, [seriesId, seriesTitle, shows, handleChangeSeries, navigate, defaultShow, setSeriesTitle, setShow]);

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
  }, [pathname, theme?.typography?.fontFamily])

  useEffect(() => {

    setCid(seriesId || metadata?.id || (shows.some(show => show.isFavorite) ? defaultShow : '_universal'))

    return () => {
      if (pathname === '/') {
        setShowObj(null)
        setSearchQuery(null)
        setCidSearchQuery('')
      }
    }
  }, [pathname, defaultShow, metadata?.id, seriesId, setCid, setCidSearchQuery, setSearchQuery, setShowObj, shows]);


  return (
    <>
      <StyledGridContainer container sx={currentThemeBackground}>
        <Grid container marginY="auto" justifyContent="center" pb={isMd ? 0 : 8}>
          <Grid container justifyContent="center">
            <Grid item textAlign="center" marginBottom={2}>
              <Box onClick={() => handleChangeSeries(window.localStorage.getItem(`defaultsearch${user?.sub}`) || '_universal')}>
                <Box
                  component="img"
                  src={Logo({ color: currentThemeFontColor || 'white' })}
                  sx={{ 
                    objectFit: 'contain', 
                    cursor: 'pointer', 
                    display: 'block', 
                    width: '130px', 
                    height: 'auto',
                    margin: '0 auto',
                    color: 'yellow' 
                  }}
                />
              </Box>
              <Typography
                component="h1"
                variant="h1"
                fontSize={34}
                fontFamily={currentThemeFontFamily}
                sx={{ 
                  color: currentThemeFontColor, 
                  textShadow: '1px 1px 1px rgba(0, 0, 0, 0.20)',
                  display: 'grid',
                  gridTemplateColumns: '36px 1fr 36px',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                {cid && cid !== '_universal' && cid !== '_favorites' && shows.length > 0 ? (
                  <FavoriteToggle
                    indexId={cid}
                    initialIsFavorite={shows.find(show => show.id === cid)?.isFavorite || false}
                  />
                ) : (
                  <span />
                )}
                {`${currentThemeTitleText} ${currentThemeTitleText === 'memeSRC' ? (user?.userDetails?.magicSubscription === 'true' ? 'Pro' : '') : ''}`}
                <span />
              </Typography>
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
                      let { value } = e.target;

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
          <Grid item xs={12} textAlign="center" color={currentThemeFontColor} marginBottom={2} marginTop={1}>
            <Typography component="h4" variant="h4">
              {currentThemeBragText}
            </Typography>
          </Grid>
          {user?.userDetails?.subscriptionStatus !== 'active' &&
            <Grid item xs={12} mt={1}>
              <center>
                <Box >
                  {isMobile ? <FixedMobileBannerAd /> : <HomePageBannerAd />}
                  <Link to="/pro" style={{ textDecoration: 'none' }}>
                    <Typography variant="body2" textAlign="center" color="white" sx={{ marginTop: 1 }}>
                      ☝️ Remove ads with <span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>memeSRC Pro</span>
                    </Typography>
                  </Link>
                </Box>
              </center>
            </Grid>
          }
        </Grid>
        <StyledFooter position="left" className="bottomBtn">
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
        </StyledFooter>
        <StyledFooter position="right" className="bottomBtn">
          <StyledButton
            onClick={() => { loadRandomFrame(show) }}
            loading={loadingRandom}
            startIcon={<Shuffle />}
            variant="contained"
            style={{ backgroundColor: 'black', marginLeft: 'auto', zIndex: '1300' }}
          >
            Random
          </StyledButton>
        </StyledFooter>
      </StyledGridContainer>
      <AddCidPopup open={addNewCidOpen} setOpen={setAddNewCidOpen} />
    </>
  );
}
