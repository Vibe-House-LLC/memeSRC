import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
// @mui
import { Grid, Container, Typography } from '@mui/material';
// Amplify
import { API, graphqlOperation } from 'aws-amplify';
import { listHomepageSections, getAnalyticsMetrics } from '../graphql/queries';
// components
// import { API, graphqlOperation } from 'aws-amplify';
import Iconify from '../components/iconify';
// sections
import {
  AppTasks,
  AppHomepageSectionsListPreview,
  AppOrderTimeline,
  AppTrafficBySite,
  AppWidgetSummary,
} from '../sections/@dashboard/app';

// import { createGlobalMessage } from '../graphql/mutations';

// ----------------------------------------------------------------------


// Function to pull the homepage sections from graphql
async function fetchHomepageSections(items = [], nextToken = null) {
  const result = await API.graphql(
    graphqlOperation(listHomepageSections, {
      filter: {},
      limit: 10,
      nextToken
    })
  );
  const sortedSections = result.data.listHomepageSections.items.sort((a, b) => {
    if (a.index < b.index) return -1;
    if (a.index > b.index) return 1;
    return 0;
  });
  const allItems = [...items, ...sortedSections];
  const newNextToken = result.data.listHomepageSections.nextToken;
  if (newNextToken) {
    return fetchHomepageSections(allItems, newNextToken);
  }
  return allItems;
}

export default function DashboardAppPage() {
  const [sections, setSections] = useState([]);
  const [frameViewsDaily, setFrameViewsDaily] = useState()
  const [searchesDaily, setSearchesDaily] = useState()
  const [randomsDaily, setRandomsDaily] = useState()
  const [sessionsDaily, setSessionsDaily] = useState()

  const fetchAnalyticsFrameViews = async () => {
    const result = await API.graphql(
      graphqlOperation(getAnalyticsMetrics, {
        id: 'totalFrameViews'
      })
    )
    console.log(result)
    const cleaned = JSON.parse(result.data.getAnalyticsMetrics.value)[1][0]
    setFrameViewsDaily(cleaned)
  }

  const fetchAnalyticsRandoms = async () => {
    const result = await API.graphql(
      graphqlOperation(getAnalyticsMetrics, {
        id: 'totalRandoms'
      })
    )
    console.log(result)
    const cleaned = JSON.parse(result.data.getAnalyticsMetrics.value)[1][0]
    setRandomsDaily(cleaned)
  }

  const fetchAnalyticsSearches = async () => {
    const result = await API.graphql(
      graphqlOperation(getAnalyticsMetrics, {
        id: 'totalSearches'
      })
    )
    console.log(result)
    const cleaned = JSON.parse(result.data.getAnalyticsMetrics.value)[1][0]
    setSearchesDaily(cleaned)
  }

  const fetchAnalyticsSessions = async () => {
    const result = await API.graphql(
      graphqlOperation(getAnalyticsMetrics, {
        id: 'totalSessions'
      })
    )
    console.log(result)
    const cleaned = JSON.parse(result.data.getAnalyticsMetrics.value)[1][0]
    setSessionsDaily(cleaned)
  }


  // Pull the homepage sections from GraphQL when the component loads
  useEffect(() => {
    async function getData() {
      const data = await fetchHomepageSections();
      setSections(data);
      console.log(data)
    }
    getData();
  }, []);

  // Pull the analytics data for the dashboard
  useEffect(() => {
    fetchAnalyticsFrameViews();
    fetchAnalyticsRandoms();
    fetchAnalyticsSearches();
    fetchAnalyticsSessions();
    // API.get('publicapi', '/analytics', { "queryStringParameters": { "metric": "totalFrameViews" } }).then(data => {
    //   const result = JSON.parse(data.value)[1][0]
    //   console.log(result)
    //   setFrameViewsDaily(result)
    // })
    // API.get('publicapi', '/analytics', { "queryStringParameters": { "metric": "totalRandoms" } }).then(data => {
    //   const result = JSON.parse(data.value)[1][0]
    //   setRandomsDaily(result)
    // })
    // API.get('publicapi', '/analytics', { "queryStringParameters": { "metric": "totalSearches" } }).then(data => {
    //   const result = JSON.parse(data.value)[1][0]
    //   setSearchesDaily(result)
    // })
    // API.get('publicapi', '/analytics', { "queryStringParameters": { "metric": "totalSessions" } }).then(data => {
    //   const result = JSON.parse(data.value)[1][0]
    //   setSessionsDaily(result)
    // })
    // API.get('publicapi', '/analytics', { "queryStringParameters": { "metric": "popularShows" } }).then(data => {
    //   const result = JSON.parse(data.value).slice(1).map(row => {
    //     return {
    //       label: row[0],
    //       value: parseInt(row[1], 10)
    //     };
    //   });
    //   const resultSorted = result.sort((a, b) => {
    //     if (a.value < b.value) return 1;
    //     if (a.value > b.value) return -1;
    //     return 0;
    //   });
    //   console.log(resultSorted)
    //   setPopularShows(resultSorted)
    // })
  }, [])


  // async function createNewGlobalMessage(title, message, timestamp) {
  //   const newGlobalMessage = {
  //     input: {
  //       title,
  //       message,
  //       timestamp,
  //     },
  //   };
  
  //   const result = await API.graphql(graphqlOperation(createGlobalMessage, newGlobalMessage));
  
  //   return result.data.createGlobalMessage;
  // }
  
  // createNewGlobalMessage("Example 1", "This is the first example message.", Date.now()).then( x => {
  //   console.log(x)
  // }).catch( x => {
  //   console.log(x)
  // })

  return (
    <>
      
        <Helmet>
          <title> Dashboard - memeSRC 2.0 </title>
        </Helmet>

        <Container maxWidth="xl">
          <Typography variant="h4" sx={{ mb: 5 }}>
            Hi, Welcome back
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <AppWidgetSummary title={`Frame Views (${process.env.REACT_APP_USER_BRANCH})`} total={frameViewsDaily} icon={'ant-design:android-filled'} />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <AppWidgetSummary title={`Searches (${process.env.REACT_APP_USER_BRANCH})`} total={searchesDaily} color="info" icon={'ant-design:apple-filled'} />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <AppWidgetSummary title={`Randoms (${process.env.REACT_APP_USER_BRANCH})`} total={randomsDaily} color="warning" icon={'ant-design:windows-filled'} />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <AppWidgetSummary title={`API Sessions (${process.env.REACT_APP_USER_BRANCH})`} total={sessionsDaily} color="error" icon={'ant-design:bug-filled'} />
            </Grid>

            <Grid item xs={12} md={6} lg={8}>
              <AppHomepageSectionsListPreview
                title="Homepage Sections"
                list={sections.map((section) => ({
                  id: section.id,
                  title: section.title,
                  description: section.subtitle,
                  image: JSON.parse(section.bottomImage).src,
                  postedAt: new Date(),
                  backgroundColor: section.backgroundColor
                }))}
              />
            </Grid>

            <Grid item xs={12} md={6} lg={4}>
              <AppTrafficBySite
                title="Traffic by Site"
                list={[
                  {
                    name: 'FaceBook',
                    value: 323234,
                    icon: <Iconify icon={'eva:facebook-fill'} color="#1877F2" width={32} />,
                  },
                  {
                    name: 'Google',
                    value: 341212,
                    icon: <Iconify icon={'eva:google-fill'} color="#DF3E30" width={32} />,
                  },
                  {
                    name: 'Linkedin',
                    value: 411213,
                    icon: <Iconify icon={'eva:linkedin-fill'} color="#006097" width={32} />,
                  },
                  {
                    name: 'Twitter',
                    value: 443232,
                    icon: <Iconify icon={'eva:twitter-fill'} color="#1C9CEA" width={32} />,
                  },
                ]}
              />
            </Grid>

            <Grid item xs={12} md={6} lg={4}>
              <AppOrderTimeline
                title="Order Timeline"
                list={[...Array(5)].map((_, index) => ({
                  id: `order-${index + 1}`,
                  title: [
                    '1983, orders, $4220',
                    '12 Invoices have been paid',
                    'Order #37745 from September',
                    'New order placed #XF-2356',
                    'New order placed #XF-2346',
                  ][index],
                  type: `order${index + 1}`,
                  time: new Date(),
                }))}
              />
            </Grid>

            <Grid item xs={12} md={6} lg={8}>
              <AppTasks
                title="Tasks"
                list={[
                  { id: '1', label: 'Create FireStone Logo' },
                  { id: '2', label: 'Add SCSS and JS files if required' },
                  { id: '3', label: 'Stakeholder Meeting' },
                  { id: '4', label: 'Scoping & Estimations' },
                  { id: '5', label: 'Sprint Showcase' },
                ]}
              />
            </Grid>
          </Grid>
        </Container>
      
    </>
  );
}
