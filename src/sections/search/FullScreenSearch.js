import styled from '@emotion/styled';
import { Alert, AlertTitle, Button, Fab, Grid, Typography, IconButton, Stack, useMediaQuery } from '@mui/material';
import { Box } from '@mui/system';
import { ArrowDownwardRounded, Favorite, MapsUgc, Shuffle } from '@mui/icons-material';
import { API, graphqlOperation } from 'aws-amplify';
import { useCallback, useContext, useEffect, useState } from 'react';
import { LoadingButton } from '@mui/lab';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import CloseIcon from '@mui/icons-material/Close';
import { UserContext } from '../../UserContext';
import useSearchDetails from '../../hooks/useSearchDetails';
import { searchPropTypes } from './SearchPropTypes';
import Logo from '../../components/logo/Logo';
import { contentMetadataByStatus, listContentMetadata, listHomepageSections } from '../../graphql/queries';
import HomePageSection from './HomePageSection';
import HomePageBannerAd from '../../ads/HomePageBannerAd';
import useSearchDetailsV2 from '../../hooks/useSearchDetailsV2';
import AddCidPopup from '../../components/ipfs/add-cid-popup';

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

async function fetchShows() {
  const result = await API.graphql({
    ...graphqlOperation(contentMetadataByStatus, { filter: {}, limit: 50, status: 1 }),
    authMode: 'API_KEY',
  });
  const sortedMetadata = result.data.contentMetadataByStatus.items.sort((a, b) => {
    if (a.title < b.title) return -1;
    if (a.title > b.title) return 1;
    return 0;
  });
  return sortedMetadata;
}

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
const defaultBragText = 'Search 47 million+ screencaps';
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

export default function FullScreenSearch({ searchTerm, setSearchTerm, seriesTitle, setSeriesTitle, searchFunction }) {
  const { localCids, setLocalCids, cid, setCid, searchQuery: cidSearchQuery, setSearchQuery: setCidSearchQuery, setShowObj } = useSearchDetailsV2()
  const [shows, setShows] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRandom, setLoadingRandom] = useState(false);
  const [scrollToSections, setScrollToSections] = useState();
  const { show, setShow, searchQuery, setSearchQuery } = useSearchDetails();
  const isMd = useMediaQuery((theme) => theme.breakpoints.up('sm'));
  const [addNewCidOpen, setAddNewCidOpen] = useState(false);
  const { user, setUser } = useContext(UserContext);

  const [alertOpen, setAlertOpen] = useState(true);

  const location = useLocation();

  // Theme States
  const [currentThemeBragText, setCurrentThemeBragText] = useState(defaultBragText);
  const [currentThemeTitleText, setCurrentThemeTitleText] = useState(defaultTitleText);
  const [currentThemeFontColor, setCurrentThemeFontColor] = useState(defaultFontColor);
  const [currentThemeBackground, setCurrentThemeBackground] = useState({
    backgroundImage: defaultBackground,
  });

  const { sectionIndex, seriesId } = useParams();

  const navigate = useNavigate();

  // The handleChangeSeries function now only handles theme updates
  const handleChangeSeries = useCallback((newSeriesTitle) => {
    const selectedSeriesProperties = shows.find((object) => object.id === newSeriesTitle);

    if (selectedSeriesProperties) {
      setCurrentThemeBackground({ backgroundColor: `${selectedSeriesProperties.colorMain}` });
      setCurrentThemeFontColor(selectedSeriesProperties.colorSecondary);
      setCurrentThemeTitleText(selectedSeriesProperties.title);
      setCurrentThemeBragText(
        `Search over ${selectedSeriesProperties.frameCount.toLocaleString('en-US')} frames from ${selectedSeriesProperties.title
        }`
      );
    } else {
      navigate('/')
    }
  }, [shows]);

  // This useEffect handles the data fetching
  useEffect(() => {
    async function getData() {
      // Get shows
      const fetchedShows = await fetchShows();
      setShows(fetchedShows);
      setLoading(false);

      // Get homepage sections
      const fetchedSections = await fetchSections();
      setSections(fetchedSections);
    }
    getData();
  }, []);

  // This useEffect ensures the theme is applied based on the seriesId once the data is loaded
  useEffect(() => {
    // Check if shows have been loaded
    if (shows.length > 0) {
      // Determine the series to use based on the URL or default to '_universal'
      const currentSeriesId = seriesId || '_universal';

      setShow(currentSeriesId)

      if (currentSeriesId !== seriesTitle) {
        setSeriesTitle(currentSeriesId); // Update the series title based on the URL parameter
        handleChangeSeries(currentSeriesId); // Update the theme

        // Navigation logic
        navigate(currentSeriesId === '_universal' ? '/' : `/${currentSeriesId}`);
      }
    }
  }, [seriesId, seriesTitle, shows, handleChangeSeries, navigate]);


  useEffect(() => {
    document.addEventListener('scroll', () => {
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
    });
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
      console.log(scrolltoelm);
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

  const loadRandomFrame = useCallback(() => {
    setLoadingRandom(true);
    getSessionID().then((sessionId) => {
      const apiName = 'publicapi';
      const path = '/random';
      const myInit = {
        queryStringParameters: {
          series: show,
          sessionId,
        },
      };

      API.get(apiName, path, myInit)
        .then((response) => {
          const fid = response.frame_id;
          console.log(fid);
          navigate(`/frame/${fid}`);
          setSearchQuery(null)
          setLoadingRandom(false);
        })
        .catch((error) => {
          console.error(error);
          setLoadingRandom(false);
        });
    });
  }, [navigate, seriesTitle]);

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

    if (!localCids) {
      // Attempt to retrieve and parse the 'custom_cids' from local storage
      const savedCids = checkAndParseLocalStorage('custom_cids');

      // If savedCids is an array, use it; otherwise, default to an empty array
      setLocalCids(savedCids || []);
    }
    console.log(localCids)

  }, [localCids]);

  const searchCid = (e) => {
    e.preventDefault()
    setCidSearchQuery(searchTerm)
    navigate(`/v2/search/${cid}/${encodeURIComponent(searchTerm)}`)
    return false
  }

  useEffect(() => {
    
  
    return () => {
      setCid(null)
      setShowObj(null)
      setSearchQuery(null)
      console.log('Unset CID')
    }
  }, []);

  return (
    <>
      <StyledGridContainer container paddingX={3} sx={currentThemeBackground}>
        <Grid container marginY="auto" justifyContent="center" pb={isMd ? 0 : 8}>
          <Grid container justifyContent="center">
            <Grid item textAlign="center" marginBottom={5}>
              <Typography
                component="h1"
                variant="h1"
                fontSize={34}
                sx={{ color: currentThemeFontColor, textShadow: '1px 1px 3px rgba(0, 0, 0, 0.30);' }}
              >
                <Box onClick={() => handleChangeSeries('_universal')}>
                  <Logo
                    sx={{ display: 'inline', width: '130px', height: 'auto', margin: '-18px', color: 'yellow' }}
                    color="white"
                  />
                </Box>
                {currentThemeTitleText}
              </Typography>
              {!localStorage.getItem('alertDismissed-UPLOADS-auir9o89rd') && (
                <center>
                  <Alert
                    severity="success"
                    action={
                      <>
                        <Button
                          component={Link}
                          to="/edit"
                          variant="outlined"
                          color="inherit"
                          size="small"
                          style={{ marginRight: '5px' }}
                        >
                          Edit
                        </Button>
                        <IconButton
                          color="inherit"
                          size="small"
                          onClick={() => {
                            localStorage.setItem('alertDismissed-UPLOADS-auir9o89rd', 'true');
                            setAlertOpen(false);
                          }}
                        >
                          <CloseIcon fontSize="inherit" />
                        </IconButton>
                      </>
                    }
                    sx={{
                      marginTop: 2,
                      marginBottom: -3,
                      opacity: 0.9,
                      maxWidth: 400
                    }}
                  >
                    <b>New:</b> Edit&nbsp;your&nbsp;own&nbsp;pics!
                  </Alert>
                </center>
              )}
            </Grid>
          </Grid>
          <StyledSearchForm onSubmit={(e) => cid ? searchCid(e) : searchFunction(e)}>
            <Grid container justifyContent="center">
              <Grid item sm={3.5} xs={12} paddingX={0.25} paddingBottom={{ xs: 1, sm: 0 }}>
                <StyledSearchSelector
                  onChange={(e) => {
                    const selectedId = e.target.value;

                    if (selectedId === 'addNewCid') {
                      setAddNewCidOpen(true)
                    } else {
                      const savedCid = localCids.find(obj => obj.cid === selectedId)
                      if (savedCid) {
                        setCid(selectedId)
                        handleChangeSeries('_universal')
                      } else {
                        const newSeriesTitle = e.target.value;
                        setCid()
                        setSeriesTitle(newSeriesTitle); // Update the series title based on the selection
                        handleChangeSeries(newSeriesTitle); // Update the theme
                        navigate(newSeriesTitle === '_universal' ? '/' : `/${newSeriesTitle}`); // Navigate
                      }
                    }

                  }}
                  value={cid || seriesTitle}
                >
                  <option key="_universal" value="_universal">
                    🌈 All Shows & Movies
                  </option>
                  {loading ? (
                    <option key="loading" value="loading" disabled>
                      Loading...
                    </option>
                  ) : (
                    shows.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.emoji} {item.title}
                      </option>
                    ))
                  )}
                  <option disabled value=''>IPFS</option>
                  {!loading && localCids && localCids.map(obj =>
                    <option key={obj.cid} value={obj.cid}>{obj.title}</option>
                  )}
                  <option key='addNew' value='addNewCid'>+ Add New CID</option>
                </StyledSearchSelector>
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
            <Grid item xs={12} mt={2}>
              <center>
                <Box sx={{ maxWidth: '800px'}}>
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
            onClick={loadRandomFrame}
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
      {sections.map((section) => (
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
      ))}
      <AddCidPopup open={addNewCidOpen} setOpen={setAddNewCidOpen} />
    </>
  );
}
