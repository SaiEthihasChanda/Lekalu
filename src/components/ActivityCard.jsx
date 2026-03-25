import { formatAmount, formatDate } from '../utils/analytics.js';
import { Trash2, Edit2 } from 'lucide-react';

export const ActivityCard = ({ activity, trackable, account, onEdit, onDelete }) => {
  const isIncome = activity.type === 'income';
  const isTransfer = activity.type === 'transfer';

  const bgColor = isTransfer ? 'bg-gray-700/50' : isIncome ? 'bg-green-900/20' : 'bg-red-900/20';
  const textColor = isTransfer ? 'text-gray-300' : isIncome ? 'text-green-400' : 'text-red-400';
  const amountPrefix = isIncome ? '+' : '-';

  return (
    <div className={`${bgColor} border border-gray-700 rounded-lg p-4 hover:border-accent transition-colors`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-white font-medium">{trackable?.name || activity.description}</h3>
          <p className="text-xs text-gray-400 mt-1">{account?.cardName || 'Unknown Account'}</p>
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
            >
              <Edit2 size={16} className="text-gray-400" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 hover:bg-red-900/50 rounded transition-colors"
            >
              <Trash2 size={16} className="text-red-400" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className={`${textColor} text-lg font-semibold`}>
          {amountPrefix}
          {formatAmount(activity.amount)}
        </span>
        <span className="text-xs text-gray-500">{formatDate(activity.date, 'HH:mm')}</span>
      </div>
    </div>
  );
};
