import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel 
} from '@mui/material';
import PokemonSprite from '../components/PokemonSprite';

const PokemonUsage = () => {
    const [months, setMonths] = useState([]);
    const [month, setMonth] = useState('');
    const [formats, setFormats] = useState([]);
    const [format, setFormat] = useState('');
    const [usageData, setUsageData] = useState([]);
    const [error, setError] = useState(null);

    const handleMonthChange = async (selectedMonth) => {
        setMonth(selectedMonth);
        try {
            const response = await fetch(`http://localhost:5000/api/formats/${selectedMonth}`);
            const data = await response.json();
            // Filter only VGC formats
            const vgcFormats = data.filter(fmt => fmt.toLowerCase().includes('vgc'));
            setFormats(vgcFormats);
            setFormat(vgcFormats[0] || '');
        } catch (error) {
            console.error("Error fetching formats:", error);
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
                const url = `http://localhost:5000/api/rankings?month=${month}&format=${format}.txt`;
                try {
                    const response = await fetch(url);
                    const data = await response.text();
                    parseData(data);
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
        for (let i = 5; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && !line.startsWith('+')) {
                const columns = line.split('|').map(col => col.trim()).filter(col => col);
                parsedData.push({
                    rank: columns[0],
                    name: columns[1],
                    usagePercentage: columns[2],
                    raw: columns[3],
                    realPercentage: columns[5],
                });
            }
        }
        setUsageData(parsedData);
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

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {usageData.map((pokemon) => (
                    <Box 
                        key={pokemon.rank}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            padding: 1,
                            borderRadius: 1,
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.05)'
                            }
                        }}
                    >
                        <Typography sx={{ minWidth: 50 }}>#{pokemon.rank}</Typography>
                        <PokemonSprite pokemon={{ name: pokemon.name }} />
                        <Typography sx={{ minWidth: 150 }}>{pokemon.name}</Typography>
                        <Typography>{pokemon.usagePercentage}%</Typography>
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

export default PokemonUsage;
