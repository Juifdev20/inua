import React from 'react';
import { AlertTriangle, Clock, X } from 'lucide-react';

const ShutdownAlertBanner = ({ message, timeRemaining, onDismiss }) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3 sm:py-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-base font-medium truncate">
                {message}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs sm:text-sm font-semibold">
                  Temps restant: {timeRemaining}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white text-amber-600 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors"
            >
              J'ai compris
            </button>
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg hover:bg-amber-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShutdownAlertBanner;
