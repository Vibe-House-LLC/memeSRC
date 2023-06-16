import { Helmet } from 'react-helmet-async';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { AppBar, Toolbar, IconButton, Button, Typography, Container, Card, CardContent, CardMedia, Grid, Chip, CircularProgress } from '@mui/material';
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
            <>
              <RouterLink to={`/series/${fid.split('-')[0]}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                {fid.split('-')[0]}
              </RouterLink>
              <Chip
                size='small'
                label={`S${fid.split('-')[1]} E${fid.split('-')[2]}`}
                sx={{
                  marginLeft: '5px', // Adjust as needed for space between chips
                  "& .MuiChip-label": {
                    fontWeight: 'bold',
                  },
                }}
              /></>

          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl">
        <Grid container spacing={2} direction="row" alignItems="center" justifyContent="center">
          <Grid item xs={12} md={6}>
            <StyledCard>
              <CardMedia
                component="img"
                alt={fid.split('-')[0]}
                image={`https://memesrc.com/${fid.split('-')[0]}/img/${fid.split('-')[1]}/${fid.split('-')[2]}/${fid}.jpg`}
              />
            </StyledCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <CardContent style={{ marginBottom: '1rem' }}>
              <Typography variant="h4" component="div" style={{ marginBottom: '0.5rem' }}>
                {fid.split('-')[0]}
              </Typography>
              <Typography variant="h5" style={{ marginBottom: '0.5rem' }}>
                Season: {fid.split('-')[1]}
              </Typography>
              <Typography variant="h5" style={{ marginBottom: '0.5rem' }}>
                Episode: {fid.split('-')[2]}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" style={{ marginBottom: '1rem' }}>
                {frameData.subtitle ? `"${frameData.subtitle}"` : <CircularProgress />}
              </Typography>
              <Button size="large" variant="contained" to={`/editor/${fid}`} component={RouterLink} style={{ marginBottom: '1rem' }}>
                Add Captions & Edit Photo
              </Button>
            </CardContent>

          </Grid>
        </Grid>
      </Container>
    </>
  );
}
