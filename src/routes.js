import { Navigate, useRoutes } from 'react-router-dom';
import { lazy } from 'react';
import EditorNewProjectPage from './pages/EditorNewProjectPage';
import EditorProjectsPage from './pages/EditorProjectsPage';
import { V2SearchDetailsProvider } from './contexts/V2SearchDetailsProvider';
import SiteWideMaintenance from './pages/SiteWideMaintenance';
import { DialogProvider } from './contexts/SubscribeDialog';
import { ShowProvider } from './contexts/useShows';


// ----------------------------------------------------------------------

const AddSeriesPage = lazy(() => import('./pages/AddSeriesPage'));
const VotingPage = lazy(() => import('./pages/VotingPage'))
const InpaintingPage = lazy(() => import('./pages/InpaintingPage'));
const DashboardSeriesPage = lazy(() => import('./pages/DashboardSeriesPage'));
const DashboardCidPage = lazy(() => import('./pages/DashboardCidPage'));
const DashboardAliasPageRevised = lazy(() => import('./pages/DashboardAliasPageRevised'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const DashboardLayout = lazy(() => import('./layouts/dashboard'));
const LoginForm = lazy(() => import('./sections/auth/login/LoginForm'));
const SignupForm = lazy(() => import('./sections/auth/login/SignupForm'));
const VerifyForm = lazy(() => import('./sections/auth/login/VerifyForm'));
const ForgotPasswordForm = lazy(() => import('./sections/auth/login/ForgotPasswordForm'));
const ForgotUsernameForm = lazy(() => import('./sections/auth/login/ForgotUsernameForm'));
const PrivacyPolicy = lazy(() => import('./sections/legal/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./sections/legal/TermsOfService'));
const Page404 = lazy(() => import('./pages/Page404'));
const ErrorPage = lazy(() => import('./pages/ErrorPage'));
const DashboardAppPage = lazy(() => import('./pages/DashboardAppPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const GuestAuth = lazy(() => import('./sections/auth/login/GuestAuth'));
const CheckAuth = lazy(() => import('./sections/auth/login/CheckAuth'));
const AddToSeriesPage = lazy(() => import('./pages/AddToSeriesPage'));
const HomePage = lazy(() => import('./pages/HomePage'))
const V2SearchPage = lazy(() => import('./pages/V2SearchPage'));
const EditorPage = lazy(() => import('./pages/EditorPage'));
// const SourceMediaList = lazy(() => import('./pages/SourceMediaList'));
// const SourceMediaFileList = lazy(() => import('./pages/SourceMediaFileList'));
const MetadataPage = lazy(() => import('./pages/MetadataPage'));
const ContributorRequest = lazy(() => import('./pages/ContributorRequest'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const MagicPopup = lazy(() => import('./components/magic-popup/MagicPopup'));
const DynamicRouteHandler = lazy(() => import('./pages/DynamicRouteHandler'));
const IpfsSearchBar = lazy(() => import('./sections/search/ipfs-search-bar'));
const V2FramePage = lazy(() => import('./pages/V2FramePage'));
const V2EditorPage = lazy(() => import('./pages/V2EditorPage'));
const V2EpisodePage = lazy(() => import('./pages/V2EpisodePage'));
const WebsiteSettings = lazy(() => import('./pages/WebsiteSettings'))
const ProSupport = lazy(() => import('./pages/ProSupport'));
const ProSupportAdmin = lazy(() => import('./pages/ProSupportAdmin'));
const AdminUsageEventsLog = lazy(() => import('./pages/AdminUsageEventsLog'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const InvoiceListPage = lazy(() => import('./pages/InvoicesListPage'));
const LibraryPage = lazy(() => import('./pages/LibraryPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const FacebookAuthDemo = lazy(() => import('./pages/FacebookAuthDemo'));
const CollagePageLegacy = lazy(() => import('./pages/CollagePageLegacy'));
const CollagePage = lazy(() => import('./pages/CollagePage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const UserListPage = lazy(() => import('./pages/UserPage-Refactor'));
const SubtitleViewerPage = lazy(() => import('./pages/SubtitleViewerPage'));
const CollageAnimatedIconDemoPage = lazy(() => import('./pages/CollageAnimatedIconDemoPage'));
const ServerPage = lazy(() => import('./pages/ServerPage'));
const DesktopProcessingPage = lazy(() => import('./pages/DesktopProcessingPage'));
const ReleasesPage = lazy(() => import('./pages/ReleasesPage'));
const AdminSourceMedia = lazy(() => import('./pages/AdminSourceMedia'));
const AdminFileReview = lazy(() => import('./pages/AdminFileReview'));
const MagicPage = lazy(() => import('./pages/MagicPage'));
const SubscriptionPortalRedirect = lazy(() => import('./pages/SubscriptionPortalRedirect'));
// Removed insecure HelloWorldPage route

const DonationRedirect = () => {
  window.location.href = 'https://buy.stripe.com/6oEeYJ2EJ4vH3Ha7ss';
  return null;
};

// ----------------------------------------------------------------------

export default function Router() {


  const routes = useRoutes([
    {
      path: '/',
      element: <GuestAuth><DialogProvider><MagicPopup><V2SearchDetailsProvider><DashboardLayout /></V2SearchDetailsProvider></MagicPopup></DialogProvider></GuestAuth>,
      children: [
        { element: <SiteWideMaintenance><HomePage /></SiteWideMaintenance>, index: true },
        { path: 'pro', element: <SiteWideMaintenance><HomePage /></SiteWideMaintenance>, index: true },
        { path: 'search', element: <SiteWideMaintenance><Navigate to='/' /></SiteWideMaintenance> },
        { path: 'edit', element: <SiteWideMaintenance><EditorNewProjectPage /></SiteWideMaintenance> },
        { path: 'collage', element: <SiteWideMaintenance><CollagePage /></SiteWideMaintenance> },
        { path: 'collage-legacy', element: <SiteWideMaintenance><CollagePageLegacy /></SiteWideMaintenance> },
        { path: 'projects', element: <SiteWideMaintenance><ProjectsPage /></SiteWideMaintenance> },
        { path: 'projects/new', element: <SiteWideMaintenance><CollagePage /></SiteWideMaintenance> },
        { path: 'projects/:projectId', element: <SiteWideMaintenance><CollagePage /></SiteWideMaintenance> },
        { path: 'manageSubscription', element: <SiteWideMaintenance><InvoiceListPage /></SiteWideMaintenance> },
        { path: 'account', element: <SiteWideMaintenance><AccountPage /></SiteWideMaintenance> },
        { path: 'subscription-portal', element: <SiteWideMaintenance><SubscriptionPortalRedirect /></SiteWideMaintenance> },
        { path: 'editor/projects', element: <SiteWideMaintenance><EditorProjectsPage /></SiteWideMaintenance> },
        { path: 'editor/new', element: <SiteWideMaintenance><EditorNewProjectPage /></SiteWideMaintenance> },
        { path: 'editor/project/:editorProjectId', element: <SiteWideMaintenance><V2EditorPage /></SiteWideMaintenance> },
        { path: 'search/:cid', element: <SiteWideMaintenance><IpfsSearchBar><V2SearchPage /></IpfsSearchBar></SiteWideMaintenance> },
        { path: 'search/:cid/:searchTerms', element: <SiteWideMaintenance><IpfsSearchBar><V2SearchPage /></IpfsSearchBar></SiteWideMaintenance> },

        { path: 'frame/:cid/:season/:episode/:frame', element: <SiteWideMaintenance><IpfsSearchBar><V2FramePage /></IpfsSearchBar></SiteWideMaintenance> },
        { path: 'editor/:cid/:season/:episode/:frame', element: <SiteWideMaintenance><IpfsSearchBar><V2EditorPage /></IpfsSearchBar></SiteWideMaintenance> },
        { path: 'frame/:cid/:season/:episode/:frame/:fineTuningIndex', element: <SiteWideMaintenance><IpfsSearchBar><V2FramePage /></IpfsSearchBar></SiteWideMaintenance> },
        { path: 'editor/:cid/:season/:episode/:frame/:fineTuningIndex', element: <SiteWideMaintenance><IpfsSearchBar><V2EditorPage /></IpfsSearchBar></SiteWideMaintenance> },
        { path: 'episode/:cid/:season/:episode/:frame', element: <SiteWideMaintenance><IpfsSearchBar><V2EpisodePage /></IpfsSearchBar></SiteWideMaintenance> },

        { path: 'favorites', element: <SiteWideMaintenance><FavoritesPage /></SiteWideMaintenance> },
        { path: 'magic', element: <SiteWideMaintenance><MagicPage /></SiteWideMaintenance> },
        { path: 'library', element: <SiteWideMaintenance><LibraryPage /></SiteWideMaintenance> },
        { path: 'support', element: <SiteWideMaintenance><ProSupport /></SiteWideMaintenance> },
        { path: 'faq', element: <SiteWideMaintenance><FAQPage /></SiteWideMaintenance> },
        { path: 'faq/:slug', element: <SiteWideMaintenance><FAQPage /></SiteWideMaintenance> },
        { path: 'releases', element: <SiteWideMaintenance><ReleasesPage /></SiteWideMaintenance> },
        { path: '/vote', element: <SiteWideMaintenance><ShowProvider><VotingPage /></ShowProvider></SiteWideMaintenance> },
        { path: '/contribute', element: <SiteWideMaintenance><ContributorRequest /></SiteWideMaintenance> },
        { path: '/pricing', element: <SiteWideMaintenance><PricingPage /></SiteWideMaintenance> },
        { path: '/:seriesId', element: <SiteWideMaintenance><DynamicRouteHandler /></SiteWideMaintenance> },
        { path: '/server', element: <SiteWideMaintenance><ServerPage /></SiteWideMaintenance> },
        { path: '/desktop/process', element: <SiteWideMaintenance><DesktopProcessingPage /></SiteWideMaintenance> },
        { path: '/facebook', element: <SiteWideMaintenance><FacebookAuthDemo /></SiteWideMaintenance> },
        { path: '/demo/collage-animated-icon', element: <SiteWideMaintenance><CollageAnimatedIconDemoPage /></SiteWideMaintenance> },
        { path: '/demo/rainbow-icon', element: <SiteWideMaintenance><CollageAnimatedIconDemoPage /></SiteWideMaintenance> },
      ]
    },
    {
      path: '/dashboard',
      element: <CheckAuth><DialogProvider><MagicPopup><DashboardLayout /></MagicPopup></DialogProvider></CheckAuth>,
      children: [
        { element: <Navigate to="/dashboard/app" />, index: true },
        { path: 'app', element: <DashboardAppPage /> },
        { path: 'user', element: <UserListPage /> },
        { path: 'support', element: <ProSupportAdmin /> },
        { path: 'usage-events', element: <AdminUsageEventsLog /> },
        { path: 'home', element: <HomePage /> },
        { path: 'editor', element: <EditorPage /> },
        { path: 'editor/:fid', element: <EditorPage /> },
        { path: 'metadata', element: <MetadataPage /> },
        { path: 'series', element: <DashboardSeriesPage /> },
        { path: 'cidmanagement', element: <DashboardCidPage /> },
        { path: 'aliasmanagement', element: <DashboardAliasPageRevised /> },
        // { path: 'sourcemedia', element: <SourceMediaList /> },
        // { path: 'sourcemedia/files/:sourceMediaId', element: <SourceMediaFileList /> },
        { path: 'addseries', element: <AddSeriesPage /> },
        { path: 'inpainting', element: <InpaintingPage /> },
        { path: 'websiteSettings', element: <WebsiteSettings /> },
        { path: 'addtoseries/:seriesId', element: <AddToSeriesPage /> },
        { path: 'subtitles', element: <SubtitleViewerPage /> },
        { path: 'sourcemedia', element: <AdminSourceMedia /> },
        { path: 'review-upload', element: <AdminFileReview /> },
      ],
    },
    {
      path: '/login',
      element: <GuestAuth><AuthPage method='signin'><LoginForm /></AuthPage></GuestAuth>,
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
      path: '/forgotusername',
      element: <CheckAuth><AuthPage><ForgotUsernameForm /></AuthPage></CheckAuth>,
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
    // Removed insecure /hello route
    {
      path: '/error',
      element: <ErrorPage />
    },
    {
      path: '/404',
      element: <Page404 />
    },
    {
      path: '/donate',
      element: <DonationRedirect />
    },
    {
      path: '*',
      element: <Page404 />,
    },
  ]);

  return routes;
}
