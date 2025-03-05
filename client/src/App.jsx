import { Route, Routes } from "react-router-dom";

import HomePage from "./Pages/HomePage.jsx";
import TurnAssistantPage from "./Pages/TurnAssistantPage.jsx";
import GamesPage from './Pages/GamesPage.jsx';
import RankingsPage from "./Pages/RankingsPage.jsx";
import MainLayout from "./layout/MainLayout.jsx";
import PublicGamesPage from "./Pages/PublicGamesPage.jsx";
import ProfilePage from "./Pages/ProfilePage.jsx";
import FinishSignIn from "./Pages/FinishSignIn.jsx";

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/turn-assistant" element={<TurnAssistantPage />} />
        <Route path="/my-games" element={<GamesPage />} />
        <Route path="/saved-games" element={<GamesPage />} />
        <Route path="/public-games" element={<PublicGamesPage />} />
        <Route path="/rankings" element={<RankingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/finishSignIn" element={<FinishSignIn />} />
      </Route>
    </Routes>
  );
}

export default App;