import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import {
  Box,
  Grid,
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
  CircularProgress,
  Alert,
  useTheme,
} from "@mui/material";
import PokemonSprite from "../components/PokemonSprite";

const AnalyzeBattlePage = () => {
  const { replayId } = useParams();
  const theme = useTheme();
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get(`/api/analyze-battle/${replayId}`)
      .then(res => setData(res.data))
      .catch(console.error);
  }, [replayId]);

  if (!data) {
    return (
      <Box sx={{ textAlign: 'center', mt: 8 }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" color="common.white" gutterBottom>
        Battle Analysis: {data.replayId}
      </Typography>

      {data.hasInsufficientData && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Some turns don't have enough data for accurate predictions. This happens when there are few or no similar scenarios in our database.
        </Alert>
      )}

      <Grid container spacing={4} sx={{ mb: 4 }}>
        {['p1','p2'].map((side, i) => (
          <Grid key={side} item xs={12} sm={6}>
            <Typography variant="h6" color="common.white" gutterBottom>
              Player {i+1} Team
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {data.teams[side].map(p =>
                <PokemonSprite key={p.name} pokemon={{ name: p.name }} />
              )}
            </Stack>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        {data.analysis
          .filter(turn => turn.turn_number !== 0)
          .map(turn => (
            <Grid key={turn.turn_number} item xs={12} sm={6} md={4}>
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
                  subheader={`P1: ${turn.moveUsedP1} — P2: ${turn.moveUsedP2}`}
                  titleTypographyProps={{ variant: 'h6', color: 'primary.contrastText' }}
                  subheaderTypographyProps={{ variant: 'body2', color: 'primary.contrastText' }}
                  sx={{
                    '& .MuiCardHeader-action, & .MuiCardHeader-content': {
                      color: theme.palette.primary.contrastText
                    }
                  }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Field / Weather / Room chips */}
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
                      {['P1','P2'].map((pl, idx) => {
                        const win = pl === 'P1' ? turn.winProbP1 : turn.winProbP2;
                        const activeNames = pl === 'P1' ? turn.activePokemon.p1 : turn.activePokemon.p2;

                        return (
                          <TableRow key={pl}>
                            <TableCell sx={{ color: theme.palette.primary.contrastText }}>{pl}</TableCell>
                            <TableCell align="right" sx={{ color: theme.palette.primary.contrastText }}>
                              {turn.noData || win === null ? 
                                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>?</Typography> : 
                                `${(win * 100).toFixed(1)}%`
                              }
                            </TableCell>
                            <TableCell sx={{ color: theme.palette.primary.contrastText }}>
                              <Stack direction="row" spacing={0.5}>
                                {activeNames.map((name, i) => 
                                  name && <PokemonSprite key={i} pokemon={{ name }} />
                                )}
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

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
            </Grid>
          ))}
      </Grid>
    </Box>
  );
};

export default AnalyzeBattlePage;