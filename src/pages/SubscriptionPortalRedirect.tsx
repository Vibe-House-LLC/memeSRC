import React, { useCallback, useEffect, useState } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { API } from 'aws-amplify';

const SubscriptionPortalRedirect: React.FC = () => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const resolveReturnUrl = useCallback(() => {
    const fallbackUrl = `${window.location.origin}/account`;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const rawReturnUrl = searchParams.get('returnUrl');
      if (!rawReturnUrl) {
        return fallbackUrl;
      }

      const parsedUrl = new URL(rawReturnUrl, window.location.origin);
      if (parsedUrl.origin !== window.location.origin) {
        return fallbackUrl;
      }

      return parsedUrl.toString();
    } catch (error) {
      console.error('Invalid returnUrl provided to subscription portal redirect:', error);
      return fallbackUrl;
    }
  }, []);

  const fetchPortalUrl = useCallback(async () => {
    setErrorMessage(null);
    setIsRetrying(true);

    try {
      const portalUrl = await API.post('publicapi', '/user/update/getPortalLink', {
        body: { currentUrl: resolveReturnUrl() },
      });
      window.location.replace(portalUrl);
    } catch (error) {
      console.error('Failed to open subscription portal:', error);
      setErrorMessage('We could not open your subscription portal. Please try again in a moment.');
      setIsRetrying(false);
    }
  }, [resolveReturnUrl]);

  useEffect(() => {
    fetchPortalUrl();
  }, [fetchPortalUrl]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <Stack alignItems="center" spacing={3} sx={{ maxWidth: 420, textAlign: 'center' }}>
        <CircularProgress color="primary" />
        <Stack spacing={1}>
          <Typography variant="h5" fontWeight={700}>
            Redirecting to Stripe
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Hold tight—your subscription portal is loading in this tab.
          </Typography>
        </Stack>

        {errorMessage && (
          <Stack spacing={1} alignItems="center">
            <Typography variant="body2" color="error">
              {errorMessage}
            </Typography>
            <LoadingButton
              variant="contained"
              onClick={fetchPortalUrl}
              loading={isRetrying}
              sx={{ mt: 1 }}
            >
              Try again
            </LoadingButton>
          </Stack>
        )}
      </Stack>
    </Box>
  );
};

export default SubscriptionPortalRedirect;
