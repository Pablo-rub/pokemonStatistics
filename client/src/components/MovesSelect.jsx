import React from 'react';
import { Autocomplete, TextField, Chip } from '@mui/material';

const MovesSelect = ({ movesList, selectedMoves, setSelectedMoves }) => {
  return (
    <Autocomplete
      multiple
      options={movesList}
      getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
      value={selectedMoves}
      onChange={(e, newValue) => {
        // Limitar a máximo 4 movimientos
        if (newValue.length <= 4) {
          setSelectedMoves(newValue);
        }
      }}
      renderInput={(params) => (
        <TextField 
          {...params} 
          label="Moves (max 4)" 
          variant="outlined"
        />
      )}
      renderTags={(value, getTagProps) =>
        value.map((option, index) => (
          <Chip
            label={typeof option === 'string' ? option : option.name}
            {...getTagProps({ index })}
          />
        ))
      }
    />
  );
};

export default MovesSelect;