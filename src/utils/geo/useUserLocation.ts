import { useState, useEffect } from 'react';
import { countries, timezones } from './mappings';

export type UserLocation = {
  countryCode: string | null;
  countryName: string | null;
  state: string | null;
};

const useUserLocation = (): UserLocation => {
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [countryName, setCountryName] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);

  useEffect(() => {
    const getCountry = () => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      if (timezone === '' || !timezone) {
        return null as { countryCode: string | null; countryName: string | null } | null;
      }

      const _country = (timezones as any)[timezone]?.c?.[0] as string | undefined;
      return {
        countryCode: _country || null,
        countryName: _country ? countries[_country] || null : null,
      };
    };

    const getState = () => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      if (timezone === '' || !timezone) {
        return null as string | null;
      }

      const state = timezone.split('/')[1]?.replace('_', ' ');
      return state || null;
    };

    const country = getCountry();
    if (country) {
      setCountryCode(country.countryCode);
      setCountryName(country.countryName);
    }
    setState(getState());
  }, []);

  return { countryCode, countryName, state };
};

export default useUserLocation;

