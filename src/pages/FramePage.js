import { Helmet } from 'react-helmet-async';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
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
  Stack,
  Tooltip,
} from '@mui/material';
import { HistoryToggleOffRounded, Home } from '@mui/icons-material';

const StyledCard = styled(Card)`
  
  border: 3px solid transparent;
  box-sizing: border-box;

  &:hover {
    border: 3px solid orange;
  }
`;

const StyledCardMedia = styled('img')`
  width: 100%;
  height: auto;
  background-color: black;
`;

export default function FramePage() {
  const navigate = useNavigate();
  const { fid } = useParams();
  const [frameData, setFrameData] = useState({});
  const [surroundingFrames, setSurroundingFrames] = useState();
  const [sliderValue, setSliderValue] = useState(0);
  const [middleIndex, setMiddleIndex] = useState(0);
  const [displayImage, setDisplayImage] = useState('');

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
        setDisplayImage(`https://memesrc.com/${fid.split('-')[0]}/img/${fid.split('-')[1]}/${fid.split('-')[2]}/${fid}.jpg`)
        setFrameData(data);
        setSurroundingFrames(data.frames_surrounding);
        const newMiddleIndex = Math.floor(data.frames_fine_tuning.length / 2);
        const initialFineTuneImage = data.frames_fine_tuning[newMiddleIndex];
        setMiddleIndex(newMiddleIndex)
        setDisplayImage(`https://memesrc.com${initialFineTuneImage}`);
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
            <Grid item xs={4} sm={4} md={12 / 9} key={frame}>
              <a style={{ textDecoration: 'none' }}>
                <StyledCard style={{ border: fid === frame ? '3px solid orange' : '' }}>
                  {/* {console.log(`${fid} = ${result?.fid}`)} */}
                  <StyledCardMedia
                    component="img"
                    alt={`${frame.fid}`}
                    src={`https://memesrc.com${frame.frame_image}`}
                    title={frame.subtitle || 'No subtitle'}
                    onClick={() => {
                      navigate(`/frame/${frame.fid}`)
                    }}
                  />
                </StyledCard>
              </a>
            </Grid>
          ))}
        </Grid>
      );
    }
    return null;
  };

  const renderFineTuningFrames = () => {
    return (
      <>
        <CardMedia
          component="img"
          alt={`Fine-tuning ${sliderValue}`}
          image={displayImage}
        />
        {/* <Slider
          value={sliderValue}
          min={-middleIndex}
          max={middleIndex}
          step={1}
          onChange={(e, newValue) => setSliderValue(newValue)}
        /> */}

        <Stack spacing={2} direction="row" p={2} pr={3} alignItems={'center'}>
          <Tooltip title="Fine Tuning">
            <IconButton>
              <HistoryToggleOffRounded alt="Fine Tuning" />
            </IconButton>
          </Tooltip>
          <Slider
            size="small"
            defaultValue={4}
            min={-middleIndex}
            max={middleIndex}
            value={sliderValue}
            step={1}
            onChange={(e, newValue) => setSliderValue(newValue)}
            valueLabelFormat={(value) => `Fine Tuning: ${((value - 4) / 10).toFixed(1)}s`}
            marks
          />
        </Stack>
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
