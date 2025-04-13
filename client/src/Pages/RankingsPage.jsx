import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Select, MenuItem, FormControl, InputLabel,
  Grid, Paper, CircularProgress, IconButton, Button
} from '@mui/material';
import PokemonSprite from '../components/PokemonSprite';
import axios from 'axios';
import { 
    XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend, CartesianGrid
} from 'recharts';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import PokemonList from '../components/rankings/PokemonList';
import DetailsPane from '../components/rankings/DetailsPane';

//todo
// que se muestren los mismos pokemon
// ranking generales de tera, items, abilities, moves
// ranking de mejores equipos
// ranking de mejores sets de un pokemon
// quitar de victoria historical usege por historical winrate
// eliminar pokemon duplicados raros
// filtrar victorias por mes

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
    const [rankingType, setRankingType] = useState('usage');
    const [victoryData, setVictoryData] = useState([]);
    const [isVictoryDataLoading, setIsVictoryDataLoading] = useState(false);

    // Mapeo de endpoints para cada categoría (excepto historicalUsage)
    const victoryEndpoints = {
        abilities: '/api/victories/abilities',
        moves: '/api/victories/moves',
        items: '/api/victories/items',
        // Si tienes endpoint para spreads, agregar aquí; de lo contrario, omitirlo
        teraTypes: '/api/victories/tera',
        teammates: '/api/victories/teammates'
    };

    const categories = [
        { name: "Historical Usage", key: "historicalUsage" },
        { name: "Abilities", key: "abilities" },
        { name: "Moves", key: "moves" },
        { name: "Items", key: "items" },
        { name: "Spreads", key: "spreads" },
        { name: "Tera Types", key: "teraTypes" },
        { name: "Teammates", key: "teammates" }
    ];

    // Para el modo 'victories', define títulos ajustados
    const victoryCategoryTitles = [
        { name: "Historical Winrate", key: "historicalWinrate" },
        { name: "Abilities", key: "abilities" },
        { name: "Moves", key: "moves" },
        { name: "Items", key: "items" },
        { name: "Tera Types", key: "teraTypes" },
        { name: "Teammates", key: "teammates" }
    ];

    const handlePrevCategory = () => {
        const navCategories = rankingType === 'usage' ? categories : victoryCategoryTitles;
        setCurrentCategory(prev => (prev > 0 ? prev - 1 : navCategories.length - 1));
    };

    const handleNextCategory = () => {
        const navCategories = rankingType === 'usage' ? categories : victoryCategoryTitles;
        setCurrentCategory(prev => (prev < navCategories.length - 1 ? prev + 1 : 0));
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

    useEffect(() => {
        if (format) {
            handleFormatChange(format);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rankingType]);

    useEffect(() => {
        const fetchVictoryData = async () => {
            // Solo se obtiene si está en "victories" y se ha seleccionado un Pokémon
            if (rankingType !== 'victories' || !selectedPokemon) return;
            // Usa la clave de victoria según el array de categorías de victoria
            const currentVictoryCategory = victoryCategoryTitles[currentCategory].key;
            // Para la categoría histórica, muestra el gráfico histórico (no hace fetch)
            if (currentVictoryCategory === 'historicalWinrate') return;
            setIsVictoryDataLoading(true);
            try {
                if (!victoryEndpoints[currentVictoryCategory]) {
                    setVictoryData([]);
                } else {
                    const response = await axios.get(`http://localhost:5000${victoryEndpoints[currentVictoryCategory]}`, {
                        params: { pokemon: selectedPokemon.name }
                    });
                    setVictoryData(response.data);
                }
            } catch (error) {
                console.error(`Error fetching victory data for ${currentVictoryCategory}:`, error);
                setVictoryData([]);
            } finally {
                setIsVictoryDataLoading(false);
            }
        };

        fetchVictoryData();
    }, [rankingType, currentCategory, selectedPokemon]);

    const handleFormatChange = async (selectedFormat) => {
        setFormat(selectedFormat);
        setIsLoadingFormat(true);
        setSelectedPokemon(null);
        setPokemonDetails(null);
        try {
            if (rankingType === 'usage') {
                // Lógica actual: consulta a /api/rankings
                const monthsResponse = await axios.get('http://localhost:5000/api/months');
                const months = monthsResponse.data.sort((a, b) => b.localeCompare(a));
                const historicalDataObj = {};
                let foundData = false;
                let consecutiveFailures = 0;
                const MAX_CONSECUTIVE_FAILURES = 3;
                const MAX_MONTHS = 12;
                let monthsWithData = 0;
                for (const month of months) {
                    if (monthsWithData >= MAX_MONTHS) break;
                    try {
                        const response = await axios.get('http://localhost:5000/api/rankings', {
                            params: { month, format: selectedFormat }
                        });
                        if (response.data && response.data.data && Object.keys(response.data.data).length > 0) {
                            historicalDataObj[month] = response.data;
                            foundData = true;
                            consecutiveFailures = 0;
                            monthsWithData++;
                        } else {
                            consecutiveFailures++;
                        }
                    } catch (fetchError) {
                        consecutiveFailures++;
                        console.error(`Error fetching data for ${month}:`, fetchError);
                    }
                    if (foundData && consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) break;
                }
                setHistoricalData(historicalDataObj);
                const latestMonth = Object.keys(historicalDataObj).sort((a, b) => b.localeCompare(a))[0];
                if (historicalDataObj[latestMonth]) {
                    // Se llama a la función encargada de parsear los datos de uso
                    parseData(historicalDataObj[latestMonth]);
                    setError(null);
                } else {
                    setUsageData([]);
                    setError(`No data available for format: ${selectedFormat}`);
                }
            } else {
                // rankingType === 'victories'
                // Llamamos al endpoint /api/victories, pero NO actualizamos usageData,
                // para mantener la misma lista de Pokémon que en el modo usage.
                const response = await axios.get('http://localhost:5000/api/victories', {
                    params: { format: selectedFormat }
                });
                const data = response.data;
                data.sort((a, b) => b.win_rate - a.win_rate);
                let rank = 1;
                const parsedData = data.map(item => ({
                    rank: rank++,
                    name: item.pokemon,
                    percentage: parseFloat(item.win_rate),
                    wins: item.wins,
                    total_games: item.total_games
                }));
                // NO actualizamos usageData, de modo que la lista de Pokémon sigue siendo la de usage.
                setError(null);
            }
        } catch (error) {
            console.error("Error loading ranking data:", error);
            setError(`Error loading data: ${error.message}`);
            setUsageData([]);
        } finally {
            setIsLoadingFormat(false);
        }
    };

    const parseData = (data) => {
        if (typeof data === 'object' && data !== null) {
            const parsedData = [];
            if (data.data) {
                const pokemonEntries = Object.entries(data.data);
                let rank = 1;
                pokemonEntries.forEach(([name, details]) => {
                    if (details.usage !== undefined || details.victories !== undefined) {
                        parsedData.push({
                            rank: rank.toString(),
                            name: name,
                            percentage: rankingType === 'usage'
                                ? parseFloat(details.usage.toFixed(2))
                                : parseFloat(details.victories.toFixed(2)),
                            raw: rankingType === 'usage'
                                ? details.raw || "0"
                                : details.victoriesRaw || "0"  // Suponiendo que la API devuelva este campo en modo victorias
                        });
                        rank++;
                    }
                });
            }
            setUsageData(parsedData);
        } else {
            console.error("Unexpected data format:", data);
            setUsageData([]);
        }
    };

    // Modify the fetchPokemonDetails function to ensure we properly handle all data types
const fetchPokemonDetails = async (pokemonName) => {
    setIsLoadingDetails(true);
    try {
        // Get the most recent month 
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
            // Find the Pokémon in the data (case-insensitive if needed)
            let detailsKey = Object.keys(response.data.data).find(
                key => key.toLowerCase() === pokemonName.toLowerCase()
            );
            
            if (detailsKey) {
                const pokemonData = response.data.data[detailsKey];
                console.log("Found Pokémon data:", pokemonData);
                
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
                    
                    // For spreads, use the value field instead of name
                    spreads: Object.entries(pokemonData.Spreads || {}).map(([value, usage]) => ({
                        value,
                        percentage: usage
                    })).sort((a, b) => b.percentage - a.percentage).slice(0, 10),
                    
                    teraTypes: Object.entries(pokemonData["Tera Types"] || {}).map(([type, usage]) => ({
                        type,
                        percentage: usage
                    })).sort((a, b) => b.percentage - a.percentage),
                    
                    // For teammates, ensure we map the data correctly
                    teammates: Object.entries(pokemonData.Teammates || {}).map(([name, usage]) => ({
                        name,
                        percentage: usage
                    })).sort((a, b) => b.percentage - a.percentage).slice(0, 10)
                };
                
                console.log("Processed details:", details);
                console.log("Rendering teammates data:", details.teammates);
                console.log("Rendering spreads data:", details.spreads);
                
                setPokemonDetails(details);
            } else {
                console.error(`No data found for Pokémon: ${pokemonName}`);
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

    // Add this function to render category navigation
    const renderCategoryNavigation = () => {
        // Usa el mapeo correspondiente según el modo
        const navCategories = rankingType === 'usage' ? categories : victoryCategoryTitles;
        return (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <IconButton onClick={handlePrevCategory} sx={{ color: 'white' }}>
                    <NavigateBeforeIcon />
                </IconButton>
                <Typography variant="h6" sx={{ color: 'white' }}>
                    {navCategories[currentCategory % navCategories.length].name}
                </Typography>
                <IconButton onClick={handleNextCategory} sx={{ color: 'white' }}>
                    <NavigateNextIcon />
                </IconButton>
            </Box>
        );
    };

    // Function to prepare all historical data for a category (for combined chart)
    const prepareCategoryHistoricalData = (pokemonName, categoryKey) => {
        if (!historicalData || !pokemonName || !categoryKey) return { chartData: [], elements: [] };

        // Get all unique elements across all months
        const allElements = new Set();
        // Get sorted months (chronological order)
        const months = Object.keys(historicalData).sort();
        let formattedMonths = [];
        
        // First, collect all months and format them for display
        months.forEach(month => {
            // Format the month for display
            const [year, monthNum] = month.split('-');
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const formattedMonth = `${monthNames[parseInt(monthNum) - 1]} ${year}`;
            
            formattedMonths.push({
                rawMonth: month,
                formattedMonth,
                originalMonth: month // Keep for sorting
            });
        });
        
        // Then find all elements used across all months
        months.forEach(month => {
            if (historicalData[month] && historicalData[month].data) {
                let pokemonData = historicalData[month].data[pokemonName];
                
                // Case-insensitive search if needed
                if (!pokemonData) {
                    const pokemonNameLower = pokemonName.toLowerCase();
                    for (const key in historicalData[month].data) {
                        if (key.toLowerCase() === pokemonNameLower) {
                            pokemonData = historicalData[month].data[key];
                            break;
                        }
                    }
                }
                
                if (pokemonData) {
                    // Map category key to the actual property in the data
                    let categoryData;
                    switch(categoryKey) {
                        case 'abilities': categoryData = pokemonData.Abilities; break;
                        case 'moves': categoryData = pokemonData.Moves; break;
                        case 'items': categoryData = pokemonData.Items; break;
                        case 'spreads': categoryData = pokemonData.Spreads; break;
                        case 'teraTypes': categoryData = pokemonData["Tera Types"]; break;
                        case 'teammates': categoryData = pokemonData.Teammates; break;
                        default: categoryData = null;
                    }
                    
                    // Add all elements to our set
                    if (categoryData) {
                        Object.keys(categoryData).forEach(element => {
                            // Skip "Other" for the chart to avoid clutter
                            if (element.toLowerCase() !== 'other') {
                                allElements.add(element);
                            }
                        });
                    }
                }
            }
        });
        
        // Find top elements based on most recent month
        let sortedElements = [];
        const latestMonth = months.sort((a, b) => b.localeCompare(a))[0]; // Get latest month
        
        if (historicalData[latestMonth] && historicalData[latestMonth].data) {
            let pokemonData = historicalData[latestMonth].data[pokemonName];
            
            // Case-insensitive search if needed
            if (!pokemonData) {
                const pokemonNameLower = pokemonName.toLowerCase();
                for (const key in historicalData[latestMonth].data) {
                    if (key.toLowerCase() === pokemonNameLower) {
                        pokemonData = historicalData[latestMonth].data[key];
                        break;
                    }
                }
            }
            
            if (pokemonData) {
                // Map category key to the actual property in the data
                let categoryData;
                switch(categoryKey) {
                    case 'abilities': categoryData = pokemonData.Abilities; break;
                    case 'moves': categoryData = pokemonData.Moves; break;
                    case 'items': categoryData = pokemonData.Items; break;
                    case 'spreads': categoryData = pokemonData.Spreads; break;
                    case 'teraTypes': categoryData = pokemonData["Tera Types"]; break;
                    case 'teammates': categoryData = pokemonData.Teammates; break;
                    default: categoryData = null;
                }
                
                if (categoryData) {
                    sortedElements = Object.entries(categoryData)
                        .filter(([name]) => name.toLowerCase() !== 'other')
                        .sort((a, b) => b[1] - a[1])
                        .map(([name]) => name);
                }
            }
        }
        
        // Change this line to show 10 elements for teammates category
        const maxElements = categoryKey === 'teammates' ? 10 : 5;
        const topElements = sortedElements.slice(0, maxElements);
        
        // For each formatted month, create an entry with data for all top elements
        const combinedChartData = formattedMonths.map(({ rawMonth, formattedMonth, originalMonth }) => {
            const monthData = { 
                month: formattedMonth, 
                originalMonth: originalMonth // Add this for proper sorting
            };
            
            if (historicalData[rawMonth] && historicalData[rawMonth].data) {
                let pokemonData = historicalData[rawMonth].data[pokemonName];
                
                // Case-insensitive search if needed
                if (!pokemonData) {
                    const pokemonNameLower = pokemonName.toLowerCase();
                    for (const key in historicalData[rawMonth].data) {
                        if (key.toLowerCase() === pokemonNameLower) {
                            pokemonData = historicalData[rawMonth].data[key];
                            break;
                        }
                    }
                }
                
                if (pokemonData) {
                    // Map category key to the actual property in the data
                    let categoryData;
                    switch(categoryKey) {
                        case 'abilities': categoryData = pokemonData.Abilities; break;
                        case 'moves': categoryData = pokemonData.Moves; break;
                        case 'items': categoryData = pokemonData.Items; break;
                        case 'spreads': categoryData = pokemonData.Spreads; break;
                        case 'teraTypes': categoryData = pokemonData["Tera Types"]; break;
                        case 'teammates': categoryData = pokemonData.Teammates; break;
                        default: categoryData = null;
                    }
                    
                    // Add data for each element to the month data
                    if (categoryData) {
                        topElements.forEach(element => {
                            monthData[element] = categoryData[element] || 0;
                        });
                    }
                }
            }
            
            return monthData;
        });

        return {
            // Sort by original month for correct chronological display
            chartData: combinedChartData.sort((a, b) => a.originalMonth.localeCompare(b.originalMonth)),
            elements: topElements
        };
    };

    // Calculate month-over-month change for each element with improved calculation
    const calculateMonthlyChange = (pokemonName, categoryKey, itemName) => {
        if (!historicalData || !pokemonName) return null;
        
        const months = Object.keys(historicalData).sort().reverse();
        if (months.length < 2) return null;
        
        const currentMonth = months[0];
        const previousMonth = months[1];
        
        let currentValue = 0;
        let previousValue = 0;
        
        // Get current month value
        if (historicalData[currentMonth] && historicalData[currentMonth].data) {
            const pokemonData = historicalData[currentMonth].data[pokemonName] || 
                            Object.values(historicalData[currentMonth].data).find(
                                d => d.name && d.name.toLowerCase() === pokemonName.toLowerCase()
                            );
                            
            if (pokemonData) {
                let categoryData;
                switch(categoryKey) {
                    case 'abilities': categoryData = pokemonData.Abilities; break;
                    case 'moves': categoryData = pokemonData.Moves; break;
                    case 'items': categoryData = pokemonData.Items; break;
                    case 'spreads': categoryData = pokemonData.Spreads; break;
                    case 'teraTypes': categoryData = pokemonData["Tera Types"]; break;
                    case 'teammates': categoryData = pokemonData.Teammates; break;
                    default: categoryData = null;
                }
                
                if (categoryData && categoryData[itemName] !== undefined) {
                    currentValue = categoryData[itemName];
                }
            }
        }
        
        // Get previous month value
        if (historicalData[previousMonth] && historicalData[previousMonth].data) {
            const pokemonData = historicalData[previousMonth].data[pokemonName] || 
                            Object.values(historicalData[previousMonth].data).find(
                                d => d.name && d.name.toLowerCase() === pokemonName.toLowerCase()
                            );
                            
            if (pokemonData) {
                let categoryData;
                switch(categoryKey) {
                    case 'abilities': categoryData = pokemonData.Abilities; break;
                    case 'moves': categoryData = pokemonData.Moves; break;
                    case 'items': categoryData = pokemonData.Items; break;
                    case 'spreads': categoryData = pokemonData.Spreads; break;
                    case 'teraTypes': categoryData = pokemonData["Tera Types"]; break;
                    case 'teammates': categoryData = pokemonData.Teammates; break;
                    default: categoryData = null;
                }
                
                if (categoryData && categoryData[itemName] !== undefined) {
                    previousValue = categoryData[itemName];
                }
            }
        }
        
        // Calculate change
        const change = currentValue - previousValue;
        
        return {
            change: change.toFixed(2),
            isPositive: change > 0,
            isNeutral: change === 0
        };
    };

    // Modified renderCategoryContent to handle the historical usage category differently
    const renderCategoryContent = () => {
        const category = rankingType === 'usage'
            ? categories[currentCategory]
            : victoryCategoryTitles[currentCategory];

        // Para la categoría histórica (usage en modo usage o winrate en victorias)
        if (category.key === 'historicalUsage' || category.key === 'historicalWinrate') {
            return renderPokemonHistoricalUsage();
        }

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

        const categoryData = pokemonDetails[category.key];
        if (!categoryData || categoryData.length === 0) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography sx={{ color: 'white', mb: 2 }}>
                        No available data for {category.name.toLowerCase()}
                    </Typography>
                </Box>
            );
        }

        // Get colors for different categories
        const categoryColor = category.key === 'abilities' ? '#24CC9F' : 
                           category.key === 'moves' ? '#FF6384' : 
                           category.key === 'items' ? '#36A2EB' :
                           category.key === 'spreads' ? '#FFCE56' :
                           category.key === 'teraTypes' ? '#9966FF' : '#FF9F40';

        // Get historical data for combined chart
        const { chartData: combinedChartData, elements: topElements } = 
            prepareCategoryHistoricalData(selectedPokemon.name, category.key);
        
        // Set overflow to 'auto' to make content scrollable
        return (
            <Box sx={{ height: '100%', overflow: 'auto', pr: 1 }}>
                <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                    {category.name} ({categoryData.length})
                </Typography>
                
                {/* Combined chart for top elements in this category */}
                {combinedChartData.length > 1 && topElements.length > 0 && (
                    <Box sx={{ mt: 3, mb: 4, height: 300 }}>
                        <Typography variant="subtitle1" sx={{ color: 'white', mb: 1 }}>
                            Top {topElements.length} {category.name} Usage Trends
                        </Typography>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={combinedChartData}
                                margin={{ top: 5, right: 30, left: 5, bottom: 30 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis 
                                    dataKey="month" 
                                    tick={{ fill: 'white', fontSize: 10 }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={60}
                                />
                                <YAxis 
                                    tick={{ fill: 'white', fontSize: 10 }}
                                    tickFormatter={(value) => `${value}%`}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#221FC7',
                                        borderColor: '#1A1896',
                                        color: 'white',
                                        fontSize: 12
                                    }}
                                    formatter={(value, name, props) => [
                                        `${parseFloat(value).toFixed(2)}%`, 
                                        name
                                    ]}
                                    labelFormatter={(label) => label}
                                    itemSorter={(item) => -item.value}
                                    labelStyle={{ color: 'white' }}
                                />
                                <Legend wrapperStyle={{ color: 'white' }} />
                                {topElements.map((element, index) => (
                                    <Line 
                                        key={element}
                                        type="monotone" 
                                        dataKey={element} 
                                        name={element} 
                                        stroke={generateColor(index, topElements.length)}
                                        strokeWidth={2}
                                        dot={{ r: 3 }}
                                        activeDot={{ r: 5 }}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </Box>
                )}
                
                {/* Individual item listings with bar charts */}
                {categoryData.map((item, index) => {
                    // Get the item name/value based on the category
                    const itemName = category.key === 'teraTypes' ? item.type : 
                                   category.key === 'teammates' ? item.name : 
                                   category.key === 'spreads' ? item.value :
                                   item.name;
                                   
                    // Get month-over-month change
                    const monthlyChange = calculateMonthlyChange(
                        selectedPokemon.name, 
                        category.key, 
                        itemName
                    );
                    
                    return (
                        <Box key={index} sx={{ mb: 2.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="body2" sx={{ 
                                    color: 'white',
                                    maxWidth: '60%',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {itemName}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Typography variant="body2" sx={{ color: 'white' }}>
                                        {parseFloat(item.percentage).toFixed(2)}%
                                    </Typography>
                                    
                                    {/* Monthly change indicator */}
                                    {monthlyChange && (
                                        <Typography 
                                            variant="caption" 
                                            sx={{ 
                                                ml: 1, 
                                                color: monthlyChange.isPositive ? '#4CAF50' : 
                                                       monthlyChange.isNeutral ? '#FFC107' : '#F44336',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                        >
                                            {monthlyChange.isPositive ? (
                                                <ArrowUpwardIcon fontSize="inherit" sx={{ mr: 0.5 }} />
                                            ) : monthlyChange.isNeutral ? (
                                                <RemoveIcon fontSize="inherit" sx={{ mr: 0.5 }} />
                                            ) : (
                                                <ArrowDownwardIcon fontSize="inherit" sx={{ mr: 0.5 }} />
                                            )}
                                            {monthlyChange.change}%
                                        </Typography>
                                    )}
                                </Box>
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
                                    backgroundColor: categoryColor,
                                    borderRadius: '4px'
                                }} />
                            </Box>
                        </Box>
                    );
                })}
            </Box>
        );
    };

    // New function to render Pokemon's historical usage
    const renderPokemonHistoricalUsage = () => {
        if (!selectedPokemon) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography sx={{ color: 'white' }}>
                        Select a Pokémon
                    </Typography>
                </Box>
            );
        }

        const chartData = prepareHistoricalChartData(selectedPokemon.name);

        if (chartData.length <= 1) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography sx={{ color: 'white' }}>
                        No historical usage data available for {selectedPokemon.name}
                    </Typography>
                </Box>
            );
        }
        
        return (
            <Box sx={{ height: '100%', overflow: 'auto', pr: 1 }}>
                <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                    {selectedPokemon.name} Historical Usage
                </Typography>
                <Box sx={{ height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={chartData}
                            margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis 
                                dataKey="month" 
                                tick={{ fill: 'white' }}
                                angle={-45}
                                textAnchor="end"
                                height={60}
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
                                formatter={(value) => [`${parseFloat(value).toFixed(2)}%`, selectedPokemon.name]}
                                itemSorter={(item) => -item.value} // Sort items by value in descending order
                                labelStyle={{ color: 'white' }}
                            />
                            <Legend />
                            <Line 
                                type="monotone" 
                                dataKey="usage" 
                                name="Uso %" 
                                stroke="#24CC9F" 
                                strokeWidth={2}
                                dot={{ fill: '#24CC9F', r: 4 }}
                                activeDot={{ r: 8 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </Box>
                
                <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                        Usage Trends
                    </Typography>
                    <Box sx={{ 
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: 2
                    }}>
                        {chartData.slice(-5).reverse().map((dataPoint, index) => (
                            <Box key={index} sx={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                p: 2,
                                borderRadius: 1,
                                textAlign: 'center'
                            }}>
                                <Typography variant="subtitle2" sx={{ color: 'white' }}>
                                    {dataPoint.month}
                                </Typography>
                                <Typography variant="h5" sx={{ color: '#24CC9F', mt: 1 }}>
                                    {parseFloat(dataPoint.usage).toFixed(2)}%
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Box>
        );
    };

    // Add this function to prepare historical data for charts
    const prepareHistoricalChartData = (pokemonName) => {
        if (!historicalData || !pokemonName) return [];
        
        const chartData = [];
        // Get months sorted in chronological order
        const months = Object.keys(historicalData).sort();
        
        months.forEach(month => {
            if (historicalData[month] && historicalData[month].data) {
                // Try to find the Pokemon with exact or case-insensitive match
                let pokemonData = historicalData[month].data[pokemonName];
                
                // If not found with exact match, try case-insensitive search
                if (!pokemonData) {
                    const pokemonNameLower = pokemonName.toLowerCase();
                    for (const key in historicalData[month].data) {
                        if (key.toLowerCase() === pokemonNameLower) {
                            pokemonData = historicalData[month].data[key];
                            break;
                        }
                    }
                }
                
                if (pokemonData) {
                    // Format the month for display (e.g., "2023-01" to "Jan 2023")
                    const [year, monthNum] = month.split('-');
                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const formattedMonth = `${monthNames[parseInt(monthNum) - 1]} ${year}`;
                    
                    chartData.push({
                        month: formattedMonth,
                        originalMonth: month, // Keep original for proper sorting
                        usage: pokemonData.usage || 0
                    });
                }
            }
        });
        
        // Sort the data by original month strings for correct chronological order
        return chartData.sort((a, b) => a.originalMonth.localeCompare(b.originalMonth));
    };

    // Helper function to generate colors for multi-line chart
    const generateColor = (index, total) => {
        const baseColors = ['#24CC9F', '#FF6384', '#36A2EB', '#FFCE56', '#9966FF', '#FF9F40', '#4BC0C0', '#F49AC2'];
        
        if (index < baseColors.length) {
            return baseColors[index];
        }
        
        // Generate colors dynamically if we have more elements than base colors
        const hue = (index / total) * 360;
        return `hsl(${hue}, 80%, 65%)`;
    };

    return (
        <Box sx={{ padding: 2 }}>
            <Typography variant="h4" gutterBottom>
                Pokémon Usage Statistics
            </Typography>

            <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 4
            }}>
                {/* Contenedor para el select de formato */}
                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Format</InputLabel>
                    <Select
                        value={format}
                        label="Format"
                        onChange={(e) => {
                            console.log("Format selected:", e.target.value);
                            handleFormatChange(e.target.value);
                        }}
                        disabled={isLoadingFormat}
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

                {/* Botón de toggle alineado a la derecha */}
                <Button 
                    variant="contained" 
                    onClick={() => setRankingType(rankingType === 'usage' ? 'victories' : 'usage')}
                    disabled={isLoadingFormat}
                >
                    {rankingType === 'usage' ? 'Winrate Ranking' : 'Usage Ranking'}
                </Button>
            </Box>

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
                    <PokemonList
                        data={getPaginatedData()}
                        isLoadingFormat={isLoadingFormat}
                        onPokemonSelect={handlePokemonSelect}
                        selectedPokemon={selectedPokemon}
                        page={page}
                        itemsPerPage={itemsPerPage}
                        totalItems={usageData.length}
                        onPageChange={handlePageChange}
                        showUsagePercentage={rankingType !== 'victories'}
                    />
                    </Grid>

                    {/* Details panel */}
                    <Grid item xs={12} md={9}>
                    <DetailsPane
                        isLoadingFormat={isLoadingFormat}
                        isLoadingDetails={isLoadingDetails}
                        selectedPokemon={selectedPokemon}
                        pokemonDetails={pokemonDetails}
                        rankingType={rankingType}
                        renderCategoryNavigation={renderCategoryNavigation}
                        renderCategoryContent={renderCategoryContent}
                        renderPokemonHistoricalUsage={renderPokemonHistoricalUsage}
                        categories={categories}
                        currentCategory={currentCategory}
                        isVictoryDataLoading={isVictoryDataLoading}
                        victoryData={victoryData}
                    />
                    </Grid>
                </Grid>
            )}
        </Box>
    );
};

export default PokemonUsage;
