import { Route, Routes } from "react-router-dom";

import HomePage from "./Pages/HomePage.jsx";
import TurnAssistantPage from "./Pages/TurnAssistantPage.jsx";
import RankingsPage from "./Pages/RankingsPage.jsx";
import MainLayout from "./layout/MainLayout.jsx";
import PublicGamesPage from "./Pages/PublicGamesPage.jsx";
import ProfilePage from "./Pages/ProfilePage.jsx";
import FinishSignIn from "./Pages/FinishSignIn.jsx";
import SavedGamesPage from "./Pages/SavedGamesPage.jsx";
import ForumPage from "./Pages/ForumPage.jsx"; // Importar la página del foro

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/turn-assistant" element={<TurnAssistantPage />} />
        <Route path="/saved-games" element={<SavedGamesPage />} />
        <Route path="/public-games" element={<PublicGamesPage />} />
        <Route path="/rankings" element={<RankingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/finishSignIn" element={<FinishSignIn />} />
        <Route path="/forum" element={<ForumPage />} /> {/* Añadir ruta al foro */}
      </Route>
    </Routes>
  );
}

export default App;