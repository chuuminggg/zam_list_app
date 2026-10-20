import { useEffect } from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import SyncButton from './components/sync/SyncButton';
import ThemeToggle from './components/common/ThemeToggle';
import Toaster from './components/common/Toaster';
import LedgerSheetHost from './components/ledger/LedgerSheetHost';
import { useTheme } from './hooks/useTheme';
import FortunePage from './pages/FortunePage';
import KakaoCallbackPage from './pages/KakaoCallbackPage';
import LedgerPage from './pages/LedgerPage';
import ReportPage from './pages/ReportPage';
import TodoPage from './pages/TodoPage';
import WishlistPage from './pages/WishlistPage';
import { startSync } from './sync/sync';
import './index.css';

const NAV_BASE = 'shrink-0 whitespace-nowrap px-2.5 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors';
const NAV_ACTIVE = 'bg-indigo-600 text-white';
const NAV_IDLE = 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800';

export default function App() {
  useTheme();
  useEffect(startSync, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 transition-colors">
          {/* 좁은 화면에서는 로고·버튼 줄 아래에 탭 줄을 두고, 탭 이름은 줄바꿈하지 않는다. */}
          <nav className="max-w-5xl mx-auto px-4 py-2 sm:py-3 flex flex-wrap sm:flex-nowrap items-center gap-x-1 sm:gap-x-2 gap-y-1">
            <span className="order-1 shrink-0 whitespace-nowrap font-bold text-gray-900 dark:text-white mr-1 sm:mr-3">
              ZAM List
            </span>
            <div className="order-3 sm:order-2 w-full sm:w-auto min-w-0 flex gap-1 sm:gap-2 overflow-x-auto [scrollbar-width:none]">
              <NavLink to="/" end className={({ isActive }) => `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_IDLE}`}>
                할 일
              </NavLink>
              <NavLink to="/wishlist" className={({ isActive }) => `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_IDLE}`}>
                위시리스트
              </NavLink>
              <NavLink to="/ledger" className={({ isActive }) => `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_IDLE}`}>
                가계부
              </NavLink>
              <NavLink to="/fortune" className={({ isActive }) => `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_IDLE}`}>
                운세
              </NavLink>
              <NavLink to="/report" className={({ isActive }) => `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_IDLE}`}>
                리포트
              </NavLink>
            </div>
            <div className="order-2 sm:order-3 ml-auto flex items-center">
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
            <Route path="/fortune" element={<FortunePage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/auth/kakao" element={<KakaoCallbackPage />} />
          </Routes>
        </main>
        <LedgerSheetHost />
        <Toaster />
      </div>
    </BrowserRouter>
  );
}
