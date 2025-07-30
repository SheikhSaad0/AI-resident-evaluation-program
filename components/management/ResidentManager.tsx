import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Resident } from '@prisma/client';
import { useApi } from '../../lib/useApi'; // ✅ Import the new hook
import { GlassInput, GlassButton, ImageUpload, GlassCard } from '../ui';

// ... (interface and initialFormData remain the same)
interface ResidentFormData {
    name: string;
    email?: string;
    photoUrl?: string | null;
    company?: string;
    year?: string;
    medicalSchool?: string;
}
const initialFormData: ResidentFormData = { name: '', email: '', photoUrl: null, company: '', year: '', medicalSchool: '' };

const ResidentManager = () => {
    const [residents, setResidents] = useState<Resident[]>([]);
    const [formData, setFormData] = useState<ResidentFormData>(initialFormData);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { apiFetch } = useApi(); // ✅ Use the new hook

    useEffect(() => {
        const fetchResidents = async () => {
            setLoading(true);
            try {
                // ✅ FIX: Use apiFetch, which handles the db context automatically
                const data = await apiFetch<Resident[]>('/api/residents');
                setResidents(data);
            } catch (error) {
                console.error('Failed to fetch residents:', error);
            }
            setLoading(false);
        };
        fetchResidents();
    }, [apiFetch]); // Dependency array includes apiFetch

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = (url: string) => {
        setFormData(prev => ({ ...prev, photoUrl: url }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // ✅ FIX: Use apiFetch for POST requests too
            await apiFetch('/api/residents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            // Refetch after successful creation
            const updatedResidents = await apiFetch<Resident[]>('/api/residents');
            setResidents(updatedResidents);
            setFormData(initialFormData);
        } catch (error) {
            console.error('Failed to submit form:', error);
        }
        setLoading(false);
    };
    
    // ✅ FIX: Ensure the db query param is passed on navigation
    const handleCardClick = (residentId: string) => {
        const db = new URLSearchParams(window.location.search).get('db') || 'testing';
        router.push(`/residents/${residentId}?db=${db}`);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                {/* Add New Resident Form - no changes here */}
                <h3 className="heading-lg mb-4">Add New Resident</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <ImageUpload value={formData.photoUrl || undefined} onChange={handleImageUpload} placeholder="Click to upload profile picture" />
                    <GlassInput name="name" placeholder="Name" value={formData.name} onChange={handleChange} required />
                    <GlassInput name="email" placeholder="Email (Optional)" value={formData.email || ''} onChange={handleChange} />
                    <GlassInput name="year" placeholder="Year (e.g., PGY-1)" value={formData.year || ''} onChange={handleChange} />
                    <GlassInput name="company" placeholder="Institution" value={formData.company || ''} onChange={handleChange} />
                    <GlassInput name="medicalSchool" placeholder="Medical School" value={formData.medicalSchool || ''} onChange={handleChange} />
                    <GlassButton type="submit" variant="primary" loading={loading} className="w-full">
                        {loading ? 'Saving...' : 'Save Resident'}
                    </GlassButton>
                </form>
            </div>
            <div>
                <h3 className="heading-lg mb-4">Current Residents</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-glass pr-2">
                    {loading ? (
                         <p className="text-text-secondary">Loading...</p>
                    ) : residents.length > 0 ? (
                        residents.map(resident => (
                           <GlassCard 
                                key={resident.id} 
                                variant="subtle" 
                                className="p-3 cursor-pointer"
                                hover
                                onClick={() => handleCardClick(resident.id)} // Use the new handler
                            >
                                <div className="flex items-center space-x-4">
                                    <img src={resident.photoUrl || '/images/default-avatar.svg'} alt={resident.name} className="w-10 h-10 rounded-full object-cover" />
                                    <div>
                                        <p className="font-semibold text-text-primary">{resident.name}</p>
                                        <p className="text-sm text-text-tertiary">{resident.year} - {resident.company}</p>
                                    </div>
                                </div>
                            </GlassCard>
                        ))
                    ) : (
                        <p className="text-text-secondary">No residents found in this database.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResidentManager;