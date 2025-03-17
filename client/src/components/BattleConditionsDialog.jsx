import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
  Typography
} from '@mui/material';
import { styled } from '@mui/material/styles';

const sideEffectsList = ["Tailwind", "Reflect", "Lightscreen", "Aurora Veil"];

// Estilo para que el icono del checkbox sea blanco incluso al estar seleccionado
const WhiteCheckbox = styled(Checkbox)(({ theme }) => ({
  color: 'white',
  '&.Mui-checked': {
    color: 'white',
  }
}));

const menuPropsDown = {
  anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
  transformOrigin: { vertical: 'top', horizontal: 'left' },
  getContentAnchorEl: null
};

const BattleConditionsDialog = ({ open, onClose, battleConditions, setBattleConditions }) => {
  const handleSelectChange = (e, key) => {
    setBattleConditions(prev => ({ ...prev, [key]: e.target.value }));
  };

  const handleCheckboxChange = (side, effect) => (e) => {
    const value = e.target.checked;
    setBattleConditions(prev => ({
      ...prev,
      sideEffects: {
        ...prev.sideEffects,
        [side]: {
          ...prev.sideEffects?.[side],
          [effect]: value
        }
      }
    }));
  };

  const handleApply = () => {
    onClose();
  };

  const selectSx = {
    color: 'inherit',
    backgroundColor: '#221FC7',
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'inherit' },
    '& .MuiSvgIcon-root': { color: 'inherit' }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>Battle Conditions</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {/* Sección de condiciones generales */}
          <Grid item xs={12}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel sx={{ color: 'inherit' }}>Weather</InputLabel>
              <Select
                value={battleConditions.weather}
                onChange={(e) => handleSelectChange(e, 'weather')}
                label="Weather"
                sx={selectSx}
                MenuProps={menuPropsDown}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="RainDance">RainDance</MenuItem>
                <MenuItem value="SunnyDay">SunnyDay</MenuItem>
                <MenuItem value="Sandstorm">Sandstorm</MenuItem>
                <MenuItem value="Hail">Hail</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel sx={{ color: 'inherit' }}>Field</InputLabel>
              <Select
                value={battleConditions.field}
                onChange={(e) => handleSelectChange(e, 'field')}
                label="Field"
                sx={selectSx}
                MenuProps={menuPropsDown}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="ElectricTerrain">ElectricTerrain</MenuItem>
                <MenuItem value="GrassyTerrain">GrassyTerrain</MenuItem>
                <MenuItem value="MistyTerrain">MistyTerrain</MenuItem>
                <MenuItem value="PsychicTerrain">PsychicTerrain</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel sx={{ color: 'inherit' }}>Room Effects</InputLabel>
              <Select
                value={battleConditions.room}
                onChange={(e) => handleSelectChange(e, 'room')}
                label="Room Effects"
                sx={selectSx}
                MenuProps={menuPropsDown}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="TrickRoom">TrickRoom</MenuItem>
                <MenuItem value="Gravity">Gravity</MenuItem>
                <MenuItem value="MagicRoom">MagicRoom</MenuItem>
                <MenuItem value="WonderRoom">WonderRoom</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2, borderColor: 'grey.500' }} />
          </Grid>

          {/* Sección de Side Effects */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Side Effects</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body1" sx={{ mb: 1 }}>Your Side</Typography>
                <FormGroup>
                  {sideEffectsList.map(effect => (
                    <FormControlLabel
                      key={effect}
                      control={
                        <WhiteCheckbox
                          checked={battleConditions.sideEffects?.yourSide?.[effect] || false}
                          onChange={handleCheckboxChange('yourSide', effect)}
                          name={effect}
                        />
                      }
                      label={effect}
                    />
                  ))}
                </FormGroup>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body1" sx={{ mb: 1 }}>Opponent Side</Typography>
                <FormGroup>
                  {sideEffectsList.map(effect => (
                    <FormControlLabel
                      key={effect}
                      control={
                        <WhiteCheckbox
                          checked={battleConditions.sideEffects?.opponentSide?.[effect] || false}
                          onChange={handleCheckboxChange('opponentSide', effect)}
                          name={effect}
                        />
                      }
                      label={effect}
                    />
                  ))}
                </FormGroup>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" color="error">
          Cancel
        </Button>
        <Button onClick={handleApply} variant="containedSuccess">
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BattleConditionsDialog;