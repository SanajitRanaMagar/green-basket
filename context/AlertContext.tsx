import React, { createContext, useContext, useState } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

type AlertType = 'info' | 'success' | 'warning' | 'danger';

interface AlertOptions {
  title: string;
  message: string;
  type?: AlertType;
  okText?: string;
}

interface AlertContextValue {
  alert: (options: AlertOptions | string) => Promise<void>;
}

const AlertContext = createContext<AlertContextValue | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<AlertOptions>({
    title: '',
    message: '',
    type: 'info',
    okText: 'OK',
  });

  const alert = async (input: AlertOptions | string): Promise<void> => {
    const opts: AlertOptions = typeof input === 'string' ? { title: '', message: input, type: 'info' } : input;
    
    setOptions({
      title: opts.title || '',
      message: opts.message,
      type: opts.type || 'info',
      okText: opts.okText || 'OK',
    });
    
    setIsOpen(true);

    // Wait for user to close
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!isOpen) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const getColors = (type: AlertType) => {
    switch (type) {
      case 'success':
        return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', button: 'bg-green-600 hover:bg-green-700' };
      case 'danger':
        return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', button: 'bg-red-600 hover:bg-red-700' };
      case 'warning':
        return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', button: 'bg-yellow-600 hover:bg-yellow-700' };
      default:
        return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', button: 'bg-blue-600 hover:bg-blue-700' };
    }
  };

  const getIcon = (type: AlertType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-600" />;
      case 'danger':
        return <AlertCircle className="w-12 h-12 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-12 h-12 text-yellow-600" />;
      default:
        return <Info className="w-12 h-12 text-blue-600" />;
    }
  };

  const colors = getColors(options.type || 'info');

  return (
    <AlertContext.Provider value={{ alert }}>
      {children}
      
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${colors.bg} border ${colors.border} rounded-lg shadow-lg p-8 max-w-md w-full mx-4 transform transition-all`}>
            <div className="flex flex-col items-center text-center">
              <div className="mb-4">
                {getIcon(options.type || 'info')}
              </div>
              
              {options.title && (
                <h2 className={`text-xl font-bold ${colors.text} mb-2`}>
                  {options.title}
                </h2>
              )}
              
              <p className={`${colors.text} mb-6`}>
                {options.message}
              </p>
              
              <button
                onClick={handleClose}
                className={`${colors.button} text-white px-8 py-2 rounded-lg font-semibold transition-colors`}
              >
                {options.okText || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlert must be used within AlertProvider');
  return ctx;
};
