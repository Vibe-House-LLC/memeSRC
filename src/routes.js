import { Navigate, useRoutes } from 'react-router-dom';
import { lazy, Suspense, memo } from 'react';
import AddSeriesPage from './pages/AddSeriesPage';
import InpaintingPage from './pages/InpaintingPage';
import FramePage from './pages/FramePage';
import DashboardLayout from './layouts/dashboard';
import CheckAuth from './sections/auth/login/CheckAuth';
import GuestAuth from './sections/auth/login/GuestAuth';
import TopBannerSearchRevised from './sections/search/TopBannerSeachRevised';
import DashboardAppPage from './pages/DashboardAppPage';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import EditorPage from './pages/EditorPage';
import HomepageSectionPage from './pages/HomepageSectionPage';

const DashboardSeriesPage = lazy(() => import('./pages/DashboardSeriesPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const LoginForm = lazy(() => import('./sections/auth/login/LoginForm'));
const SignupForm = lazy(() => import('./sections/auth/login/SignupForm'));
const VerifyForm = lazy(() => import('./sections/auth/login/VerifyForm'));
const ForgotPasswordForm = lazy(() => import('./sections/auth/login/ForgotPasswordForm'));
const UserPage = lazy(() => import('./pages/UserPage'));
const Page404 = lazy(() => import('./pages/Page404'));
const ErrorPage = lazy(() => import('./pages/ErrorPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const ImageUploadPage = lazy(() => import('./pages/ImageUploadPage'));
const AddToSeriesPage = lazy(() => import('./pages/AddToSeriesPage'));
const EpisodePage = lazy(() => import('./pages/EpisodePage'));
const SeriesPage = lazy(() => import('./pages/SeriesPage'));
const MetadataPage = lazy(() => import('./pages/MetadataPage'));

// ----------------------------------------------------------------------

function Router() {
  const routes = useRoutes([
    {
      path: '/',
      element: <GuestAuth><DashboardLayout /></GuestAuth>,
      children: [
        { element: <HomePage />, index: true },
        { path: 'search/:seriesId/:searchTerms', element: <SearchPage /> },
        { path: 'frame/:fid', element: <TopBannerSearchRevised><FramePage /></TopBannerSearchRevised> },
        { path: 'editor/:fid', element: <TopBannerSearchRevised><EditorPage /></TopBannerSearchRevised> },
        { path: 'series/:seriesId', element: <TopBannerSearchRevised><SeriesPage /></TopBannerSearchRevised> },
        { path: '/episode/:seriesId/:seasonNum/:episodeNum', element: <TopBannerSearchRevised><EpisodePage /></TopBannerSearchRevised> },
        { path: '/episode/:seriesId/:seasonNum/:episodeNum/:frameNum', element: <TopBannerSearchRevised><EpisodePage /></TopBannerSearchRevised> },
      ]
    },
    {
      path: '/dashboard',
      element: <CheckAuth><DashboardLayout /></CheckAuth>,
      children: [
        { element: <Navigate to="/dashboard/app" />, index: true },
        { path: 'app', element: <DashboardAppPage /> },
        { path: 'imageupload', element: <ImageUploadPage /> },
        { path: 'user', element: <UserPage /> },
        { path: 'products', element: <ProductsPage /> },
        { path: 'blog', element: <BlogPage /> },
        { path: 'home', element: <HomePage /> },
        { path: 'editor', element: <EditorPage /> },
        { path: 'editor/:fid', element: <EditorPage /> },
        { path: 'metadata', element: <MetadataPage /> },
        { path: 'homepagesections', element: <HomepageSectionPage /> },
        { path: 'series', element: <DashboardSeriesPage /> },
        { path: 'addseries', element: <AddSeriesPage /> },
        { path: 'inpainting', element: <InpaintingPage /> },
        { path: 'addtoseries/:seriesId', element: <AddToSeriesPage /> }
      ],
    },
    {
      path: '/login',
      element: <CheckAuth><AuthPage><LoginForm /></AuthPage></CheckAuth>,
    },
    {
      path: '/signup',
      element: <CheckAuth><AuthPage><SignupForm /></AuthPage></CheckAuth>,
    },
    {
      path: '/verify',
      element: <CheckAuth><AuthPage><VerifyForm /></AuthPage></CheckAuth>,
    },
    {
      path: '/forgotpassword',
      element: <CheckAuth><AuthPage><ForgotPasswordForm /></AuthPage></CheckAuth>,
    },
    {
      path: '/section/:sectionIndex',
      element: <HomePage />
    },
    {
      path: '/error',
      element: <ErrorPage />
    },
    {
      path: '/404',
      element: <Page404 />
    },
    {
      path: '*',
      element: <Navigate to="/404" replace />,
    },
  ]);

  return routes;
}

export default memo(Router);
