import React from 'react';
import { ResponsiveContainer, LineChart, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Line } from 'recharts';

const generateColor = (index, total) => {
    const baseColors = ['#24CC9F', '#FF6384', '#36A2EB', '#FFCE56', '#9966FF', '#FF9F40', '#4BC0C0', '#F49AC2'];
    if (index < baseColors.length) return baseColors[index];
    const hue = (index / total) * 360;
    return `hsl(${hue}, 80%, 65%)`;
};

const MultiLineChart = ({ chartData, elements }) => {
    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 5, bottom: 30 }}>
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
                        contentStyle={{ backgroundColor: '#221FC7', borderColor: '#1A1896', color: 'white', fontSize: 12 }}
                        labelStyle={{ color: 'white' }}
                    />
                    <Legend wrapperStyle={{ color: 'white' }} />
                    {elements.map((element, index) => (
                        <Line
                            key={element}
                            type="monotone"
                            dataKey={element}
                            name={element}
                            stroke={generateColor(index, elements.length)}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default MultiLineChart;