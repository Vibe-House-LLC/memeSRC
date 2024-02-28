import styled from "@emotion/styled";
import { Link, Fab, FormControl, Grid, InputBase, MenuItem, Select, Typography, Divider } from "@mui/material";
import { Favorite, MapsUgc, Search, Shuffle } from "@mui/icons-material";
import { API, graphqlOperation } from 'aws-amplify';
import { useCallback, useEffect, useState } from "react";
import { LoadingButton } from "@mui/lab";
import { Outlet, Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { searchPropTypes } from "./SearchPropTypes";
import Logo from "../../components/logo/Logo";
import { contentMetadataByStatus, listContentMetadata } from '../../graphql/queries';
import useSearchDetails from "../../hooks/useSearchDetails";
import useSearchDetailsV2 from "../../hooks/useSearchDetailsV2";
import AddCidPopup from "../../components/ipfs/add-cid-popup";

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
  paddingBottom: '10px'
}));

async function fetchShows() {
  const result = await API.graphql({
    ...graphqlOperation(contentMetadataByStatus, { filter: {}, limit: 50, status: 1 }),
    authMode: "API_KEY"
  });
  const sortedMetadata = result.data.contentMetadataByStatus.items.sort((a, b) => {
    if (a.title < b.title) return -1;
    if (a.title > b.title) return 1;
    return 0;
  });
  return sortedMetadata;
}

IpfsSearchBar.propTypes = searchPropTypes;


export default function IpfsSearchBar(props) {
  const { show, setShow, searchQuery, setSearchQuery, cid = '', setCid, localCids, setLocalCids, showObj, setShowObj, selectedFrameIndex, setSelectedFrameIndex } = useSearchDetailsV2();
  const params = useParams();
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRandom, setLoadingRandom] = useState(false);
  const { children } = props

  /* ----------------------------------- New ---------------------------------- */

  const [search, setSearch] = useState(searchQuery || '');
  const [addNewCidOpen, setAddNewCidOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {

    if (params.cid) {
      setCid(params.cid)
      console.log('SET CID')
    }
  }, [params?.cid]);

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

  }, [localCids]); // Empty dependency array means this effect runs once on mount


  useEffect(() => {
    if (params.searchTerms) {
      setSearchQuery(params.searchTerms)
      setSearch(params?.searchTerms)
    }
  }, [params?.searchTerms]);

  useEffect(() => {
    console.log(cid)
  }, [cid]);

  const handleSelectSeries = (data) => {
    if (data?.addNew) {
      setAddNewCidOpen(true)
    } else {
      const savedCid = localCids.find(obj => obj.cid === data)
      if (savedCid) {
        navigate(`/v2/search/${savedCid.cid}/${encodeURIComponent(search)}`)
      } else {
        navigate(`/search/${data}/${encodeURIComponent(search)}`)
      }
    }
  }

  useEffect(() => {
    setSelectedFrameIndex()
  }, [params?.subtitleIndex]);


  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    async function getData() {
      // Get shows
      const shows = await fetchShows();
      setShows(shows);
      setLoading(false);
    }
    getData();
  }, []);

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
  }, [navigate]);

  const searchFunction = (searchEvent) => {
    searchEvent.preventDefault();
    console.log(search)
    navigate(`/v2/search/${cid}/${encodeURIComponent(search)}`)
    return false
  }

  return (
    <>
      <StyledHeader>
        <Grid container mb={1.5} paddingX={2}>
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
                value={search}
                onChange={(e) => {
                  let value = e.target.value;

                  // Replace curly single quotes with straight single quotes
                  value = value.replace(/[\u2018\u2019]/g, "'");

                  // Replace curly double quotes with straight double quotes
                  value = value.replace(/[\u201C\u201D]/g, '"');

                  // Replace en-dash and em-dash with hyphen
                  value = value.replace(/[\u2013\u2014]/g, '-');

                  // setSearchTerm(value);
                  setSearch(value)
                }}
              />
            </form>
          </Grid>
        </Grid>
        <Grid container wrap="nowrap" sx={{ overflowX: "scroll", flexWrap: "nowrap", scrollbarWidth: 'none', '&::-webkit-scrollbar': { height: '0 !important', width: '0 !important', display: 'none' } }} paddingX={2}>
          <Grid item marginLeft={{ md: 6 }}>

            <FormControl
              // disabled={resultsLoading}
              variant="standard"
              sx={{ minWidth: 120 }}
            >
              <Select
                labelId="demo-simple-select-standard-label"
                id="demo-simple-select-standard"
                value={cid}
                onChange={(x) => {
                  handleSelectSeries(x.target.value)
                }}
                label="Age"
                size="small"
                autoWidth
                disableUnderline
              >
                {console.log(cid)}
                <MenuItem key='_universal' value='_universal'>🌈 All Shows & Movies</MenuItem>
                {(loading) ? <MenuItem key="loading" value="loading" disabled>Loading...</MenuItem> : shows.map((item) => (
                  <MenuItem key={item.id} value={item.id}>{item.emoji} {item.title}</MenuItem>
                ))}
                <Divider />
                <MenuItem disabled value=''>IPFS</MenuItem>
                <Divider />
                {!loading && localCids && localCids.map(obj => 
                  <MenuItem key={obj.cid} value={obj.cid}>{obj.title}</MenuItem>
                )}
                <MenuItem key='addNew' value={{addNew: true}}>+ Add New CID</MenuItem>
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
      <Divider sx={{ mb: 2.5 }} />
      <Outlet />
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
      <AddCidPopup open={addNewCidOpen} setOpen={setAddNewCidOpen} />
    </>
  )
}
