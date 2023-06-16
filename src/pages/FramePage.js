import { Helmet } from 'react-helmet-async';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { AppBar, Toolbar, IconButton, Button, Typography, Container, Card, CardContent, CardMedia, Grid } from '@mui/material';
import { useEffect, useState } from 'react';
import { API } from 'aws-amplify';
import HomeIcon from '@mui/icons-material/Home';

const StyledCard = styled(Card)({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
});

export default function FramePage() {
  const { fid } = useParams();
  const [frameData, setFrameData] = useState({});

  useEffect(() => {
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

    getSessionID()
      .then(sessionId => {
        const queryStringParams = { queryStringParameters: { fid, sessionId } }
        return API.get('publicapi', '/frame', queryStringParams)
      })
      .then(setFrameData)
      .catch(console.error);
  }, [fid]);

  return (
    <>
      <Helmet>
        <title> Frame Details | memeSRC 2.0 </title>
      </Helmet>

      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" aria-label="menu" to="/" component={RouterLink}>
            <HomeIcon />
          </IconButton>
          <Typography variant="h6" style={{ flexGrow: 1 }}>
            Frame Details
          </Typography>
          <Button size="large" variant="contained" to={`/editor/${fid}`} component={RouterLink}>
            Edit Mode
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl">
        <Grid container spacing={2} direction="row" alignItems="center" justifyContent="center">
          <Grid item xs={12} md={6}>
            <StyledCard>
              <CardMedia
                component="img"
                alt={frameData.series_name}
                image={`https://memesrc.com/${fid.split('-')[0]}/img/${fid.split('-')[1]}/${fid.split('-')[2]}/${fid}.jpg`}
              />
            </StyledCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <CardContent>
              <Typography variant="h4" component="div">
                {frameData.series_name}
              </Typography>
              <Typography variant="h5">
                Season: {frameData.season_number} Episode: {frameData.episode_number}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {frameData.subtitle}
              </Typography>
            </CardContent>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}
