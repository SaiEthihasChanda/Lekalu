import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

/**
 * Display current date and time at the top right
 * Updates every second
 */
export const DateTimeDisplay = () => {
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed top-4 right-4 md:top-6 md:right-6 z-30 pointer-events-none">
      <div className="text-right">
        <p className="text-xs md:text-sm text-gray-400">
          {format(dateTime, 'EEE, MMM d')}
        </p>
        <p className="text-sm md:text-base font-semibold text-gray-300">
          {format(dateTime, 'h:mm:ss a')}
        </p>
      </div>
    </div>
  );
};
