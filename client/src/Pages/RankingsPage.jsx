import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Select, MenuItem, FormControl, InputLabel,
  Grid, CircularProgress, IconButton, Button
} from '@mui/material';
import axios from 'axios';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import PokemonList from '../components/rankings/PokemonList';
import DetailsPane from '../components/rankings/DetailsPane';
import MultiLineChart from '../components/rankings/MultiLineChart';

//todo
// ranking generales de tera, items, abilities, moves
// ranking de mejores equipos
// ranking de mejores sets de un pokemon
// chart teammates
// historical winrate

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
        historicalWinrate: '/api/victories',
        abilities: '/api/victories/abilities',
        moves: '/api/victories/moves',
        items: '/api/victories/items',
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
            if (rankingType !== 'victories' || !selectedPokemon) return;
            const currentVictoryCategory = victoryCategoryTitles[currentCategory].key;
            setIsVictoryDataLoading(true);
            try {
                const endpoint = victoryEndpoints[currentVictoryCategory];
                console.log(`Fetching victory data for ${currentVictoryCategory}...`);
                const response = await axios.get(`http://localhost:5000${endpoint}`, {
                    params: { pokemon: selectedPokemon.name }
                });
                console.log("Victory data response:", response.data);
                setVictoryData(response.data);
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

        const allElements = new Set();
        const months = Object.keys(historicalData).sort();
        const formattedMonths = months.map(month => {
            const [year, monthNum] = month.split('-');
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return {
                rawMonth: month,
                formattedMonth: `${monthNames[parseInt(monthNum) - 1]} ${year}`
            };
        });

        const combinedChartData = formattedMonths.map(({ rawMonth, formattedMonth }) => {
            const monthData = { month: formattedMonth };

            if (historicalData[rawMonth] && historicalData[rawMonth].data) {
                let pokemonData = historicalData[rawMonth].data[pokemonName];
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
                    let categoryData;
                    switch (categoryKey) {
                        case 'abilities': categoryData = pokemonData.Abilities; break;
                        case 'moves': categoryData = pokemonData.Moves; break;
                        case 'items': categoryData = pokemonData.Items; break;
                        case 'spreads': categoryData = pokemonData.Spreads; break;
                        case 'teraTypes': categoryData = pokemonData["Tera Types"]; break;
                        case 'teammates': categoryData = pokemonData.Teammates; break;
                        default: categoryData = null;
                    }
                    if (categoryData) {
                        // Usamos un objeto temporal para acumular sumas y contar repeticiones
                        const aggregation = {};
                        Object.entries(categoryData).forEach(([element, usage]) => {
                            if (aggregation[element]) {
                                aggregation[element].sum += usage;
                                aggregation[element].count++;
                            } else {
                                aggregation[element] = { sum: usage, count: 1 };
                            }
                        });
                        // Calcular el promedio y asignar en monthData
                        Object.entries(aggregation).forEach(([element, { sum, count }]) => {
                            monthData[element] = sum / count;
                            allElements.add(element);
                        });
                    }
                }
            }
            return monthData;
        });

        return {
            chartData: combinedChartData,
            elements: Array.from(allElements)
        };
    };

    // Función para preparar la data histórica para categorías de victories (no la histórica global)
    const prepareCategoryVictoryHistoricalData = (pokemonName, categoryKey) => {
        if (!historicalData || !pokemonName || !categoryKey) return { chartData: [], elements: [] };

        const allElements = new Set();
        const months = Object.keys(historicalData).sort();
        const formattedMonths = months.map(month => {
            const [year, monthNum] = month.split('-');
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return {
                rawMonth: month,
                formattedMonth: `${monthNames[parseInt(monthNum) - 1]} ${year}`
            };
        });

        const combinedChartData = formattedMonths.map(({ rawMonth, formattedMonth }) => {
            const monthData = { month: formattedMonth };

            if (historicalData[rawMonth] && historicalData[rawMonth].data) {
                let pokemonData = historicalData[rawMonth].data[pokemonName];
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
                    let categoryData;
                    switch (categoryKey) {
                        case 'abilities': 
                            categoryData = pokemonData.Abilities; 
                            break;
                        case 'moves': 
                            categoryData = pokemonData.Moves; 
                            break;
                        case 'items': 
                            categoryData = pokemonData.Items; 
                            break;
                        case 'spreads': 
                            categoryData = pokemonData.Spreads; 
                            break;
                        case 'teraTypes': 
                            categoryData = pokemonData["Tera Types"]; 
                            break;
                        case 'teammates': 
                            categoryData = pokemonData.Teammates; 
                            break;
                        default: 
                            categoryData = null;
                    }
                    if (categoryData) {
                        // Acumular valores para evitar duplicados.
                        const aggregation = {};
                        Object.entries(categoryData).forEach(([element, victories]) => {
                            if (aggregation[element]) {
                                aggregation[element].sum += victories;
                                aggregation[element].count++;
                            } else {
                                aggregation[element] = { sum: victories, count: 1 };
                            }
                        });
                        Object.entries(aggregation).forEach(([element, { sum, count }]) => {
                            monthData[element] = sum / count;
                            allElements.add(element);
                        });
                    }
                }
            }
            return monthData;
        });

        return {
            chartData: combinedChartData,
            elements: Array.from(allElements)
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

    // Add this function to calculate month-over-month change for victory data
    const calculateVictoryMonthlyChange = (data, label) => {
        if (!data || data.length < 2) return null;
        
        // Group data by month
        const dataByMonth = {};
        data.forEach(item => {
            const key = item.ability || item.move || item.item || item.tera_type || item.teammate || 'N/A';
            if (key === label) {
                dataByMonth[item.month] = item.win_rate;
            }
        });
        
        // Get months in chronological order
        const months = Object.keys(dataByMonth).sort();
        if (months.length < 2) return null;
        
        // Get current and previous month values
        const currentMonth = months[months.length - 1];
        const previousMonth = months[months.length - 2];
        
        const currentValue = dataByMonth[currentMonth];
        const previousValue = dataByMonth[previousMonth];
        
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

        // Para la categoría histórica: usage en uso o winrate en victorias
        if (category.key === 'historicalUsage' || category.key === 'historicalWinrate') {
            return rankingType === 'usage'
                ? renderPokemonHistoricalUsage()
                : renderPokemonHistoricalVictory();
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

        // Para las categorías de victories (no históricas), preparamos la data y la mostramos en el gráfico
        let chartData = [];
        let elements = [];

        if (rankingType === 'victories' && currentCategory > 0) {
            // Para visualizaciones específicas de victory (abilities, moves, etc.),
            // usamos los datos que vienen directamente del backend
            if (!isVictoryDataLoading && victoryData && victoryData.length > 0) {
                const processedData = prepareVictoryDataForChart(victoryData);
                chartData = processedData.chartData;
                elements = processedData.elements;
            }
        } else {
            // Para datos históricos generales o categorías de uso,
            // seguimos usando la preparación histórica existente
            const { chartData: combinedChartData, elements: topElements } = 
                rankingType === 'victories'
                    ? prepareCategoryVictoryHistoricalData(selectedPokemon.name, category.key)
                    : prepareCategoryHistoricalData(selectedPokemon.name, category.key);
            
            chartData = combinedChartData;
            elements = topElements;
        }

        return (
            <Box sx={{ height: '100%', overflow: 'auto', pr: 1 }}>
                <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                    {category.name} ({categoryData.length})
                </Typography>
                
                {/* Combined chart for top elements in this category */}
                {chartData.length > 1 && elements.length > 0 && (
                    <Box sx={{ mt: 3, mb: 4 }}>
                        <Typography variant="subtitle1" sx={{ color: 'white', mb: 1 }}>
                            Top {elements.length} {category.name} 
                            {rankingType === 'usage' ? ' Usage Trends' : ' Winrate Trends'}
                        </Typography>
                        <MultiLineChart chartData={chartData} elements={elements} />
                    </Box>
                )}
                
                {/* Resto de la visualización individual con indicadores de cambio (barra, etc.) */}
                {categoryData.map((item, index) => {
                    const itemName = category.key === 'teraTypes' ? item.type : 
                                     category.key === 'teammates' ? item.name : 
                                     category.key === 'spreads' ? item.value : item.name;
                    const monthlyChange = rankingType === 'victories'
                        ? calculateVictoryMonthlyChange(victoryData, itemName)
                        : calculateMonthlyChange(selectedPokemon.name, category.key, itemName);
                    
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
                                    backgroundColor: '#FF6384',
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
                    {selectedPokemon.name} Historical {rankingType === 'victories' ? 'Winrate' : 'Usage'}
                </Typography>
                <Box sx={{ height: 400 }}>
                    {/* Usamos MultiLineChart pasándole "usage" como única serie */}
                    <MultiLineChart chartData={chartData} elements={[rankingType === 'victories' ? 'Winrate' : 'Usage']} />
                </Box>
            </Box>
        );
    };

    // Add this function to prepare historical data for charts
    const prepareHistoricalChartData = (pokemonName) => {
        if (!historicalData || !pokemonName) return [];

        const months = Object.keys(historicalData).sort();
        const chartData = [];

        months.forEach((month) => {
            if (historicalData[month] && historicalData[month].data) {
                // Buscar los datos del Pokémon (exacto o case-insensitive)
                let dataForPokemon = historicalData[month].data[pokemonName];
                if (!dataForPokemon) {
                    const lowerName = pokemonName.toLowerCase();
                    for (const key in historicalData[month].data) {
                        if (key.toLowerCase() === lowerName) {
                            dataForPokemon = historicalData[month].data[key];
                            break;
                        }
                    }
                }
                if (dataForPokemon) {
                    // Formatear el mes para presentación (ej. "2023-01" a "Jan 2023")
                    const dateObj = new Date(month);
                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const formattedMonth = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

                    chartData.push({
                        month: formattedMonth,
                        Usage: dataForPokemon.usage || 0, // Usamos el porcentaje de uso
                        originalMonth: month
                    });
                }
            }
        });

        // Ordenar cronológicamente usando el valor original del mes
        return chartData.sort((a, b) => a.originalMonth.localeCompare(b.originalMonth));
    };

    // Función para preparar la data histórica para victorias (winrate)
    const prepareHistoricalVictoryChartData = (pokemonName) => {
        console.log("Preparing historical victory data for:", pokemonName);
        console.log("Victory data:", victoryData);
        
        if (!victoryData || victoryData.length === 0) {
            return [];
        }
        
        // Filter victory data for this specific Pokémon
        const filteredData = victoryData.filter(
            entry => entry.pokemon && entry.pokemon.toLowerCase() === pokemonName.toLowerCase()
        );
        
        console.log("Filtered victory data:", filteredData);
        
        if (filteredData.length === 0) {
            return [];
        }
        
        // Sort by month chronologically
        filteredData.sort((a, b) => new Date(a.month) - new Date(b.month));
        
        // Format the data for the chart
        return filteredData.map(entry => {
            // Format month from "YYYY-MM" to "Mon YYYY"
            const [year, monthNum] = entry.month.split('-');
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const formattedMonth = `${monthNames[parseInt(monthNum) - 1]} ${year}`;
            
            return {
                month: formattedMonth,
                Winrate: entry.win_rate
            };
        });
    };
      
    // Ejemplo de renderizado para el histórico de victorias
    const renderPokemonHistoricalVictory = () => {
        if (!selectedPokemon) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography sx={{ color: 'white' }}>
                        Select a Pokémon to see historical winrate
                    </Typography>
                </Box>
            );
        }
        
        const chartData = prepareHistoricalVictoryChartData(selectedPokemon.name);
        
        if (chartData.length <= 1) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography sx={{ color: 'white' }}>
                        No historical winrate data available for {selectedPokemon.name}
                    </Typography>
                </Box>
            );
        }
        
        return (
            <Box sx={{ height: '100%', overflow: 'auto', pr: 1 }}>
                <Typography variant="h6" sx={{ color: 'white', mb: 2, textAlign: 'center' }}>
                    {selectedPokemon.name} Historical Winrate
                </Typography>
                <Box sx={{ height: 400 }}>
                    {/* Se pasa "Winrate" como única serie al gráfico */}
                    <MultiLineChart chartData={chartData} elements={["Winrate"]} />
                </Box>
            </Box>
        );
    };

    // Función para procesar los datos de victorias que vienen del backend
    const prepareVictoryDataForChart = (victoryData) => {
        if (!victoryData || victoryData.length === 0) return { chartData: [], elements: [] };
        
        // Agrupar los datos por mes
        const monthlyData = {};
        const allElements = new Set();
        
        victoryData.forEach(item => {
            const month = item.month || 'Unknown';
            const element = item.name || item.type || item.value || 'Unknown';
            const winRate = item.win_rate || 0;
            
            if (!monthlyData[month]) {
                monthlyData[month] = { month };
            }
            
            // Evitamos duplicados en el mismo mes
            monthlyData[month][element] = winRate;
            allElements.add(element);
        });
        
        // Convertir a array y ordenar cronológicamente
        const chartData = Object.values(monthlyData).sort((a, b) => {
            return new Date(a.month) - new Date(b.month);
        });
        
        // Formatear los meses para mejor visualización
        const formattedChartData = chartData.map(item => {
            try {
                const dateObj = new Date(item.month);
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const formattedMonth = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
                return { ...item, month: formattedMonth };
            } catch (e) {
                return item; // En caso de error, mantener el formato original
            }
        });
        
        return {
            chartData: formattedChartData,
            elements: Array.from(allElements)
        };
    };

    // Esta función prepara los datos de victoria para mostrarlos en un gráfico de líneas múltiples
    const prepareVictoryTimelineData = (victoryData) => {
        // Agrupa los datos por mes
        const groupedByMonth = {};
        
        victoryData.forEach(item => {
            const month = item.month;
            const elementName = 
            item.ability || 
            item.move || 
            item.item || 
            item.tera_type || 
            item.teammate || 
            'N/A';
            
            if (!groupedByMonth[month]) {
            groupedByMonth[month] = {};
            }
            
            groupedByMonth[month][elementName] = item.win_rate;
        });
        
        // Convierte los datos agrupados a un formato adecuado para MultiLineChart
        const chartData = [];
        
        Object.keys(groupedByMonth).sort().forEach(month => {
            const [year, monthNum] = month.split('-');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const formattedMonth = `${monthNames[parseInt(monthNum) - 1]} ${year}`;
            
            const dataPoint = {
            month: formattedMonth,
            ...groupedByMonth[month]
            };
            
            chartData.push(dataPoint);
        });
        
        return chartData;
    };

    // Esta función obtiene los elementos únicos de los datos de victoria
    // Limitando a los 10 con mayor tasa de victoria
    const getUniqueElements = (victoryData) => {
        // Crear un mapa para rastrear la tasa de victoria promedio de cada elemento
        const elementWinRates = {};
        const elementCounts = {};
        
        // Calcular la tasa de victoria promedio para cada elemento
        victoryData.forEach(item => {
            const elementName = 
            item.ability || 
            item.move || 
            item.item || 
            item.tera_type || 
            item.teammate || 
            'N/A';
            
            if (!elementWinRates[elementName]) {
            elementWinRates[elementName] = 0;
            elementCounts[elementName] = 0;
            }
            
            elementWinRates[elementName] += item.win_rate;
            elementCounts[elementName]++;
        });
        
        // Calcular el promedio
        Object.keys(elementWinRates).forEach(key => {
            elementWinRates[key] = elementWinRates[key] / elementCounts[key];
        });
        
        // Ordenar por tasa de victoria y obtener los 10 primeros
        const topElements = Object.entries(elementWinRates)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(entry => entry[0]);
        
        return topElements;
    };

    return (
        <Box sx={{ padding: 2 }}>
            <Typography variant="h4" gutterBottom>
                Pokémon Usage Statistics
            </Typography>

            <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                mb: 4,
            }}>
                {/* Selector de formato SIEMPRE primero */}
                <FormControl sx={{ minWidth: 200, mr: 3 }}>
                    <InputLabel>Format</InputLabel>
                    <Select
                        value={format}
                        label="Format"
                        onChange={(e) => {
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

                {/* Botón de toggle Usage/Winrate */}
                <Button 
                    variant="contained" 
                    onClick={() => setRankingType(rankingType === 'usage' ? 'victories' : 'usage')}
                    disabled={isLoadingFormat}
                    sx={{ mr: 2 }}
                >
                    {rankingType === 'usage' ? 'Winrate Ranking' : 'Usage Ranking'}
                </Button>

                {/* Botón Teams Ranking */}
                <Button 
                    variant="contained" 
                    onClick={() => setRankingType('teams')}
                    disabled={isLoadingFormat}
                >
                    Teams Ranking
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
                        rankingType={rankingType}
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
                        renderPokemonHistoricalVictory={renderPokemonHistoricalVictory}
                        categories={rankingType === 'usage' ? categories : victoryCategoryTitles}
                        currentCategory={currentCategory}
                        isVictoryDataLoading={isVictoryDataLoading}
                        victoryData={victoryData}
                        prepareVictoryTimelineData={prepareVictoryTimelineData}
                        getUniqueElements={getUniqueElements}
                        calculateVictoryMonthlyChange={calculateVictoryMonthlyChange}
                    />
                    </Grid>
                </Grid>
            )}
        </Box>
    );
};

export default PokemonUsage;
