import { formatAmount, formatDate } from '../utils/analytics.js';
import { Trash2, Edit2 } from 'lucide-react';

export const ActivityCard = ({ activity, trackable, account, onEdit, onDelete }) => {
  const isIncome = activity.type === 'income';
  const isTransfer = activity.type === 'transfer';

  const bgColor = isTransfer ? 'bg-gray-700/50' : isIncome ? 'bg-green-900/20' : 'bg-red-900/20';
  const textColor = isTransfer ? 'text-gray-300' : isIncome ? 'text-green-400' : 'text-red-400';
  const amountPrefix = isIncome ? '+' : '-';

  return (
    <div className={`${bgColor} border border-gray-700 rounded-lg p-3 md:p-4 hover:border-accent transition-colors`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm md:text-base text-white font-medium truncate">{trackable?.name || activity.description}</h3>
          <p className="text-xs text-gray-400 mt-1 truncate">{account?.cardName || 'Unknown Account'}</p>
        </div>
        <div className="flex items-center gap-1 md:gap-2 self-end md:self-auto">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 md:p-2 hover:bg-gray-700 rounded transition-colors"
              title="Edit"
            >
              <Edit2 size={16} className="text-gray-400" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 md:p-2 hover:bg-red-900/50 rounded transition-colors"
              title="Delete"
            >
              <Trash2 size={16} className="text-red-400" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <span className={`${textColor} text-base md:text-lg font-semibold`}>
          {amountPrefix}
          {formatAmount(activity.amount)}
        </span>
        <span className="text-xs text-gray-500">{formatDate(activity.date, 'HH:mm')}</span>
      </div>
    </div>
  );
};
