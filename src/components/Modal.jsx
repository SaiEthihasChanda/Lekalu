import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'md:w-96 w-[90vw]',
    md: 'md:w-[500px] w-[90vw]',
    lg: 'md:w-[700px] w-[90vw]',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className={`bg-secondary rounded-lg shadow-xl max-h-[90vh] overflow-y-auto ${sizeClasses[size]}`}
      >
        <div className="sticky top-0 flex items-center justify-between p-4 md:p-6 border-b border-primary bg-secondary gap-2">
          <h2 className="text-lg md:text-xl font-semibold text-white flex-1 truncate">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-primary rounded-lg transition-colors flex-shrink-0"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        <div className="p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
};
