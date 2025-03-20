import React from 'react';
import { Autocomplete, TextField, Chip } from '@mui/material';

const VolatileStatusesSelect = ({ options, selectedStatuses, setSelectedStatuses }) => {
  const handleChange = (event, newValue) => {
    setSelectedStatuses(newValue);
  };

  return (
    <Autocomplete
      multiple
      options={options}
      getOptionLabel={(option) => option}
      value={selectedStatuses}
      onChange={handleChange}
      filterSelectedOptions
      renderInput={(params) => (
        <TextField
          {...params}
          variant="outlined"
          label="Volatile Statuses"
          placeholder={selectedStatuses.length > 0 ? "" : "Select volatile statuses"}
        />
      )}
      renderTags={(value, getTagProps) =>
        value.map((option, index) => (
          <Chip key={option} label={option} {...getTagProps({ index })} />
        ))
      }
    />
  );
};

export default VolatileStatusesSelect;