import React from 'react';
import { Paper, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import useDraggable from '../hooks/useDraggable';

function DraggablePaperComponent(props) {
  const { ref, style, handleMouseDown } = useDraggable({ resetOnClose: true, handleSelector: '#draggable-dialog-title' });
  return <Paper ref={ref} {...props} style={{ ...props.style, ...style }} onMouseDown={handleMouseDown} />;
}

const ClearConfirmationDialog = ({ open, onClose, onConfirm }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperComponent={DraggablePaperComponent}
      aria-labelledby="draggable-dialog-title"
    >
      <DialogTitle style={{ cursor: 'move' }} id="draggable-dialog-title">
        Confirm Clear
      </DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to clear all Pokémon selection and battle condition data?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" color="error">
          Cancel
        </Button>
        <Button onClick={onConfirm} variant="contained" color="success">
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClearConfirmationDialog;