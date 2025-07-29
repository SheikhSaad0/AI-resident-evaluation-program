import React from 'react';
import { GlassCard, GlassTabs } from '../components/ui';
import ResidentManager from '../components/management/ResidentManager';
import AttendingManager from '../components/management/AttendingManager';
import ProgramDirectorManager from '../components/management/ProgramDirectorManager';

const ManageProfilesPage = () => {
  const tabs = [
    { id: 'residents', label: 'Residents', content: <ResidentManager /> },
    { id: 'attendings', label: 'Attendings', content: <AttendingManager /> },
    { id: 'programDirectors', label: 'Program Directors', content: <ProgramDirectorManager /> },
  ];

  return (
    // This wrapper will center the content on the page
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-7xl space-y-8">
        <div className="text-center lg:text-left">
          <h1 className="heading-xl text-gradient mb-2">Manage Profiles</h1>
          <p className="text-text-tertiary text-lg">Add, edit, or remove profiles from the databases.</p>
        </div>
        <GlassCard variant="strong" className="p-6">
          <GlassTabs tabs={tabs} defaultTab="residents" />
        </GlassCard>
      </div>
    </div>
  );
};

export default ManageProfilesPage;