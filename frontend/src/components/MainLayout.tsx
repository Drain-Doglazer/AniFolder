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
      <header className="bg-blue-600 text-white shadow-md">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold tracking-wide">
            AniFolder
          </Link>
          
          <nav className="flex items-center gap-6">
            <Link 
              to="/catalog" 
              className="text-white hover:text-blue-200 transition-colors font-medium"
            >
              Каталог
            </Link>
            <Link 
              to="/community" 
              className="text-white hover:text-blue-200 transition-colors font-medium"
            >
              Сообщество
            </Link>

            {isAuthenticated ? (
              <>
                <Link 
                  to="/me" 
                  className="text-white hover:text-blue-200 transition-colors font-medium"
                >
                  Привет, {user?.username}
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="text-white hover:text-blue-200 transition-colors font-medium"
                >
                  Войти
                </Link>
                <Link 
                  to="/register" 
                  className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Регистрация
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-6">
        <Outlet />
      </main>

      <footer className="bg-gray-800 text-gray-400 p-4 text-center text-sm">
        © 2026 AniFolder
      </footer>
    </div>
  );
};