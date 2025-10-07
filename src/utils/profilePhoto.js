import { Storage } from 'aws-amplify';

/**
 * Fetches the user's profile photo from S3 Storage
 * @returns {Promise<string|null>} The profile photo URL or null if not found
 */
export const fetchProfilePhoto = async () => {
  try {
    const photoKey = 'profile-photo';
    const url = await Storage.get(photoKey, { level: 'private' });
    return url;
  } catch (error) {
    // No profile photo exists yet, or error fetching
    console.log('No profile photo found:', error);
    return null;
  }
};

