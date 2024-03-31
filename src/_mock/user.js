import { sample } from 'lodash';

// ----------------------------------------------------------------------

const users = [...Array(24)].map((_, index) => ({
  id: `user-${index + 1}`,
  avatarUrl: `/assets/images/avatars/avatar_${index + 1}.jpg`,
  name: `User ${index + 1}`,
  company: `Company ${index + 1}`,
  isVerified: sample([true, false]),
  status: sample(['active', 'banned']),
  role: sample([
    'Leader',
    'Hr Manager',
    'UI Designer',
    'UX Designer',
    'UI/UX Designer',
    'Project Manager',
    'Backend Developer',
    'Full Stack Designer',
    'Front End Developer',
    'Full Stack Developer',
  ]),
}));

export default users;
