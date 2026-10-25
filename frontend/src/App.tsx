import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/MainLayout';
import { CatalogPage } from './pages/CatalogPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProfilePage } from './pages/ProfilePage';
import { AnimeDetailsPage } from './pages/AnimeDetailsPage';
import { TopicsPage } from './pages/TopicsPage';
import { TopicDetailsPage } from './pages/TopicDetailsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<CatalogPage />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="anime/:id" element={<AnimeDetailsPage />} />
          <Route path="me" element={<ProfilePage />} />
          <Route path="community" element={<TopicsPage />} />
          <Route path="topics/:id" element={<TopicDetailsPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;