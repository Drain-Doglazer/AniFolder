import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';

export const MainLayout = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogout, setShowLogout] = useState(false);
  const logoutDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!showLogout) return;
    const dialog = logoutDialog.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [showLogout]);
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 button-primary">К содержимому</a>
      <header className="border-b border-gray-800 bg-[var(--bg)]">
        <div className="page-shell flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-4">
          <Link to="/" aria-label="AniFolder — главная" className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#6b5275] bg-[#a884b51a] text-accent" aria-hidden="true">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="m10 11 5 3-5 3v-6Z" fill="currentColor"/></svg>
            </span>
            <span>Ani<span className="text-accent">Folder</span></span>
          </Link>
          <nav aria-label="Основная навигация" className="order-3 flex w-full items-center gap-1 border-t border-gray-800 pt-3 sm:order-none sm:w-auto sm:border-0 sm:pt-0">
            <NavLink to="/catalog" className={({ isActive }) => `nav-link ${isActive || location.pathname === '/' ? 'active' : ''}`}>Каталог</NavLink>
            <NavLink to="/community" className="nav-link">Сообщество</NavLink>
            {isAuthenticated && <NavLink to="/me" className="nav-link">Мой список</NavLink>}
          </nav>
          <div className="flex items-center gap-2">
            {isAuthenticated ? <>
              <Link to="/me" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#a884b526] text-sm font-semibold text-accent-hover" aria-label={`Профиль ${user?.username || ''}`} title={user?.username}>{user?.username?.slice(0, 1).toUpperCase() || 'A'}</Link>
              <button className="nav-link" onClick={() => setShowLogout(true)}>Выйти</button>
            </> : <>
              <Link to="/login" className="nav-link">Войти</Link>
              <Link to="/register" className="button-primary !px-3 sm:!px-4">Регистрация</Link>
            </>}
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="page-shell flex-grow py-8 sm:py-10"><Outlet /></main>
      <dialog
        ref={logoutDialog}
        aria-labelledby="logout-title"
        aria-describedby="logout-description"
        className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-gray-800 bg-[var(--surface)] p-0 text-gray-100 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
        onCancel={(event) => { event.preventDefault(); setShowLogout(false); }}
        onClose={() => setShowLogout(false)}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setShowLogout(false);
        }}
      >
        <div className="p-6 sm:p-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#6b5275] bg-[#a884b51a] text-accent-hover" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M14 8l4 4-4 4M8 12h10" /></svg>
          </div>
          <h2 id="logout-title" className="text-2xl font-semibold tracking-tight">Выйти из аккаунта?</h2>
          <p id="logout-description" className="mt-3 text-sm leading-relaxed text-gray-400">Чтобы продолжить вести свою коллекцию, нужно будет войти снова.</p>
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" autoFocus className="button-secondary" onClick={() => setShowLogout(false)}>Остаться</button>
            <button type="button" className="button-primary" onClick={() => { setShowLogout(false); logout(); navigate('/'); }}>Выйти</button>
          </div>
        </div>
      </dialog>
      <footer className="mt-10 border-t border-gray-800 py-6">
        <div className="page-shell flex flex-wrap justify-between gap-2 text-xs text-gray-500"><span>© 2026 AniFolder</span><span>Твои истории. Твоя коллекция.</span></div>
      </footer>
    </div>
  );
};


