import styled from "@emotion/styled";
import { Favorite } from "@mui/icons-material";
import { Button, Grid, Typography } from "@mui/material";
import DOMPurify from "dompurify";
import PropTypes from 'prop-types';
import { useNavigate } from "react-router-dom";

// Create a grid container component
const StyledGridContainer = styled(Grid)`
  /* Prefer dynamic viewport units for mobile browsers while
     keeping a fallback for older ones */
  min-height: 100vh;
  min-height: 100dvh;
  position: relative;
`;

HomePageSection.propTypes = {
  backgroundColor: PropTypes.string,
  textColor: PropTypes.string,
  index: PropTypes.number,
  bottomImage: PropTypes.shape({
    src: PropTypes.string,
    bottomMargin: PropTypes.string,
    maxHeight: PropTypes.string,
    alt: PropTypes.string
  }),
  buttons: PropTypes.array,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  buttonSubtext: PropTypes.shape({
    emoji: PropTypes.string,
    href: PropTypes.string,
    text: PropTypes.string
  })

};

export default function HomePageSection({ backgroundColor, textColor, title, subtitle, buttons, bottomImage, buttonSubtext, index }) {

  const navigate = useNavigate();


  return (
    <StyledGridContainer container justifyItems='center' paddingX={3} backgroundColor={backgroundColor} data-scroll-to id={index}>
      <Grid item xs={12} textAlign='center' marginY='auto' paddingTop={8}>
        <Typography component='h2' sx={{ color: textColor, }} fontSize='2.5em' fontWeight='800' marginBottom={4}>
          {title}
        </Typography>
        <Typography component='h4' sx={[{ color: textColor, '& a': { color: textColor } }]} fontSize='1.3em' fontWeight='600' marginBottom={4}>
          {
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(subtitle) }} /> // eslint-disable-line react/no-danger
          }
        </Typography>
        <Grid container justifyContent='center' spacing={2}>
          {buttons.map((button, index) => (
            <Grid item xs={12} sm='auto' key={index}>
              <Button key={index} color={"secondary"} startIcon={<Favorite />} href={button.destination} variant="contained" size="large" fullWidth={window.innerWidth <= 600}>
                {button.title}
              </Button>
            </Grid>
          )
          )}
        </Grid>
        <Button onClick={() => {
          if (buttonSubtext.href.length > 0) {
            
            if (buttonSubtext.href[0] === '/') {
              console.log(buttonSubtext.href[0]);
              navigate(buttonSubtext.href)
              setTimeout(() => navigate('/'), 150)
            } else {
              window.location.href = buttonSubtext.href;
            }
          }
        }} startIcon={buttonSubtext.emoji} sx={[{ marginTop: '12px', backgroundColor: 'unset', '&:hover': { backgroundColor: 'unset' }, cursor: `${buttonSubtext.href.length > 0 ? 'pointer' : 'default !important'}` }]}>
          <Typography sx={{ textDecoration: `${buttonSubtext.href.length > 0 ? 'underline' : 'none'}`, fontSize: '.95em', fontWeight: '800', color: textColor }}>
            {buttonSubtext.text}
          </Typography>
        </Button>
      </Grid>
      <Grid item marginX='auto' marginTop='auto' marginBottom={bottomImage.bottomMargin}>
        <img src={bottomImage.src} alt={bottomImage.src} style={{
          maxHeight: bottomImage.maxHeight || '400px',
          height: 'auto',
          width: '100%'
        }} />
      </Grid>
    </StyledGridContainer>
  )
}
