import { Route, Routes } from "react-router-dom";

import HomePage from "./Pages/HomePage.jsx";
import TurnAssistantPage from "./Pages/TurnAssistantPage.jsx";
import RankingsPage from "./Pages/RankingsPage.jsx";
import MainLayout from "./layout/MainLayout.jsx";
import PublicGamesPage from "./Pages/PublicGamesPage.jsx";
import ProfilePage from "./Pages/ProfilePage.jsx";
import FinishSignIn from "./Pages/FinishSignIn.jsx";
import SavedGamesPage from "./Pages/SavedGamesPage.jsx";
import ForumPage from "./Pages/ForumPage.jsx";
import ForumTopicPage from "./Pages/ForumTopicPage.jsx"; // Importar la nueva página

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
        <Route path="/forum" element={<ForumPage />} />
        <Route path="/forum/:topicId" element={<ForumTopicPage />} /> {/* Añadir ruta para temas específicos */}
      </Route>
    </Routes>
  );
}

export default App;