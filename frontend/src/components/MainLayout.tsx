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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#1e1e24' }}>
      <header style={{ backgroundColor: '#2a2a32' }} className="shadow-lg border-b border-gray-800">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold tracking-wide text-white">
            Ani<span style={{ color: '#d4845a' }}>Folder</span>
          </Link>
          
          <nav className="flex items-center gap-6">
            <Link 
              to="/catalog" 
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              Каталог
            </Link>
            <Link 
              to="/community" 
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              Сообщество
            </Link>

            {isAuthenticated ? (
              <>
                <Link 
                  to="/me" 
                  className="text-gray-300 hover:text-white transition-colors font-medium"
                >
                  Привет, {user?.username}
                </Link>
                <button
                  onClick={handleLogout}
                  className="border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="text-gray-300 hover:text-white transition-colors font-medium"
                >
                  Войти
                </Link>
                <Link 
                  to="/register" 
                  style={{ backgroundColor: '#d4845a' }}
                  className="hover:opacity-90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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

      <footer className="border-t border-gray-800 py-4 text-center text-sm text-gray-500" style={{ backgroundColor: '#2a2a32' }}>
        © 2026 AniFolder
      </footer>
    </div>
  );
};