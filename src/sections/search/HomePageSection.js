import styled from "@emotion/styled";
import { Favorite } from "@mui/icons-material";
import { Button, Grid, Typography } from "@mui/material";
import PropTypes from 'prop-types';

// Create a grid container component
const StyledGridContainer = styled(Grid)`
  min-height: 100vh;
  position: relative;
`;

HomePageSection.propTypes = {
  backgroundColor: PropTypes.string,
  textColor: PropTypes.string,
  bottomImage: PropTypes.shape({
    src: PropTypes.string,
    bottomMargin: PropTypes.number,
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

export default function HomePageSection({backgroundColor, textColor, title, subtitle, buttons, bottomImage, buttonSubtext}) {


  return (
    <StyledGridContainer container justifyItems='center' paddingX={3} backgroundColor={backgroundColor}>
      <Grid item xs={12} textAlign='center' marginY='auto'>
        <Typography component='h2' variant='h2' sx={{color: textColor}} marginBottom={4}>
          {title}
        </Typography>
        <Typography component='h4' variant='h4' sx={{color: textColor}} marginBottom={4}>
          {subtitle}
        </Typography>
        {buttons.map((button, index) => (
            <Button key={index} startIcon={<Favorite />} href={button.destination} variant="contained" sx={{margin: '10px'}}>
              {button.title}
            </Button>
          )
        )}
        <br />
        <Button href={buttonSubtext.href} startIcon={buttonSubtext.emoji} sx={{marginTop: '12px'}}>
          <Typography sx={{textDecoration: 'underline', fontSize: '.95em', fontWeight: '800', color: textColor}}>
            {buttonSubtext.text}
          </Typography>
        </Button>
      </Grid>
      <Grid item marginX='auto' marginTop='auto' marginBottom={bottomImage.bottomMargin}>
        <img src={bottomImage.src} alt={bottomImage.src} style={{
          maxHeight: bottomImage.maxHeight || '400px',
          height: 'auto',
          width: '100%'
        }}/>
      </Grid>
    </StyledGridContainer>
  )
}
