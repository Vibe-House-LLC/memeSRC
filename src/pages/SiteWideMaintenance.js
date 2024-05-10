import { Helmet } from 'react-helmet-async';
import { useContext, useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';
import { Container, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { API, graphqlOperation } from 'aws-amplify';
import Logo from '../components/logo';
import VerifyForm from '../sections/auth/login/VerifyForm';
import SignupForm from '../sections/auth/login/SignupForm';
import { UserContext } from '../UserContext';
import { getWebsiteSetting } from '../graphql/queries';

// ----------------------------------------------------------------------

const StyledRoot = styled('div')(({ theme }) => ({
  [theme.breakpoints.up('md')]: {
    display: 'flex',
  },
}));

const StyledContent = styled('div')(({ theme }) => ({
  maxWidth: 880,
  margin: 'auto',
  minHeight: '100vh',
  display: 'flex',
  justifyContent: 'center',
  flexDirection: 'column',
  padding: theme.spacing(12, 0),
}));

// ----------------------------------------------------------------------

export default function SiteWideMaintenance({ children }) {
  const [maintenance, setMaintenance] = useState();
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    setLoading(true)
    API.graphql(
      {
        ...graphqlOperation(getWebsiteSetting, { id: 'globalSettings' }),
        authMode: 'API_KEY'
      }
    ).then(response => {
      setMaintenance(response?.data?.getWebsiteSetting?.fullSiteMaintenance);
      // console.log(response?.data?.getWebsiteSetting?.fullSiteMaintenance)
      setLoading(false)
    }).catch(error => {
      console.log(error)
      setLoading(false)
    })
  }, []);

  // Return the page
  return (
    <>
      {!loading &&
        <>
          {maintenance ?
            <>
              <Helmet>
                <title> Site Wide Maintenance • memeSRC </title>
              </Helmet>

              <StyledRoot>
                {/* <Link to='/'>
                  <Logo
                    sx={{
                      position: 'fixed',
                      top: { xs: 16, sm: 24, md: 40 },
                      left: { xs: 16, sm: 24, md: 40 },
                    }}
                  />
                </Link> */}

                <Container maxWidth="md">
                  <StyledContent>
                    <Typography fontSize={40} fontWeight={800} textAlign='center'>
                      We are currently down for maintenance.
                    </Typography>
                    <Typography fontSize={26} textAlign='center' pt={5}>
                      Please try again later.
                    </Typography>
                  </StyledContent>
                </Container>
              </StyledRoot>
            </>
            :
            <>
              {children}
            </>
          }
        </>
      }
    </>
  );
};

// AuthPage.propTypes = {
//   method: PropTypes.string.isRequired,
// };
