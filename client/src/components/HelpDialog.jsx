import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button
} from '@mui/material';

const HelpDialog = ({ open, onClose }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>How to Use Turn Assistant</DialogTitle>
    <DialogContent dividers>
      <Typography variant="body2" paragraph>
        1. Select your 2 Pokémon for your side (topLeft & topRight) and your opponent’s 2 (bottomLeft & bottomRight).
      </Typography>
      <Typography variant="body2" paragraph>
        2. (Optional) Select your full teams via the “Select Team” buttons for each side.
      </Typography>
      <Typography variant="body2" paragraph>
        3. (Optional) Tweak battle-wide effects via the “Battle Conditions” button.
      </Typography>
      <Typography variant="body2" paragraph>
        4. Click “Analyze Battle” to see win-rates and move-combination suggestions.
      </Typography>
      <Typography variant="body2" paragraph>
        5. Hit “Reset All” to clear everything and start fresh.
      </Typography>
      <Typography variant="body2" paragraph>
        Note: The more specific your selections, the fewer scenarios will match, resulting in fewer results.
      </Typography>
      <Typography variant="body2" paragraph>
        Data collection began in March 2025, so historical coverage may be limited.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} variant="contained" color="primary">
        Close
      </Button>
    </DialogActions>
  </Dialog>
);

export default HelpDialog;