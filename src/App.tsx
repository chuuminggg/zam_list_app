import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import ThemeToggle from './components/common/ThemeToggle';
import { useTheme } from './hooks/useTheme';
import TodoPage from './pages/TodoPage';
import WishlistPage from './pages/WishlistPage';
import './index.css';

const NAV_BASE = 'px-4 py-2 rounded-lg text-sm font-medium transition-colors';
const NAV_ACTIVE = 'bg-indigo-600 text-white';
const NAV_IDLE = 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800';

export default function App() {
  useTheme();

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
          <nav className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
            <span className="font-bold text-gray-900 dark:text-white mr-4">ZAM List</span>
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
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </nav>
        </header>
        <main className="py-6">
          <Routes>
            <Route path="/" element={<TodoPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
