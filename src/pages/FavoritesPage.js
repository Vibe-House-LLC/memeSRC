// FavoritesPage.js

import React, { useState, useEffect, useContext } from 'react';
import { API, graphqlOperation, Auth } from 'aws-amplify';
import { Typography, Grid, Card, CardContent, Button, Collapse, Stack } from '@mui/material';
import { styled } from '@mui/material/styles';
import Container from '@mui/material/Container';
import { Link } from 'react-router-dom';
import { listFavorites } from '../graphql/queries';
import fetchShows from '../utils/fetchShows';
import { UserContext } from '../UserContext';
import { useSubscribeDialog } from '../contexts/useSubscribeDialog';
import FavoriteToggle from '../components/FavoriteToggle';

const UpgradedIndexBanner = styled('div')(({ show }) => ({
  backgroundImage: 'url("https://api-prod-minimal-v510.vercel.app/assets/images/cover/cover_3.jpg")',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  padding: show ? '40px 20px' : '10px',
  textAlign: 'center',
  position: 'relative',
  borderRadius: '8px',
  boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
  marginBottom: '30px;',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: show ? '200px' : '50px',
  transition: 'all 0.3s ease-in-out',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: '8px',
  },
}));

const UpgradedIndexText = styled(Typography)`
  font-size: 30px;
  font-weight: bold;
  margin-bottom: 10px;
  color: #fff;
  position: relative;
  z-index: 1;
`;

const UpgradedIndexSubtext = styled(Typography)`
  font-size: 16px;
  font-weight: 600;
  color: #E2e2e3;
  position: relative;
  z-index: 1;
  margin-bottom: 10px;
  margin-left: 10px;
  margin-right: 10px;

  a {
    color: #f0f0f0;
    text-decoration: underline;

    &:hover {
      color: #fff;
    }
  }
`;

const MinimizedBanner = styled('div')({
  backgroundImage: 'url("https://api-prod-minimal-v510.vercel.app/assets/images/cover/cover_3.jpg")',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  padding: '10px',
  textAlign: 'center',
  position: 'relative',
  borderRadius: '8px',
  boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
  marginBottom: '30px;',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '50px',
  cursor: 'pointer',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: '8px',
  },
});

const MinimizedBannerText = styled(Typography)`
  font-size: 16px;
  font-weight: bold;
  color: #fff;
  position: relative;
  z-index: 1;
`;

const APP_VERSION = process.env.REACT_APP_VERSION || 'defaultVersion';

async function getCacheKey() {
  try {
    const currentUser = await Auth.currentAuthenticatedUser();
    return `showsCache-${currentUser.username}-${APP_VERSION}`;
  } catch {
    return `showsCache-${APP_VERSION}`;
  }
}

const FavoritesPage = () => {
  const { user } = useContext(UserContext);
  const { openSubscriptionDialog } = useSubscribeDialog();
  const [favorites, setFavorites] = useState([]);
  const [availableIndexes, setAvailableIndexes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isBannerMinimized, setIsBannerMinimized] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  const authorized = !!user; // Check if user is logged in

  useEffect(() => {
    Promise.all([fetchAvailableIndexes()])
      .then(() => {
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading data:', err);
        setError('Failed to load data.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (availableIndexes.length > 0 && user && user?.userDetails?.favorites) {
      const parsedFavorites = JSON.parse(user?.userDetails?.favorites);
      const matchedFavorites = availableIndexes.filter((index) =>
        parsedFavorites.includes(index.id)
      );
    
      const enrichedFavorites = matchedFavorites.map((favorite) => {
        const match = availableIndexes.find((index) => index.id === favorite.id);
        return match ? { ...favorite, alias: match } : favorite;
      });
    
      setFavorites(enrichedFavorites);
    }
  }, [availableIndexes, user]);

  const fetchAvailableIndexes = async () => {
    try {
      const shows = await fetchShows();
      setAvailableIndexes(shows);
    } catch (err) {
      console.error('Error fetching available indexes:', err);
      setError('Failed to fetch available indexes.');
    }
  };

  const fetchFavorites = async () => {
    try {
      const currentUser = await Auth.currentAuthenticatedUser();

      let nextToken = null;
      let allFavorites = [];

      do {
        // eslint-disable-next-line no-await-in-loop
        const result = await API.graphql(graphqlOperation(listFavorites, {
          limit: 10,
          nextToken,
        }));

        allFavorites = allFavorites.concat(result.data.listFavorites.items);
        nextToken = result.data.listFavorites.nextToken;

      } while (nextToken);

      const enrichedFavorites = allFavorites.map(favorite => {
        const match = availableIndexes.find(index => index.id === favorite.cid);
        return match ? { ...favorite, alias: match } : favorite;
      });

      // Sort enrichedFavorites alphabetically by alias title
      enrichedFavorites.sort((a, b) => {
        const titleA = (a.alias?.title || "").toLowerCase().replace(/^the\s+/, '');
        const titleB = (b.alias?.title || "").toLowerCase().replace(/^the\s+/, '');
        return titleA.localeCompare(titleB);
      });

      setFavorites(enrichedFavorites);
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setError('Failed to fetch favorites.');
    }
  };

  const clearSessionCache = async () => {
    const cacheKey = await getCacheKey();
    localStorage.removeItem(cacheKey);
  };

  const filteredAvailableIndexes = availableIndexes.filter(
    index => !favorites.find(favorite => favorite.cid === index.id)
  );

  // Sort filteredAvailableIndexes alphabetically by title before rendering
  const sortedFilteredAvailableIndexes = filteredAvailableIndexes.sort((a, b) => {
    const titleA = a.title.toLowerCase().replace(/^the\s+/, '');
    const titleB = b.title.toLowerCase().replace(/^the\s+/, '');
    return titleA.localeCompare(titleB);
  });

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  if (!authorized) {
    return (
      <Grid container height="100%" justifyContent="center" alignItems="center" mt={6}>
        <Grid item>
          <Stack spacing={3} justifyContent="center" alignItems="center">
            <img
              src="/assets/memeSRC-white.svg"
              alt="memeSRC logo"
              style={{ height: 48, marginBottom: -15 }}
            />
            <Typography variant="h3" textAlign="center">
              Favorites
            </Typography>
            <Typography variant="body1" textAlign="center" sx={{ paddingX: 2, maxWidth: 400 }}>
              Create an account or log in to access the Favorites feature and personalize your memeSRC experience.
            </Typography>
            <Button
              component={Link}
              to="/signup"
              variant="contained"
              size="large"
              sx={{ fontSize: 17, minWidth: 200, mt: 2 }}
            >
              Create Account
            </Button>
            <Typography variant="body2" sx={{ mt: 2 }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'primary.main', textDecoration: 'none' }}>
                Log in
              </Link>
            </Typography>
          </Stack>
        </Grid>
      </Grid>
    );
  }

  return (
    <Container maxWidth="md" sx={{ padding: '20px' }}>
      <h1>Edit Favorites</h1>
      <Collapse in={showBanner}>
        <UpgradedIndexBanner show={showBanner}>
          {showBanner && (
            <>
              <UpgradedIndexText>Favorites!</UpgradedIndexText>
              <UpgradedIndexSubtext>
                Use the ⭐️ to set favorites.
              </UpgradedIndexSubtext>
              <UpgradedIndexSubtext sx={{ fontSize: 12 }}>
                As a memeSRC Pro, you get early access.{' '}
                <a href="/support" rel="noopener noreferrer">
                  Report&nbsp;a&nbsp;problem
                </a>
                .
              </UpgradedIndexSubtext>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <Button
                  variant="contained"
                  onClick={() => {
                    setIsBannerMinimized(true);
                    setShowBanner(false);
                    localStorage.setItem(`dismissedBanner`, 'true');
                  }}
                  style={{
                    marginTop: '15px',
                    borderRadius: '20px',
                    padding: '6px 16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    color: '#000',
                    position: 'relative',
                    zIndex: 1,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    },
                  }}
                >
                  Minimize
                </Button>
              </div>
            </>
          )}
        </UpgradedIndexBanner>
      </Collapse>
      {!showBanner && (
        <MinimizedBanner
          onClick={() => {
            setShowBanner(true);
            setIsBannerMinimized(false);
            localStorage.removeItem(`dismissedBanner`);
          }}
        >
          <MinimizedBannerText style={{ fontWeight: 'bold' }}>Favorites (early access)</MinimizedBannerText>
          <MinimizedBannerText
            style={{
              textDecoration: 'underline',
              fontWeight: 'normal',
              marginLeft: '10px',
            }}
          >
            Learn&nbsp;More
          </MinimizedBannerText>
        </MinimizedBanner>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div>
        <Typography variant="h4" gutterBottom>Favorites</Typography>
        {favorites.length > 0 ? (
          <Grid container spacing={2} justifyContent="center">
            {favorites.map((favorite) => (
              <Grid item xs={12} key={favorite.id}>
                <Card
                  sx={{
                    backgroundColor: favorite.alias?.colorMain,
                    color: favorite.alias?.colorSecondary,
                    cursor: 'pointer',
                    minHeight: 150,
                    width: '100%',
                    position: 'relative',
                    overflow: 'visible',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingX: 2
                  }}
                >
                  <FavoriteToggle
                    indexId={favorite.id}
                    initialIsFavorite
                  />
                  <CardContent
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      textAlign: 'center',
                      height: '100%',
                      width: '100%',
                      padding: '16px',
                    }}
                  >
                    <Typography variant="h5" sx={{ mb: 1 }}>
                      {favorite.alias?.emoji} {favorite.alias?.title}
                    </Typography>
                    <Typography variant="caption">
                      {favorite.alias?.frameCount.toLocaleString()} frames
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography>No favorites added yet.</Typography>
        )}
      </div>
      <div style={{ marginTop: 20 }}>
        <Typography variant="h4" gutterBottom>Other</Typography>
        {sortedFilteredAvailableIndexes.length > 0 ? (
          <Grid container spacing={2} justifyContent="center">
            {sortedFilteredAvailableIndexes.map((index) => (
              <Grid item xs={12} key={index.id}>
                <Card
                  sx={{
                    backgroundColor: index.colorMain,
                    color: index.colorSecondary,
                    cursor: 'pointer',
                    minHeight: 150,
                    width: '100%',
                    position: 'relative',
                    overflow: 'visible',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingX: 2
                  }}
                >
                  <FavoriteToggle
                    indexId={index.id}
                    initialIsFavorite={false}
                  />
                  <CardContent
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      textAlign: 'center',
                      height: '100%',
                      width: '100%',
                      padding: '16px',
                    }}
                  >
                    <Typography variant="h5" sx={{ mb: 1 }}>
                      {index.emoji} {index.title}
                    </Typography>
                    <Typography variant="caption">
                      {index.frameCount.toLocaleString()} frames
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography>All indexes are in your favorites.</Typography>
        )}
      </div>
    </Container>
  );
};

export default FavoritesPage;
