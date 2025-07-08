import React, { useState } from 'react';

interface TabsProps {
  tabs: { id: string; label: string; content: React.ReactNode }[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
}

export default function GlassTabs({ 
  tabs, 
  defaultTab, 
  onChange,
  className = '' 
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div className={className}>
      {/* Tab Navigation */}
      <div className="tab-container mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={activeTab === tab.id ? 'tab-active' : 'tab'}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTabContent}
      </div>
    </div>
  );
}