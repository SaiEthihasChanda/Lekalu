import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from './Modal.jsx';
import { formatAmount } from '../utils/analytics.js';
import { amountToWords } from '../utils/amountToWords.js';

/**
 * Confirmation modal for suspicious amounts (>99 lakhs)
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {number} props.amount - Amount in rupees
 * @param {Function} props.onConfirm - Callback when user confirms
 * @param {Function} props.onCancel - Callback when user cancels
 */
export const AmountConfirmationModal = ({ isOpen, amount, onConfirm, onCancel }) => {
  if (!isOpen || !amount) return null;

  const amountFloor = Math.floor(amount);
  const amountWords = amountToWords(amountFloor);
  const decimals = Math.round((amount - amountFloor) * 100);

  return (
    <Modal isOpen={isOpen} onClose={onCancel}>
      <div className="w-full max-w-md p-4 md:p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle size={24} className="text-yellow-500 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
              Are you sure this is the correct amount?🤨
            </h2>
            <p className="text-sm md:text-base text-gray-300">
              To make sure the amount you entered is <span className="font-semibold text-accent">{amountWords}{decimals !== '00' ? ' and ' + decimals + ' paise' : ''}</span>
            </p>
          </div>
        </div>

        <div className="bg-primary border border-yellow-500/30 rounded-lg p-3 md:p-4 mb-6">
          <p className="text-lg md:text-xl font-bold text-accent text-center">
            {formatAmount(amount)}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 md:py-3 px-4 rounded-lg transition-colors"
          >
            i made a mistake😬
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 md:py-3 px-4 rounded-lg transition-colors"
          >
            yes this is right😅
          </button>
        </div>
      </div>
    </Modal>
  );
};
