import { useState, useEffect } from 'react';
import { formatAmount, formatDate } from '../utils/analytics.js';
import { Trash2, Edit2, ChevronDown } from 'lucide-react';
import { getUserEmail } from '../fb/index.js';

export const ActivityCard = ({ activity, trackable, account, onEdit, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [creatorEmail, setCreatorEmail] = useState(null);
  
  // Validate activity data - if critical fields are missing/null, don't render
  console.log('ActivityCard validation:', {
    hasActivity: !!activity,
    type: activity?.type,
    typeIsNull: activity?.type === null,
    typeIsUndefined: activity?.type === undefined,
    amount: activity?.amount,
    amountIsNull: activity?.amount === null,
    allKeys: Object.keys(activity || {})
  });
  
  if (!activity || !activity.type || activity.amount == null) {
    console.log('ActivityCard REJECTED - validation failed');
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
      className={`${bgColor} border border-gray-700 rounded-lg p-2 md:p-4 hover:border-accent transition-all cursor-pointer`}
      onClick={() => hasDescription && setIsExpanded(!isExpanded)}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1.5 md:gap-0 mb-2 md:mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-xs md:text-base text-white font-medium truncate">{trackable?.name || 'Transaction'}</h3>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{account?.cardName || 'Unknown Account'}</p>
          {creatorEmail && (
            <p className="text-xs text-gray-500 mt-0.5">Created by: {creatorEmail}</p>
          )}
        </div>
        <div className="flex items-center gap-0.5 md:gap-2 self-end md:self-auto">
          {hasDescription && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1 md:p-2 hover:bg-gray-700 rounded transition-colors"
              title={isExpanded ? 'Hide details' : 'Show details'}
            >
              <ChevronDown size={14} className={`text-gray-400 transition-transform md:w-4 md:h-4 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1 md:p-2 hover:bg-gray-700 rounded transition-colors"
              title="Edit"
            >
              <Edit2 size={14} className="text-gray-400 md:w-4 md:h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 md:p-2 hover:bg-red-900/50 rounded transition-colors"
              title="Delete"
            >
              <Trash2 size={14} className="text-red-400 md:w-4 md:h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
        <span className={`${textColor} text-sm md:text-lg font-semibold`}>
          {amountPrefix}
          {formatAmount(activity.amount)}
        </span>
        <span className="text-xs text-gray-500">{formatDate(activity.date, 'HH:mm')}</span>
      </div>

      {isExpanded && hasDescription && (
        <div className="mt-2 pt-2 md:mt-3 md:pt-3 border-t border-gray-600">
          <p className="text-xs md:text-sm text-gray-300">{activity.description}</p>
        </div>
      )}
    </div>
  );
};
