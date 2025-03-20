import React from 'react';
import { Autocomplete, TextField, Chip } from '@mui/material';

const MovesSelect = ({ movesList, selectedMoves, setSelectedMoves }) => {
  const handleChange = (event, newValue) => {
    // Limitar la selección a 4 movimientos
    if (newValue.length <= 4) {
      setSelectedMoves(newValue);
    }
  };

  return (
    <Autocomplete
      multiple
      options={movesList}
      getOptionLabel={(option) => option.name}
      value={selectedMoves}
      onChange={handleChange}
      filterSelectedOptions
      renderInput={(params) => (
        <TextField 
          {...params}
          variant="outlined"
          label="Select up to 4 moves"
          placeholder={selectedMoves.length > 0 ? "" : "Moves"}
          InputLabelProps={{ style: { color: 'white' } }}
          InputProps={{
            ...params.InputProps,
            style: { color: 'white' }
          }}
        />
      )}
      renderTags={(value, getTagProps) =>
        value.map((option, index) => (
          <Chip 
            key={option.name} 
            label={option.name} 
            {...getTagProps({ index })}
          />
        ))
      }
      sx={{
        mt: 1,
        '& .MuiOutlinedInput-root': {
          '& fieldset': { borderColor: 'white' },
        },
        '& .MuiSvgIcon-root': { color: 'white' },
      }}
    />
  );
};

export default MovesSelect;