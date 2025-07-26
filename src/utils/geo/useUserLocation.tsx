import { useState, useEffect } from 'react';
import { countries, timezones } from './mappings';

const useUserLocation = () => {
  const [countryCode, setCountryCode] = useState(null);
  const [countryName, setCountryName] = useState(null);
  const [state, setState] = useState(null);

  useEffect(() => {
    const getCountry = () => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      if (timezone === "" || !timezone) {
        return null;
      }

      const _country = timezones[timezone]?.c?.[0];
      return {
        countryCode: _country || null,
        countryName: countries[_country] || null
      };
    };

    const getState = () => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      if (timezone === "" || !timezone) {
        return null;
      }

      const state = timezone.split("/")[1]?.replace("_", " ");
      return state || null;
    };

    const { countryCode, countryName } = getCountry();
    setCountryCode(countryCode);
    setCountryName(countryName);
    setState(getState());
  }, []);

  return { countryCode, countryName, state };
};

export default useUserLocation;