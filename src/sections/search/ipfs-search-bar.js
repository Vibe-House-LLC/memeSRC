// ipfs-search-bar.js

import styled from "@emotion/styled";
import { Link, Grid, InputBase, Typography, Divider, Box, Stack, Container, Button } from "@mui/material";
import { ArrowBack, Close, Search } from "@mui/icons-material";
import { Children, cloneElement, useContext, useEffect, useRef, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { searchPropTypes } from "./SearchPropTypes";
import useSearchDetailsV2 from "../../hooks/useSearchDetailsV2";
import AddCidPopup from "../../components/ipfs/add-cid-popup";
import { UserContext } from "../../UserContext";
import FixedMobileBannerAd from '../../ads/FixedMobileBannerAd';
import FloatingActionButtons from "../../components/floating-action-buttons/FloatingActionButtons";
import { trackUsageEvent } from '../../utils/trackUsageEvent';
import SeriesSelectorDialog from '../../components/SeriesSelectorDialog';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

// Define constants for colors and fonts
const FONT_FAMILY = 'Roboto, sans-serif';

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
  const { user, shows, defaultShow } = useContext(UserContext);
  const { searchQuery, setSearchQuery, cid = shows.some(show => show.isFavorite) ? params?.cid || defaultShow : params?.cid || '_universal', setCid, selectedFrameIndex, setSelectedFrameIndex, savedCids } = useSearchDetailsV2();
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('searchTerm');

  /* ----------------------------------- New ---------------------------------- */

  const searchInputRef = useRef(null);

  const [search, setSearch] = useState(searchTerm || '');
  const [addNewCidOpen, setAddNewCidOpen] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
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
    if (searchTerm) {
      setSearchQuery(searchTerm);
      setSearch(searchTerm);
    }
  }, [searchTerm]);

  const handleSelectSeries = (data) => {
    if (data === "addNewCid") {
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



  const searchFunction = (searchEvent) => {
    searchEvent?.preventDefault();
    // console.log(search)
    const selectedCid = cid || params?.cid || (shows.some(show => show.isFavorite) ? defaultShow : '_universal');
    const normalizedSearch = typeof search === 'string' ? search.trim() : '';

    let resolvedIndex = selectedCid;
    if (selectedCid === '_favorites') {
      resolvedIndex = shows.filter((show) => show.isFavorite).map((show) => show.id).join(',') || '_favorites';
    }

    trackUsageEvent('search', {
      index: selectedCid,
      searchTerm: normalizedSearch,
      resolvedIndex,
      source: 'IpfsSearchBar',
    });

    navigate(`/search/${selectedCid}/?searchTerm=${encodeURIComponent(search || '')}`)
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
            {(() => {
              const currentLabel = (() => {
                if (cid === '_universal') return '🌈 All Shows & Movies';
                if (cid === '_favorites') return '⭐ All Favorites';
                const found = shows.find((s) => s.id === cid) || savedCids.find((s) => s.id === cid);
                return found ? `${found.emoji ? `${found.emoji} ` : ''}${found.title}` : 'Select show or movie';
              })();

              const includeAllFav = shows.some((s) => s.isFavorite);

              return (
                <>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                    <Button
                      size="small"
                      onClick={() => setSelectorOpen(true)}
                      endIcon={<ArrowDropDownIcon fontSize="small" />}
                      sx={{
                        minWidth: 'auto',
                        width: 'fit-content',
                        height: 40,
                        fontFamily: FONT_FAMILY,
                        fontSize: '16px',
                        fontWeight: 400,
                        bgcolor: 'transparent',
                        color: '#fff',
                        borderRadius: 0,
                        px: 0,
                        textTransform: 'none',
                        whiteSpace: 'nowrap',
                        '&:hover': { bgcolor: 'transparent' },
                      }}
                    >
                      {currentLabel}
                    </Button>
                  </Box>
                  <SeriesSelectorDialog
                    open={selectorOpen}
                    onClose={() => setSelectorOpen(false)}
                    onSelect={handleSelectSeries}
                    shows={shows}
                    savedCids={savedCids}
                    currentValueId={cid}
                    includeAllFavorites={includeAllFav}
                  />
                </>
              );
            })()}
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
