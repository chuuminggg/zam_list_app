import { useEffect } from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import SyncButton from './components/sync/SyncButton';
import ThemeToggle from './components/common/ThemeToggle';
import { useTheme } from './hooks/useTheme';
import KakaoCallbackPage from './pages/KakaoCallbackPage';
import LedgerPage from './pages/LedgerPage';
import TodoPage from './pages/TodoPage';
import WishlistPage from './pages/WishlistPage';
import { startSync } from './sync/sync';
import './index.css';

const NAV_BASE = 'px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors';
const NAV_ACTIVE = 'bg-indigo-600 text-white';
const NAV_IDLE = 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800';

export default function App() {
  useTheme();
  useEffect(startSync, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 transition-colors">
          <nav className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-1 sm:gap-2">
            <span className="font-bold text-gray-900 dark:text-white mr-1 sm:mr-3">ZAM List</span>
            <NavLink
              to="/"
              end
              className={({ isActive }) => `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_IDLE}`}
            >
              할 일
            </NavLink>
            <NavLink
              to="/wishlist"
              className={({ isActive }) => `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_IDLE}`}
            >
              위시리스트
            </NavLink>
            <NavLink
              to="/ledger"
              className={({ isActive }) => `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_IDLE}`}
            >
              가계부
            </NavLink>
            <div className="ml-auto flex items-center">
              <SyncButton />
              <ThemeToggle />
            </div>
          </nav>
        </header>
        <main className="py-6">
          <Routes>
            <Route path="/" element={<TodoPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/ledger" element={<LedgerPage />} />
            <Route path="/auth/kakao" element={<KakaoCallbackPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
