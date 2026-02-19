import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

type ConfirmType = 'danger' | 'warning' | 'info' | 'success';

type ConfirmOptions = {
  title: string;
  message: string;
  type?: ConfirmType;
  okText?: string;
  cancelText?: string;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolveCallback, setResolveCallback] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts);
      setResolveCallback(() => resolve);
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = () => {
    if (resolveCallback) {
      resolveCallback(true);
    }
    setIsOpen(false);
    setOptions(null);
    setResolveCallback(null);
  };

  const handleCancel = () => {
    if (resolveCallback) {
      resolveCallback(false);
    }
    setIsOpen(false);
    setOptions(null);
    setResolveCallback(null);
  };

  const getIcon = (type?: ConfirmType) => {
    switch (type) {
      case 'danger':
        return <AlertTriangle className="w-8 h-8 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-8 h-8 text-yellow-600" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      default:
        return <AlertCircle className="w-8 h-8 text-blue-600" />;
    }
  };

  const getColors = (type?: ConfirmType) => {
    switch (type) {
      case 'danger':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          button: 'bg-red-600 hover:bg-red-700',
          buttonText: 'text-white',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          button: 'bg-yellow-600 hover:bg-yellow-700',
          buttonText: 'text-white',
        };
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          button: 'bg-green-600 hover:bg-green-700',
          buttonText: 'text-white',
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          button: 'bg-primary hover:bg-green-700',
          buttonText: 'text-white',
        };
    }
  };

  const colors = getColors(options?.type);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {isOpen && options && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className={`${colors.bg} border ${colors.border} rounded-lg shadow-lg w-full max-w-md p-6 transform transition-all`}>
            {/* Header with Icon */}
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 pt-1">
                {getIcon(options.type)}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">{options.title}</h3>
              </div>
            </div>

            {/* Message */}
            <p className="text-gray-700 mb-6">{options.message}</p>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                {options.cancelText || 'Cancel'}
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 ${colors.button} ${colors.buttonText} rounded-lg font-medium transition`}
              >
                {options.okText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
};
