// component
import { Settings } from '@mui/icons-material';
import SvgColor from '../../../components/svg-color';

// ----------------------------------------------------------------------

const icon = (name) => <SvgColor src={`/assets/icons/navbar/${name}.svg`} sx={{ width: 1, height: 1 }} />;

const navConfig = [
  {
    title: 'dashboard',
    path: '/dashboard/app',
    icon: icon('ic_analytics'),
  },
  // {
  //   title: 'search',
  //   path: '/dashboard/search',
  //   icon: icon('ic_menu_item'),
  // },
  // {
  //   title: 'editor',
  //   path: '/dashboard/editor',
  //   icon: icon('ic_kanban')
  // },
  {
    title: 'metadata',
    path: '/dashboard/metadata',
    icon: icon('ic_booking')
  },
  {
    title: 'homepage sections',
    path: '/dashboard/homepagesections',
    icon: icon('ic_file')
  },
  // {
  //   title: 'upload',
  //   path: '/dashboard/imageupload',
  //   icon: icon('ic_file'),
  // },
  {
    title: 'user',
    path: '/dashboard/user',
    icon: icon('ic_user'),
  },
  {
    title: 'series',
    path: '/dashboard/series',
    icon: icon('ic_booking')
  },
  {
    title: 'add series',
    path: '/dashboard/addseries',
    icon: <Settings />
  }
  // {
  //   title: 'product',
  //   path: '/dashboard/products',
  //   icon: icon('ic_cart'),
  // },
  // {
  //   title: 'blog',
  //   path: '/dashboard/blog',
  //   icon: icon('ic_blog'),
  // },
  // {
  //   title: 'login',
  //   path: '/login',
  //   icon: icon('ic_lock'),
  // },
  // {
  //   title: 'Not found',
  //   path: '/404',
  //   icon: icon('ic_disabled'),
  // },
];

export default navConfig;
