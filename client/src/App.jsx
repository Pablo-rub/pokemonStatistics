import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import HomePage from './Pages/HomePage';
import SavedGamesPage from './Pages/SavedGamesPage';
import PublicGamesPage from './Pages/PublicGamesPage';
import RankingsPage from './Pages/RankingsPage';
import TurnAssistantPage from './Pages/TurnAssistantPage';
import ForumPage from './Pages/ForumPage';
import ForumTopicPage from './Pages/ForumTopicPage';
import ProfilePage from './Pages/ProfilePage';
import AnalyzeBattlePage from './Pages/AnalyzeBattlePage';
import BattleAnalyticsPage from './Pages/BattleAnalyticsPage';
import ContactPage from './Pages/ContactPage';
import PokemonListPage from './Pages/PokemonListPage';
import PokemonDetailPage from './Pages/PokemonDetailPage';
import TeamBuilderPage from './Pages/TeamBuilderPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="saved-games" element={<SavedGamesPage />} />
        <Route path="public-games" element={<PublicGamesPage />} />
        <Route path="rankings" element={<RankingsPage />} />
        <Route path="turn-assistant" element={<TurnAssistantPage />} />
        <Route path="forum" element={<ForumPage />} />
        <Route path="forum/:topicId" element={<ForumTopicPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="analyze-battle/:replayId" element={<AnalyzeBattlePage />} />
        <Route path="battle-analytics" element={<BattleAnalyticsPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="pokemon-list" element={<PokemonListPage />} />
        <Route path="pokemon/:nameOrId" element={<PokemonDetailPage />} />
        <Route path="team-builder" element={<TeamBuilderPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;