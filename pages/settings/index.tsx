// pages/settings/index.tsx

import { useState, useEffect } from 'react';
import { GlassCard, GlassButton, GlassInput, GlassTabs, PillToggle } from '../../components/ui';
import { useApi } from '../../lib/useApi';

interface DatabaseSettings {
  name: string;
}

interface Settings {
  activeDatabase: 'testing' | 'production';
  defaultDatabase: 'testing' | 'production';
  databases: {
    testing: DatabaseSettings;
    production: DatabaseSettings;
  };
}

const SettingsPage = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { apiFetch } = useApi();

  useEffect(() => {
    apiFetch('/api/settings')
      .then(data => setSettings(data))
      .catch(err => setError(err.message));
  }, [apiFetch]);

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    setMessage('');
    setError('');
    try {
      await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      // Success! The change is now instant.
      setMessage('Settings saved successfully! The active database has been switched.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Error saving settings: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDatabaseNameChange = (db: 'testing' | 'production', name: string) => {
    setSettings(prev => prev && { ...prev, databases: { ...prev.databases, [db]: { ...prev.databases[db], name } } });
  };

  if (error) {
     return <div className="text-center text-red-500">Error: {error}</div>;
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-tertiary">Loading Settings...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'database',
      label: 'Database',
      content: (
        <div className="space-y-6">
          <GlassCard variant="strong" className="p-6">
            <h3 className="heading-md mb-6">Active Database</h3>
            <PillToggle
              options={[
                { id: 'testing', label: settings.databases.testing.name },
                { id: 'production', label: settings.databases.production.name },
              ]}
              defaultSelected={settings.activeDatabase}
              onChange={(id) => setSettings(s => s && { ...s, activeDatabase: id as 'testing' | 'production' })}
            />
            {/* The note about restarting is no longer needed. */}
          </GlassCard>

          <GlassCard variant="strong" className="p-6">
            <h3 className="heading-md mb-6">Database Names</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Testing Database Name</label>
                <GlassInput
                  value={settings.databases.testing.name}
                  onChange={(e) => handleDatabaseNameChange('testing', e.target.value)}
                  placeholder="Testing DB"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Production Database Name</label>
                <GlassInput
                  value={settings.databases.production.name}
                  onChange={(e) => handleDatabaseNameChange('production', e.target.value)}
                  placeholder="Production DB"
                />
              </div>
            </div>
          </GlassCard>

          <GlassCard variant="strong" className="p-6">
            <h3 className="heading-md mb-6">Default Database on Load</h3>
            <PillToggle
              options={[
                { id: 'testing', label: settings.databases.testing.name },
                { id: 'production', label: settings.databases.production.name },
              ]}
              defaultSelected={settings.defaultDatabase}
              onChange={(id) => setSettings(s => s && { ...s, defaultDatabase: id as 'testing' | 'production' })}
            />
          </GlassCard>

          <div className="pt-4">
            <GlassButton variant="primary" size="lg" onClick={handleSave} loading={isSaving} className="w-full">
              Save Settings
            </GlassButton>
            {message && <p className="text-center mt-4 text-sm text-green-400">{message}</p>}
            {error && <p className="text-center mt-4 text-sm text-red-500">{error}</p>}
          </div>
        </div>
      )
    },
     {
      id: 'general',
      label: 'General',
      content: (
        <GlassCard variant="strong" className="p-8 text-center">
          <p className="text-text-tertiary">General settings will be available here in the future.</p>
        </GlassCard>
      )
    }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center lg:text-left">
        <h1 className="heading-xl text-gradient mb-2">Settings</h1>
        <p className="text-text-tertiary text-lg">Manage application settings and preferences.</p>
      </div>
      <GlassTabs tabs={tabs} defaultTab="database" />
    </div>
  );
};

export default SettingsPage;