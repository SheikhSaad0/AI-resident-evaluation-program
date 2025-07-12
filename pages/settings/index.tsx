import { useState, useEffect } from 'react';
import { GlassCard, GlassButton, GlassInput, GlassTabs, PillToggle } from '../../components/ui';

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

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings(data));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error('Failed to save settings');
      setMessage('Settings saved successfully! A server restart is required for the active database change to take effect.');
    } catch (error) {
      setMessage(`Error saving settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDatabaseNameChange = (db: 'testing' | 'production', name: string) => {
    setSettings(prev => prev && { ...prev, databases: { ...prev.databases, [db]: { ...prev.databases[db], name } } });
  };

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
            <p className="text-xs text-text-quaternary mt-4">
              Note: Changing the active database requires a server restart to take effect.
            </p>
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
            <h3 className="heading-md mb-6">Default Database</h3>
            <PillToggle
              options={[
                { id: 'testing', label: settings.databases.testing.name },
                { id: 'production', label: settings.databases.production.name },
              ]}
              defaultSelected={settings.defaultDatabase}
              onChange={(id) => setSettings(s => s && { ...s, defaultDatabase: id as 'testing' | 'production' })}
            />
            <p className="text-xs text-text-quaternary mt-4">
              The default database to load when the application starts.
            </p>
          </GlassCard>

          <div className="pt-4">
            <GlassButton variant="primary" size="lg" onClick={handleSave} loading={isSaving} className="w-full">
              Save Settings
            </GlassButton>
            {message && <p className="text-center mt-4 text-sm text-text-tertiary">{message}</p>}
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