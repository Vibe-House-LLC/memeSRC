import { Helmet } from 'react-helmet-async';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { API } from 'aws-amplify';
import { styled } from '@mui/material/styles';
import {
  AppBar,
  Toolbar,
  IconButton,
  Button,
  Typography,
  Container,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Chip,
  Slider,
  CircularProgress,
} from '@mui/material';
import { Home } from '@mui/icons-material';

const StyledCard = styled(Card)({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
});

export default function FramePage() {
  const { fid } = useParams();
  const [frameData, setFrameData] = useState({});
  const [surroundingFrames, setSurroundingFrames] = useState();
  const [sliderValue, setSliderValue] = useState(0);
  const [middleIndex, setMiddleIndex] = useState(0);
  const [loadingFineTuning, setLoadingFineTuning] = useState(true);
  const [displayImage, setDisplayImage] = useState(`https://memesrc.com/${fid.split('-')[0]}/img/${fid.split('-')[1]}/${fid.split('-')[2]}/${fid}.jpg`);

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
      .then(data => {
        setFrameData(data);
        setSurroundingFrames(data.frames_surrounding);
        const newMiddleIndex = Math.floor(data.frames_fine_tuning.length / 2);
        setMiddleIndex(newMiddleIndex);
        setLoadingFineTuning(false);
      })
      .catch(console.error);
    }, [fid]);

    useEffect(() => {
      if (frameData.frames_fine_tuning && middleIndex !== 0) {
        const displayIndex = middleIndex + sliderValue;
        const newDisplayFrame = frameData.frames_fine_tuning[displayIndex];
        setDisplayImage(`https://memesrc.com${newDisplayFrame}`);
      }
    }, [sliderValue, frameData, middleIndex]);
    

    const renderSurroundingFrames = () => {
      if (surroundingFrames) {
        return (
          <Grid container spacing={2}>
            {surroundingFrames.map((frame, index) => (
              <Grid item xs={4} key={index}>
                <Card>
                  <CardMedia
                    component="img"
                    alt={`${frame.fid}`}
                    image={`https://memesrc.com${frame.frame_image}`}
                  />
                  <CardContent>
                    <Typography variant="caption">{frame.subtitle || 'No subtitle'}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        );
      }
      return null;
    };

    const renderFineTuningFrames = () => {
      if (loadingFineTuning) {
        return <CircularProgress />;
      }
    
      return (
        <>
          <CardMedia
            component="img"
            alt={`Fine-tuning ${sliderValue}`}
            image={displayImage}
          />
          <Slider
            value={sliderValue}
            min={-middleIndex}
            max={middleIndex}
            step={1}
            onChange={(e, newValue) => setSliderValue(newValue)}
          />
        </>
      );
    };    
  
    return (
      <>
        <Helmet>
          <title> Frame Details | memeSRC 2.0 </title>
        </Helmet>
  
        <AppBar position="static">
          <Toolbar>
            <IconButton edge="start" color="inherit" aria-label="menu" to="/" component={RouterLink}>
              <Home />
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
                  marginLeft: '5px',
                  "& .MuiChip-label": {
                    fontWeight: 'bold',
                  },
                }}
              />
            </>
            </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl">
        <Grid container spacing={2} direction="row" alignItems="center" justifyContent="center">
          <Grid item xs={12} md={6}>
            <StyledCard>
              {renderFineTuningFrames()}
            </StyledCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <CardContent style={{ marginBottom: '1rem' }}>
              <Typography variant="h4" component="div" style={{ marginBottom: '0.5rem' }}>
                {fid.split('-')[0]} <Chip
                  size='small'
                  label={`S${fid.split('-')[1]} E${fid.split('-')[2]}`}
                  sx={{
                    marginLeft: '5px',
                    "& .MuiChip-label": {
                      fontWeight: 'bold',
                    },
                  }}
                />
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" style={{ marginBottom: '1rem' }}>
                {frameData.subtitle ? `"${frameData.subtitle}"` : <CircularProgress />}
              </Typography>

              <Button size="large" variant="contained" to={`/editor/${fid}`} component={RouterLink} style={{ marginBottom: '1rem' }}>
                Add Captions & Edit Photo
              </Button>

              <Typography variant="subtitle1" color="text.secondary" style={{ marginBottom: '1rem' }}>
                TODO: add more metadata, links, content, etc. here
              </Typography>
            </CardContent>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6">Surrounding Frames</Typography>
            {renderSurroundingFrames()}
          </Grid>
        </Grid>
      </Container>
    </>
  );
}
