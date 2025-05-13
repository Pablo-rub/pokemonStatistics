import React from 'react';
import { ResponsiveContainer, LineChart, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Line } from 'recharts';

const generateColor = (index, total) => {
    // Material colors con buen contraste sobre fondo oscuro
    const baseColors = [
      '#24CC9F', // verde brillante (índice 0)
      '#FFCE56', // rosado (1)
      '#FF9F40', // azul 700 (2)
      '#FFD600', // amarillo 600 (3)
      '#4BC0C0', // púrpura 500 (4)
      '#F49AC2', // deep-orange 500 (5)
      '#0288D1', // 6: azul 600  ← reemplazo de '#0097A7'
      '#8E24AA', // 7: púrpura 600 ← reemplazo de '#7B1FA2'
      '#78909C', // 8: azul-gris 400 ← reemplazo de '#455A64'
      '#E53935'  // 9: rojo 600   ← reemplazo de '#D84315'
  ];

    if (index < baseColors.length) {
      return baseColors[index];
    }
    // fallback genérico si se excede el length
    const hue = (index / total) * 360;
    return `hsl(${hue}, 80%, 65%)`;
};

// Componente personalizado para el tooltip que ordena los elementos por valor descendente
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        // Ordenar los elementos por valor descendente
        const sortedPayload = [...payload].sort((a, b) => b.value - a.value);
        
        return (
            <div style={{ 
                backgroundColor: '#221FC7', 
                border: '1px solid #1A1896', 
                borderRadius: 5, 
                padding: 10,
                boxShadow: '0 3px 10px rgba(0,0,0,0.2)'
            }}>
                <p style={{ margin: 0, color: 'white', fontWeight: 'bold', marginBottom: 5 }}>{label}</p>
                {sortedPayload.map((entry, index) => (
                    <div key={`item-${index}`} style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        margin: '3px 0'
                    }}>
                        <span style={{ 
                            display: 'inline-block', 
                            width: 10, 
                            height: 10, 
                            backgroundColor: entry.color,
                            marginRight: 6,
                            borderRadius: '50%'
                        }}></span>
                        <span style={{ color: 'white' }}>
                            {entry.name}: {entry.value?.toFixed(2) || 'N/A'}%
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    
    return null;
};

const MultiLineChart = ({ chartData, elements }) => {
    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 5, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                        dataKey="month" 
                        tick={{ fill: 'white', fontSize: 12 }} 
                        angle={-45} 
                        textAnchor="end" 
                        height={60}
                    />
                    <YAxis 
                        tick={{ fill: 'white', fontSize: 12 }} 
                        tickFormatter={(value) => `${value}%`}
                    />
                    {/* Reemplazar el Tooltip existente con nuestro componente personalizado */}
                    <Tooltip content={<CustomTooltip />} />
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