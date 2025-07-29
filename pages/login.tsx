import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { GlassCard, GlassButton, PillToggle } from '../components/ui';
import { AuthContext } from '../lib/auth';
import { Resident, Attending, ProgramDirector } from '@prisma/client';

interface UserProfile {
  id: string;
  name: string;
  photoUrl?: string | null;
  type: 'resident' | 'attending' | 'programDirector';
}

const LoginPage = () => {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [attendings, setAttendings] = useState<Attending[]>([]);
  const [programDirectors, setProgramDirectors] = useState<ProgramDirector[]>([]);
  
  const [database, setDatabase] = useState<'testing' | 'production'>('testing');
  const auth = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    const fetchProfiles = async (db: 'testing' | 'production') => {
      try {
        const [resResidents, resAttendings, resProgramDirectors] = await Promise.all([
          fetch(`/api/residents?db=${db}`),
          fetch(`/api/attendings?db=${db}`),
          fetch(`/api/program-directors?db=${db}`)
        ]);

        if (resResidents.ok) setResidents(await resResidents.json());
        if (resAttendings.ok) setAttendings(await resAttendings.json());
        if (resProgramDirectors.ok) setProgramDirectors(await resProgramDirectors.json());

      } catch (error) {
        console.error("Failed to fetch profiles:", error);
      }
    };

    fetchProfiles(database);
  }, [database]);

  const handleLogin = (profile: UserProfile) => {
    if (auth) {
      auth.login(profile, database);
      router.push('/');
    }
  };

  const ProfileList = ({ title, profiles, type }: { title: string, profiles: any[], type: UserProfile['type'] }) => (
    <>
      {profiles.length > 0 && (
        <div className="space-y-3">
          <h2 className="heading-md text-text-secondary">{title}</h2>
          {profiles.map((profile) => (
            <GlassCard
              key={profile.id}
              variant="subtle"
              hover
              onClick={() => handleLogin({ ...profile, type })}
              className="p-4 cursor-pointer"
            >
              <div className="flex items-center space-x-4">
                <img
                  src={profile.photoUrl || '/images/default-avatar.svg'}
                  alt={profile.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold text-text-primary">{profile.name}</p>
                  <p className="text-sm text-text-tertiary">{profile.title || profile.year}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-gradient">
      <GlassCard variant="strong" className="p-8 space-y-6 max-w-xl w-full">
        <h1 className="heading-xl text-gradient text-center">Select Profile</h1>
        <PillToggle
          options={[{ id: 'testing', label: 'Testing DB' }, { id: 'production', label: 'Production DB' }]}
          value={database}
          onChange={(id) => setDatabase(id as 'testing' | 'production')}
        />
        <div className="space-y-6 max-h-[60vh] overflow-y-auto scrollbar-glass pr-2">
          <ProfileList title="Residents" profiles={residents} type="resident" />
          <ProfileList title="Attendings" profiles={attendings} type="attending" />
          <ProfileList title="Program Directors" profiles={programDirectors} type="programDirector" />
        </div>
        <GlassButton variant="secondary" onClick={() => router.push('/manage-profiles')} className="w-full">
          Manage Profiles
        </GlassButton>
      </GlassCard>
    </div>
  );
};

export default LoginPage;