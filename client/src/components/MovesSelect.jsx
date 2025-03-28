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
          InputLabelProps={{ style: { color: 'white' } }}
        />
      )}
      renderTags={(value, getTagProps) =>
        value.map((option, index) => (
          <Chip
            label={typeof option === 'string' ? option : option.name}
            {...getTagProps({ index })}
            sx={{ 
              backgroundColor: '#24CC9F',
              color: 'black',
              '& .MuiChip-deleteIcon': {
                color: 'black',
                '&:hover': { color: 'darkred' }
              }
            }}
          />
        ))
      }
      sx={{
        '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' } },
        '& .MuiSvgIcon-root': { color: 'white' }
      }}
    />
  );
};

export default MovesSelect;