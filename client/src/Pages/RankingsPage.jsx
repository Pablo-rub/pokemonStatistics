import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Paper,
  CircularProgress,
  Pagination,
  IconButton
} from '@mui/material';
import PokemonSprite from '../components/PokemonSprite';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

//todo
//menos numeros de pagination, 1 2 3 ... 100
//no solapamiento
//checks and counters
//abilities centered horizontally
//rankings de victoria

const PokemonUsage = () => {
    const [months, setMonths] = useState([]);
    const [month, setMonth] = useState('');
    const [formats, setFormats] = useState([]);
    const [format, setFormat] = useState('');
    const [usageData, setUsageData] = useState([]);
    const [error, setError] = useState(null);
    const [selectedPokemon, setSelectedPokemon] = useState(null);
    const [pokemonDetails, setPokemonDetails] = useState(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [page, setPage] = useState(1);
    const itemsPerPage = 6;
    const [currentCategory, setCurrentCategory] = useState(0);

    const categories = [
        { name: "Abilities", key: "abilities" },
        { name: "Moves", key: "moves" },
        { name: "Items", key: "items" },
        { name: "Spreads", key: "spreads" },
        { name: "Tera Types", key: "teraTypes" },
        { name: "Teammates", key: "teammates" },
        { name: "Checks & Counters", key: "checksAndCounters" }
    ];

    const handlePrevCategory = () => {
        setCurrentCategory(prev => (prev > 0 ? prev - 1 : categories.length - 1));
    };

    const handleNextCategory = () => {
        setCurrentCategory(prev => (prev < categories.length - 1 ? prev + 1 : 0));
    };

    const handleMonthChange = async (selectedMonth) => {
        setMonth(selectedMonth);
        try {
            const response = await axios.get(`http://localhost:5000/api/formats/${selectedMonth}`);
            const data = response.data;
            // Filtrar solo formatos VGC
            const vgcFormats = data.filter(fmt => 
                fmt.toLowerCase().includes('vgc')
            );
            setFormats(vgcFormats);
            if (vgcFormats.length > 0) {
                setFormat(vgcFormats[0]);
            }
        } catch (error) {
            console.error("Error fetching formats:", error);
            setError("Error fetching formats");
        }
    };

    const handleFormatChange = (e) => {
        setFormat(e.target.value);
    };

    useEffect(() => {
        const fetchMonths = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/months');
                const data = await response.json();
                setMonths(data);
                if (data.length > 0) {
                    const firstMonth = data[0];
                    setMonth(firstMonth);
                    await handleMonthChange(firstMonth);
                }
            } catch (error) {
                console.error("Error fetching months:", error);
            }
        };
        fetchMonths();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (month && format) {
                try {
                    const url = `http://localhost:5000/api/rankings?month=${month}&format=${format}.txt`;
                    console.log('Fetching from:', url);
                    const response = await axios.get(url);
                    console.log('Response data:', response.data);
                    if (response.data) {
                        parseData(response.data);
                    }
                } catch (error) {
                    console.error("Error loading data:", error);
                    setError(error.message);
                }
            }
        };
        fetchData();
    }, [format, month]);

    const parseData = (data) => {
        const lines = data.split('\n');
        const parsedData = [];
        // Empezar desde la línea 5 para saltar el encabezado
        for (let i = 5; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && !line.startsWith('+')) {
                const columns = line.split('|').map(col => col.trim()).filter(col => col);
                if (columns.length >= 6) {
                    parsedData.push({
                        rank: columns[0],
                        name: columns[1],
                        usagePercentage: parseFloat(columns[2]),
                        raw: columns[3],
                        realPercentage: columns[5]
                    });
                }
            }
        }
        setUsageData(parsedData);
    };

    const fetchPokemonDetails = async (pokemonName) => {
        if (!month || !format) return;
      
        setIsLoadingDetails(true);
        try {
            const response = await axios.get(`http://localhost:5000/api/rankings`, {
                params: {
                    month,
                    format,
                    chaos: true
                }
            });

            if (response.data && response.data.data) {
                const detailsKey = Object.keys(response.data.data).find(
                    key => key === pokemonName
                );

                if (detailsKey) {
                    const pokemonData = response.data.data[detailsKey];
                    
                    // Calcular totales para cada categoría
                    const getTotalUsage = (category) => {
                        return Object.values(category || {}).reduce((sum, value) => {
                            return typeof value === 'number' ? sum + value : sum;
                        }, 0);
                    };

                    const totalAbilities = getTotalUsage(pokemonData.Abilities);
                    const totalMoves = getTotalUsage(pokemonData.Moves);
                    const totalItems = getTotalUsage(pokemonData.Items);
                    const totalSpreads = getTotalUsage(pokemonData.Spreads);
                    const totalTeraTypes = getTotalUsage(pokemonData["Tera Types"]);
                    const totalTeammates = getTotalUsage(pokemonData.Teammates);

                    const details = {
                        abilities: Object.entries(pokemonData.Abilities || {}).map(([name, usage]) => ({
                            name,
                            percentage: ((usage / totalAbilities) * 100).toFixed(2)
                        })).sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage)),
                        
                        moves: Object.entries(pokemonData.Moves || {}).map(([name, usage]) => ({
                            name,
                            percentage: ((usage / totalMoves) * 100).toFixed(2)
                        })).sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage)),
                        
                        items: Object.entries(pokemonData.Items || {}).map(([name, usage]) => ({
                            name,
                            percentage: ((usage / totalItems) * 100).toFixed(2)
                        })).sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage)),
                        
                        spreads: Object.entries(pokemonData.Spreads || {}).map(([value, usage]) => ({
                            value,
                            percentage: ((usage / totalSpreads) * 100).toFixed(2)
                        })).sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage)),

                        teraTypes: Object.entries(pokemonData["Tera Types"] || {}).map(([type, usage]) => ({
                            type,
                            percentage: ((usage / totalTeraTypes) * 100).toFixed(2)
                        })).sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage)),

                        teammates: Object.entries(pokemonData.Teammates || {}).map(([name, usage]) => ({
                            name,
                            percentage: ((usage / totalTeammates) * 100).toFixed(2)
                        })).sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage))
                    };

                    setPokemonDetails(details);
                } else {
                    console.warn("No se encontró la clave correspondiente para:", pokemonName);
                    setPokemonDetails(null);
                }
            }
        } catch (error) {
            console.error("Error loading Pokémon details:", error);
            setPokemonDetails(null);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handlePokemonSelect = (pokemon) => {
        setSelectedPokemon(pokemon);
        fetchPokemonDetails(pokemon.name);
    };

    const getPaginatedData = () => {
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return usageData.slice(startIndex, endIndex);
    };

    const handlePageChange = (event, value) => {
        setPage(value);
        setSelectedPokemon(null);
        setPokemonDetails(null);
    };

    const renderCategoryContent = () => {
        const category = categories[currentCategory];
        
        return (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            height: '100%'
          }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2 
            }}>
              <IconButton onClick={handlePrevCategory} sx={{ color: 'white' }}>
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="h6" sx={{ color: 'white' }}>
                {category.name}
              </Typography>
              <IconButton onClick={handleNextCategory} sx={{ color: 'white' }}>
                <ArrowForwardIcon />
              </IconButton>
            </Box>
      
            <Box sx={{ flexGrow: 1 }}>
              {/* Abilities Chart */}
              {category.key === "abilities" && (
                <Box sx={{ 
                  height: pokemonDetails.abilities.filter(a => parseFloat(a.percentage) > 0).length * 40,
                  minHeight: 100,
                  mb: 4 
                }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={pokemonDetails.abilities.filter(a => parseFloat(a.percentage) > 0)}
                      layout="vertical"
                      margin={{ left: 150, right: 30 }}
                    >
                      <XAxis type="number" stroke="#fff" domain={[0, 100]} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        stroke="#fff" 
                        width={140}
                        tick={{ fontSize: 12 }}
                        interval={0}
                      />
                      <Tooltip 
                        cursor={false}
                        contentStyle={{ backgroundColor: '#221FC7' }}
                        labelStyle={{ color: '#fff' }}
                        formatter={(value) => [`${value}%`]}
                      />
                      <Bar dataKey="percentage" fill="#24CC9F" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
      
              {/* Moves Chart */}
              {category.key === "moves" && (
                <Box sx={{ 
                  height: pokemonDetails.moves.filter(move => parseFloat(move.percentage) > 0).length * 40,
                  minHeight: 100,
                  mb: 4 
                }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={pokemonDetails.moves.filter(move => parseFloat(move.percentage) > 0)}
                      layout="vertical"
                      margin={{ left: 150, right: 30 }}
                    >
                      <XAxis type="number" stroke="#fff" domain={[0, 100]} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        stroke="#fff" 
                        width={140}
                        tick={{ fontSize: 12 }}
                        interval={0}
                      />
                      <Tooltip 
                        cursor={false}
                        contentStyle={{ backgroundColor: '#221FC7' }}
                        labelStyle={{ color: '#fff' }}
                        formatter={(value) => [`${value}%`]}
                      />
                      <Bar dataKey="percentage" fill="#24CC9F" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
      
              {/* Items Chart */}
              {category.key === "items" && (
                <Box sx={{ 
                  height: pokemonDetails.items.filter(item => parseFloat(item.percentage) > 0).length * 40,
                  minHeight: 100,
                  mb: 4 
                }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={pokemonDetails.items.filter(item => parseFloat(item.percentage) > 0)}
                      layout="vertical"
                      margin={{ left: 150, right: 30 }}
                    >
                      <XAxis type="number" stroke="#fff" domain={[0, 100]} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        stroke="#fff" 
                        width={140}
                        tick={{ fontSize: 12 }}
                        interval={0}
                      />
                      <Tooltip 
                        cursor={false}
                        contentStyle={{ backgroundColor: '#221FC7' }}
                        labelStyle={{ color: '#fff' }}
                        formatter={(value) => [`${value}%`]}
                      />
                      <Bar dataKey="percentage" fill="#24CC9F" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
      
              {/* Spreads Chart */}
              {category.key === "spreads" && (
                <Box sx={{ 
                  height: pokemonDetails.spreads.filter(spread => parseFloat(spread.percentage) > 0).length * 40,
                  minHeight: 100,
                  mb: 4 
                }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={pokemonDetails.spreads.filter(spread => parseFloat(spread.percentage) > 0)}
                      layout="vertical"
                      margin={{ left: 150, right: 30 }}
                    >
                      <XAxis type="number" stroke="#fff" domain={[0, 100]} />
                      <YAxis 
                        dataKey="value" 
                        type="category" 
                        stroke="#fff" 
                        width={140}
                        tick={{ fontSize: 12 }}
                        interval={0}
                      />
                      <Tooltip 
                        cursor={false}
                        contentStyle={{ backgroundColor: '#221FC7' }}
                        labelStyle={{ color: '#fff' }}
                        formatter={(value) => [`${value}%`]}
                      />
                      <Bar dataKey="percentage" fill="#24CC9F" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
      
              {/* Tera Types Chart */}
              {category.key === "teraTypes" && (
                <Box sx={{ 
                  height: pokemonDetails.teraTypes.filter(type => parseFloat(type.percentage) > 0).length * 40,
                  minHeight: 100,
                  mb: 4 
                }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={pokemonDetails.teraTypes.filter(type => parseFloat(type.percentage) > 0)}
                      layout="vertical"
                      margin={{ left: 150, right: 30 }}
                    >
                      <XAxis type="number" stroke="#fff" domain={[0, 100]} />
                      <YAxis 
                        dataKey="type" 
                        type="category" 
                        stroke="#fff" 
                        width={140}
                        tick={{ fontSize: 12 }}
                        interval={0}
                      />
                      <Tooltip 
                        cursor={false}
                        contentStyle={{ backgroundColor: '#221FC7' }}
                        labelStyle={{ color: '#fff' }}
                        formatter={(value) => [`${value}%`]}
                      />
                      <Bar dataKey="percentage" fill="#24CC9F" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
      
              {/* Teammates */}
              {category.key === "teammates" && (
                <Box sx={{ 
                  height: pokemonDetails.teammates.filter(teammate => parseFloat(teammate.percentage) > 0).length * 60,
                  minHeight: 100,
                  mb: 4 
                }}>
                  {pokemonDetails.teammates
                    .filter(teammate => parseFloat(teammate.percentage) > 0)
                    .map((teammate, idx) => (
                      <Box key={idx} sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        mb: 2,
                        p: 2,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: 1
                      }}>
                        <PokemonSprite pokemon={{ name: teammate.name }} />
                        <Typography sx={{ color: 'white', flexGrow: 1 }}>{teammate.name}</Typography>
                        <Typography sx={{ color: 'white' }}>{teammate.percentage}%</Typography>
                      </Box>
                  ))}
                </Box>
              )}
      
              {/* Checks and Counters */}
              {category.key === "checksAndCounters" && pokemonDetails.checksAndCounters && (
                <Box sx={{ mb: 4 }}>
                  {pokemonDetails.checksAndCounters
                    .filter(counter => parseFloat(counter.usage) > 0)
                    .map((counter, idx) => (
                      <Box key={idx} sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        mb: 2,
                        p: 2,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: 1
                      }}>
                        <PokemonSprite pokemon={{ name: counter.name }} />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography sx={{ color: 'white' }}>{counter.name}</Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            Usage: {counter.usage}% | Score1: {counter.score1}% | Score2: {counter.score2}%
                          </Typography>
                        </Box>
                      </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        );
      };

    return (
        <Box sx={{ padding: 2 }}>
            <Typography variant="h4" gutterBottom>
                Pokémon Usage Statistics
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Month</InputLabel>
                    <Select
                        value={month}
                        label="Month"
                        onChange={(e) => handleMonthChange(e.target.value)}
                    >
                        {months.map((m) => (
                            <MenuItem key={m} value={m}>{m}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 300 }}>
                    <InputLabel>Format</InputLabel>
                    <Select
                        value={format}
                        label="Format"
                        onChange={handleFormatChange}
                    >
                        {formats.map((fmt) => (
                            <MenuItem key={fmt} value={fmt}>{fmt}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {error && (
                <Typography color="error" sx={{ mb: 2 }}>
                    Error: {error}
                </Typography>
            )}

            <Grid container spacing={2}>
                {/* Pokémon list */}
                <Grid item xs={12} md={3}>
                    <Box sx={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2
                    }}>
                        {getPaginatedData().map((pokemon) => (
                            <Paper
                                key={pokemon.rank}
                                onClick={() => handlePokemonSelect(pokemon)}
                                sx={{
                                    p: 2,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    backgroundColor: selectedPokemon?.name === pokemon.name ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)'
                                    }
                                }}
                            >
                                <Box sx={{ 
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    width: '100%'
                                }}>
                                    <PokemonSprite pokemon={{ name: pokemon.name }} />
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography>{pokemon.name}</Typography>
                                        <Typography variant="caption">{pokemon.usagePercentage}%</Typography>
                                    </Box>
                                    <Typography variant="caption">#{pokemon.rank}</Typography>
                                </Box>
                            </Paper>
                        ))}
                        <Pagination 
                            count={Math.ceil(usageData.length / itemsPerPage)}
                            page={page}
                            onChange={handlePageChange}
                            color="primary"
                            siblingCount={1}
                            sx={{
                                '& .MuiPaginationItem-root': {
                                    color: 'white'
                                }
                            }}
                        />
                    </Box>
                </Grid>

                {/* Details panel */}
                <Grid item xs={12} md={9}>
                    <Paper sx={{ 
                        p: 3,
                        backgroundColor: '#221FC7',
                        height: '80vh',
                        overflow: 'auto'
                    }}>
                        {isLoadingDetails ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                <CircularProgress />
                            </Box>
                        ) : selectedPokemon && pokemonDetails ? (
                            <Box>
                                {/* Header con nombre y sprite */}
                                <Box sx={{ 
                                    position: 'sticky',
                                    top: 0,
                                    backgroundColor: '#221FC7',
                                    zIndex: 10,
                                    pb: 2,
                                    borderBottom: '2px solid rgba(255, 255, 255, 0.2)'
                                }}>
                                    <Box sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center',
                                        gap: 2,
                                        mb: 2
                                    }}>
                                        <PokemonSprite pokemon={{ name: selectedPokemon.name }} />
                                        <Typography variant="h4" sx={{ color: 'white' }}>
                                            {selectedPokemon.name}
                                        </Typography>
                                        <Typography variant="h6" sx={{ ml: 'auto', color: 'white' }}>
                                            Usage: {selectedPokemon.usagePercentage}%
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Contenido con gráficas */}
                                <Box sx={{ mt: 4 }}>
                                    {renderCategoryContent()}
                                </Box>
                            </Box>
                        ) : (
                            <Box sx={{ 
                                display: 'flex', 
                                justifyContent: 'center', 
                                alignItems: 'center', 
                                height: '100%' 
                            }}>
                                <Typography sx={{ color: 'white' }}>
                                    Select a Pokémon to see details
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default PokemonUsage;
