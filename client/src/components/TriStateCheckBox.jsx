//// filepath: d:\tfg\pokemonStatistics\client\src\components\TriStateCheckbox.jsx
import React from 'react';
import { IconButton, Box } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox';

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

  const commonStyle = {
    border: '1px solid white',
    borderRadius: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    pointerEvents: 'none'
  };

  let icon;
  if (value === true) {
    icon = (
      <Box sx={commonStyle}>
        <CheckIcon style={{ color: 'white', fontSize: 16 }} />
      </Box>
    );
  } else if (value === false) {
    icon = (
      <Box sx={commonStyle}>
        <CloseIcon style={{ color: 'white', fontSize: 16 }} />
      </Box>
    );
  } else {
    icon = (
      <Box sx={commonStyle} />
    );
  }

  return (
    <IconButton onClick={handleClick} {...props}>
      {icon}
    </IconButton>
  );
};

export default TriStateCheckbox;