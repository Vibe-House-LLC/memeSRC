import { Navigate, useRoutes } from 'react-router-dom';
import { lazy } from 'react';
import EditorNewProjectPage from './pages/EditorNewProjectPage';
import EditorProjectsPage from './pages/EditorProjectsPage';
import { V2SearchDetailsProvider } from './contexts/V2SearchDetailsProvider';
import SiteWideMaintenance from './pages/SiteWideMaintenance';


// ----------------------------------------------------------------------

const AddSeriesPage = lazy(() => import('./pages/AddSeriesPage'));
const VotingPage = lazy(() => import('./pages/VotingPage'))
const InpaintingPage = lazy(() => import('./pages/InpaintingPage'));
const FramePage = lazy(() => import('./pages/FramePage'));
const TopBannerSearchRevised = lazy(() => import('./sections/search/TopBannerSeachRevised'));
const DashboardSeriesPage = lazy(() => import('./pages/DashboardSeriesPage'));
const DashboardCidPage = lazy(() => import('./pages/DashboardCidPage'));
const DashboardAliasPageRevised = lazy(() => import('./pages/DashboardAliasPageRevised'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const DashboardLayout = lazy(() => import('./layouts/dashboard'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const LoginForm = lazy(() => import('./sections/auth/login/LoginForm'));
const SignupForm = lazy(() => import('./sections/auth/login/SignupForm'));
const VerifyForm = lazy(() => import('./sections/auth/login/VerifyForm'));
const ForgotPasswordForm = lazy(() => import('./sections/auth/login/ForgotPasswordForm'));
const UserPage = lazy(() => import('./pages/UserPage'));
const PrivacyPolicy = lazy(() => import('./sections/legal/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./sections/legal/TermsOfService'));
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
const V2SearchPage = lazy(() => import('./pages/V2SearchPage'));
const EditorPage = lazy(() => import('./pages/EditorPage'));
const EpisodePage = lazy(() => import('./pages/EpisodePage'));
const SeriesPage = lazy(() => import('./pages/SeriesPage'));
const SourceMediaList = lazy(() => import('./pages/SourceMediaList'));
const SourceMediaFileList = lazy(() => import('./pages/SourceMediaFileList'));
const MetadataPage = lazy(() => import('./pages/MetadataPage'));
const HomepageSectionPage = lazy(() => import('./pages/HomepageSectionPage'));
const ContributorRequest = lazy(() => import('./pages/ContributorRequest'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const MagicPopup = lazy(() => import('./components/magic-popup/MagicPopup'));
const DynamicRouteHandler = lazy(() => import('./pages/DynamicRouteHandler'));
const ServerPage = lazy(() => import('./pages/ServerPage'));
const IpfsSearchBar = lazy(() => import('./sections/search/ipfs-search-bar'));
const V2FramePage = lazy(() => import('./pages/V2FramePage'));
const V2EditorPage = lazy(() => import('./pages/V2EditorPage'));
const V2EpisodePage = lazy(() => import('./pages/V2EpisodePage'));
const WebsiteSettings = lazy(() => import('./pages/WebsiteSettings'))

// ----------------------------------------------------------------------

export default function Router() {


  const routes = useRoutes([
    {
      path: '/',
      element: <GuestAuth><MagicPopup><V2SearchDetailsProvider><DashboardLayout /></V2SearchDetailsProvider></MagicPopup></GuestAuth>,
      children: [
        { element: <SiteWideMaintenance><HomePage /></SiteWideMaintenance>, index: true },
        { path: 'search', element: <SiteWideMaintenance><Navigate to='/' /></SiteWideMaintenance> },
        { path: 'edit', element: <SiteWideMaintenance><EditorNewProjectPage /></SiteWideMaintenance> },
        // { path: 'editor/projects', element: <SiteWideMaintenance><EditorProjectsPage /></SiteWideMaintenance> },
        // { path: 'editor/new', element: <SiteWideMaintenance><EditorNewProjectPage /></SiteWideMaintenance> },
        // { path: 'editor/project/:editorProjectId', element: <SiteWideMaintenance><EditorPage /></SiteWideMaintenance> },
        // { path: 'search/:seriesId', element: <SiteWideMaintenance><SearchPage /></SiteWideMaintenance> },
        // { path: 'search/:seriesId/:searchTerms', element: <SiteWideMaintenance><SearchPage /></SiteWideMaintenance> },
        { path: 'search/:cid', element: <SiteWideMaintenance><IpfsSearchBar><V2SearchPage /></IpfsSearchBar></SiteWideMaintenance> },
        { path: 'search/:cid/:searchTerms', element: <SiteWideMaintenance><IpfsSearchBar><V2SearchPage /></IpfsSearchBar></SiteWideMaintenance> },
        { path: 'frame/:cid/:season/:episode/:frame', element: <SiteWideMaintenance><IpfsSearchBar><V2FramePage /></IpfsSearchBar></SiteWideMaintenance> },
        { path: 'editor/:cid/:season/:episode/:frame', element: <SiteWideMaintenance><IpfsSearchBar><V2EditorPage /></IpfsSearchBar></SiteWideMaintenance> },
        { path: 'episode/:cid/:season/:episode/:frame', element: <SiteWideMaintenance><IpfsSearchBar><V2EpisodePage /></IpfsSearchBar></SiteWideMaintenance> },
        { path: 'favorites', element: <SiteWideMaintenance><FavoritesPage /></SiteWideMaintenance> },
        // {
        //   path: 'v2',
        //   element: <SiteWideMaintenance><IpfsSearchBar /></SiteWideMaintenance>,
        //   children: [
        //     { path: 'search/:cid', element: <V2SearchPage /> },
        //     { path: 'search/:cid/:searchTerms', element: <V2SearchPage /> },
        //     { path: 'frame/:cid/:season/:episode/:frame', element: <V2FramePage /> },
        //     { path: 'editor/:cid/:season/:episode/:frame', element: <V2EditorPage /> },
        //     { path: 'episode/:cid/:season/:episode/:frame', element: <V2EpisodePage /> },
        //   ]
        // },
        // { path: 'frame/:fid', element: <SiteWideMaintenance><TopBannerSearchRevised><FramePage /></TopBannerSearchRevised></SiteWideMaintenance> },
        // { path: 'editor/:fid', element: <SiteWideMaintenance><TopBannerSearchRevised><EditorPage /></TopBannerSearchRevised></SiteWideMaintenance> },
        { path: 'series/:seriesId', element: <SiteWideMaintenance><TopBannerSearchRevised><SeriesPage /></TopBannerSearchRevised></SiteWideMaintenance> },
        // { path: '/episode/:seriesId/:seasonNum/:episodeNum', element: <SiteWideMaintenance><TopBannerSearchRevised><EpisodePage /></TopBannerSearchRevised></SiteWideMaintenance> },
        // { path: '/episode/:seriesId/:seasonNum/:episodeNum/:frameNum', element: <SiteWideMaintenance><TopBannerSearchRevised><EpisodePage /></TopBannerSearchRevised></SiteWideMaintenance> },
        { path: '/vote', element: <SiteWideMaintenance><TopBannerSearchRevised><VotingPage /></TopBannerSearchRevised></SiteWideMaintenance> },
        { path: '/contribute', element: <SiteWideMaintenance><ContributorRequest /></SiteWideMaintenance> },
        { path: '/pricing', element: <SiteWideMaintenance><PricingPage /></SiteWideMaintenance> },
        { path: '/:seriesId', element: <SiteWideMaintenance><DynamicRouteHandler /></SiteWideMaintenance> },
        { path: '/server', element: <SiteWideMaintenance><ServerPage /></SiteWideMaintenance> }
      ]
    },
    {
      path: '/dashboard',
      element: <CheckAuth><MagicPopup><DashboardLayout /></MagicPopup></CheckAuth>,
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
        { path: 'cidmanagement', element: <DashboardCidPage /> },
        { path: 'aliasmanagement', element: <DashboardAliasPageRevised /> },
        { path: 'sourcemedia', element: <SourceMediaList /> },
        { path: 'sourcemedia/files/:sourceMediaId', element: <SourceMediaFileList /> },
        { path: 'addseries', element: <AddSeriesPage /> },
        { path: 'inpainting', element: <InpaintingPage /> },
        { path: 'websiteSettings', element: <WebsiteSettings /> },
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
      element: <SiteWideMaintenance><HomePage /></SiteWideMaintenance>
    },
    {
      path: '/privacypolicy',
      element: <PrivacyPolicy />
    },
    {
      path: '/termsofservice',
      element: <TermsOfService />
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
      element: <Page404 />,
    },
  ]);

  return routes;
}
