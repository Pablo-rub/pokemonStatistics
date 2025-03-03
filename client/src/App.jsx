import { Route, Routes } from "react-router-dom";

import HomePage from "./Pages/HomePage.jsx";
import TurnAssistantPage from "./Pages/TurnAssistantPage.jsx";
import GamesPage from './Pages/GamesPage.jsx';
import RankingsPage from "./Pages/RankingsPage.jsx";
import MainLayout from "./layout/MainLayout.jsx";

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/turn-assistant" element={<TurnAssistantPage />} />
        <Route path="/my-games" element={<GamesPage />} />
        <Route path="/saved-games" element={<GamesPage />} />
        <Route path="/public-games" element={<GamesPage />} />
        <Route path="/rankings" element={<RankingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;