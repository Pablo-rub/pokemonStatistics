import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Select, MenuItem, FormControl, InputLabel,
  Grid, Paper, CircularProgress, Pagination, IconButton
} from '@mui/material';
import PokemonSprite from '../components/PokemonSprite';
import axios from 'axios';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

//todo
//menos numeros de pagination, 1 2 3 ... 100
//no solapamiento
//checks and counters
//rankings de victoria
//error 500 algunos formatos

const PokemonUsage = () => {
    const [formats, setFormats] = useState([]);
    const [format, setFormat] = useState('');
    const [usageData, setUsageData] = useState([]);
    const [historicalData, setHistoricalData] = useState({}); // Para almacenar datos históricos
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

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // 1. Get latest month
                const monthsResponse = await axios.get('http://localhost:5000/api/months');
                const months = monthsResponse.data;
                
                if (months.length > 0) {
                    const latestMonth = months[0];
                    
                    // 2. Get formats for latest month and filter VGC formats
                    const formatsResponse = await axios.get(`http://localhost:5000/api/formats/${latestMonth}`);
                    const vgcFormats = formatsResponse.data
                        .filter(fmt => fmt.toLowerCase().includes('vgc'))
                        .sort((a, b) => b.localeCompare(a));
                    
                    setFormats(vgcFormats);
                    
                    // 3. Automatically select the last format and fetch its data
                    if (vgcFormats.length > 0) {
                        const lastFormat = vgcFormats[0];
                        setFormat(lastFormat);
                        
                        // CHANGE: Call handleFormatChange to load all historical data
                        // instead of just fetching the latest month
                        handleFormatChange(lastFormat);
                    }
                }
            } catch (error) {
                console.error("Error in fetchInitialData:", error);
                const errorMessage = error.response?.data || "Error loading formats";
                setError(errorMessage);
                setIsLoadingDetails(false);
            }
        };

        fetchInitialData();
    }, []);

    const handleFormatChange = async (selectedFormat) => {
        setFormat(selectedFormat);
        setIsLoadingDetails(true);
        setSelectedPokemon(null);
        setPokemonDetails(null);
        
        try {
            // 1. Obtener todos los meses disponibles
            console.log("Fetching months...");
            const monthsResponse = await axios.get('http://localhost:5000/api/months');
            const months = monthsResponse.data.sort().reverse() // Ordenar de más reciente a más antiguo
            console.log(months);
            const historicalDataObj = {};
            let foundData = false;
            let consecutiveFailures = 0;
            // Aumentamos el máximo de fallos consecutivos para asegurar que busca más meses
            const MAX_CONSECUTIVE_FAILURES = 3; // Aumentado para asegurar que busca más meses

            // 2. Iterar por los meses hasta encontrar uno sin datos
            for (const month of months) {
                try {
                    console.log(`Buscando datos para ${selectedFormat} en ${month}...`);
                    const response = await axios.get('http://localhost:5000/api/rankings', {
                        params: {
                            month,
                            format: selectedFormat,
                            chaos: true
                        }
                    });
                    
                    if (response.data && response.data.data && 
                        Object.keys(response.data.data).length > 0) {
                        historicalDataObj[month] = response.data;
                        foundData = true;
                        consecutiveFailures = 0; // Resetear contador de fallos consecutivos
                        console.log(`Encontrados datos para ${selectedFormat} en ${month}`);
                    } else {
                        consecutiveFailures++;
                        console.log(`No se encontraron datos válidos para ${selectedFormat} en ${month}`);
                    }
                } catch (fetchError) {
                    consecutiveFailures++;
                    if (fetchError.response &&
                        (fetchError.response.status === 404 || fetchError.response.status === 500)) {
                        console.log(`No hay datos para ${selectedFormat} en ${month} (${fetchError.response.status})`);
                    } else {
                        console.error(`Error buscando datos para ${month}:`, fetchError);
                    }
                }
                
                // Si ya encontramos datos y tenemos MAX_CONSECUTIVE_FAILURES fallos seguidos, asumimos que hemos terminado
                if (foundData && consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                    console.log(`Deteniendo búsqueda después de ${MAX_CONSECUTIVE_FAILURES} fallos consecutivos`);
                    break;
                }
            }

            // 3. Actualizar estados con los datos históricos
            setHistoricalData(historicalDataObj);
            
            // 4. Usar los datos más recientes para la vista principal
            const latestMonth = Object.keys(historicalDataObj).sort().reverse()[0];
            if (historicalDataObj[latestMonth]) {
                parseData(historicalDataObj[latestMonth]);
                setError(null); // Limpiar errores previos
            } else {
                setError(`No data available for format: ${selectedFormat}`);
            }
        } catch (error) {
            console.error("Error fetching months:", error);
            setError("Error accessing Smogon data");
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const parseData = (data) => {
        // Check if data is JSON (from chaos endpoint) or text
        if (typeof data === 'object' && data !== null) {
            // Handle JSON data from chaos endpoint
            const parsedData = [];
            
            // Extract data from the chaos format
            if (data.data) {
                const pokemonEntries = Object.entries(data.data);
                let rank = 1;
                
                pokemonEntries.forEach(([name, details]) => {
                    if (details.usage !== undefined) {
                        parsedData.push({
                            rank: rank.toString(),
                            name: name,
                            usagePercentage: parseFloat((details.usage * 100).toFixed(2)),
                            raw: details.raw || "0",
                            realPercentage: details['real usage'] ? (details['real usage'] * 100).toFixed(2) : "0"
                        });
                        rank++;
                    }
                });
                
                // Sort by usage percentage
                parsedData.sort((a, b) => b.usagePercentage - a.usagePercentage);
            }
            
            setUsageData(parsedData);
        } else if (typeof data === 'string') {
            // Handle text data (original implementation)
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
        } else {
            console.error("Unexpected data format:", data);
            setUsageData([]);
        }
    };

    const fetchPokemonDetails = async (pokemonName) => {
        setIsLoadingDetails(true);
        try {
            // Get the most recent month from historicalData
            const latestMonth = Object.keys(historicalData).sort().reverse()[0];
            
            if (!latestMonth) {
                throw new Error("No month data available");
            }
            
            const response = await axios.get(`http://localhost:5000/api/rankings`, {
                params: {
                    format,
                    month: latestMonth,
                    chaos: true
                }
            });

            if (response.data && response.data.data) {
                const detailsKey = Object.keys(response.data.data).find(
                    key => key === pokemonName
                );

                if (detailsKey) {
                    // Rest of your existing code
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
                        })).sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage)).slice(0, 10),
                        
                        items: Object.entries(pokemonData.Items || {}).map(([name, usage]) => ({
                            name,
                            percentage: ((usage / totalItems) * 100).toFixed(2)
                        })).sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage)).slice(0, 10),
                        
                        // Limitar spreads a los 10 principales
                        spreads: Object.entries(pokemonData.Spreads || {}).map(([value, usage]) => ({
                            value,
                            percentage: ((usage / totalSpreads) * 100).toFixed(2)
                        })).sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage)).slice(0, 10),

                        teraTypes: Object.entries(pokemonData["Tera Types"] || {}).map(([type, usage]) => ({
                            type,
                            percentage: ((usage / totalTeraTypes) * 100).toFixed(2)
                        })).sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage)),

                        teammates: Object.entries(pokemonData.Teammates || {}).map(([name, usage]) => ({
                            name,
                            percentage: ((usage / totalTeammates) * 100).toFixed(2)
                        })).sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage)).slice(0, 10)
                    };

                    setPokemonDetails(details);
                } else {
                    console.warn("No se encontró la clave correspondiente para:", pokemonName);
                    setPokemonDetails(null);
                }
            }
        } catch (error) {
            console.error("Error fetching Pokémon details:", error);
            setError("Error fetching Pokémon details");
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
        
        // Define paleta de colores ampliada para las líneas de los gráficos
        const COLORS = [
          '#24CC9F', '#1A9B79', '#147A5E', '#0E5943', '#093828', 
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', 
          '#FF9F40', '#E7E9ED', '#8A2BE2', '#00BFFF', '#FF7F50'
        ];
      
        // Función para generar datos de series temporales para la categoría actual
        const generateTimeSeriesData = (categoryKey) => {
          if (!selectedPokemon || !historicalData || Object.keys(historicalData).length === 0) {
            return [];
          }
      
          // Mapeo de llaves de categoría a la estructura de datos
          const categoryKeys = {
            'abilities': 'Abilities',
            'moves': 'Moves',
            'items': 'Items',
            'spreads': 'Spreads',
            'teraTypes': 'Tera Types'
          };
      
          const structureKey = categoryKeys[categoryKey];
          if (!structureKey) return [];
      
          // Obtener todos los nombres de elementos únicos de esta categoría a través de todos los meses
          const uniqueItems = new Set();
          
          // Limitar el número de elementos según la categoría
          const itemLimit = categoryKey === 'spreads' ? 10 : (categoryKey === 'abilities' ? 100 : 20);
          
          Object.entries(historicalData).forEach(([month, monthData]) => {
            if (monthData && monthData.data && monthData.data[selectedPokemon.name]) {
              const categoryData = monthData.data[selectedPokemon.name][structureKey];
              if (categoryData) {
                // Ordenar por uso y tomar solo los primeros N elementos
                const sortedItems = Object.entries(categoryData)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, itemLimit)
                    .map(([itemName]) => itemName);
                    
                sortedItems.forEach(itemName => uniqueItems.add(itemName));
              }
            }
          });
      
          // Para cada elemento, crear una serie de datos con su uso a lo largo del tiempo
          const seriesData = Array.from(uniqueItems).map(itemName => {
            const dataPoints = [];
            Object.entries(historicalData)
              .sort((a, b) => a[0].localeCompare(b[0])) // Ordenar por fecha
              .forEach(([month, monthData]) => {
                if (monthData && monthData.data && monthData.data[selectedPokemon.name]) {
                  const categoryData = monthData.data[selectedPokemon.name][structureKey];
                  const total = Object.values(categoryData || {}).reduce((sum, val) => sum + parseFloat(val), 0);
                  const value = categoryData && categoryData[itemName] ? 
                    parseFloat((categoryData[itemName] / total * 100).toFixed(2)) : 0;
                  
                  dataPoints.push({
                    month,
                    [itemName]: value
                  });
                }
              });
            
            return {
              name: itemName,
              data: dataPoints
            };
          });
      
          // Filtrar series con datos para mostrar solo las que tienen uso
          return seriesData.filter(series => 
            series.data.some(point => point[series.name] > 0)
          );
        };
      
        // Renderizar gráfico de líneas para la categoría actual
        const renderCategoryTimeSeries = (categoryKey) => {
          const seriesData = generateTimeSeriesData(categoryKey);
          
          if (seriesData.length === 0) {
            return (
              <Box sx={{ mt: 3, mb: 2 }}>
                <Typography sx={{ color: 'white', fontStyle: 'italic' }}>
                  No hay suficientes datos históricos para mostrar tendencias.
                </Typography>
              </Box>
            );
          }
          
          // Crear estructura unificada para el gráfico
          const months = Array.from(
            new Set(seriesData.flatMap(s => s.data.map(d => d.month)))
          ).sort();
          
          const graphData = months.map(month => {
            const dataPoint = { month };
            seriesData.forEach(series => {
              const monthPoint = series.data.find(d => d.month === month);
              dataPoint[series.name] = monthPoint ? monthPoint[series.name] : 0;
            });
            return dataPoint;
          });
      
          return (
            <Box sx={{ 
              height: 400, 
              width: '100%', 
              mt: 4,
              mb: 4
            }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'white', textAlign: 'center' }}>
                {category.name} - Evolución Histórica
              </Typography>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={graphData}>
                  <XAxis dataKey="month" stroke="#fff" />
                  <YAxis 
                    stroke="#fff" 
                    domain={[0, 100]}
                    ticks={[0, 20, 40, 60, 80, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    formatter={(value) => `${value}%`}
                    contentStyle={{ backgroundColor: '#221FC7' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  {seriesData.map((series, index) => (
                    <Line 
                      key={series.name}
                      type="monotone" 
                      dataKey={series.name} 
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Box>
          );
        };
      
        return (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            height: '100%'
          }}>
            {/* Navigation controls */}
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
              {/* Render category time series chart */}
              {renderCategoryTimeSeries(category.key)}
              
              {/* Render current month data pie chart (mantenemos esta funcionalidad) */}
              {category.key === "abilities" && pokemonDetails && (
                <Box sx={{ height: 400, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pokemonDetails.abilities.filter(a => parseFloat(a.percentage) > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percentage }) => `${name} (${percentage}%)`}
                        outerRadius={150}
                        dataKey="percentage"
                        nameKey="name"
                      >
                        {pokemonDetails.abilities.filter(a => parseFloat(a.percentage) > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => `${value}%`}
                        contentStyle={{ backgroundColor: '#221FC7' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              )}
              
              {/* Repetir para otras categorías (moves, items, etc.) */}
              {/* ... */}
            </Box>
          </Box>
        );
      };

    const renderHistoricalChart = (pokemonName) => {
        if (!historicalData || Object.keys(historicalData).length === 0) {
            return null;
        }

        const usageData = [];
        
        // Procesar datos históricos para el pokemon seleccionado
        Object.entries(historicalData).forEach(([month, monthData]) => {
            let pokemonData = null;
            
            // Verificar la estructura de datos y buscar el Pokémon de manera apropiada
            if (monthData && typeof monthData === 'object') {
                // Si es un objeto con estructura JSON de "chaos"
                if (monthData.data && typeof monthData.data === 'object') {
                    // Buscar en monthData.data[pokemonName] directamente
                    if (monthData.data[pokemonName]) {
                        pokemonData = {
                            name: pokemonName,
                            usagePercentage: (monthData.data[pokemonName].usage * 100).toFixed(2)
                        };
                    }
                }
            }
            
            if (pokemonData) {
                usageData.push({
                    month,
                    usage: parseFloat(pokemonData.usagePercentage)
                });
            }
        });
        
        // Ordenar por fecha
        usageData.sort((a, b) => a.month.localeCompare(b.month));
        
        return (
            <Box sx={{ mt: 4 }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
                    Usage History ({usageData.length} months)
                </Typography>
                <Box sx={{ height: 300, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={usageData}>
                            <XAxis dataKey="month" stroke="#fff" />
                            <YAxis 
                                domain={[0, 100]} 
                                stroke="#fff" 
                                ticks={[0, 20, 40, 60, 80, 100]}
                                tickFormatter={(value) => `${value}%`}
                            />
                            <Tooltip 
                                formatter={(value) => `${value}%`}
                                contentStyle={{ backgroundColor: '#221FC7' }}
                                labelStyle={{ color: '#fff' }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="usage" 
                                stroke="#24CC9F" 
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </Box>
            </Box>
        );
    };

    return (
        <Box sx={{ padding: 2 }}>
            <Typography variant="h4" gutterBottom>
                Pokémon Usage Statistics
            </Typography>

            <FormControl sx={{ minWidth: 300, mb: 4 }}>
                <InputLabel>Format</InputLabel>
                <Select
                    value={format}
                    label="Format"
                    onChange={(e) => {
                        console.log("Format selected:", e.target.value);
                        handleFormatChange(e.target.value);
                    }}
                >
                    {formats.map((fmt) => (
                        <MenuItem key={fmt} value={fmt}>{fmt}</MenuItem>
                    ))}
                </Select>
            </FormControl>

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
                        height: '90vh', // Changed from 80vh to 90vh
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
                                    {renderHistoricalChart(selectedPokemon.name)}
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
