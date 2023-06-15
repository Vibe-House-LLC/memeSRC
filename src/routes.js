import { Navigate, useRoutes } from 'react-router-dom';
import { lazy } from 'react';
import AddSeriesPage from './pages/AddSeriesPage';
import InpaintingPage from './pages/InpaintingPage';

const TopBannerSearchRevised = lazy(() => import('./sections/search/TopBannerSeachRevised'));
const DashboardSeriesPage = lazy(() => import('./pages/DashboardSeriesPage'));
const DashboardLayout = lazy(() => import('./layouts/dashboard'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const LoginForm = lazy(() => import('./sections/auth/login/LoginForm'));
const SignupForm = lazy(() => import('./sections/auth/login/SignupForm'));
const VerifyForm = lazy(() => import('./sections/auth/login/VerifyForm'));
const ForgotPasswordForm = lazy(() => import('./sections/auth/login/ForgotPasswordForm'));
const UserPage = lazy(() => import('./pages/UserPage'));
const Page404 = lazy(() => import('./pages/Page404'));
const ErrorPage = lazy(() => import('./pages/ErrorPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const DashboardAppPage = lazy(() => import('./pages/DashboardAppPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const GuestAuth = lazy(() => import('./sections/auth/login/GuestAuth'));
const CheckAuth = lazy(() => import('./sections/auth/login/CheckAuth'));
const ImageUploadPage = lazy(() => import('./pages/ImageUploadPage'));
const AddToSeriesPage = lazy(() => import('./pages/AddToSeriesPage'));
const HomePage = lazy(() => import('./pages/HomePage'))
const SearchPage = lazy(() => import('./pages/SearchPage'));
const EditorPage = lazy(() => import('./pages/EditorPage'));
const EpisodePage = lazy(() => import('./pages/EpisodePage'));
const MetadataPage = lazy(() => import('./pages/MetadataPage'));
const HomepageSectionPage = lazy(() => import('./pages/HomepageSectionPage'));


// ----------------------------------------------------------------------

export default function Router() {

  const routes = useRoutes([
    {
      path: '/',
      element: <GuestAuth><DashboardLayout /></GuestAuth>,
      children: [
        { element: <HomePage />, index: true },
        { path: 'search/:seriesId/:searchTerms', element: <SearchPage /> },
        { path: 'editor/:fid', element: <TopBannerSearchRevised><EditorPage /></TopBannerSearchRevised> }
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
      path: '/episode/:seriesId/:seasonNum/:episodeNum',
      element: <TopBannerSearchRevised><EpisodePage /></TopBannerSearchRevised>
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
