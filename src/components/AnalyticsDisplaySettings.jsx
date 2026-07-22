import React, { useState, useEffect } from 'react';
import { GripVertical, Eye, EyeOff } from 'lucide-react';

const getDefaults = () => ({
  masterTotal: { visible: true },
  masterBalances: { visible: true },
  masterTrackables: { visible: true },
  masterPivot: { visible: true },
  filteredSummary: { visible: true },
  filteredTransactions: { visible: true },
  filteredCharts: { visible: true },
  stickyMobileTabs: { enabled: true },
  transactionScrollThreshold: { value: 10 },
  trendsOverTime: { visible: true, position: 0 },
  currentBalances: { visible: true, position: 1 },
});

const normalizeThresholdConfig = (rawThreshold, fallback = 10) => {
  if (typeof rawThreshold === 'number' && Number.isFinite(rawThreshold)) {
    return { value: Math.max(1, Math.min(50, Math.trunc(rawThreshold))) };
  }

  if (typeof rawThreshold === 'string') {
    const parsed = Number.parseInt(rawThreshold, 10);
    if (Number.isFinite(parsed)) {
      return { value: Math.max(1, Math.min(50, parsed)) };
    }
  }

  if (rawThreshold && typeof rawThreshold === 'object') {
    const parsed = Number.parseInt(rawThreshold.value, 10);
    if (Number.isFinite(parsed)) {
      return {
        ...rawThreshold,
        value: Math.max(1, Math.min(50, parsed)),
      };
    }

    return {
      ...rawThreshold,
      value: fallback,
    };
  }

  return { value: fallback };
};

const mergeWithDefaults = (config) => {
  const defaults = getDefaults();

  // Backward compatibility: old configs may store this as a scalar.
  const thresholdConfig = normalizeThresholdConfig(
    config?.transactionScrollThreshold,
    defaults.transactionScrollThreshold.value
  );

  return {
    ...defaults,
    ...(config || {}),
    masterTotal: { ...defaults.masterTotal, ...(config?.masterTotal || {}) },
    masterBalances: { ...defaults.masterBalances, ...(config?.masterBalances || {}) },
    masterTrackables: { ...defaults.masterTrackables, ...(config?.masterTrackables || {}) },
    masterPivot: { ...defaults.masterPivot, ...(config?.masterPivot || {}) },
    filteredSummary: { ...defaults.filteredSummary, ...(config?.filteredSummary || {}) },
    filteredTransactions: { ...defaults.filteredTransactions, ...(config?.filteredTransactions || {}) },
    filteredCharts: { ...defaults.filteredCharts, ...(config?.filteredCharts || {}) },
    stickyMobileTabs: { ...defaults.stickyMobileTabs, ...(config?.stickyMobileTabs || {}) },
    transactionScrollThreshold: { ...defaults.transactionScrollThreshold, ...thresholdConfig },
    trendsOverTime: { ...defaults.trendsOverTime, ...(config?.trendsOverTime || {}) },
    currentBalances: { ...defaults.currentBalances, ...(config?.currentBalances || {}) },
  };
};

/**
 * Analytics Display Settings Component
 * Allows users to toggle visibility and reorder visualizations
 * @param {Object} config - Current configuration
 * @param {Function} onConfigChange - Callback when configuration changes
 * @param {boolean} isLoading - Loading state
 */
export const AnalyticsDisplaySettings = ({ config, onConfigChange, isLoading = false }) => {
  const [items, setItems] = useState([]);
  const [layoutConfig, setLayoutConfig] = useState(getDefaults());
  const [draggedItem, setDraggedItem] = useState(null);

  // Initialize items from config
  useEffect(() => {
    const merged = mergeWithDefaults(config);
    setLayoutConfig(merged);

    const initialItems = [
      { id: 'trendsOverTime', label: 'Daily Income vs Expense Chart', visible: merged?.trendsOverTime?.visible ?? true, position: merged?.trendsOverTime?.position ?? 0 },
      { id: 'currentBalances', label: 'Current Bank Balances Chart', visible: merged?.currentBalances?.visible ?? true, position: merged?.currentBalances?.position ?? 1 },
    ].sort((a, b) => a.position - b.position);
    
    setItems(initialItems);
  }, [config]);

  const emitConfig = (partial = {}) => {
    const merged = mergeWithDefaults({ ...layoutConfig, ...partial });

    // Keep chart visibility/positions from current drag list unless explicitly overridden.
    const chartConfig = {};
    items.forEach((item) => {
      chartConfig[item.id] = {
        visible: item.visible,
        position: item.position,
      };
    });

    const finalConfig = {
      ...merged,
      ...chartConfig,
    };

    setLayoutConfig(finalConfig);
    onConfigChange(finalConfig);
  };

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
    const chartConfig = {};
    updatedItems.forEach(item => {
      chartConfig[item.id] = {
        visible: item.visible,
        position: item.position,
      };
    });

    emitConfig(chartConfig);
  };

  const toggleLayoutSection = (key) => {
    const current = !!layoutConfig?.[key]?.visible;
    emitConfig({
      [key]: {
        ...(layoutConfig?.[key] || {}),
        visible: !current,
      },
    });
  };

  const toggleStickyMobileTabs = () => {
    const current = !!layoutConfig?.stickyMobileTabs?.enabled;
    emitConfig({
      stickyMobileTabs: {
        ...(layoutConfig?.stickyMobileTabs || {}),
        enabled: !current,
      },
    });
  };

  const handleThresholdChange = (e) => {
    const parsed = Number.parseInt(e.target.value, 10);
    const safeValue = Number.isNaN(parsed) ? 10 : Math.max(1, Math.min(50, parsed));
    emitConfig({
      transactionScrollThreshold: {
        ...(layoutConfig?.transactionScrollThreshold || {}),
        value: safeValue,
      },
    });
  };

  // Reset to default configuration
  const handleReset = () => {
    const defaultItems = [
      { id: 'trendsOverTime', label: 'Daily Income vs Expense Chart', visible: true, position: 0 },
      { id: 'currentBalances', label: 'Current Bank Balances Chart', visible: true, position: 1 },
    ];
    setItems(defaultItems);

    const resetBase = getDefaults();
    setLayoutConfig(resetBase);
    onConfigChange(resetBase);
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
        Customize the Analytics page sections, sticky behavior, transaction list behavior, and chart order.
      </p>

      {/* Layout Sections */}
      <div className="space-y-2 bg-primary rounded-lg p-3 border border-gray-700">
        <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Layout Sections</p>
        {[
          { id: 'masterTotal', label: 'Master: Total' },
          { id: 'masterBalances', label: 'Master: Current Bank Balances' },
          { id: 'masterTrackables', label: 'Master: Per Trackable Totals' },
          { id: 'masterPivot', label: 'Master: Trackables by Month' },
          { id: 'filteredSummary', label: 'Filtered: Summary Cards' },
          { id: 'filteredTransactions', label: 'Filtered: Related Transactions' },
          { id: 'filteredCharts', label: 'Filtered: Charts Section' },
        ].map((item) => {
          const visible = layoutConfig?.[item.id]?.visible !== false;

          return (
            <div key={item.id} className="flex items-center gap-3 p-2 bg-secondary rounded border border-gray-700">
              <span className="text-sm text-gray-300 flex-1 truncate">{item.label}</span>
              <button
                onClick={() => toggleLayoutSection(item.id)}
                disabled={isLoading}
                className={`p-1.5 rounded transition-colors flex-shrink-0 ${
                  visible
                    ? 'bg-accent/20 text-accent hover:bg-accent/30'
                    : 'bg-gray-700/30 text-gray-500 hover:bg-gray-700/50'
                } disabled:opacity-50`}
                title={visible ? 'Hide section' : 'Show section'}
              >
                {visible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
          );
        })}
      </div>

      {/* Behavior Controls */}
      <div className="space-y-3 bg-primary rounded-lg p-3 border border-gray-700">
        <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Behavior</p>
        <div className="flex items-center justify-between gap-3 p-2 bg-secondary rounded border border-gray-700">
          <div>
            <p className="text-sm text-gray-300">Sticky Mobile Tabs</p>
            <p className="text-xs text-gray-500">Keep Analytics tabs visible while scrolling on mobile</p>
          </div>
          <button
            onClick={toggleStickyMobileTabs}
            disabled={isLoading}
            className={`p-1.5 rounded transition-colors flex-shrink-0 ${
              layoutConfig?.stickyMobileTabs?.enabled !== false
                ? 'bg-accent/20 text-accent hover:bg-accent/30'
                : 'bg-gray-700/30 text-gray-500 hover:bg-gray-700/50'
            } disabled:opacity-50`}
            title={layoutConfig?.stickyMobileTabs?.enabled !== false ? 'Disable sticky mobile tabs' : 'Enable sticky mobile tabs'}
          >
            {layoutConfig?.stickyMobileTabs?.enabled !== false ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>

        <div className="p-2 bg-secondary rounded border border-gray-700">
          <label className="block text-sm text-gray-300 mb-2">Transaction List Scroll Threshold</label>
          <input
            type="number"
            min={1}
            max={50}
            value={layoutConfig?.transactionScrollThreshold?.value ?? 10}
            onChange={handleThresholdChange}
            disabled={isLoading}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent disabled:opacity-50"
          />
          <p className="text-xs text-gray-500 mt-1">Enable scrolling when transactions exceed this number.</p>
        </div>
      </div>

      {/* Visualization Items */}
      <div className="space-y-2 bg-primary rounded-lg p-3 border border-gray-700">
        <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Filtered Charts Order</p>
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
        {items.filter(i => i.visible).length} of {items.length} filtered charts visible
      </p>
    </div>
  );
};
