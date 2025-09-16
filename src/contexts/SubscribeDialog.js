import { createContext, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate } from 'react-router-dom';

export const SubscribeDialogContext = createContext({
  openSubscriptionDialog: () => {},
});

const sanitizeDestination = (destination) => {
  if (!destination) {
    return '/';
  }

  if (!destination.startsWith('/')) {
    return '/';
  }

  if (destination.startsWith('/pro')) {
    return '/';
  }

  return destination;
};

export const DialogProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const openSubscriptionDialog = useCallback(
    (destination) => {
      const fallback = `${location.pathname}${location.search}${location.hash}`;
      const resolvedDestination = destination ?? fallback;
      const target = sanitizeDestination(resolvedDestination || '/');
      const encodedDest = encodeURIComponent(target);
      navigate(`/pro?dest=${encodedDest}`);
    },
    [location.hash, location.pathname, location.search, navigate]
  );

  const value = useMemo(
    () => ({
      openSubscriptionDialog,
    }),
    [openSubscriptionDialog]
  );

  return <SubscribeDialogContext.Provider value={value}>{children}</SubscribeDialogContext.Provider>;
};

DialogProvider.propTypes = {
  children: PropTypes.node,
};

export default DialogProvider;
