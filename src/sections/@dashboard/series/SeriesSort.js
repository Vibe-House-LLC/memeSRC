import PropTypes from 'prop-types';
// @mui


// ----------------------------------------------------------------------

SeriesSort.propTypes = {
  options: PropTypes.array,
  onSort: PropTypes.func,
};

export default function SeriesSort({ options, onSort }) {
  return (
    <TextField select size="small" value="latest" onChange={onSort}>
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
