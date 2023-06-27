// component
import { Settings } from '@mui/icons-material';
import SvgColor from '../../../components/svg-color';

// ----------------------------------------------------------------------

const icon = (name) => <SvgColor src={`/assets/icons/navbar/${name}.svg`} sx={{ width: 1, height: 1 }} />;

const navConfig = [
  {
    title: 'dashboard',
    adminOnly: true,
    path: '/dashboard/app',
    icon: icon('ic_analytics'),
  },
  {
    title: 'search',
    adminOnly: false,
    path: '/search',
    icon: icon('ic_menu_item'),
  },
  {
    title: 'editor',
    adminOnly: true,
    path: '/editor',
    icon: icon('ic_file'),
  },
  {
    title: 'TV Shows',
    adminOnly: true,
    path: '/dashboard/series',
    icon: icon('ic_booking')
  },
  {
    title: 'Requests',
    adminOnly: false,
    path: '/vote',
    icon: icon('ic_kanban')
  },
  {
    title: 'metadata',
    adminOnly: true,
    path: '/dashboard/metadata',
    icon: icon('ic_booking')
  },
  {
    title: 'user',
    adminOnly: true,
    path: '/dashboard/user',
    icon: icon('ic_user'),
  },
  {
    title: 'homepage sections',
    adminOnly: true,
    path: '/dashboard/homepagesections',
    icon: icon('ic_file')
  },
  // {
  //   title: 'inpainting demo',
  //   path: '/dashboard/inpainting',
  //   icon: icon('ic_file')
  // },
  // {
  //   title: 'upload',
  //   path: '/dashboard/imageupload',
  //   icon: icon('ic_file'),
  // },
  // {
  //   title: 'add series',
  //   path: '/dashboard/addseries',
  //   icon: <Settings />
  // }
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
