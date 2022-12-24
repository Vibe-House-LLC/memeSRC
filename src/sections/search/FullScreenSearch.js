import styled from "@emotion/styled";
import { Button, Fab, Grid, Typography } from "@mui/material";
import { Favorite, MessageTwoTone, Shuffle } from "@mui/icons-material";
import { API, graphqlOperation } from 'aws-amplify';
import { useEffect, useState } from "react";
import { searchPropTypes } from "./SearchPropTypes";
import Logo from "../../components/logo/Logo";
import { listContentMetadata } from '../../graphql/queries';


const StyledForm = styled.form`
  display: 'flex'
`;

const StyledGridContainer = styled(Grid)`
  min-height: 100vh;
  background-image: linear-gradient(45deg,
    #5461c8 12.5% /* 1*12.5% */,
    #c724b1 0, #c724b1 25%   /* 2*12.5% */,
    #e4002b 0, #e4002b 37.5% /* 3*12.5% */,
    #ff6900 0, #ff6900 50%   /* 4*12.5% */,
    #f6be00 0, #f6be00 62.5% /* 5*12.5% */,
    #97d700 0, #97d700 75%   /* 6*12.5% */,
    #00ab84 0, #00ab84 87.5% /* 7*12.5% */,
    #00a3e0 0);
`;

const StyledLabel = styled.label(({ theme }) => ({
  marginBottom: '8px',
  color: theme.palette.text.secondary,
}));

const StyledInput = styled.input(({ theme }) => ({
  fontSize: '16px',
  padding: '8px',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: '4px',
  width: '100%'
}));

const StyledSelect = styled.select(({ theme }) => (`
  appearance: none;
  background-color: #FFFFFF;
  border: 1px solid ${theme.palette.divider};
  border-radius: 4px;
  padding: 5px;
  margin: 0;
  width: 100%;
  font-size: 16px;
  line-height: inherit;
`));

const StyledButton = styled.button(({ theme }) => ({
  fontSize: '16px',
  padding: '8px 16px',
  border: 'none',
  borderRadius: '4px',
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
  cursor: 'pointer',

  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));

const StyledFooter = styled('header')(({ theme }) => ({
  bottom: 10,
  left: 0,
  lineHeight: 0,
  width: '100%',
  position: 'fixed',
  padding: theme.spacing(0, 3, 3, 3),
  display: 'flex',
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(0, 5, 3, 3),
  },
}));

async function fetchShows() {
  const result = await API.graphql(graphqlOperation(listContentMetadata, { filter: {}, limit: 10 }));
  return result.data.listContentMetadata.items;
}

FullScreenSearch.propTypes = searchPropTypes;

export default function FullScreenSearch(props) {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const { searchTerms, setSearchTerm, seriesTitle, setSeriesTitle, searchFunction } = props

  useEffect(() => {
    async function getData() {
      const data = await fetchShows();
      setShows(data);
      setLoading(false);
    }
    getData();
  }, []);

  useEffect(() => {
    if (shows.length > 0) {
      setSeriesTitle(shows[0].id)
      console.log(shows)
    }
  }, [shows, setSeriesTitle])

  return (
    <StyledGridContainer container>
      <Grid container marginY='auto' justifyContent='center'>
        <Grid item xs={12} textAlign='center' marginBottom={5}>

          <Typography component='h1' variant='h1' sx={{ color: '#FFFFFF' }}>
            <Logo sx={{ display: 'inline', width: '150px', height: 'auto' }} color="white" /><br />memeSRC
          </Typography>

        </Grid>
        <StyledForm onSubmit={e => searchFunction(e)}>
          <Grid container alignItems={'center'}>
            <Grid item md={5} sm='auto' paddingX={0.25}>
              <StyledLabel htmlFor="search-term">
                <StyledInput
                  type="text"
                  id="search-term"
                  value={searchTerms}
                  placeholder="What's the quote?"
                  onChange={e => setSearchTerm(e.target.value)} />
              </StyledLabel>
            </Grid>
            <Grid item md={5} sm='auto' paddingX={0.25}>
              <StyledSelect onChange={(x) => { setSeriesTitle(x.target.value) }} value={seriesTitle}>
                {(loading) ? <option key="loading" value="loading" disabled>Loading...</option> : shows.map((item) => (
                  <option key={item.id} value={item.id}>{item.emoji} {item.title}</option>
                ))}
              </StyledSelect>
            </Grid>
            <Grid item md={2} sm={12} paddingX={0.25}>
              <StyledButton type="submit" style={{backgroundColor: "black"}}>Search</StyledButton>
            </Grid>
          </Grid>
        </StyledForm>
      </Grid>
      <StyledFooter >
        <Fab color="primary" aria-label="feedback" style={{ margin: "0 10px 0 0", backgroundColor: "black" }}>
          <MessageTwoTone color="white"/>
        </Fab>
        <Fab color="primary" aria-label="donate" style={{ backgroundColor: "black" }}>
          <Favorite />
        </Fab>
        <a href={`https://api.memesrc.com/random/generate${seriesTitle ? `?series=${seriesTitle}` : ''}`} style={{ marginLeft: 'auto', textDecoration: 'none' }}>
          <Button startIcon={<Shuffle />} variant="contained" style={{backgroundColor: "black"}}>Random</Button>
        </a>
      </StyledFooter>
    </StyledGridContainer>
  )
}
