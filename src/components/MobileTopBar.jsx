import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Fixed top bar for mobile devices with logo, menu, and time
 */
export const MobileTopBar = ({ isMenuOpen, onMenuToggle }) => {
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-secondary border-b border-gray-700 z-50 flex items-center justify-between px-4">
      {/* Menu Button - Left */}
      <button
        onClick={onMenuToggle}
        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        aria-label="Toggle menu"
      >
        {isMenuOpen ? (
          <X size={24} className="text-white" />
        ) : (
          <Menu size={24} className="text-white" />
        )}
      </button>

      {/* Logo - Center */}
      <div className="flex items-center gap-2">
        <img src="/lekalu-logo.svg" alt="Lekalu" className="w-8 h-8" />
        <span className="text-sm font-bold text-white">Lekalu</span>
      </div>

      {/* Time - Right */}
      <div className="text-right text-xs">
        <p className="text-gray-400 leading-tight">
          {format(dateTime, 'h:mm:ss a')}
        </p>
        <p className="text-gray-500 text-xs leading-tight">
          {format(dateTime, 'MMM d')}
        </p>
      </div>
    </div>
  );
};
