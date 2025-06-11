import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Select, MenuItem, FormControl, InputLabel,
  Grid, CircularProgress, IconButton, Button, Paper, Pagination
} from '@mui/material';
import axios from 'axios';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import Chip from '@mui/material/Chip';
import PokemonList from '../components/rankings/PokemonList';
import DetailsPane from '../components/rankings/DetailsPane';
import MultiLineChart from '../components/rankings/MultiLineChart';
import PokemonSprite from '../components/PokemonSprite';

const victoryEndpoints = {
  historicalWinrate: '/api/victories',
  abilities: '/api/victories/abilities',
  moves: '/api/victories/moves',
  items: '/api/victories/items',
  teraTypes: '/api/victories/tera',
  teammates: '/api/victories/teammates',
};

const victoryCategoryTitles = [
  { name: "Historical Winrate", key: "historicalWinrate" },
  { name: "Abilities", key: "abilities" },
  { name: "Moves", key: "moves" },
  { name: "Items", key: "items" },
  { name: "Tera Types", key: "teraTypes" },
  { name: "Teammates", key: "teammates" },
];

const PokemonUsage = () => {
    const [formats, setFormats] = useState([]);
    const [format, setFormat] = useState('');
    const [usageData, setUsageData] = useState([]);
    const [historicalData, setHistoricalData] = useState({});
    const [error, setError] = useState(null);
    const [selectedPokemon, setSelectedPokemon] = useState(null);
    const [pokemonDetails, setPokemonDetails] = useState(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [isLoadingInitial, setIsLoadingInitial] = useState(true);
    const [isLoadingFormat, setIsLoadingFormat] = useState(false);
    const [page, setPage] = useState(1);
    const itemsPerPage = 6;
    const [currentCategory, setCurrentCategory] = useState(0);
    const [rankingType, setRankingType] = useState('usage');
    const [victoryData, setVictoryData] = useState([]);
    const [isVictoryDataLoading, setIsVictoryDataLoading] = useState(false);
    const [teamData, setTeamData] = useState([]);
    const [isLoadingTeams, setIsLoadingTeams] = useState(false);
    const [teamsPage, setTeamsPage] = useState(1);
    const teamsLimit = 12;
    const [teamsSortBy, setTeamsSortBy] = useState('usage');
    const [teamsSortDir, setTeamsSortDir] = useState('desc');
    const [teamsTotal, setTeamsTotal] = useState(0);
    const [teamsMonths, setTeamsMonths] = useState([]);
    const [teamsMonth, setTeamsMonth] = useState('');
    
    // Leads ranking state
    const [leadData, setLeadData] = useState([]);
    const [isLoadingLeads, setIsLoadingLeads] = useState(false);
    const [leadsPage, setLeadsPage] = useState(1);
    const leadsLimit = 12;
    const [leadsSortBy, setLeadsSortBy] = useState('win_rate');
    const [leadsSortDir, setLeadsSortDir] = useState('desc');
    const [leadsTotal, setLeadsTotal] = useState(0);
    const [leadsMonth, setLeadsMonth] = useState('');
    const [leadsMonths, setLeadsMonths] = useState([]);

    const categories = [
        { name: "Historical Usage", key: "historicalUsage" },
        { name: "Abilities", key: "abilities" },
        { name: "Moves", key: "moves" },
        { name: "Items", key: "items" },
        { name: "Spreads", key: "spreads" },
        { name: "Tera Types", key: "teraTypes" },
        { name: "Teammates", key: "teammates" }
    ];

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoadingInitial(true);
            try {
                // 1. Get latest month
                const monthsResponse = await axios.get('/api/months');
                const months = monthsResponse.data;
                
                if (months.length > 0) {
                    const latestMonth = months[0];
                    
                    // 2. Get formats for latest month and filter VGC formats
                    const formatsResponse = await axios.get(`/api/formats/${latestMonth}`);
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
                // Si es un 500 no deseado, lo ignoramos
                if (error.response?.status !== 500) {
                    console.error("Error inesperado al fetch de rankings:", error);
                } else {
                    console.error("Error in fetchInitialData:", error);
                    const errorMessage = error.response?.data || "Error loading formats";
                    setError(errorMessage);
                }
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
        if (rankingType !== 'victories' || !selectedPokemon) return;

        const { key } = victoryCategoryTitles[currentCategory];
        const endpoint = victoryEndpoints[key];
        console.log(`Fetching victory data for ${key}…`);
        setIsVictoryDataLoading(true);

        axios.get(endpoint, {
            params: { pokemon: selectedPokemon.name, format }
        })
        .then(({ data }) => {
            console.log('Victory data response:', data);
            setVictoryData(data);
        })
        .catch(err => {
            console.error('Error fetching victory data:', err);
            setVictoryData([]);
        })
        .finally(() => setIsVictoryDataLoading(false));
    }, [
        rankingType,
        currentCategory,
        selectedPokemon,
        format
    ]);

    useEffect(() => {
        if (rankingType !== 'teams' || !format) return;
        setIsLoadingTeams(true);
        axios.get('/api/teams/usage', {
            params: {
                format,
                month: teamsMonth,
                page: teamsPage,
                limit: teamsLimit,
                sortBy: teamsSortBy,
                sortDir: teamsSortDir
            }
        })
        .then(({ data: { teams, total } }) => {
            setTeamData(teams);
            setTeamsTotal(total);
        })
        .finally(() => setIsLoadingTeams(false));
    }, [rankingType, format, teamsPage, teamsSortBy, teamsSortDir, teamsMonth]);

    // Fetch leads usage when selected
    useEffect(() => {
        if (rankingType !== 'leads' || !format) return;
        setIsLoadingLeads(true);
        axios.get('/api/leads/usage', {
            params: {
                format,
                month: leadsMonth,
                page: leadsPage,
                limit: leadsLimit,
                sortBy: leadsSortBy,
                sortDir: leadsSortDir
            }
        })
        .then(({ data: { leads, total } }) => {
            setLeadData(leads);
            setLeadsTotal(total);
        })
        .finally(() => setIsLoadingLeads(false));
    }, [rankingType, format, leadsPage, leadsSortBy, leadsSortDir, leadsMonth]);

    useEffect(() => {
        setIsLoadingFormat(true);
        axios.get('/api/formats/currentMonth')
            .then(({ data }) => {
                setTeamsMonths(data.months);
                setTeamsMonth(data.currentMonth);
            })
            .catch(error => {
                if (error.response?.status !== 500) {
                    console.error("Error fetching currentMonth:", error);
                }
            })
            .finally(() => setIsLoadingFormat(false));
    }, []);

    // Cargar lista de meses
    useEffect(() => {
        axios.get('/api/months')
          .then(({ data }) => {
            setTeamsMonths(data);
            setLeadsMonths(data);
            if (data.length) {
                setTeamsMonth(data[0]);
                setLeadsMonth(data[0]);
            }
          });
    }, []);
    
    const handleTeamsMonthChange = e => {
        setTeamsMonth(e.target.value);
        setTeamsPage(1);
    };

    const handleFormatChange = async (selectedFormat) => {
        setFormat(selectedFormat);
        setIsLoadingFormat(true);
        setSelectedPokemon(null);
        setPokemonDetails(null);
        try {
            if (rankingType === 'usage') {
                // Lógica actual: consulta a /api/rankings
                const monthsResponse = await axios.get('/api/months');
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
                        const response = await axios.get('/api/rankings', {
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
                const response = await axios.get('/api/victories', {
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

    const handleTeamsPageChange = (_, value) => setTeamsPage(value);
    const handleTeamsSortByChange = (e) => {
        setTeamsSortBy(e.target.value);
        setTeamsPage(1);
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

    const fetchPokemonDetails = async (pokemonName) => {
        setIsLoadingDetails(true);
        try {
            // Get the most recent month 
            const latestMonth = Object.keys(historicalData).sort().reverse()[0];
            
            console.log(`Fetching details for ${pokemonName} in ${format} (${latestMonth})`);
            
            const response = await axios.get('/api/rankings', {
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
        const list = rankingType === 'usage' ? categories : victoryCategoryTitles;
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                <IconButton
                    aria-label="Previous category"
                    onClick={() => setCurrentCategory(c => Math.max(c - 1, 0))}
                    disabled={currentCategory === 0}
                    sx={{ color: 'white' }}
                >
                    <NavigateBeforeIcon />
                </IconButton>
                <Typography component="h2" variant="h6" sx={{ color: 'white', mx: 2 }}>
                    {list[currentCategory]?.name}
                </Typography>
                <IconButton
                    aria-label="Next category"
                    onClick={() => setCurrentCategory(c => Math.min(c + 1, list.length - 1))}
                    disabled={currentCategory === list.length - 1}
                    sx={{ color: 'white' }}
                >
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
                <Typography component="h3" variant="h6" sx={{ color: 'white', mb: 2 }}>
                    {category.name} ({categoryData.length})
                </Typography>
                
                {/* Combined chart for top elements in this category */}
                {chartData.length >= 1 && elements.length > 0 && (
                    <Box sx={{ mt: 3, mb: 4 }}>
                        <Typography component="h4" variant="subtitle1" sx={{ color: 'white', mb: 1 }}>
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
                                        <Chip
                                            size="small"
                                            label={`${monthlyChange.change}%`}
                                            icon={
                                                monthlyChange.isPositive ? (
                                                    <ArrowUpwardIcon fontSize="small" />
                                                ) : monthlyChange.isNeutral ? (
                                                    <RemoveIcon fontSize="small" />
                                                ) : (
                                                    <ArrowDownwardIcon fontSize="small" />
                                                )
                                            }
                                            sx={{
                                                ml: 1,
                                                backgroundColor: 'rgba(255,255,255,0.15)',
                                                color: monthlyChange.isPositive
                                                    ? '#4CAF50'
                                                    : monthlyChange.isNeutral
                                                    ? '#FFC107'
                                                    : '#F44336',
                                                '& .MuiChip-icon': {
                                                    color: monthlyChange.isPositive
                                                        ? '#4CAF50'
                                                        : monthlyChange.isNeutral
                                                        ? '#FFC107'
                                                        : '#F44336',
                                                },
                                                borderRadius: '4px'
                                            }}
                                        />
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
                <Typography component="h2" variant="h6" sx={{ color: 'white', mb: 2 }}>
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
                <Typography component="h2" variant="h6" sx={{ color: 'white', mb: 2, textAlign: 'center' }}>
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
        <Box component="main" sx={{ padding: 2 }}>
            <Typography component="h1" variant="h4" gutterBottom>
                Pokémon Usage Statistics
            </Typography>

            {/* Control buttons: responsive layout, more visual */}
            <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
                gap: 2,
                mb: 4,
            }}>
                {/* Selector de formato SIEMPRE primero */}
                <FormControl sx={{ minWidth: 200, mr: 3 }}>
                    <InputLabel 
                      id="format-label" 
                      htmlFor="format-select"
                      sx={{ color: 'text.primary' }}
                    >
                      Format
                    </InputLabel>
                    <Select
                        labelId="format-label"
                        label="Format"
                        inputProps={{
                          id: 'format-select',
                          'aria-labelledby': 'format-label',
                          style: { display: 'none' }
                        }}
                        value={format}
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

                <Button
                    variant='contained'
                    color="primary"
                    size="large"
                    disableElevation
                    onClick={() => setRankingType(rankingType === 'usage' ? 'victories' : 'usage')}
                    disabled={isLoadingFormat}
                    sx={{
                        flex: { xs: '1 1 100%', sm: 'auto' },
                        fontSize: { xs: 12, sm: 14 },
                        py: { xs: 1, sm: 1.5 },
                    }}
                >
                    {rankingType === 'usage' ? 'Winrate Ranking' : 'Usage Ranking'}
                </Button>

                <Button
                    variant={rankingType === 'teams' ? 'outlined' : 'contained'}
                    color="primary"
                    size="large"
                    disableElevation
                    onClick={() => setRankingType('teams')}
                    disabled={isLoadingFormat || rankingType === 'teams'}
                    sx={{
                        flex: { xs: '1 1 100%', sm: 'auto' },
                        fontSize: { xs: 12, sm: 14 },
                        py: { xs: 1, sm: 1.5 },
                    }}
                >
                    Teams Ranking
                </Button>

                <Button
                    variant={rankingType === 'leads' ? 'outlined' : 'contained'}
                    color="primary"
                    size="large"
                    disableElevation
                    onClick={() => setRankingType('leads')}
                    disabled={isLoadingFormat || rankingType === 'leads'}
                    sx={{
                        flex: { xs: '1 1 100%', sm: 'auto' },
                        fontSize: { xs: 12, sm: 14 },
                        py: { xs: 1, sm: 1.5 },
                    }}
                >
                    Leads Ranking
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
            ) : rankingType === 'teams' ? (
                <Box sx={{ mb: 4 }}>
                    {isLoadingTeams ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <>
                            {/* Teams Ranking controls */}
                            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                                <FormControl size="small">
                                    <InputLabel id="teams-sort-by-label" htmlFor="teams-sort-by-select" sx={{ color: 'white' }}>
                                        Sort by
                                    </InputLabel>
                                    <Select
                                        labelId="teams-sort-by-label"
                                        label="Sort by"
                                        value={teamsSortBy}
                                        onChange={handleTeamsSortByChange}
                                        inputProps={{
                                            id: "teams-sort-by-select",
                                            'aria-labelledby': 'teams-sort-by-label',
                                            style: { display: 'none' }               // oculta el select nativo
                                        }}
                                        sx={{
                                            color: 'white',
                                            backgroundColor: 'rgba(255,255,255,0.15)',
                                            '& .MuiSelect-icon': { color: 'white' },
                                            '& .MuiOutlinedInput-notchedOutline': {
                                                borderColor: 'rgba(255,255,255,0.7)'
                                            }
                                        }}
                                    >
                                        <MenuItem value="usage">Winrate %</MenuItem>
                                        <MenuItem value="total_games">Battles</MenuItem>
                                    </Select>
                                </FormControl>

                                <FormControl size="small">
                                    <InputLabel id="teams-month-label" htmlFor="teams-month-select" sx={{ color: 'white' }}>
                                        Month
                                    </InputLabel>
                                    <Select
                                        labelId="teams-month-label"
                                        label="Month"
                                        value={teamsMonth}
                                        onChange={handleTeamsMonthChange}
                                        inputProps={{
                                            id: "teams-month-select",
                                            'aria-labelledby': 'teams-month-label',
                                            style: { display: 'none' }
                                        }}
                                        sx={{
                                            color: 'white',
                                            backgroundColor: 'rgba(255,255,255,0.15)',
                                            '& .MuiSelect-icon': { color: 'white' },
                                            '& .MuiOutlinedInput-notchedOutline': {
                                                borderColor: 'rgba(255,255,255,0.7)'
                                            }
                                        }}
                                    >
                                        {teamsMonths.map(m => (
                                            <MenuItem key={m} value={m}>{m}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>
                            <Grid container spacing={2} sx={{ mb: 2 }}>
                                {teamData.map((team, i) => (
                                    <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                                        <Paper sx={{ p: 2, bgcolor: '#221FC7', color: 'white', textAlign: 'center' }}>
                                            <Box
                                                sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 1, mb: 1 }}
                                                role="img"
                                                aria-label={`Team ${i + 1} sprites`}
                                            >
                                                {team.name.split(';').map((poke, idx) => {
                                                    const displayName = poke
                                                        .split('-')
                                                        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                                                        .join(' ');
                                                    return (
                                                        <PokemonSprite
                                                            key={idx}
                                                            pokemon={{ name: poke }}
                                                            size={32}
                                                            aria-label={displayName}
                                                        />
                                                    );
                                                })}
                                            </Box>
                                            <Typography component="h2" variant="h5">{team.monthly_usage}%</Typography>
                                            <Typography component="h2" variant="caption">{team.monthly_total_games} games</Typography>
                                        </Paper>
                                    </Grid>
                                ))}
                            </Grid>
                            <Pagination
                                count={Math.ceil(teamsTotal / teamsLimit)}
                                page={teamsPage}
                                onChange={handleTeamsPageChange}
                                color="primary"
                                sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}
                            />
                        </>
                    )}
                </Box>
            ) : rankingType === 'leads' ? (
                <Box sx={{ mb: 4 }}>
                    {isLoadingLeads ? (
                        <Box sx={{ display:'flex', justifyContent:'center', my:4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <>
                            {/* Leads Ranking controls */}
                            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                                <FormControl size="small">
                                    <InputLabel id="leads-sort-by-label" htmlFor="leads-sort-by-select" sx={{ color: 'white' }}>
                                        Sort by
                                    </InputLabel>
                                    <Select
                                        labelId="leads-sort-by-label"
                                        label="Sort by"
                                        value={leadsSortBy}
                                        onChange={e => setLeadsSortBy(e.target.value)}
                                        inputProps={{
                                            id: "leads-sort-by-select",
                                            'aria-labelledby': 'leads-sort-by-label',
                                            style: { display: 'none' }
                                        }}
                                        sx={{
                                            color: 'white',
                                            backgroundColor: 'rgba(255,255,255,0.15)',
                                            '& .MuiSelect-icon': { color: 'white' },
                                            '& .MuiOutlinedInput-notchedOutline': {
                                                borderColor: 'rgba(255,255,255,0.7)'
                                            }
                                        }}
                                    >
                                        <MenuItem value="win_rate">Win Rate %</MenuItem>
                                        <MenuItem value="total_games">Games</MenuItem>
                                    </Select>
                                </FormControl>

                                <FormControl size="small">
                                    <InputLabel id="leads-month-label" htmlFor="leads-month-select" sx={{ color: 'white' }}>
                                        Month
                                    </InputLabel>
                                    <Select
                                        labelId="leads-month-label"
                                        label="Month"
                                        value={leadsMonth}
                                        onChange={e => { setLeadsMonth(e.target.value); setLeadsPage(1); }}
                                        inputProps={{
                                            id: "leads-month-select",
                                            'aria-labelledby': 'leads-month-label',
                                            style: { display: 'none' }               // oculta el select nativo
                                        }}
                                        sx={{
                                            color: 'white',
                                            backgroundColor: 'rgba(255,255,255,0.15)',
                                            '& .MuiSelect-icon': { color: 'white' },
                                            '& .MuiOutlinedInput-notchedOutline': {
                                                borderColor: 'rgba(255,255,255,0.7)'
                                            }
                                        }}
                                    >
                                        {leadsMonths.map(m => (
                                            <MenuItem key={m} value={m}>{m}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>
                            <Grid container spacing={2} sx={{ mb:2 }}>
                                {leadData.map((lead, i) => (
                                    <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                                        <Paper sx={{ p:2, bgcolor:'#221FC7', color:'white', textAlign:'center' }}>
                                            <Box sx={{ display:'flex', justifyContent:'center', gap:1, mb:1 }}>
                                                {lead.name.split(';').map((p,idx) => (
                                                    <PokemonSprite key={idx} pokemon={{name:p}} size={28} />
                                                ))}
                                            </Box>
                                            <Typography component="h2" variant="h5">{lead.monthly_usage}%</Typography>
                                            <Typography component="h2" variant="caption">{lead.monthly_total_games} games</Typography>
                                        </Paper>
                                    </Grid>
                                ))}
                            </Grid>
                            <Pagination
                                count={Math.ceil(leadsTotal / leadsLimit)}
                                page={leadsPage}
                                onChange={(e,v)=>setLeadsPage(v)}
                                color="primary"
                                sx={{ display:'flex', justifyContent:'center', mt:2 }}
                            />
                        </>
                    )}
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
