import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';

export const MainLayout = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-xl font-bold">AniFolder</Link>
          <nav className="flex items-center gap-4">
            <Link to="/catalog" className="hover:text-blue-200">Каталог</Link>
            <Link to="/community" className="hover:text-blue-200">Сообщество</Link>

            {isAuthenticated ? (
              <>
                <Link to="/me" className="hover:text-blue-200">
                  Привет, {user?.username}
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-blue-800 hover:bg-blue-900 px-3 py-1 rounded text-sm"
                >
                  Выйти
                </button>
              </>
            ) : (
              <div className="flex gap-3">
                <Link to="/login" className="hover:text-blue-200">Войти</Link>
                <Link to="/register" className="bg-blue-800 hover:bg-blue-900 px-3 py-1 rounded text-sm">
                  Регистрация
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4">
        <Outlet />
      </main>

      <footer className="bg-gray-800 text-gray-400 p-4 text-center text-sm">
        © 2026 AniFolder. Frontend by Anton.
      </footer>
    </div>
  );
};