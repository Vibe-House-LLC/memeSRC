// component
import { Article, CardGiftcard, Favorite, MapsUgc, Settings, Shield } from '@mui/icons-material';
import SvgColor from '../../../components/svg-color';

// ----------------------------------------------------------------------

const icon = (name) => <SvgColor src={`/assets/icons/navbar/${name}.svg`} sx={{ width: 1, height: 1 }} />;

const navConfig = [
  {
    sectionTitle: 'General',
    adminOnly: false,
    items: [

      {
        title: 'search',
        path: '/search',
        externalLink: false,
        icon: icon('ic_menu_item'),
      },

      {
        title: 'Requests',
        path: '/vote',
        externalLink: false,
        icon: icon('ic_kanban')
      },
      {
        title: 'Feedback',
        path: 'https://forms.gle/8CETtVbwYoUmxqbi7',
        externalLink: true,
        icon: <MapsUgc />
      },
      {
        title: 'Donate',
        path: 'https://memesrc.com/donate',
        externalLink: true,
        icon: <Favorite />
      }
    ]
  },

  {
    sectionTitle: 'Admin',
    adminOnly: true,
    items: [
      {
        title: 'dashboard',
        path: '/dashboard/app',
        externalLink: false,
        icon: icon('ic_analytics'),
      },
      {
        title: 'editor',
        path: '/editor',
        externalLink: false,
        icon: icon('ic_file'),
      },
      {
        title: 'TV Shows',
        path: '/dashboard/series',
        externalLink: false,
        icon: icon('ic_booking')
      },
      {
        title: 'metadata',
        path: '/dashboard/metadata',
        externalLink: false,
        icon: icon('ic_booking')
      },
      {
        title: 'user',
        path: '/dashboard/user',
        externalLink: false,
        icon: icon('ic_user'),
      },
      {
        title: 'homepage sections',
        path: '/dashboard/homepagesections',
        externalLink: false,
        icon: icon('ic_file')
      },
    ]
  },
  {
    sectionTitle: 'Legal',
    adminOnly: false,
    items: [
      {
        title: 'Terms of Service',
        path: '/termsofservice',
        externalLink: false,
        icon: <Article />,
      },
      {
        title: 'Privacy Policy',
        path: '/privacypolicy',
        externalLink: false,
        icon: <Shield />,
      },
    ]
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
