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
  Typography,
  Paper,
  Box,
  TextField
} from '@mui/material';
import { styled } from '@mui/material/styles';
import useDraggable from '../hooks/useDraggable';
import TriStateCheckbox from './TriStateCheckBox';

const WhiteCheckbox = styled(Checkbox)(({ theme }) => ({
  color: 'white',
  '&.Mui-checked': {
    color: 'white',
  }
}));

function DraggablePaperComponent(props) {
  const { ref, style, handleMouseDown } = useDraggable({ resetOnClose: true, handleSelector: '#draggable-dialog-title' });
  return <Paper ref={ref} {...props} style={{ ...props.style, ...style }} onMouseDown={handleMouseDown} />;
}

const sideEffectsList = ["tailwind", "reflect", "lightscreen", "auroraveil"];
const hazardsList = ["Spikes", "Toxic Spikes", "Stealth Rock", "Sticky Web"];
const menuPropsDown = {
  anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
  transformOrigin: { vertical: 'top', horizontal: 'left' },
  getContentAnchorEl: null
};

const BattleConditionsDialog = ({ open, onClose, battleConditions, setBattleConditions }) => {
  const handleSelectChange = (e, key) => {
    setBattleConditions(prev => ({ ...prev, [key]: e.target.value }));
    
    // Si se selecciona un valor, establecer duración predeterminada
    if (e.target.value && e.target.value !== "none") {
      let defaultDuration = 5; // Por defecto 5 turnos
      setBattleConditions(prev => ({
        ...prev,
        [`${key}Duration`]: defaultDuration
      }));
    } else {
      // Si se deselecciona, resetear duración
      setBattleConditions(prev => ({
        ...prev,
        [`${key}Duration`]: 0
      }));
    }
  };

  const handleSideEffectChange = (side, effect, newValue) => {
    setBattleConditions(prev => ({
      ...prev,
      sideEffects: {
        ...prev.sideEffects,
        [side]: {
          ...prev.sideEffects?.[side],
          [effect]: newValue
        }
      }
    }));

    if (newValue) {
      let defaultDuration;
      if (effect === "tailwind") {
        defaultDuration = 4;
      } else {
        defaultDuration = 4;
      }
      setBattleConditions(prev => ({
        ...prev,
        sideEffectsDuration: {
          ...prev.sideEffectsDuration,
          [side]: {
            ...prev.sideEffectsDuration?.[side],
            [effect]: defaultDuration
          }
        }
      }));
    } else {
      setBattleConditions(prev => ({
        ...prev,
        sideEffectsDuration: {
          ...prev.sideEffectsDuration,
          [side]: {
            ...prev.sideEffectsDuration?.[side],
            [effect]: 0
          }
        }
      }));
    }
  };

  const handleHazardChange = (side, hazard) => (newValue) => {
    const value = newValue;
    setBattleConditions(prev => ({
      ...prev,
      entryHazards: {
        ...prev.entryHazards,
        [side]: {
          ...prev.entryHazards?.[side],
          [hazard]: value
        }
      }
    }));
    
    // Si se activa y es Spikes o Toxic Spikes, establecer nivel predeterminado
    if (value && (hazard === "Spikes" || hazard === "Toxic Spikes")) {
      const defaultLevel = 1;
      
      setBattleConditions(prev => ({
        ...prev,
        entryHazardsLevel: {
          ...prev.entryHazardsLevel || {},
          [side]: {
            ...prev.entryHazardsLevel?.[side] || {},
            [hazard]: defaultLevel
          }
        }
      }));
    } else if (!value && (hazard === "Spikes" || "Toxic Spikes")) {
      // Si se desactiva, resetear nivel
      setBattleConditions(prev => ({
        ...prev,
        entryHazardsLevel: {
          ...prev.entryHazardsLevel || {},
          [side]: {
            ...prev.entryHazardsLevel?.[side] || {},
            [hazard]: 0
          }
        }
      }));
    } else if (value) {
      // Para otros hazards, establecer duración predeterminada
      setBattleConditions(prev => ({
        ...prev,
        entryHazardsDuration: {
          ...prev.entryHazardsDuration || {},
          [side]: {
            ...prev.entryHazardsDuration?.[side] || {},
            [hazard]: 0 // No tienen duración por defecto
          }
        }
      }));
    }
  };

  const handleDurationChange = (type, key, value) => {
    let newValue = parseInt(value) || 0;
    
    // Limitar valores según el tipo, pero permitiendo 0 como mínimo para todos
    if (type === "weather" || type === "field" || type === "room") {
      // Duración normal de efectos de campo: 0-8 turnos
      newValue = Math.max(0, Math.min(8, newValue));
      setBattleConditions(prev => ({ ...prev, [`${type}Duration`]: newValue }));
    } else if (type === "sideEffect") {
      const [side, effect] = key.split('.');
      if (effect === "tailwind") {
        newValue = Math.max(0, Math.min(5, newValue));
      } else {
        newValue = Math.max(0, Math.min(8, newValue));
      }
      setBattleConditions(prev => ({
        ...prev,
        sideEffectsDuration: {
          ...prev.sideEffectsDuration || {},
          [side]: {
            ...prev.sideEffectsDuration?.[side] || {},
            [effect]: newValue
          }
        }
      }));
    } else if (type === "hazardLevel") {
      // Nivel de spikes: 0-3, toxic spikes: 0-2 (0 significa ninguno)
      const [side, hazard] = key.split('.');
      let maxLevel = hazard === "Spikes" ? 3 : 2;
      newValue = Math.max(0, Math.min(maxLevel, newValue));
      
      setBattleConditions(prev => ({
        ...prev,
        entryHazardsLevel: {
          ...prev.entryHazardsLevel || {},
          [side]: {
            ...prev.entryHazardsLevel?.[side] || {},
            [hazard]: newValue
          }
        }
      }));
    } else if (type === "entryHazard") {
      // Duración de otros hazards: 0-8 turnos
      newValue = Math.max(0, Math.min(8, newValue));
      const [side, hazard] = key.split('.');
      
      setBattleConditions(prev => ({
        ...prev,
        entryHazardsDuration: {
          ...prev.entryHazardsDuration || {},
          [side]: {
            ...prev.entryHazardsDuration?.[side] || {},
            [hazard]: newValue
          }
        }
      }));
    }
  };

  const handleClearData = () => {
    setBattleConditions({
      weather: "",
      weatherDuration: 0,
      field: "",
      fieldDuration: 0,
      room: "",
      roomDuration: 0,
      sideEffects: {
        yourSide: {},
        opponentSide: {}
      },
      sideEffectsDuration: {
        yourSide: {},
        opponentSide: {}
      },
      entryHazards: {
        yourSide: {},
        opponentSide: {}
      },
      entryHazardsLevel: {
        yourSide: {},
        opponentSide: {}
      },
      entryHazardsDuration: {
        yourSide: {},
        opponentSide: {}
      }
    });
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
    <Dialog open={open} onClose={onClose} PaperComponent={DraggablePaperComponent} fullWidth>
      <DialogTitle id="draggable-dialog-title" style={{ cursor: 'grab' }}>
        Battle Conditions
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {/* Sección de condiciones generales */}
          <Grid item xs={12}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flex: 0.7 }}>
                  <InputLabel sx={{ color: 'inherit' }}>Weather</InputLabel>
                  <Select
                    value={battleConditions.weather}
                    onChange={(e) => handleSelectChange(e, 'weather')}
                    label="Weather"
                    sx={selectSx}
                    MenuProps={menuPropsDown}
                    fullWidth
                  >
                    <MenuItem value="">Any</MenuItem>
                    <MenuItem value="none">None</MenuItem>
                    <MenuItem value="RainDance">RainDance</MenuItem>
                    <MenuItem value="SunnyDay">SunnyDay</MenuItem>
                    <MenuItem value="Sandstorm">Sandstorm</MenuItem>
                    <MenuItem value="Hail">Hail</MenuItem>
                  </Select>
                </Box>
                <TextField
                  label="Turns Left"
                  type="number"
                  value={battleConditions.weatherDuration || 0}
                  onChange={(e) => handleDurationChange('weather', 'weather', e.target.value)}
                  inputProps={{ min: 1, max: 8, step: 1 }}
                  sx={{ width: '80px' }}
                />
              </Box>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flex: 0.7 }}>
                  <InputLabel sx={{ color: 'inherit' }}>Field</InputLabel>
                  <Select
                    value={battleConditions.field}
                    onChange={(e) => handleSelectChange(e, 'field')}
                    label="Field"
                    sx={selectSx}
                    MenuProps={menuPropsDown}
                    fullWidth
                  >
                    <MenuItem value="">Any</MenuItem>
                    <MenuItem value="none">None</MenuItem>
                    <MenuItem value="ElectricTerrain">ElectricTerrain</MenuItem>
                    <MenuItem value="GrassyTerrain">GrassyTerrain</MenuItem>
                    <MenuItem value="MistyTerrain">MistyTerrain</MenuItem>
                    <MenuItem value="PsychicTerrain">PsychicTerrain</MenuItem>
                  </Select>
                </Box>
                <TextField
                  label="Turns Left"
                  type="number"
                  value={battleConditions.fieldDuration || 0}
                  onChange={(e) => handleDurationChange('field', 'field', e.target.value)}
                  inputProps={{ min: 1, max: 8, step: 1 }}
                  sx={{ width: '80px' }}
                />
              </Box>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flex: 0.7 }}>
                  <InputLabel sx={{ color: 'inherit' }}>Room Effects</InputLabel>
                  <Select
                    value={battleConditions.room}
                    onChange={(e) => handleSelectChange(e, 'room')}
                    label="Room Effects"
                    sx={selectSx}
                    MenuProps={menuPropsDown}
                    fullWidth
                  >
                    <MenuItem value="">Any</MenuItem>
                    <MenuItem value="none">None</MenuItem>
                    <MenuItem value="TrickRoom">TrickRoom</MenuItem>
                    <MenuItem value="Gravity">Gravity</MenuItem>
                    <MenuItem value="MagicRoom">MagicRoom</MenuItem>
                    <MenuItem value="WonderRoom">WonderRoom</MenuItem>
                  </Select>
                </Box>
                <TextField
                  label="Turns Left"
                  type="number"
                  value={battleConditions.roomDuration || 0}
                  onChange={(e) => handleDurationChange('room', 'room', e.target.value)}
                  inputProps={{ min: 1, max: 8, step: 1 }}
                  sx={{ width: '80px' }}
                />
              </Box>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2, borderColor: 'grey.500' }} />
          </Grid>

          {/* Sección de Side Effects */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Side Effects</Typography>
            <Grid container spacing={2}>
              {/* Your Side */}
              <Grid item xs={6}>
                <Typography variant="body1" sx={{ mb: 1 }}>Your Side</Typography>
                <FormGroup>
                  {sideEffectsList.map(effect => (
                    <Box key={effect} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <FormControlLabel
                        control={
                          <TriStateCheckbox
                            value={battleConditions.sideEffects?.yourSide?.[effect]}
                            onChange={(newValue) => handleSideEffectChange('yourSide', effect, newValue)}
                            sx={{ color: 'white' }}
                          />
                        }
                        label={effect === "tailwind" ? "Tailwind (Your Side)" : effect}
                        sx={{ color: 'white' }}
                      />
                      <TextField
                        label="Turns Left"
                        type="number"
                        value={battleConditions.sideEffectsDuration?.yourSide?.[effect] || 0}
                        onChange={(e) => handleDurationChange('sideEffect', `yourSide.${effect}`, e.target.value)}
                        inputProps={{ min: 1, max: effect === "tailwind" ? 5 : 8, step: 1 }}
                        sx={{ width: '80px' }}
                      />
                    </Box>
                  ))}
                </FormGroup>
              </Grid>
              {/* Opponent Side */}
              <Grid item xs={6}>
                <Typography variant="body1" sx={{ mb: 1 }}>Opponent Side</Typography>
                <FormGroup>
                  {sideEffectsList.map(effect => (
                    <Box key={effect} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <FormControlLabel
                        control={
                          <TriStateCheckbox
                            value={battleConditions.sideEffects?.opponentSide?.[effect]}
                            onChange={(newValue) => handleSideEffectChange('opponentSide', effect, newValue)}
                            sx={{ color: 'white' }}
                          />
                        }
                        label={effect}
                        sx={{ color: 'white' }}
                      />
                      <TextField
                        label="Turns Left"
                        type="number"
                        value={battleConditions.sideEffectsDuration?.opponentSide?.[effect] || 0}
                        onChange={(e) => handleDurationChange('sideEffect', `opponentSide.${effect}`, e.target.value)}
                        inputProps={{ min: 1, max: effect === "tailwind" ? 5 : 8, step: 1 }}
                        sx={{ width: '80px' }}
                      />
                    </Box>
                  ))}
                </FormGroup>
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Entry Hazards</Typography>
            <Grid container spacing={2}>
              {/* Lado "Your Side" */}
              <Grid item xs={6}>
                <Typography variant="body1" sx={{ mb: 1 }}>Your Side</Typography>
                <FormGroup>
                  {hazardsList.map(hazard => (
                    <Box key={hazard} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <FormControlLabel
                        control={
                          <TriStateCheckbox
                            value={battleConditions.entryHazards?.yourSide?.[hazard] === false 
                              ? false 
                              : battleConditions.entryHazards?.yourSide?.[hazard] === true 
                                ? true 
                                : null}
                            onChange={(newValue) => handleHazardChange('yourSide', hazard)(newValue)}
                            name={hazard}
                            sx={{ color: 'white' }}
                          />
                        }
                        label={hazard}
                        sx={{ color: 'white' }}
                      />
                      {(hazard === "Spikes" || hazard === "Toxic Spikes") && (
                        <TextField
                          label="Level"
                          type="number"
                          value={battleConditions.entryHazardsLevel?.yourSide?.[hazard] || 0}
                          onChange={(e) => handleDurationChange('hazardLevel', `yourSide.${hazard}`, e.target.value)}
                          inputProps={{ 
                            min: 1, 
                            max: hazard === "Spikes" ? 3 : hazard === "Toxic Spikes" ? 2 : 8, 
                            step: 1 
                          }}
                          sx={{ width: '80px' }}
                        />
                      )}
                    </Box>
                  ))}
                </FormGroup>
              </Grid>
              {/* Lado "Opponent Side" */}
              <Grid item xs={6}>
                <Typography variant="body1" sx={{ mb: 1 }}>Opponent Side</Typography>
                <FormGroup>
                  {hazardsList.map(hazard => (
                    <Box key={hazard} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <FormControlLabel
                        control={
                          <TriStateCheckbox
                            value={battleConditions.entryHazards?.opponentSide?.[hazard] === false 
                              ? false 
                              : battleConditions.entryHazards?.opponentSide?.[hazard] === true 
                                ? true 
                                : null}
                            onChange={(newValue) => handleHazardChange('opponentSide', hazard)(newValue)}
                            name={hazard}
                            sx={{ color: 'white' }}
                          />
                        }
                        label={hazard}
                        sx={{ color: 'white' }}
                      />
                      {(hazard === "Spikes" || hazard === "Toxic Spikes") && (
                        <TextField
                          label="Level"
                          type="number"
                          value={battleConditions.entryHazardsLevel?.opponentSide?.[hazard] || 0}
                          onChange={(e) => handleDurationChange('hazardLevel', `opponentSide.${hazard}`, e.target.value)}
                          inputProps={{ 
                            min: 1, 
                            max: hazard === "Spikes" ? 3 : hazard === "Toxic Spikes" ? 2 : 8, 
                            step: 1 
                          }}
                          sx={{ width: '80px' }}
                        />
                      )}
                    </Box>
                  ))}
                </FormGroup>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleClearData} 
          variant="outlined" 
          color="warning"
          sx={{ mr: 'auto' }}
        >
          Clear Conditions
        </Button>
        <Button onClick={onClose} variant="contained" color="error">
          Cancel
        </Button>
        <Button onClick={handleApply} variant="contained" color="success">
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BattleConditionsDialog;