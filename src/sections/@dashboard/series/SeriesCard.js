import PropTypes from 'prop-types';
// @mui
import { alpha, styled } from '@mui/material/styles';
import { Box, Link, Card, Grid, Avatar, Typography, CardContent, IconButton, List, ListItem, ListItemText, Popover, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Stack } from '@mui/material';
import MoreVert from '@mui/icons-material/MoreVert';
import { useState } from 'react';
// utils
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { fDate } from '../../../utils/formatTime';
import { fShortenNumber } from '../../../utils/formatNumber';
//
import SvgColor from '../../../components/svg-color';
import Iconify from '../../../components/iconify';

// ----------------------------------------------------------------------

const StyledCardMedia = styled('div')({
  position: 'relative',
  paddingTop: '150%',
});

const StyledTitle = styled(Link)({
  height: 44,
  overflow: 'hidden',
  WebkitLineClamp: 2,
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
});

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  zIndex: 9,
  width: 32,
  height: 32,
  position: 'absolute',
  left: theme.spacing(3),
  bottom: theme.spacing(-2),
}));

const StyledInfo = styled('div')(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
  marginTop: theme.spacing(3),
  color: theme.palette.text.disabled,
}));

const StyledCover = styled('img')({
  top: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  position: 'absolute',
});

const StyledIconButton = styled(IconButton)({
  position: 'absolute',
  top: '5px',
  right: '5px',
  zIndex: '10',
})

// ----------------------------------------------------------------------

SeriesCard.propTypes = {
  post: PropTypes.object.isRequired,
  isOverlay: PropTypes.bool,
  isLarge: PropTypes.bool,
  handleEdit: PropTypes.func,
  handleDelete: PropTypes.func,
};


export default function SeriesCard({ post, isOverlay = false, isLarge = false, handleEdit, handleDelete }) {
  const { cover, name, view, comment, share, author, createdAt, id, year, slug } = post;
  const [anchorEl, setAnchorEl] = useState(null);
  const [openConfirmation, setOpenConfirmation] = useState(false);
  const navigate = useNavigate();

  const handleConfirmationOpen = () => {
    setOpenConfirmation(true);
  };

  const handleConfirmationClose = () => {
    setOpenConfirmation(false);
  };

  const POST_INFO = [
    { number: comment, icon: 'eva:message-circle-fill' },
    { number: view, icon: 'eva:eye-fill' },
    { number: share, icon: 'eva:share-fill' },
  ];

  const open = Boolean(anchorEl);
  const popoverId = open ? 'simple-popover' : undefined;
  const handleMoreVertClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Grid item xs={4} sm={isLarge ? 12 : 6} md={isLarge ? 6 : 3}>
      <Card sx={{ position: 'relative' }}>
          <StyledCardMedia
            sx={{
              ...((isLarge || isOverlay) && {
                pt: 'calc(100% * 4 / 3)',
                '&:after': {
                  top: 0,
                  content: "''",
                  width: '100%',
                  height: '100%',
                  position: 'absolute',
                  bgcolor: (theme) => alpha(theme.palette.grey[900], 0.72),
                },
              }),
              ...(isLarge && {
                pt: {
                  xs: 'calc(100% * 4 / 3)',
                  sm: 'calc(100% * 3 / 4.66)',
                },
              }),
            }}
          >
            <SvgColor
              color="paper"
              src="/assets/icons/shape-avatar.svg"
              sx={{
                width: 80,
                height: 36,
                zIndex: 9,
                bottom: -15,
                position: 'absolute',
                color: 'background.paper',
                ...((isLarge || isOverlay) && { display: 'none' }),
                display: { xs: 'none', sm: 'block' }

              }}
            />
            <StyledAvatar
              alt={author.name}
              sx={{
                ...((isLarge || isOverlay) && {
                  zIndex: 9,
                  top: 24,
                  left: 24,
                  width: 40,
                  height: 40,
                }),
                display: { xs: 'none', sm: 'flex' }
              }}
            >
              {author.avatarUrl}
            </StyledAvatar>

            <StyledCover alt={name} src={cover} />
            <StyledIconButton onClick={(event) => handleMoreVertClick(event)} sx={{ display: { xs: 'none', sm: 'flex' } }}>
              <MoreVert />
            </StyledIconButton>
          </StyledCardMedia>
        <RouterLink to={`/series/${slug}`} key={id}>
          <CardContent
            sx={{
              pt: 4,
              ...((isLarge || isOverlay) && {
                bottom: 0,
                width: '100%',
                position: 'absolute',
              }),
              display: { xs: 'none', sm: 'block' }
            }}
          >
            <Typography gutterBottom variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
              {fDate(createdAt)}
            </Typography>
            <StyledTitle
              color="inherit"
              variant="subtitle2"
              underline="hover"
              sx={{
                ...(isLarge && { typography: 'h5', height: 60 }),
                ...((isLarge || isOverlay) && {
                  color: 'common.white',
                }),
              }}
            >
              {name}
            </StyledTitle>

            <StyledInfo>
              {POST_INFO.map((info, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    ml: index === 0 ? 0 : 1.5,
                    ...((isLarge || isOverlay) && {
                      color: 'grey.500',
                    }),
                  }}
                >
                  <Iconify icon={info.icon} sx={{ width: 16, height: 16, mr: 0.5 }} />
                  <Typography variant="caption">{fShortenNumber(info.number)}</Typography>
                </Box>
              ))}
            </StyledInfo>
          </CardContent>
        </RouterLink>
      </Card>
      <Stack direction='row' alignItems='center' sx={{ display: { xs: 'flex', sm: 'none' } }}>
        <MoreVert onClick={(event) => handleMoreVertClick(event)} sx={{ marginLeft: -0.8 }} />
        <Grid xs={10}>
          <Typography component='p' variant='body1' noWrap paddingTop={1}>
            {name}
          </Typography>
          <Typography component='p' variant='caption' noWrap paddingTop={0} sx={{ color: '#919191' }}>
            {year}
          </Typography>
        </Grid>
      </Stack>



      <Popover
        id={popoverId}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <List>
          <ListItem key="close" button onClick={() => {
            handleClose();
            handleEdit(post);
          }}>
            <ListItemText primary="Edit" />
          </ListItem>
          <ListItem key="addtoseries" button onClick={() => {
            navigate(`/dashboard/addtoseries/${id}`)
          }}>
            <ListItemText primary="Add To Series" />
          </ListItem>
          <ListItem key="delete" button onClick={() => {
            handleClose();
            handleConfirmationOpen();
          }}>
            <ListItemText primary="Delete" />
          </ListItem>
        </List>
      </Popover>
      <Dialog
        open={openConfirmation}
        onClose={handleConfirmationClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to permanently delete <b>'{name}'</b>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant='contained' onClick={handleConfirmationClose}>Cancel</Button>
          <Button color='error' onClick={() => {
            handleDelete(id);
            handleConfirmationClose();
          }} autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
