import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';

const PokemonUsage = () => {
    const [months, setMonths] = useState([]);
    const [month, setMonth] = useState();
    const [formats, setFormats] = useState([]);
    const [format, setFormat] = useState();
    const [usageData, setUsageData] = useState([]);
    const [error, setError] = useState(null);

    const handleMonthChange = async (selectedMonth) => {
        setMonth(selectedMonth);
        try {
            const response = await fetch(`http://localhost:5000/api/formats/${selectedMonth}`);
            const data = await response.json();
            setFormats(data);
            setFormat(data[0] || '');
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
                console.log("Fetching data from:", url);
                try {
                    const response = await fetch(url);
                    if (!response.ok) {
                        //throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.text();
                    parseData(data);
                } catch (error) {
                    console.error("Error al cargar los datos:", error);
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
                    pokemon: columns[1],
                    usagePercentage: columns[2],
                    raw: columns[3],
                    realPercentage: columns[5],
                });
            }
        }
        setUsageData(parsedData);
    };

    return (
        <div>
            <h1> Pokemon Usage </h1>
            <Button href="/"> Home </Button> <br />
            <select onChange={(e) => handleMonthChange(e.target.value)}>
                {months.map((month) => (
                    <option key={month} value={month}>{month}</option>
                ))}
            </select>
            <select value={format} onChange={handleFormatChange}>
                {formats.map((fmt) => (
                    <option key={fmt} value={fmt}>{fmt}</option>
                ))}
            </select>
            {error && <p>Error: {error}</p>}
            <ul>
                {usageData.map((pokemon) => (
                    <p key={pokemon.rank}>
                        {pokemon.rank}: {pokemon.pokemon} - {pokemon.usagePercentage} - {}
                    </p>
                ))}
            </ul>
        </div>
    );
};

export default PokemonUsage;
