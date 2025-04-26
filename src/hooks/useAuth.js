import { useState, useEffect } from 'react';
import { getCurrentUser, fetchAuthSession, signOut, signIn } from 'aws-amplify/auth';
import { get, post } from '../utils/api';

/**
 * Custom hook to handle authentication with Amplify v6
 * This maintains a consistent structure that matches pre-v6 behavior
 */
export const useAuth = () => {
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        // Try to get from localStorage first
        const storedUser = localStorage.getItem('memeSRCUserDetails');
        if (storedUser) {
          setAuthUser(JSON.parse(storedUser));
        }

        // Then fetch fresh data
        await refreshUserData();
      } catch (err) {
        console.error('Error fetching user:', err);
        setError(err);
        setAuthUser(null);
        localStorage.removeItem('memeSRCUserDetails');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Refresh user data from API
  const refreshUserData = async () => {
    try {
      const [currentUser, session] = await Promise.all([
        getCurrentUser().catch(() => null),
        fetchAuthSession().catch(() => null)
      ]);

      if (!currentUser || !session) {
        setAuthUser(null);
        localStorage.removeItem('memeSRCUserDetails');
        return null;
      }

      // Fetch user details from API
      console.log('Fetching user details from API...');
      
      // Our updated get function now properly parses the response
      const userDetailsResponse = await get({
        apiName: 'publicapi',
        path: '/user/get'
      });
      
      console.log('User details API response (parsed):', userDetailsResponse);
      
      // Now we can safely access the data property
      const apiUserDetails = userDetailsResponse?.data?.getUserDetails;
      
      if (!apiUserDetails) {
        console.error('API response missing user details:', userDetailsResponse);
        return null;
      }
      
      console.log('API user details:', apiUserDetails);
      
      // Create user object with structure exactly matching v5 format
      const userData = {
        username: currentUser.username,
        userDetails: apiUserDetails, // Since we're already getting a properly parsed object
        signInUserSession: {
          accessToken: {
            jwtToken: session.tokens?.accessToken?.toString(),
            payload: session.tokens?.accessToken?.payload
          },
          idToken: {
            jwtToken: session.tokens?.idToken?.toString(),
            payload: session.tokens?.idToken?.payload
          }
        }
      };

      console.log('Constructed user data:', userData);
      
      // Store in localStorage and state
      localStorage.setItem('memeSRCUserDetails', JSON.stringify(userData));
      setAuthUser(userData);
      return userData;
    } catch (err) {
      console.error('Error refreshing user data:', err);
      setError(err);
      return null;
    }
  };

  // Login handler for Amplify v6
  const login = async (username, password) => {
    try {
      setLoading(true);
      await signIn({ username, password });
      const userData = await refreshUserData();
      return userData;
    } catch (err) {
      console.error('Login error:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      setLoading(true);
      await signOut();
      setAuthUser(null);
      localStorage.removeItem('memeSRCUserDetails');
    } catch (err) {
      console.error('Logout error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return {
    user: authUser,
    setUser: setAuthUser,
    loading,
    error,
    login,
    logout,
    refreshUserData
  };
};
