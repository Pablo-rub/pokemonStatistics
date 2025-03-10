import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Select, MenuItem, FormControl, InputLabel,
  Grid, Paper, CircularProgress, IconButton
} from '@mui/material';
import PokemonSprite from '../components/PokemonSprite';
import axios from 'axios';
import { 
    XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend, CartesianGrid
} from 'recharts';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import LastPageIcon from '@mui/icons-material/LastPage';

//todo
//menos numeros de pagination, 1 2 3 ... 100
//rankings de victoria
//leyendas no cortadas

const PokemonUsage = () => {
    const [formats, setFormats] = useState([]);
    const [format, setFormat] = useState('');
    const [usageData, setUsageData] = useState([]);
    const [historicalData, setHistoricalData] = useState({});
    const [error, setError] = useState(null);
    const [selectedPokemon, setSelectedPokemon] = useState(null);
    const [pokemonDetails, setPokemonDetails] = useState(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [isLoadingInitial, setIsLoadingInitial] = useState(true); // Nuevo estado para carga inicial
    const [isLoadingFormat, setIsLoadingFormat] = useState(false); // Nuevo estado para cambio de formato
    const [page, setPage] = useState(1);
    const itemsPerPage = 6;
    const [currentCategory, setCurrentCategory] = useState(0);

    const categories = [
        { name: "Abilities", key: "abilities" },
        { name: "Moves", key: "moves" },
        { name: "Items", key: "items" },
        { name: "Spreads", key: "spreads" },
        { name: "Tera Types", key: "teraTypes" },
        { name: "Teammates", key: "teammates" }
    ];

    const handlePrevCategory = () => {
        setCurrentCategory(prev => (prev > 0 ? prev - 1 : categories.length - 1));
    };

    const handleNextCategory = () => {
        setCurrentCategory(prev => (prev < categories.length - 1 ? prev + 1 : 0));
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoadingInitial(true);
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
                        await handleFormatChange(lastFormat);
                    }
                }
            } catch (error) {
                console.error("Error in fetchInitialData:", error);
                const errorMessage = error.response?.data || "Error loading formats";
                setError(errorMessage);
            } finally {
                setIsLoadingInitial(false);
            }
        };

        fetchInitialData();
    }, []);

    const handleFormatChange = async (selectedFormat) => {
        setFormat(selectedFormat);
        setIsLoadingFormat(true);
        setSelectedPokemon(null);
        setPokemonDetails(null);
        
        try {
            // 1. Obtener todos los meses disponibles
            console.log("Fetching months...");
            const monthsResponse = await axios.get('http://localhost:5000/api/months');
            const months = monthsResponse.data.sort((a, b) => b.localeCompare(a)) // Ordenar de más reciente a más antiguo
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
                            moveset: true
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
            const latestMonth = Object.keys(historicalDataObj).sort((a, b) => b.localeCompare(a))[0];
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
            setIsLoadingFormat(false);
        }
    };

    // Fix the parseData function to not multiply percentages again
    const parseData = (data) => {
        // Check if data is JSON (from moveset endpoint) or text
        if (typeof data === 'object' && data !== null) {
            // Handle JSON data from moveset endpoint
            const parsedData = [];
            
            // Extract data from the moveset format
            if (data.data) {
                const pokemonEntries = Object.entries(data.data);
                let rank = 1;
                
                pokemonEntries.forEach(([name, details]) => {
                    if (details.usage !== undefined) {
                        parsedData.push({
                            rank: rank.toString(),
                            name: name,
                            // FIXED: Don't multiply by 100 again - the value is already a percentage
                            usagePercentage: parseFloat(details.usage.toFixed(2)),
                            raw: details.raw || "0",
                            realPercentage: details['real usage'] ? (details['real usage'] * 100).toFixed(2) : "0"
                        });
                        rank++;
                    }
                });
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
            // Get the most recent month - if historicalData is empty, use a default
            const latestMonth = Object.keys(historicalData).sort().reverse()[0];
            
            console.log(`Fetching details for ${pokemonName} in ${format} (${latestMonth})`);
            
            const response = await axios.get(`http://localhost:5000/api/rankings`, {
                params: {
                    format: format,
                    month: latestMonth,
                    moveset: true
                }
            });
            
            console.log("API Response received, status:", response.status);
            
            if (response.data && response.data.data) {
                // Find the Pokémon in the response data - try exact match first, then case-insensitive
                let detailsKey = Object.keys(response.data.data).find(
                    key => key === pokemonName
                );
                
                if (!detailsKey) {
                    detailsKey = Object.keys(response.data.data).find(
                        key => key.toLowerCase() === pokemonName.toLowerCase()
                    );
                }
                
                if (detailsKey) {
                    const pokemonData = response.data.data[detailsKey];
                    console.log("Found Pokémon data:", JSON.stringify(pokemonData, null, 2));
                    
                    // Create the details object with proper parsing
                    const details = {
                        abilities: Object.entries(pokemonData.Abilities || {}).map(([name, usage]) => ({
                            name,
                            percentage: usage
                        })).sort((a, b) => b.percentage - a.percentage),
                        
                        moves: Object.entries(pokemonData.Moves || {}).map(([name, usage]) => ({
                            name,
                            percentage: usage
                        })).sort((a, b) => b.percentage - a.percentage).slice(0, 10),
                        
                        items: Object.entries(pokemonData.Items || {}).map(([name, usage]) => ({
                            name,
                            percentage: usage
                        })).sort((a, b) => b.percentage - a.percentage).slice(0, 10),
                        
                        spreads: Object.entries(pokemonData.Spreads || {}).map(([value, usage]) => ({
                            value,
                            percentage: usage
                        })).sort((a, b) => b.percentage - a.percentage).slice(0, 10),
                        
                        teraTypes: Object.entries(pokemonData["Tera Types"] || {}).map(([type, usage]) => ({
                            type,
                            percentage: usage
                        })).sort((a, b) => b.percentage - a.percentage),
                        
                        teammates: Object.entries(pokemonData.Teammates || {}).map(([name, usage]) => ({
                            name,
                            percentage: usage
                        })).sort((a, b) => b.percentage - a.percentage).slice(0, 10)
                    };
                    
                    console.log("Processed details:", details);
                    setPokemonDetails(details);
                } else {
                    console.error(`No data found for Pokémon: ${pokemonName}`);
                    console.log("Available Pokémon:", Object.keys(response.data.data));
                    setPokemonDetails(null);
                }
            } else {
                console.error("Invalid response structure:", response.data);
                setPokemonDetails(null);
            }
        } catch (error) {
            console.error("Error fetching Pokémon details:", error);
            setError("Error fetching Pokémon details");
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
        
        // Check if we have selected Pokemon and details
        if (!selectedPokemon || !pokemonDetails) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography sx={{ color: 'white' }}>
                        {!selectedPokemon ? "Select a Pokémon to see details" : "Loading details..."}
                    </Typography>
                </Box>
            );
        }
        
        console.log(`Rendering ${category.key} data:`, pokemonDetails[category.key]);
        
        // Get data for the current category
        const categoryData = pokemonDetails[category.key];
        
        if (!categoryData || categoryData.length === 0) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography sx={{ color: 'white' }}>
                        No hay datos disponibles para {category.name.toLowerCase()}
                    </Typography>
                </Box>
            );
        }
        
        // Set overflow to 'auto' instead of 'hidden' to make content scrollable
        return (
            <Box sx={{ height: '100%', overflow: 'auto', pr: 1 }}>
                <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                    {category.name}
                </Typography>
                {categoryData.map((item, index) => (
                    <Box key={index} sx={{ mb: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2" sx={{ color: 'white' }}>
                                {category.key === 'teraTypes' ? item.type : (item.name || item.value)}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'white' }}>
                                {parseFloat(item.percentage).toFixed(2)}%
                            </Typography>
                        </Box>
                        <Box sx={{ 
                            width: '100%', 
                            height: '8px',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '4px',
                            overflow: 'hidden'
                        }}>
                            <Box sx={{ 
                                width: `${Math.min(item.percentage, 100)}%`, 
                                height: '100%',
                                backgroundColor: category.key === 'abilities' ? '#24CC9F' : 
                                              category.key === 'moves' ? '#FF6384' : 
                                              category.key === 'items' ? '#36A2EB' :
                                              category.key === 'spreads' ? '#FFCE56' :
                                              category.key === 'teraTypes' ? '#9966FF' : '#FF9F40',
                                borderRadius: '4px'
                            }} />
                        </Box>
                    </Box>
                ))}
            </Box>
        );
    };

    // Add navigation between categories
    const renderCategoryNavigation = () => (
        <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
            pb: 1
        }}>
            <IconButton 
                onClick={handlePrevCategory}
                disabled={currentCategory === 0}
                sx={{ color: 'white' }}
            >
                <NavigateBeforeIcon />
            </IconButton>
            <Typography variant="h6" sx={{ color: 'white' }}>
                {categories[currentCategory].name}
            </Typography>
            <IconButton 
                onClick={handleNextCategory}
                disabled={currentCategory === categories.length - 1}
                sx={{ color: 'white' }}
            >
                <NavigateNextIcon />
            </IconButton>
        </Box>
    );

    // Add this function to prepare historical data for charts
    const prepareHistoricalChartData = (pokemonName) => {
        if (!historicalData || !pokemonName) return [];
        
        const chartData = [];
        // Get months sorted in chronological order
        const months = Object.keys(historicalData).sort();
        
        months.forEach(month => {
            if (historicalData[month] && 
                historicalData[month].data) {
                
                // Try to find the Pokemon with exact or case-insensitive match
                const pokemonData = historicalData[month].data[pokemonName] || 
                    Object.entries(historicalData[month].data)
                        .find(([key]) => key.toLowerCase() === pokemonName.toLowerCase())?.[1];
                
                if (pokemonData) {
                    // Format the month for display (e.g., "2023-01" to "Jan 2023")
                    const [year, monthNum] = month.split('-');
                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const formattedMonth = `${monthNames[parseInt(monthNum) - 1]} ${year}`;
                    
                    chartData.push({
                        month: formattedMonth,
                        usage: pokemonData.usage
                    });
                }
            }
        });
        
        return chartData;
    };

    // Add this function to render the usage trend chart
    const renderUsageTrendChart = () => {
        if (!selectedPokemon) return null;
        
        const chartData = prepareHistoricalChartData(selectedPokemon.name);
        
        if (chartData.length <= 1) {
            return (
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Typography variant="body1" sx={{ color: 'white' }}>
                        Not enough historical data to display trends
                    </Typography>
                </Box>
            );
        }
        
        return (
            <Box sx={{ mt: 4, height: 300 }}>
                <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                    Monthly Usage Trend
                </Typography>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis 
                            dataKey="month" 
                            tick={{ fill: 'white' }}
                        />
                        <YAxis 
                            label={{ 
                                value: 'Usage %', 
                                angle: -90, 
                                position: 'insideLeft',
                                fill: 'white' 
                            }}
                            tick={{ fill: 'white' }}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: '#221FC7',
                                borderColor: '#1A1896',
                                color: 'white'
                            }}
                        />
                        <Legend />
                        <Line 
                            type="monotone" 
                            dataKey="usage" 
                            stroke="#24CC9F" 
                            activeDot={{ r: 8 }}
                            name="Usage %"
                        />
                    </LineChart>
                </ResponsiveContainer>
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
                    disabled={isLoadingFormat} // Deshabilitar durante la carga
                >
                    {formats.map((fmt) => (
                        <MenuItem key={fmt} value={fmt}>{fmt}</MenuItem>
                    ))}
                </Select>
                {isLoadingFormat && (
                    <CircularProgress 
                        size={24} 
                        sx={{ 
                            position: 'absolute', 
                            right: -30, 
                            top: '50%', 
                            marginTop: '-12px' 
                        }} 
                    />
                )}
            </FormControl>

            {error && (
                <Typography color="error" sx={{ mb: 2 }}>
                    Error: {error}
                </Typography>
            )}

            {isLoadingInitial ? (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {/* Pokémon list */}
                    <Grid item xs={12} md={3}>
                        <Box sx={{ 
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2
                        }}>
                            {isLoadingFormat ? (
                                <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
                                    <CircularProgress />
                                </Box>
                            ) : (
                                <>
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
                                    <Box sx={{ 
                                        display: 'flex', 
                                        justifyContent: 'center', 
                                        alignItems: 'center',
                                        gap: 2,
                                        mt: 2
                                    }}>
                                        <IconButton 
                                            onClick={() => handlePageChange(null, 1)} 
                                            disabled={page === 1}
                                            sx={{ color: 'white' }}
                                        >
                                            <FirstPageIcon />
                                        </IconButton>
                                        
                                        <IconButton 
                                            onClick={() => handlePageChange(null, page - 1)} 
                                            disabled={page === 1}
                                            sx={{ color: 'white' }}
                                        >
                                            <NavigateBeforeIcon />
                                        </IconButton>
                                        
                                        <Typography sx={{ color: 'white', mx: 1, minWidth: '60px', textAlign: 'center' }}>
                                            {page}/{Math.ceil(usageData.length / itemsPerPage)}
                                        </Typography>
                                        
                                        <IconButton 
                                            onClick={() => handlePageChange(null, page + 1)} 
                                            disabled={page >= Math.ceil(usageData.length / itemsPerPage)}
                                            sx={{ color: 'white' }}
                                        >
                                            <NavigateNextIcon />
                                        </IconButton>
                                        
                                        <IconButton 
                                            onClick={() => handlePageChange(null, Math.ceil(usageData.length / itemsPerPage))} 
                                            disabled={page >= Math.ceil(usageData.length / itemsPerPage)}
                                            sx={{ color: 'white' }}
                                        >
                                            <LastPageIcon />
                                        </IconButton>
                                    </Box>
                                </>
                            )}
                        </Box>
                    </Grid>

                    {/* Details panel */}
                    <Grid item xs={12} md={9}>
                        <Paper sx={{ 
                            p: 3,
                            backgroundColor: '#221FC7',
                            height: 'calc(100vh - 100px)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',  // Mantener hidden
                            '& *': {
                                // Aplicar globalmente a todos los elementos dentro
                                scrollbarWidth: 'none',
                                '&::-webkit-scrollbar': {
                                    display: 'none'
                                },
                                msOverflowStyle: 'none'  // Fixed: kebab-case to camelCase
                            }
                        }}>
                            {isLoadingFormat ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                    <CircularProgress />
                                </Box>
                            ) : isLoadingDetails ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                    <CircularProgress />
                                </Box>
                            ) : selectedPokemon && pokemonDetails ? (
                                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    {/* Pokemon header with name, sprite and usage */}
                                    <Box sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center',
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                                        pb: 2,
                                        mb: 2
                                    }}>
                                        <PokemonSprite pokemon={{ name: selectedPokemon.name }} size={60} />
                                        <Box sx={{ ml: 2 }}>
                                            <Typography variant="h5" sx={{ color: 'white' }}>
                                                {selectedPokemon.name}
                                            </Typography>
                                            <Typography variant="subtitle1" sx={{ color: 'white' }}>
                                                Rank #{selectedPokemon.rank} • Usage: {selectedPokemon.usagePercentage}%
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Category navigation */}
                                    {renderCategoryNavigation()}

                                    {/* Content area */}
                                    <Box sx={{ 
                                        flexGrow: 1,
                                        overflow: 'hidden',
                                        mt: 1,
                                    }}>
                                        {renderCategoryContent()}
                                        {renderUsageTrendChart()}
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
            )}
        </Box>
    );
};

export default PokemonUsage;
