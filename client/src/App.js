import React from 'react';
import './App.css';
import { Outlet } from 'react-router-dom';

function App() {
  return (
    /* <div className="App">
      <header className="App-header">
        <h1>Pokemon Statistics</h1>
        <p>
          Bienvenido a la aplicación de estadísticas de Pokémon.
        </p>
        </header>
        </div>*/
    <Outlet />
  );
}

export default App;
