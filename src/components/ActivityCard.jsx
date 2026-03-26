import { useState, useEffect } from 'react';
import { formatAmount, formatDate } from '../utils/analytics.js';
import { Trash2, Edit2, ChevronDown } from 'lucide-react';
import { getUserEmail } from '../fb/index.js';

export const ActivityCard = ({ activity, trackable, account, onEdit, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [creatorEmail, setCreatorEmail] = useState(null);
  
  // Validate activity data - if critical fields are missing/null, don't render
  if (!activity || !activity.type || activity.amount == null) {
    return null;
  }
  
  const isIncome = activity.type === 'income';
  const isTransfer = activity.type === 'transfer';

  useEffect(() => {
    // Fetch creator email if activity is from a group (has groupId)
    if (activity.groupId && activity.userId) {
      getUserEmail(activity.userId)
        .then(email => setCreatorEmail(email))
        .catch(err => console.error('Error fetching creator email:', err));
    }
  }, [activity.groupId, activity.userId]);

  const bgColor = isTransfer ? 'bg-gray-700/50' : isIncome ? 'bg-green-900/20' : 'bg-red-900/20';
  const textColor = isTransfer ? 'text-gray-300' : isIncome ? 'text-green-400' : 'text-red-400';
  const amountPrefix = isIncome ? '+' : '-';
  const hasDescription = activity.description && activity.description.trim();

  return (
    <div
      className={`${bgColor} border border-gray-700 rounded-lg p-2 hover:border-accent transition-all cursor-pointer`}
      onClick={() => hasDescription && setIsExpanded(!isExpanded)}
    >
      {/* Single line: trackable name, amount, time, and action buttons */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="min-w-0 flex-1">
          <h3 className="text-xs text-white font-medium truncate">{trackable?.name || 'Transaction'}</h3>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className={`${textColor} text-xs font-semibold whitespace-nowrap`}>
            {amountPrefix}
            {formatAmount(activity.amount)}
          </span>
          <span className="text-xs text-gray-500">{formatDate(activity.date, 'HH:mm')}</span>
        </div>
      </div>

      {/* Second line: account name and action buttons */}
      <div className="flex items-center justify-between gap-1">
        <p className="text-xs text-gray-400 truncate flex-1">{account?.cardName || 'Unknown Account'}</p>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {hasDescription && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-0.5 hover:bg-gray-700 rounded transition-colors"
              title={isExpanded ? 'Hide details' : 'Show details'}
            >
              <ChevronDown size={12} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-0.5 hover:bg-gray-700 rounded transition-colors"
              title="Edit"
            >
              <Edit2 size={12} className="text-gray-400" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-0.5 hover:bg-red-900/50 rounded transition-colors"
              title="Delete"
            >
              <Trash2 size={12} className="text-red-400" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && hasDescription && (
        <div className="mt-1 pt-1 border-t border-gray-600">
          <p className="text-xs text-gray-300">{activity.description}</p>
          {creatorEmail && (
            <p className="text-xs text-gray-500 mt-1">By: {creatorEmail}</p>
          )}
        </div>
      )}
    </div>
  );
};
