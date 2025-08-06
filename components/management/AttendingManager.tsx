// components/management/AttendingManager.tsx
import React, { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '../../lib/auth';
import { Attending } from '@prisma/client';
import ProfileForm, { ProfileFormData } from './ProfileForm';
import { GlassCard } from '../ui';

const initialFormData: ProfileFormData = {
    name: '',
    title: '',
    primaryInstitution: '',
    specialty: '',
    residency: '',
    medicalSchool: '',
    fellowship: '',
    photoUrl: null,
};

const AttendingManager = () => {
    const [attendings, setAttendings] = useState<Attending[]>([]);
    const [formData, setFormData] = useState<ProfileFormData>(initialFormData);
    const [loading, setLoading] = useState(false);
    const auth = useContext(AuthContext);
    const router = useRouter();

    const fetchAttendings = async () => {
        if (!auth?.database) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/attendings?db=${auth.database}`);
            if (res.ok) {
                const data = await res.json();
                setAttendings(data);
            }
        } catch (error) {
            console.error('Failed to fetch attendings:', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAttendings();
    }, [auth?.database]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`/api/attendings?db=${auth?.database}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                fetchAttendings(); // Refresh the list
                setFormData(initialFormData); // Reset form
            } else {
                 console.error('Failed to create attending');
            }
        } catch (error) {
            console.error('Failed to submit form:', error);
        }
        setLoading(false);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <h3 className="heading-lg mb-4">Add New Attending</h3>
                <ProfileForm
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleSubmit}
                    loading={loading}
                    profileType="Attending"
                />
            </div>
            <div>
                <h3 className="heading-lg mb-4">Current Attendings</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-glass pr-2">
                    {attendings.length > 0 ? (
                        attendings.map(attending => (
                            <GlassCard 
                                key={attending.id} 
                                variant="subtle" 
                                className="p-3 cursor-pointer"
                                hover
                                onClick={() => router.push(`/attendings/${attending.id}`)}
                            >
                                <div className="flex items-center space-x-4">
                                    <img src={attending.photoUrl || '/images/default-avatar.svg'} alt={attending.name} className="w-10 h-10 rounded-full object-cover" />
                                    <div>
                                        <p className="font-semibold text-text-primary">{attending.name}</p>
                                        <p className="text-sm text-text-tertiary">{attending.title}</p>
                                    </div>
                                </div>
                            </GlassCard>
                        ))
                    ) : (
                        <p className="text-text-secondary">No attendings found in this database.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AttendingManager;