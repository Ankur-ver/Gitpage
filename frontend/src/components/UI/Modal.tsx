import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };

const Modal: React.FC<Props> = ({ open, onClose, title, children, size = 'md' }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm
                     flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1,    y: 0,  opacity: 1 }}
            exit  ={{ scale: 0.95, y: 20, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className={`w-full ${sizeMap[size]} bg-bg-card border border-[#2a2a3a]
                        rounded-2xl shadow-glow-lg overflow-hidden`}
          >
            {title && (
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a3a]">
                <h2 className="font-semibold text-text-primary">{title}</h2>
                <button onClick={onClose}
                  className="text-text-muted hover:text-text-primary transition-colors">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;