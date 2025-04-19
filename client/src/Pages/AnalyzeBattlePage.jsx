import React, { useState, useEffect } from 'react';
import {
  Box, Typography, CircularProgress,
  Grid, Card, CardHeader, CardContent, Table,
  TableHead, TableRow, TableCell, TableBody,
  LinearProgress, Chip, Stack
} from '@mui/material';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import PokemonSprite from '../components/PokemonSprite';

const AnalyzeBattlePage = () => {
  const { replayId } = useParams();
  const [data, setData] = useState(null);
  useEffect(() => {
    axios.get(`/api/analyze-battle/${replayId}`)
      .then(res => setData(res.data))
      .catch(console.error);
  }, [replayId]);

  if (!data) {
    return (
      <Box sx={{ textAlign: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" gutterBottom>
        Battle Analysis: {data.replayId}
      </Typography>

      {/* Teams */}
      <Grid container spacing={4} sx={{ mb: 4 }}>
        {['p1','p2'].map((side, idx) => (
          <Grid key={side} item xs={12} md={6}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Player {idx+1} Team
            </Typography>
            <Stack direction="row" spacing={1}>
              {data.teams[side].map(member =>
                <PokemonSprite
                  key={member.name}
                  pokemon={{ name: member.name }}
                />
              )}
            </Stack>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        {data.analysis.map(turn => (
          <Grid key={turn.turn_number} item xs={12} md={6}>
            <Card variant="outlined">
              <CardHeader
                title={`Turn ${turn.turn_number}`}
                subheader={`Move P1: ${turn.moveUsedP1} | Move P2: ${turn.moveUsedP2}`}
              />
              <CardContent>
                {/* Side effects */}
                <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {turn.state?.field?.terrain && (
                    <Chip label={`Field: ${turn.state.field.terrain}`} size="small" />
                  )}
                  {turn.state?.weather?.condition && (
                    <Chip label={`Weather: ${turn.state.weather.condition}`} size="small" />
                  )}
                  {turn.state?.room?.condition && (
                    <Chip label={`Room: ${turn.state.room.condition}`} size="small" />
                  )}
                </Box>

                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Player</TableCell>
                      <TableCell align="right">Win %</TableCell>
                      <TableCell>Alternatives</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {['P1','P2'].map(pl => {
                      const winProb = pl==='P1' ? turn.winProbP1 : turn.winProbP2;
                      const alt     = pl==='P1' ? turn.altWinProbsP1 : turn.altWinProbsP2;
                      return (
                        <TableRow key={pl}>
                          <TableCell>{pl}</TableCell>
                          <TableCell align="right" sx={{ minWidth: 100 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body2">
                                {(winProb*100).toFixed(0)}%
                              </Typography>
                              <Box sx={{ flexGrow: 1, ml: 1 }}>
                                <LinearProgress variant="determinate" value={winProb*100} />
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {Object.entries(alt||{}).map(([move,p]) => (
                              <Typography
                                key={move}
                                component="div"
                                sx={{ fontSize: 12, mb: 0.5 }}
                              >
                                {move}: {(p*100).toFixed(1)}%
                              </Typography>
                            ))}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default AnalyzeBattlePage;