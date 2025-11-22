import { Outlet } from 'react-router-dom';
import { Navbar } from '../ui/Navbar';

export const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-border py-6 bg-surface transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 text-center text-text-muted text-sm">
          © {new Date().getFullYear()} Tournament Maker. All rights reserved.
        </div>
      </footer>
    </div>
  );
};
