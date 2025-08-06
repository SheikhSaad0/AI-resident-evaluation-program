// components/management/ProgramDirectorManager.tsx
import React, { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '../../lib/auth';
import { ProgramDirector } from '@prisma/client';
import ProfileForm, { ProfileFormData } from './ProfileForm';
import { GlassCard } from '../ui';

const initialFormData: ProfileFormData = {
    name: '',
    title: '',
    primaryInstitution: '',
    specialty: '',
    photoUrl: null,
};

const ProgramDirectorManager = () => {
    const [directors, setDirectors] = useState<ProgramDirector[]>([]);
    const [formData, setFormData] = useState<ProfileFormData>(initialFormData);
    const [loading, setLoading] = useState(false);
    const auth = useContext(AuthContext);
    const router = useRouter();

    const fetchDirectors = async () => {
        if (!auth?.database) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/program-directors?db=${auth.database}`);
            if (res.ok) {
                const data = await res.json();
                setDirectors(data);
            }
        } catch (error) {
            console.error('Failed to fetch program directors:', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchDirectors();
    }, [auth?.database]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Remove keys that are not on the ProgramDirector model
        const { residency, medicalSchool, fellowship, ...directorData } = formData;

        try {
            const res = await fetch(`/api/program-directors?db=${auth?.database}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(directorData),
            });
            if (res.ok) {
                fetchDirectors(); // Refresh the list
                setFormData(initialFormData); // Reset form
            } else {
                 console.error('Failed to create program director');
            }
        } catch (error) {
            console.error('Failed to submit form:', error);
        }
        setLoading(false);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <h3 className="heading-lg mb-4">Add New Program Director</h3>
                <ProfileForm
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleSubmit}
                    loading={loading}
                    profileType="ProgramDirector"
                />
            </div>
            <div>
                <h3 className="heading-lg mb-4">Current Program Directors</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-glass pr-2">
                    {directors.length > 0 ? (
                        directors.map(director => (
                            <GlassCard 
                                key={director.id} 
                                variant="subtle" 
                                className="p-3 cursor-pointer"
                                hover
                                onClick={() => router.push(`/program-directors/${director.id}`)}
                            >
                               <div className="flex items-center space-x-4">
                                    <img src={director.photoUrl || '/images/default-avatar.svg'} alt={director.name} className="w-10 h-10 rounded-full object-cover" />
                                    <div>
                                        <p className="font-semibold text-text-primary">{director.name}</p>
                                        <p className="text-sm text-text-tertiary">{director.title}</p>
                                    </div>
                                </div>
                            </GlassCard>
                        ))
                    ) : (
                        <p className="text-text-secondary">No program directors found in this database.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProgramDirectorManager;