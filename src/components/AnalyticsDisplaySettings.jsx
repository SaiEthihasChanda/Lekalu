import React, { useState, useEffect } from 'react';
import { GripVertical, Eye, EyeOff } from 'lucide-react';

/**
 * Analytics Display Settings Component
 * Allows users to toggle visibility and reorder visualizations
 * @param {Object} config - Current configuration
 * @param {Function} onConfigChange - Callback when configuration changes
 * @param {boolean} isLoading - Loading state
 */
export const AnalyticsDisplaySettings = ({ config, onConfigChange, isLoading = false }) => {
  const [items, setItems] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);

  // Initialize items from config
  useEffect(() => {
    const initialItems = [
      { id: 'categoryPie', label: 'Income vs Expense Chart', visible: config?.categoryPie?.visible ?? true, position: config?.categoryPie?.position ?? 0 },
      { id: 'trackablePie', label: 'By Trackable Chart', visible: config?.trackablePie?.visible ?? true, position: config?.trackablePie?.position ?? 1 },
      { id: 'accountBalanceOverTime', label: 'Account Balances Over Time', visible: config?.accountBalanceOverTime?.visible ?? true, position: config?.accountBalanceOverTime?.position ?? 2 },
      { id: 'trendsOverTime', label: 'Trends Over Time', visible: config?.trendsOverTime?.visible ?? true, position: config?.trendsOverTime?.position ?? 3 },
      { id: 'currentBalances', label: 'Current Bank Balances', visible: config?.currentBalances?.visible ?? true, position: config?.currentBalances?.position ?? 4 },
    ].sort((a, b) => a.position - b.position);
    
    setItems(initialItems);
  }, [config]);

  // Toggle visibility of a visualization
  const toggleVisibility = (id) => {
    const updated = items.map(item =>
      item.id === id ? { ...item, visible: !item.visible } : item
    );
    setItems(updated);
    notifyChange(updated);
  };

  // Handle drag start
  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over
  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedItem === null || draggedItem === index) return;

    const newItems = [...items];
    const draggedItemContent = newItems[draggedItem];
    
    // Remove dragged item
    newItems.splice(draggedItem, 1);
    // Insert at new position
    newItems.splice(index, 0, draggedItemContent);
    
    // Update positions
    const updatedItems = newItems.map((item, idx) => ({
      ...item,
      position: idx,
    }));

    setDraggedItem(index);
    setItems(updatedItems);
  };

  // Handle drop
  const handleDrop = (e) => {
    e.preventDefault();
    setDraggedItem(null);
    notifyChange(items);
  };

  // Send configuration changes to parent
  const notifyChange = (updatedItems) => {
    const newConfig = {};
    updatedItems.forEach(item => {
      newConfig[item.id] = {
        visible: item.visible,
        position: item.position,
      };
    });
    onConfigChange(newConfig);
  };

  // Reset to default configuration
  const handleReset = () => {
    const defaultItems = [
      { id: 'categoryPie', label: 'Income vs Expense Chart', visible: true, position: 0 },
      { id: 'trackablePie', label: 'By Trackable Chart', visible: true, position: 1 },
      { id: 'accountBalanceOverTime', label: 'Account Balances Over Time', visible: true, position: 2 },
      { id: 'trendsOverTime', label: 'Trends Over Time', visible: true, position: 3 },
      { id: 'currentBalances', label: 'Current Bank Balances', visible: true, position: 4 },
    ];
    setItems(defaultItems);
    
    const defaultConfig = {};
    defaultItems.forEach(item => {
      defaultConfig[item.id] = {
        visible: item.visible,
        position: item.position,
      };
    });
    onConfigChange(defaultConfig);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">Analytics Visualizations</h3>
        <button
          onClick={handleReset}
          disabled={isLoading}
          className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors disabled:opacity-50"
        >
          Reset to Default
        </button>
      </div>

      <p className="text-xs text-gray-400">
        Toggle visibility and drag to reorder visualizations. Filters remain fixed at the top.
      </p>

      {/* Visualization Items */}
      <div className="space-y-2 bg-primary rounded-lg p-3 border border-gray-700">
        {items.map((item, index) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={handleDrop}
            onDragEnd={() => setDraggedItem(null)}
            className={`flex items-center gap-3 p-2 bg-secondary rounded border border-gray-700 cursor-move transition-all ${
              draggedItem === index ? 'opacity-50 scale-95' : 'hover:border-accent'
            }`}
          >
            {/* Drag Handle */}
            <GripVertical size={16} className="text-gray-500 flex-shrink-0" />

            {/* Label */}
            <span className="text-sm text-gray-300 flex-1 truncate">{item.label}</span>

            {/* Toggle Button */}
            <button
              onClick={() => toggleVisibility(item.id)}
              disabled={isLoading}
              className={`p-1.5 rounded transition-colors flex-shrink-0 ${
                item.visible
                  ? 'bg-accent/20 text-accent hover:bg-accent/30'
                  : 'bg-gray-700/30 text-gray-500 hover:bg-gray-700/50'
              } disabled:opacity-50`}
              title={item.visible ? 'Hide visualization' : 'Show visualization'}
            >
              {item.visible ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 text-center">
        {items.filter(i => i.visible).length} of {items.length} visualizations visible
      </p>
    </div>
  );
};
