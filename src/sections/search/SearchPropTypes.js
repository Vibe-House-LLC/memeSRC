import PropTypes from 'prop-types';

export const searchPropTypes = {
  searchFunction: PropTypes.func,
  searchTerm: PropTypes.string,
  setSearchTerm: PropTypes.func,
  setSeriesTitle: PropTypes.func,
  persistSearchTerm: PropTypes.func,
  seriesTitle: PropTypes.string,
  loading: PropTypes.string
};
