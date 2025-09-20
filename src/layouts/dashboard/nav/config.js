// component
import { Article, Ballot, Edit, Favorite, MapsUgc, PhotoLibrary, QuestionAnswer, Search, Settings, Shield, Star, SupportAgent, Upload, Collections, NewReleases } from '@mui/icons-material';
import SvgColor from '../../../components/svg-color';

// ----------------------------------------------------------------------

const icon = (name) => <SvgColor src={`/assets/icons/navbar/${name}.svg`} sx={{ width: 1, height: 1 }} />;

const isElectron = () => window && window.process && window.process.type;

const navConfig = [
  {
    sectionTitle: 'Tools',
    adminOnly: false,
    items: [
      {
        title: 'search',
        path: '/search',
        externalLink: false,
        icon: <Search />,
      },
      {
        title: 'collage',
        path: '/collage',
        externalLink: false,
        icon: <PhotoLibrary />,
        chipText: 'UPDATED',
        chipColor: 'info',
      },
      {
        title: 'edit',
        path: '/edit',
        externalLink: false,
        icon: <Edit />,
      },
      ...(isElectron() ? [{
        title: 'Server',
        path: '/server',
        externalLink: false,
        icon: <Settings />
      }] : [])
    ]
  },
  {
    sectionTitle: 'Personal',
    adminOnly: false,
    items: [
      {
        title: 'Library',
        path: '/library',
        externalLink: false,
        icon: <Collections />,
      },
      {
        title: 'Favorites',
        path: '/favorites',
        externalLink: false,
        icon: <Star />
      },
    ]
  },
  {
    sectionTitle: 'Contribute',
    adminOnly: false,
    items: [
      {
        title: 'Vote',
        path: '/vote',
        externalLink: false,
        icon: <Ballot />
      },
      {
        title: 'upload',
        path: '/contribute',
        externalLink: false,
        icon: <Upload />
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
    sectionTitle: 'Help & Contact',
    adminOnly: false,
    items: [
      {
        title: 'Pro Support',
        path: '/support',
        externalLink: false,
        icon: <SupportAgent />,
        chipText: 'Pro',
        chipColor: 'info',
      },
      {
        title: 'FAQs',
        path: '/faq',
        externalLink: false,
        icon: <QuestionAnswer />,
      },
      {
        title: 'Feedback',
        path: '/support',
        externalLink: false,
        icon: <MapsUgc />
      },
      {
        title: 'Releases',
        path: '/releases',
        externalLink: false,
        icon: <NewReleases />,
      },
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
        title: 'Usage Events',
        path: '/dashboard/usage-events',
        externalLink: true,
        icon: <Article />,
      },
      {
        title: 'Website Settings',
        path: '/dashboard/websiteSettings',
        externalLink: false,
        icon: <Settings />,
      },
      {
        title: 'Pro Support Admin',
        path: '/dashboard/support',
        externalLink: false,
        icon: <SupportAgent />,
      },
      // {
      //   title: 'Source Media',
      //   path: '/dashboard/sourcemedia',
      //   externalLink: false,
      //   icon: icon('ic_analytics'),
      // },
      {
        title: 'Source Media',
        path: '/dashboard/sourcemedia',
        externalLink: false,
        icon: icon('ic_analytics'),
      },
      {
        title: 'editor',
        path: '/editor/projects',
        externalLink: false,
        icon: icon('ic_file'),
      },
      {
        title: 'Content Manager',
        path: '/dashboard/series',
        externalLink: false,
        icon: icon('ic_booking')
      },
      {
        title: 'Alias Management',
        path: '/dashboard/aliasmanagement',
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
        externalLink: true,
        icon: <Article />,
      },
      {
        title: 'Privacy Policy',
        path: '/privacypolicy',
        externalLink: true,
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
