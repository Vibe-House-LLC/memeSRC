import styled from "@emotion/styled";
import { Button, Fab, Grid, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { ArrowDownwardRounded, Favorite, MapsUgc, Shuffle } from "@mui/icons-material";
import { API, graphqlOperation } from 'aws-amplify';
import { useCallback, useEffect, useState } from "react";
import { LoadingButton } from "@mui/lab";
import { useNavigate, useParams } from "react-router-dom";
import { searchPropTypes } from "./SearchPropTypes";
import Logo from "../../components/logo/Logo";
import { listContentMetadata, listHomepageSections } from '../../graphql/queries';
import HomePageSection from "./HomePageSection";

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
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: box-shadow 0.3s;
  height: 50px;
  &:focus {
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
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

async function fetchSections() {
  const result = await API.graphql({
    ...graphqlOperation(listHomepageSections, { filter: {}, limit: 10 }),
    authMode: "API_KEY"
  });
  return result.data.listHomepageSections.items;
}

FullScreenSearch.propTypes = searchPropTypes;

// Create a grid container component
const StyledGridContainer = styled(Grid)`
min-height: 100vh;
`;

// Theme Defaults
const defaultTitleText = 'memeSRC'
const defaultBragText = 'Search over 36 million screencaps from your favorite shows.'
const defaultFontColor = '#FFFFFF'
const defaultBackground = `linear-gradient(45deg,
  #5461c8 12.5% /* 1*12.5% */,
  #c724b1 0, #c724b1 25%   /* 2*12.5% */,
  #e4002b 0, #e4002b 37.5% /* 3*12.5% */,
  #ff6900 0, #ff6900 50%   /* 4*12.5% */,
  #f6be00 0, #f6be00 62.5% /* 5*12.5% */,
  #97d700 0, #97d700 75%   /* 6*12.5% */,
  #00ab84 0, #00ab84 87.5% /* 7*12.5% */,
  #00a3e0 0)`

export default function FullScreenSearch({
  searchTerms,
  setSearchTerm,
  seriesTitle,
  setSeriesTitle,
  searchFunction
}) {
  const [shows, setShows] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRandom, setLoadingRandom] = useState(false);
  const [scrollToSections, setScrollToSections] = useState();

  // Theme States
  const [currentThemeBragText, setCurrentThemeBragText] = useState(defaultBragText)
  const [currentThemeTitleText, setCurrentThemeTitleText] = useState(defaultTitleText)
  const [currentThemeFontColor, setCurrentThemeFontColor] = useState(defaultFontColor);
  const [currentThemeBackground, setCurrentThemeBackground] = useState({
    backgroundImage: defaultBackground
  });

  const { sectionIndex } = useParams();

  const navigate = useNavigate();

  const resetTheme = () => {
    setCurrentThemeBackground({ backgroundImage: defaultBackground })
    setCurrentThemeFontColor(defaultFontColor)
    setCurrentThemeTitleText(defaultTitleText)
    setCurrentThemeBragText(defaultBragText)
  }

  const handleChangeSeries = newSeriesTitle => {
    setSeriesTitle(newSeriesTitle);
    if (newSeriesTitle !== '_universal') {
      const selectedSeriesProperties = shows.findIndex(object => object.id === newSeriesTitle);
      console.log(selectedSeriesProperties)
      setCurrentThemeBackground({ backgroundColor: `${shows[selectedSeriesProperties].colorMain}` })
      setCurrentThemeFontColor(shows[selectedSeriesProperties].colorSecondary);
      setCurrentThemeTitleText(shows[selectedSeriesProperties].title)
      setCurrentThemeBragText(`Search over ${shows[selectedSeriesProperties].frameCount.toLocaleString('en-US')} frames from ${shows[selectedSeriesProperties].title}`)
    } else {
      resetTheme();
    }
  }

  // useEffect(() => {
  //   changeTheme()
  // }, [seriesTitle])



  useEffect(() => {
    async function getData() {
      // Get shows
      const shows = await fetchShows();
      setShows(shows);
      setLoading(false);
      // Get homepage sections
      const sections = await fetchSections();
      setSections(sections)
    }
    getData();
  }, []);

  useEffect(() => {
    document.addEventListener('scroll', () => {

      // Find the height of the entire document
      const { body } = document;
      const html = document.documentElement;
      const height = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);

      // Calculate how far from bottom the scroll down button should start fading out
      const scrollBottom = height - window.innerHeight - window.scrollY - 300

      window.requestAnimationFrame(() => {

        const scrollDownBtn = document.getElementById('scroll-down-btn');

        // Fade out scroll down button towards bottom of the screen
        const op = scrollBottom / 100
        scrollDownBtn.style.opacity = `${Math.min(Math.max(op, 0.0000), 1)}`;

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
          scrollDownBtn.style.backgroundColor = `rgb(${scrollRGB}, ${scrollRGB}, ${scrollRGB}, 0.50)`
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
  }, [sections, sectionIndex])


  const scrollToSection = (element) => {
    if (!element) {
      const nextScroll = {
        'scrollPos': window.innerHeight,
        'element': null
      }

      let sectionChosen = false;
      scrollToSections.forEach((section) => {
        if (section.getBoundingClientRect().top > 0 && sectionChosen === false) {
          nextScroll.scrollPos = section.getBoundingClientRect().top;
          nextScroll.element = section;
          sectionChosen = true;
        }
      });

      if (nextScroll.element != null) {
        nextScroll.element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      const scrolltoelm = document.getElementById(element);
      console.log(scrolltoelm);
      scrolltoelm.scrollIntoView({ behavior: "smooth" });
    }
  }

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
          series: seriesTitle,
          sessionId
        }
      }

      API.get(apiName, path, myInit)
        .then(response => {
          const fid = response.frame_id;
          console.log(fid)
          navigate(`/editor/${fid}`);
          setLoadingRandom(false);
        })
        .catch(error => {
          console.error(error);
          setLoadingRandom(false);
        });
    })

  }, [navigate, seriesTitle]);

  return (
    <>
      <StyledGridContainer container paddingX={3} sx={currentThemeBackground}>
        <Grid container marginY='auto' justifyContent='center'>
          <Grid container justifyContent='center'>
            <Grid item textAlign='center' marginBottom={5}>
              <Typography component='h1' variant='h1' sx={{ color: currentThemeFontColor, textShadow: '1px 1px 3px rgba(0, 0, 0, 0.30);' }}>
                <Box onClick={() => handleChangeSeries('_universal')}>
                  <Logo sx={{ display: 'inline', width: '150px', height: 'auto', margin: '-18px', color: 'yellow' }} color="white" />
                </Box>
                {currentThemeTitleText}
              </Typography>
            </Grid>
          </Grid>
          <StyledSearchForm onSubmit={e => searchFunction(e)}>
            <Grid container justifyContent='center'>
              <Grid item sm={3.5} xs={12} paddingX={0.25} paddingBottom={{ xs: 1, sm: 0 }}>
                <StyledSearchSelector onChange={(x) => { handleChangeSeries(x.target.value); }} value={seriesTitle}>
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
                <StyledSearchButton type="submit" style={{ backgroundColor: "black" }} fullWidth={{ xs: true, sm: false }}>Search</StyledSearchButton>
              </Grid>
            </Grid>
          </StyledSearchForm>
          <Grid item xs={12} textAlign='center' color={currentThemeFontColor} marginTop={4}>
            <Typography component='h4' variant='h4'>
              {currentThemeBragText}
            </Typography>
            <Button onClick={() => scrollToSection()} startIcon='🚀' sx={[{ marginTop: '12px', backgroundColor: 'unset', '&:hover': { backgroundColor: 'unset' } }]}>
              <Typography sx={{ textDecoration: 'underline', fontSize: '1em', fontWeight: '800', color: currentThemeFontColor }}>
                Beta: Layer editor and more!
              </Typography>
            </Button>
          </Grid>
        </Grid>
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
        <StyledFooter>
          <Fab color="primary" onClick={() => scrollToSection()} aria-label="donate" style={{ backgroundColor: 'rgb(255, 255, 255, 0.50)', marginLeft: 'auto', marginRight: 'auto', marginBottom: '4px' }} size='small' id='scroll-down-btn'>
            <ArrowDownwardRounded />
          </Fab>
        </StyledFooter>
      </StyledGridContainer>
      {sections.map((section) =>
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
      )}
    </>
  )
}
