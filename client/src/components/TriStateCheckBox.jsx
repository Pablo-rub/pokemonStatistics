//// filepath: d:\tfg\pokemonStatistics\client\src\components\TriStateCheckbox.jsx
import React from 'react';
import { Checkbox } from '@mui/material';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import DisabledByDefaultIcon from '@mui/icons-material/DisabledByDefault';

const TriStateCheckbox = ({ value, onChange, ...props }) => {
  const handleClick = () => {
    let newValue;
    if (value === null || value === undefined) {
      newValue = true;
    } else if (value === true) {
      newValue = false;
    } else if (value === false) {
      newValue = null;
    }
    onChange(newValue);
  };

  return (
    <Checkbox
      checked={value === true}
      indeterminate={value === false}
      onClick={handleClick}
      icon={<CheckBoxOutlineBlankIcon sx={{ color: 'white' }} />}
      checkedIcon={<CheckBoxIcon sx={{ color: 'white' }} />}
      indeterminateIcon={<DisabledByDefaultIcon sx={{ color: 'white' }} />}
      {...props}
    />
  );
};

export default TriStateCheckbox;