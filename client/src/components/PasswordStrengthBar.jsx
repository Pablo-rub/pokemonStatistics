import React from 'react';
import { Box, Typography, LinearProgress, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

const PasswordStrengthBar = ({ password }) => {
  // Evaluar criterios de fortaleza
  const hasMinLength = password?.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecialChars = /[^A-Za-z0-9]/.test(password);
  
  // Lista de criterios
  const criteria = [
    { text: "Al menos 8 caracteres", fulfilled: hasMinLength },
    { text: "Al menos una letra mayúscula (A-Z)", fulfilled: hasUppercase },
    { text: "Al menos una letra minúscula (a-z)", fulfilled: hasLowercase },
    { text: "Al menos un número (0-9)", fulfilled: hasNumbers },
    { text: "Al menos un carácter especial (!@#$%^&*)", fulfilled: hasSpecialChars }
  ];
  
  // Verificar si todos los criterios están cumplidos
  const allCriteriaFulfilled = criteria.every(criterion => criterion.fulfilled);
  
  // Si todos los criterios están cumplidos, la contraseña es automáticamente fuerte (100%)
  let totalScore, feedback, color;
  
  if (allCriteriaFulfilled) {
    totalScore = 100;
    feedback = "Fuerte";
    color = "#4caf50"; // Verde
  } else {
    // Calcular puntuación cuando no todos los criterios están cumplidos
    const lengthScore = Math.min(password?.length / 12, 1) * 25;
    const complexityScore = 
      (hasUppercase ? 25 : 0) + 
      (hasLowercase ? 20 : 0) + 
      (hasNumbers ? 25 : 0) + 
      (hasSpecialChars ? 30 : 0);
    
    // Puntaje total (normalizado a 100)
    totalScore = (lengthScore * 0.4) + (complexityScore * 0.6);
    
    // Determinar estado según puntaje
    if (totalScore < 30) {
      feedback = "Muy débil";
      color = "#f44336"; // Rojo
    } else if (totalScore < 50) {
      feedback = "Débil";
      color = "#ff9800"; // Naranja
    } else if (totalScore < 75) {
      feedback = "Buena";
      color = "#ffc107"; // Amarillo
    } else {
      feedback = "Fuerte";
      color = "#4caf50"; // Verde
    }
  }
  
  return (
    <Box sx={{ width: '100%', mt: 1, mb: 2 }}>
      <LinearProgress 
        variant="determinate" 
        value={totalScore} 
        sx={{ 
          height: 6, 
          borderRadius: 3,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          '& .MuiLinearProgress-bar': {
            backgroundColor: color,
            transition: 'background-color 0.3s, width 0.5s'
          }
        }}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, mb: 1 }}>
        <Typography variant="caption" sx={{ color: color, fontWeight: 'medium' }}>
          {feedback}
        </Typography>
        <Typography variant="caption" sx={{ color: 'white' }}>
          {totalScore.toFixed(0)}%
        </Typography>
      </Box>
      
      {/* Lista de requisitos - sin efectos hover */}
      <List dense sx={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.05)', 
        borderRadius: 1,
        py: 1,
        px: 1
      }}>
        {criteria.map((criterion, index) => (
          <ListItem 
            key={index} 
            dense 
            sx={{ 
              py: 0.5,
              '&:hover': { backgroundColor: 'transparent' } // Eliminar efecto hover
            }}
            disableGutters
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              {criterion.fulfilled ? (
                <CheckIcon sx={{ color: '#4caf50', fontSize: 18 }} />
              ) : (
                <CloseIcon sx={{ color: '#f44336', fontSize: 18 }} />
              )}
            </ListItemIcon>
            <ListItemText 
              primary={
                <Typography variant="caption" sx={{ color: 'white' }}>
                  {criterion.text}
                </Typography>
              } 
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default PasswordStrengthBar;