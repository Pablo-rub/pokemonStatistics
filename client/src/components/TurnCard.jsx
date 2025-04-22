import React, { useState } from "react";
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Stack,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Collapse,
  IconButton,
  Grid
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PokemonSprite from "./PokemonSprite";

const TurnCard = ({ turn }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  // Limpia comas iniciales en el texto de movimientos
  const formattedMoveP1 = turn.moveUsedP1?.replace(/^,\s*/, '').trim();
  const formattedMoveP2 = turn.moveUsedP2?.replace(/^,\s*/, '').trim();

  return (
    <Card
      elevation={3}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
        ':hover': { boxShadow: 6 }
      }}
      aria-labelledby={`turn-${turn.turn_number}`}
    >
      <CardHeader
        id={`turn-${turn.turn_number}`}
        title={`Turn ${turn.turn_number}`}
        subheader={
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="body2" sx={{ color: theme.palette.primary.contrastText }}>
              P1: {formattedMoveP1 || '—'}
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.primary.contrastText }}>
              P2: {formattedMoveP2 || '—'}
            </Typography>
          </Box>
        }
        titleTypographyProps={{ variant: 'h6', color: 'primary.contrastText' }}
        sx={{
          '& .MuiCardHeader-action, & .MuiCardHeader-content': {
            color: theme.palette.primary.contrastText
          }
        }}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
          {['field','weather','room'].map(key => {
            const value = turn.state?.[key]?.[ key === 'field' ? 'terrain' : 'condition' ];
            if (!value) return null;
            const isField = key === 'field';
            return (
              <Chip
                key={key}
                label={`${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`}
                size="small"
                variant={isField ? 'outlined' : 'filled'}
                color={isField ? 'default' : 'success'}
                sx={{
                  color: isField
                    ? theme.palette.primary.contrastText
                    : 'white',
                  borderColor: isField
                    ? theme.palette.primary.contrastText
                    : undefined,
                  bgcolor: isField
                    ? 'transparent'
                    : undefined,
                }}
              />
            );
          })}
        </Stack>

        <Table size="small" aria-label={`win-probabilities-turn-${turn.turn_number}`}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: theme.palette.primary.contrastText }}>Player</TableCell>
              <TableCell align="right" sx={{ color: theme.palette.primary.contrastText }}>Win %</TableCell>
              <TableCell sx={{ color: theme.palette.primary.contrastText }}>Active Pokémon</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {['P1','P2'].map(pl => {
              const win = pl === 'P1' ? turn.winProbP1 : turn.winProbP2;
              const activeNames = pl === 'P1'
                ? turn.activePokemon.p1
                : turn.activePokemon.p2;
              const showQuestion = turn.noData 
                || win === null 
                || (turn.winProbP1 === 0 && turn.winProbP2 === 0);
              return (
                <TableRow key={pl}>
                  <TableCell sx={{ color: theme.palette.primary.contrastText }}>{pl}</TableCell>
                  <TableCell align="right" sx={{ color: theme.palette.primary.contrastText }}>
                    {showQuestion
                      ? <Typography variant="body2" sx={{ fontStyle: 'italic' }}>?</Typography>
                      : `${(win * 100).toFixed(1)}%`
                    }
                  </TableCell>
                  <TableCell sx={{ color: theme.palette.primary.contrastText }}>
                    <Stack direction="row" spacing={0.5}>
                      {activeNames
                        .filter(name => !!name)
                        .map((name,i) =>
                          <PokemonSprite key={i} pokemon={{ name }} />
                        )
                      }
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            mt: 2
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Typography variant="subtitle2" sx={{ color: theme.palette.primary.contrastText }}>
            Battle Conditions Details
          </Typography>
          <IconButton sx={{ color: 'white' }}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ color: theme.palette.primary.contrastText }}>
              Weather: {turn.state?.weather?.condition || 'None'} ({turn.state?.weatherDuration || 0} turns)
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.primary.contrastText }}>
              Field: {turn.state?.field?.terrain || 'None'} ({turn.state?.fieldDuration || 0} turns)
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.primary.contrastText }}>
              Room: {turn.state?.room?.condition || 'None'} ({turn.state?.roomDuration || 0} turns)
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.primary.contrastText, mt: 1 }}>
              Side Effects — You: Tailwind {turn.state?.sideEffects?.yourSide?.tailwind ? '✔' : '✘'}, Reflect {turn.state?.sideEffects?.yourSide?.reflect ? '✔' : '✘'}, Light Screen {turn.state?.sideEffects?.yourSide?.lightscreen ? '✔' : '✘'}, Aurora Veil {turn.state?.sideEffects?.yourSide?.auroraveil ? '✔' : '✘'}
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.primary.contrastText }}>
              Side Effects — Opponent: Tailwind {turn.state?.sideEffects?.opponentSide?.tailwind ? '✔' : '✘'}, Reflect {turn.state?.sideEffects?.opponentSide?.reflect ? '✔' : '✘'}, Light Screen {turn.state?.sideEffects?.opponentSide?.lightscreen ? '✔' : '✘'}, Aurora Veil {turn.state?.sideEffects?.opponentSide?.auroraveil ? '✔' : '✘'}
            </Typography>
          </Box>
        </Collapse>

        {turn.pokemonData && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ color: theme.palette.primary.contrastText, mb: 1 }}>
              Pokémon Details
            </Typography>
            <Grid container spacing={1}>
              {Object.entries(turn.pokemonData).map(([slot, mon]) =>
                mon ? (
                  <Grid key={slot} item xs={12}>
                    <Typography variant="body2" sx={{ color: theme.palette.primary.contrastText }}>
                      {`${slot.charAt(0).toUpperCase() + slot.slice(1)}: ${mon.name}`}
                      {mon.item ? ` | Item: ${mon.item}` : ''}
                      {mon.ability ? ` | Ability: ${mon.ability}` : ''}
                      {mon.moves?.length ? ` | Moves: ${mon.moves.join(', ')}` : ''}
                    </Typography>
                  </Grid>
                ) : null
              )}
            </Grid>
          </Box>
        )}

        {turn.noData && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              mt: 1,
              fontStyle: 'italic',
              color: 'rgba(255,255,255,0.7)'
            }}
          >
            Insufficient data for win prediction
          </Typography>
        )}

        {turn.scenarioCount > 0 && !turn.noData && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              mt: 1,
              color: 'rgba(255,255,255,0.7)'
            }}
          >
            Based on {turn.scenarioCount} similar scenarios
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default TurnCard;