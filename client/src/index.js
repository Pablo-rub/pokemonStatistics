import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import HomePage from "./Pages/HomePage";
import TurnAssistantPage from "./Pages/TurnAssistantPage";
import GamesPage from "./Pages/GamesPage";
import RankingsPage from "./Pages/RankingsPage";

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <App />,
      children: [
        { path: "/", element: <HomePage /> },
        { path: "/turn-assistant", element: <TurnAssistantPage />},
        { path: "/my-games", element: <GamesPage />},
        { path: "/saved-games", element: <GamesPage />},
        { path: "/public-games", element: <GamesPage />},
        { path : "/rankings", element: <RankingsPage /> },
      ],
    }
  ],
  { basename: process.env.PUBLIC_URL }
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

// Si quieres medir el rendimiento en tu app, pasa una función
reportWebVitals();
