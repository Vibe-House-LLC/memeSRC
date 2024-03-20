import styled from "@emotion/styled";
import { Link, Fab, FormControl, Grid, InputBase, MenuItem, Select, Typography, Divider } from "@mui/material";
import { Close, Favorite, MapsUgc, Search, Shuffle } from "@mui/icons-material";
import { API, graphqlOperation } from 'aws-amplify';
import { useCallback, useContext, useEffect, useState } from "react";
import { LoadingButton } from "@mui/lab";
import { Link as RouterLink, useNavigate } from "react-router-dom";
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
  paddingTop: '64px'
}));

TopBannerSearch.propTypes = searchPropTypes;


export default function TopBannerSearch(props) {
  const { show, setShow, searchQuery, setSearchQuery } = useSearchDetails();
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const { loadRandomFrame, loadingRandom, error } = useLoadRandomFrame();
  const { searchTerm, setSearchTerm, seriesTitle, setSeriesTitle, searchFunction, resultsLoading } = props
  const { savedCids, loadingSavedCids } = useSearchDetailsV2();
  const [addNewCidOpen, setAddNewCidOpen] = useState(false);
  const { user } = useContext(UserContext)

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
    console.log(resultsLoading)
  }, [resultsLoading])

  useEffect(() => {
    searchFunction()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.seriesTitle])

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

  const handleSelectSeries = (data) => {

    navigate(`/search/${data}/${encodeURIComponent(searchTerm)}`)

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
                disabled={resultsLoading}
                // InputProps={{
                //   endAdornment: <InputAdornment position="end"><Typography variant="caption"><Search /></Typography></InputAdornment>,
                // }}
                endAdornment={<>{(searchTerm) && <Close onClick={() => { setSearchTerm(''); }} sx={{cursor: 'pointer', mr: 1}} />}<Search onClick={() => searchFunction()} style={{ cursor: 'pointer' }} /></>}
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
                <Divider />
                <MenuItem disabled value=''>IPFS</MenuItem>
                <Divider />
                {user && loadingSavedCids &&
                  <MenuItem value='' disabled>Loading saved CIDs...</MenuItem>
                }
                {/* {!loading && savedCids && savedCids.map(obj =>
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
            <Typography fontSize={13}><a href="https://forms.gle/8CETtVbwYoUmxqbi7" target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Report issues</a></Typography>
          </Grid>
          <Grid item marginLeft={{ xs: 3 }} marginY='auto' display='flex' style={{ whiteSpace: 'nowrap' }}>
            <Typography fontSize={13}><a href="https://memesrc.com/donate" target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>Support the team</a></Typography>
          </Grid>
        </Grid>
      </StyledHeader>
      <Divider sx={{ mb: 2.5 }} />
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
        <StyledButton onClick={() => { loadRandomFrame(show) }} loading={loadingRandom} startIcon={<Shuffle />} variant="contained" style={{ backgroundColor: "black", marginLeft: 'auto', zIndex: '1300' }} >Random</StyledButton>
      </StyledRightFooter>
      <AddCidPopup open={addNewCidOpen} setOpen={setAddNewCidOpen} />
    </>
  )
}
