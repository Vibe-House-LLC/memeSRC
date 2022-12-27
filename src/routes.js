import { Navigate, useRoutes } from 'react-router-dom';
import { lazy } from 'react';

const DashboardLayout = lazy(() => import('./layouts/dashboard'));
const SimpleLayout = lazy(() => import('./layouts/simple'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const UserPage = lazy(() => import('./pages/UserPage'));
const Page404 = lazy(() => import('./pages/Page404'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const DashboardAppPage = lazy(() => import('./pages/DashboardAppPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const CheckAuth = lazy(() => import('./sections/auth/login/CheckAuth'));
const ImageUploadPage = lazy(() => import('./pages/ImageUploadPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const EditorPage = lazy(() => import('./pages/EditorPage'));
const MetadataPage = lazy(() => import('./pages/MetadataPage'));
const HomepageSectionPage = lazy(() => import('./pages/HomepageSectionPage'));


// ----------------------------------------------------------------------

export default function Router() {

  const routes = useRoutes([
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
        { path: 'search', element: <SearchPage /> },
        { path: 'editor', element: <EditorPage /> },
        { path: 'editor/:fid', element: <EditorPage /> },
        { path: 'metadata', element: <MetadataPage /> },
        { path: 'homepagesections', element: <HomepageSectionPage /> }
      ],
    },
    {
      path: 'login',
      element: <CheckAuth><AuthPage method="signin" /></CheckAuth>,
    },
    {
      path: 'signup',
      element: <AuthPage method="signup" />,
    },
    {
      element: <SimpleLayout />,
      children: [
        // { element: <Navigate to="/dashboard/app" />, index: true },
        { element: <SearchPage />, index: true },
        { path: '404', element: <Page404 /> },
        { path: '*', element: <Navigate to="/404" /> },
      ],
    },
    {
      path: '*',
      element: <Navigate to="/404" replace />,
    },
  ]);

  return routes;
}
