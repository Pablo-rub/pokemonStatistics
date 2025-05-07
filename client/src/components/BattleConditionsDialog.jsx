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
  Divider,
  Typography,
  Paper,
  Box,
  TextField,
  IconButton,
  useTheme,
  useMediaQuery,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import useDraggable from '../hooks/useDraggable';
import TriStateCheckbox from './TriStateCheckBox';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
    '& .MuiSvgIcon-root': { color: 'inherit' },
    '& .MuiSelect-select': {
      paddingRight: '32px'
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      PaperComponent={DraggablePaperComponent} 
      fullWidth 
      maxWidth={isMobile ? "sm" : "md"}
      aria-labelledby="draggable-dialog-title"
    >
      <DialogTitle 
        id="draggable-dialog-title" 
        style={{ cursor: 'grab' }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant={isMobile ? "h6" : "h5"} component="div">
            Battle Conditions
          </Typography>
          <IconButton 
            onClick={onClose} 
            sx={{ color: 'white' }}
            aria-label="close"
            size={isMobile ? "small" : "medium"}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {/* --------- Sección de condiciones generales: Climate y Terrain --------- */}
        <Box sx={{ mb: 2 }}>
          <Typography 
            variant={isMobile ? "subtitle2" : "subtitle1"} 
            component="h3"
            sx={{ 
              fontWeight: 'bold', 
              mb: 1, 
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            Field Conditions
            <Tooltip title="Weather, terrain and room effects that affect both sides of the field">
              <InfoIcon fontSize="small" sx={{ color: 'white' }} />
            </Tooltip>
          </Typography>

          {/* Weather, terrain y room en vista móvil: acordeón */}
          {isMobile ? (
            <Accordion 
              defaultExpanded 
              sx={{ 
                backgroundColor: 'transparent',
                boxShadow: 'none',
                '&::before': { display: 'none' } 
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}
                aria-controls="weather-content"
                id="weather-header"
                sx={{ px: 0 }}
              >
                <Typography>Weather, Terrain & Room Effects</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0 }}>
                <FieldConditionControls 
                  battleConditions={battleConditions}
                  handleSelectChange={handleSelectChange}
                  handleDurationChange={handleDurationChange}
                  selectSx={selectSx}
                  isMobile={isMobile}
                />
              </AccordionDetails>
            </Accordion>
          ) : (
            <FieldConditionControls 
              battleConditions={battleConditions}
              handleSelectChange={handleSelectChange}
              handleDurationChange={handleDurationChange}
              selectSx={selectSx}
              isMobile={isMobile}
            />
          )}
        </Box>

        <Divider sx={{ my: 2, borderColor: 'grey.500' }} />

        {/* --------- Sección de Side Effects --------- */}
        <Box sx={{ mb: 2 }}>
          <Typography 
            variant={isMobile ? "subtitle2" : "subtitle1"} 
            component="h3"
            sx={{ 
              fontWeight: 'bold', 
              mb: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            Side Effects
            <Tooltip title="Effects specific to one side of the field like Reflect, Light Screen, etc.">
              <InfoIcon fontSize="small" sx={{ color: 'white' }} />
            </Tooltip>
          </Typography>

          <Grid container spacing={isMobile ? 0 : 2}>
            {/* En móvil: efectos en acordeón para cada lado */}
            {isMobile ? (
              <>
                <Grid item xs={12}>
                  <Accordion 
                    defaultExpanded 
                    sx={{ 
                      backgroundColor: 'transparent',
                      boxShadow: 'none',
                      '&::before': { display: 'none' },
                      mb: 1
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}
                      aria-controls="your-side-content"
                      id="your-side-header"
                      sx={{ px: 1 }}
                    >
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        Your Side
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 0 }}>
                      <SideEffectsControls 
                        side="yourSide"
                        battleConditions={battleConditions}
                        handleSideEffectChange={handleSideEffectChange}
                        handleDurationChange={handleDurationChange}
                        sideEffectsList={sideEffectsList}
                        isMobile={isMobile}
                      />
                    </AccordionDetails>
                  </Accordion>
                </Grid>
                
                <Grid item xs={12}>
                  <Accordion
                    sx={{ 
                      backgroundColor: 'transparent',
                      boxShadow: 'none',
                      '&::before': { display: 'none' }
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}
                      aria-controls="opponent-side-content"
                      id="opponent-side-header"
                      sx={{ px: 1 }}
                    >
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        Opponent Side
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 0 }}>
                      <SideEffectsControls 
                        side="opponentSide"
                        battleConditions={battleConditions}
                        handleSideEffectChange={handleSideEffectChange}
                        handleDurationChange={handleDurationChange}
                        sideEffectsList={sideEffectsList}
                        isMobile={isMobile}
                      />
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              </>
            ) : (
              <>
                {/* Vista desktop: dos columnas */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="body1" sx={{ mb: 1, fontWeight: 'medium' }}>
                    Your Side
                  </Typography>
                  <SideEffectsControls 
                    side="yourSide"
                    battleConditions={battleConditions}
                    handleSideEffectChange={handleSideEffectChange}
                    handleDurationChange={handleDurationChange}
                    sideEffectsList={sideEffectsList}
                    isMobile={isMobile}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body1" sx={{ mb: 1, fontWeight: 'medium' }}>
                    Opponent Side
                  </Typography>
                  <SideEffectsControls 
                    side="opponentSide"
                    battleConditions={battleConditions}
                    handleSideEffectChange={handleSideEffectChange}
                    handleDurationChange={handleDurationChange}
                    sideEffectsList={sideEffectsList}
                    isMobile={isMobile}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </Box>

        <Divider sx={{ my: 2, borderColor: 'grey.500' }} />

        {/* --------- Sección de Entry Hazards --------- */}
        <Box sx={{ mb: 2 }}>
          <Typography 
            variant={isMobile ? "subtitle2" : "subtitle1"} 
            component="h3"
            sx={{ 
              fontWeight: 'bold', 
              mb: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            Entry Hazards
            <Tooltip title="Hazards that damage or affect Pokémon when they switch in">
              <InfoIcon fontSize="small" sx={{ color: 'white' }} />
            </Tooltip>
          </Typography>

          <Grid container spacing={isMobile ? 0 : 2}>
            {/* En móvil: hazards en acordeón para cada lado */}
            {isMobile ? (
              <>
                <Grid item xs={12}>
                  <Accordion 
                    defaultExpanded 
                    sx={{ 
                      backgroundColor: 'transparent',
                      boxShadow: 'none',
                      '&::before': { display: 'none' },
                      mb: 1
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}
                      aria-controls="your-hazards-content"
                      id="your-hazards-header"
                      sx={{ px: 1 }}
                    >
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        Your Side
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 0 }}>
                      <HazardsControls 
                        side="yourSide"
                        battleConditions={battleConditions}
                        handleHazardChange={handleHazardChange}
                        handleDurationChange={handleDurationChange}
                        hazardsList={hazardsList}
                        isMobile={isMobile}
                      />
                    </AccordionDetails>
                  </Accordion>
                </Grid>
                
                <Grid item xs={12}>
                  <Accordion
                    sx={{ 
                      backgroundColor: 'transparent',
                      boxShadow: 'none',
                      '&::before': { display: 'none' }
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}
                      aria-controls="opponent-hazards-content"
                      id="opponent-hazards-header"
                      sx={{ px: 1 }}
                    >
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        Opponent Side
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 0 }}>
                      <HazardsControls 
                        side="opponentSide"
                        battleConditions={battleConditions}
                        handleHazardChange={handleHazardChange}
                        handleDurationChange={handleDurationChange}
                        hazardsList={hazardsList}
                        isMobile={isMobile}
                      />
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              </>
            ) : (
              <>
                {/* Vista desktop: dos columnas */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="body1" sx={{ mb: 1, fontWeight: 'medium' }}>
                    Your Side
                  </Typography>
                  <HazardsControls 
                    side="yourSide"
                    battleConditions={battleConditions}
                    handleHazardChange={handleHazardChange}
                    handleDurationChange={handleDurationChange}
                    hazardsList={hazardsList}
                    isMobile={isMobile}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body1" sx={{ mb: 1, fontWeight: 'medium' }}>
                    Opponent Side
                  </Typography>
                  <HazardsControls 
                    side="opponentSide"
                    battleConditions={battleConditions}
                    handleHazardChange={handleHazardChange}
                    handleDurationChange={handleDurationChange}
                    hazardsList={hazardsList}
                    isMobile={isMobile}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button 
          onClick={handleClearData} 
          variant="outlined" 
          color="warning"
          aria-label="Clear all battle conditions"
          sx={{ 
            mr: { xs: 0, sm: 'auto' }, 
            order: { xs: 3, sm: 1 },
            width: { xs: '100%', sm: 'auto' },
            mt: { xs: 1, sm: 0 }
          }}
        >
          Clear All
        </Button>
        <Button 
          onClick={onClose} 
          variant="contained" 
          color="error"
          aria-label="Cancel changes"
          sx={{ 
            flex: { xs: 1, sm: 'none' },
            order: { xs: 1, sm: 2 }
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleApply} 
          variant="contained" 
          color="success"
          aria-label="Apply battle conditions"
          sx={{ 
            flex: { xs: 1, sm: 'none' },
            order: { xs: 2, sm: 3 }
          }}
        >
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Componente separado para los controles de Field Conditions
const FieldConditionControls = ({ battleConditions, handleSelectChange, handleDurationChange, selectSx, isMobile }) => (
  <Grid container spacing={isMobile ? 1 : 2}>
    <Grid item xs={12}>
      <FormControl 
        fullWidth 
        sx={{ mb: 1 }}
        size={isMobile ? "small" : "medium"}
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          flexDirection: { xs: 'column', sm: 'row' }
        }}>
          <Box sx={{ flex: { xs: '1', sm: '0.7' }, width: { xs: '100%', sm: 'auto' } }}>
            <InputLabel id="weather-label" sx={{ color: 'inherit' }}>Weather</InputLabel>
            <Select
              labelId="weather-label"
              value={battleConditions.weather}
              onChange={(e) => handleSelectChange(e, 'weather')}
              label="Weather"
              sx={selectSx}
              MenuProps={menuPropsDown}
              fullWidth
              aria-label="Select weather condition"
            >
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="RainDance">Rain Dance</MenuItem>
              <MenuItem value="SunnyDay">Sunny Day</MenuItem>
              <MenuItem value="Sandstorm">Sandstorm</MenuItem>
              <MenuItem value="Hail">Hail</MenuItem>
            </Select>
          </Box>
          <TextField
            label="Turns"
            type="number"
            value={battleConditions.weatherDuration || 0}
            onChange={(e) => handleDurationChange('weather', 'weather', e.target.value)}
            inputProps={{ min: 0, max: 8, step: 1 }}
            sx={{ 
              width: { xs: '100%', sm: '80px' },
              mt: { xs: 1, sm: 0 }
            }}
            size={isMobile ? "small" : "medium"}
            aria-label="Weather turns remaining"
          />
        </Box>
      </FormControl>
    </Grid>

    <Grid item xs={12}>
      <FormControl 
        fullWidth 
        sx={{ mb: 1 }}
        size={isMobile ? "small" : "medium"}
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          flexDirection: { xs: 'column', sm: 'row' }
        }}>
          <Box sx={{ flex: { xs: '1', sm: '0.7' }, width: { xs: '100%', sm: 'auto' } }}>
            <InputLabel id="field-label" sx={{ color: 'inherit' }}>Terrain</InputLabel>
            <Select
              labelId="field-label"
              value={battleConditions.field}
              onChange={(e) => handleSelectChange(e, 'field')}
              label="Terrain"
              sx={selectSx}
              MenuProps={menuPropsDown}
              fullWidth
              aria-label="Select terrain effect"
            >
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="ElectricTerrain">Electric Terrain</MenuItem>
              <MenuItem value="GrassyTerrain">Grassy Terrain</MenuItem>
              <MenuItem value="MistyTerrain">Misty Terrain</MenuItem>
              <MenuItem value="PsychicTerrain">Psychic Terrain</MenuItem>
            </Select>
          </Box>
          <TextField
            label="Turns"
            type="number"
            value={battleConditions.fieldDuration || 0}
            onChange={(e) => handleDurationChange('field', 'field', e.target.value)}
            inputProps={{ min: 0, max: 8, step: 1 }}
            sx={{ 
              width: { xs: '100%', sm: '80px' },
              mt: { xs: 1, sm: 0 }
            }}
            size={isMobile ? "small" : "medium"}
            aria-label="Terrain turns remaining"
          />
        </Box>
      </FormControl>
    </Grid>

    <Grid item xs={12}>
      <FormControl 
        fullWidth 
        sx={{ mb: 0 }}
        size={isMobile ? "small" : "medium"}
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          flexDirection: { xs: 'column', sm: 'row' }
        }}>
          <Box sx={{ flex: { xs: '1', sm: '0.7' }, width: { xs: '100%', sm: 'auto' } }}>
            <InputLabel id="room-label" sx={{ color: 'inherit' }}>Room Effect</InputLabel>
            <Select
              labelId="room-label"
              value={battleConditions.room}
              onChange={(e) => handleSelectChange(e, 'room')}
              label="Room Effect"
              sx={selectSx}
              MenuProps={menuPropsDown}
              fullWidth
              aria-label="Select room effect"
            >
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="TrickRoom">Trick Room</MenuItem>
              <MenuItem value="Gravity">Gravity</MenuItem>
              <MenuItem value="MagicRoom">Magic Room</MenuItem>
              <MenuItem value="WonderRoom">Wonder Room</MenuItem>
            </Select>
          </Box>
          <TextField
            label="Turns"
            type="number"
            value={battleConditions.roomDuration || 0}
            onChange={(e) => handleDurationChange('room', 'room', e.target.value)}
            inputProps={{ min: 0, max: 8, step: 1 }}
            sx={{ 
              width: { xs: '100%', sm: '80px' },
              mt: { xs: 1, sm: 0 }
            }}
            size={isMobile ? "small" : "medium"}
            aria-label="Room effect turns remaining"
          />
        </Box>
      </FormControl>
    </Grid>
  </Grid>
);

// Componente separado para los controles de Side Effects
const SideEffectsControls = ({ side, battleConditions, handleSideEffectChange, handleDurationChange, sideEffectsList, isMobile }) => (
  <FormGroup>
    {sideEffectsList.map(effect => (
      <Box 
        key={effect} 
        sx={{ 
          display: 'flex', 
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' }, 
          gap: { xs: 1, sm: 2 }, 
          mb: 1.5 
        }}
      >
        <FormControlLabel
          control={
            <TriStateCheckbox
              value={battleConditions.sideEffects?.[side]?.[effect]}
              onChange={(newValue) => handleSideEffectChange(side, effect, newValue)}
              sx={{ color: 'white' }}
              size={isMobile ? "small" : "medium"}
            />
          }
          label={
            <Tooltip title={getEffectDescription(effect)}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <span>{effect.charAt(0).toUpperCase() + effect.slice(1)}</span>
                <InfoIcon sx={{ fontSize: '0.875rem', color: 'white', opacity: 0.8 }} />
              </Box>
            </Tooltip>
          }
          sx={{ 
            color: 'white', 
            margin: 0,
            minWidth: { xs: '140px', sm: '150px' }
          }}
        />
        <TextField
          label="Turns"
          type="number"
          value={battleConditions.sideEffectsDuration?.[side]?.[effect] || 0}
          onChange={(e) => handleDurationChange('sideEffect', `${side}.${effect}`, e.target.value)}
          inputProps={{ 
            min: 0, 
            max: effect === "tailwind" ? 5 : 8, 
            step: 1 
          }}
          sx={{ 
            width: { xs: '100%', sm: '80px' }
          }}
          size={isMobile ? "small" : "medium"}
          aria-label={`${effect} turns remaining`}
        />
      </Box>
    ))}
  </FormGroup>
);

// Componente separado para los controles de Hazards
const HazardsControls = ({ side, battleConditions, handleHazardChange, handleDurationChange, hazardsList, isMobile }) => (
  <FormGroup>
    {hazardsList.map(hazard => (
      <Box 
        key={hazard} 
        sx={{ 
          display: 'flex', 
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1, sm: 2 }, 
          mb: 1.5 
        }}
      >
        <FormControlLabel
          control={
            <TriStateCheckbox
              value={battleConditions.entryHazards?.[side]?.[hazard] === false 
                ? false 
                : battleConditions.entryHazards?.[side]?.[hazard] === true 
                  ? true 
                  : null}
              onChange={(newValue) => handleHazardChange(side, hazard)(newValue)}
              name={hazard}
              sx={{ color: 'white' }}
              size={isMobile ? "small" : "medium"}
            />
          }
          label={
            <Tooltip title={getHazardDescription(hazard)}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <span>{hazard}</span>
                <InfoIcon sx={{ fontSize: '0.875rem', color: 'white', opacity: 0.8 }} />
              </Box>
            </Tooltip>
          }
          sx={{ 
            color: 'white', 
            margin: 0,
            minWidth: { xs: '140px', sm: '150px' }
          }}
        />
        {(hazard === "Spikes" || hazard === "Toxic Spikes") ? (
          <TextField
            label="Level"
            type="number"
            value={battleConditions.entryHazardsLevel?.[side]?.[hazard] || 0}
            onChange={(e) => handleDurationChange('hazardLevel', `${side}.${hazard}`, e.target.value)}
            inputProps={{ 
              min: 0, 
              max: hazard === "Spikes" ? 3 : hazard === "Toxic Spikes" ? 2 : 8, 
              step: 1 
            }}
            sx={{ 
              width: { xs: '100%', sm: '80px' }
            }}
            size={isMobile ? "small" : "medium"}
            aria-label={`${hazard} level`}
          />
        ) : (
          <Box sx={{ width: { xs: '100%', sm: '80px' } }} />
        )}
      </Box>
    ))}
  </FormGroup>
);

// Función auxiliar para obtener descripciones de los efectos
function getEffectDescription(effect) {
  const descriptions = {
    "tailwind": "Doubles Speed for 4 turns",
    "reflect": "Halves damage from Physical attacks for 5 turns",
    "lightscreen": "Halves damage from Special attacks for 5 turns",
    "auroraveil": "Halves damage from all attacks for 5 turns (only active during Hail)"
  };
  return descriptions[effect] || effect;
}

// Función auxiliar para obtener descripciones de los hazards
function getHazardDescription(hazard) {
  const descriptions = {
    "Spikes": "Damages non-flying Pokémon on switch-in. Up to 3 layers possible.",
    "Toxic Spikes": "Poisons non-flying Pokémon on switch-in. 2 layers causes Toxic poison.",
    "Stealth Rock": "Damages Pokémon on switch-in. Damage depends on type effectiveness against Rock.",
    "Sticky Web": "Lowers Speed of non-flying/levitating Pokémon on switch-in."
  };
  return descriptions[hazard] || hazard;
}

export default BattleConditionsDialog;