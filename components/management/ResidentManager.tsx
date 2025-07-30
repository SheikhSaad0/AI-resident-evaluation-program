import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useApi } from '../../lib/useApi'; // Import the new useApi hook
import { Resident } from '@prisma/client';
import { GlassInput, GlassButton, ImageUpload, GlassCard } from '../ui';

// Interface for the resident form data
interface ResidentFormData {
    name: string;
    email?: string;
    photoUrl?: string | null;
    company?: string;
    year?: string;
    medicalSchool?: string;
}

// Initial state for the form
const initialFormData: ResidentFormData = { name: '', email: '', photoUrl: null, company: '', year: '', medicalSchool: '' };

const ResidentManager = () => {
    const [residents, setResidents] = useState<Resident[]>([]);
    const [formData, setFormData] = useState<ResidentFormData>(initialFormData);
    const [loading, setLoading] = useState(true);
    const { apiFetch } = useApi(); // Use the apiFetch hook to make authenticated requests
    const router = useRouter();

    // Fetches the list of residents from the API.
    // Wrapped in useCallback to prevent re-creation on every render, avoiding infinite loops.
    const fetchResidents = useCallback(async () => {
        setLoading(true);
        try {
            // apiFetch automatically includes the correct 'db' query parameter.
            const data = await apiFetch('/api/residents');
            setResidents(data);
        } catch (error) { 
            console.error('Failed to fetch residents:', error); 
        } finally {
            setLoading(false);
        }
    }, [apiFetch]); // Dependency array ensures the function is recreated only if apiFetch changes.

    // useEffect hook to fetch residents when the component mounts or when fetchResidents changes.
    useEffect(() => {
        fetchResidents();
    }, [fetchResidents]);

    // Handles changes in form input fields.
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handles the image URL when an image is successfully uploaded.
    const handleImageUpload = (url: string) => {
        setFormData(prev => ({ ...prev, photoUrl: url }));
    };

    // Handles the form submission to create a new resident.
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Use apiFetch to send the POST request. It handles the database context.
            await apiFetch('/api/residents', {
                method: 'POST',
                body: JSON.stringify(formData),
            });
            await fetchResidents(); // Re-fetch the list to show the newly added resident.
            setFormData(initialFormData); // Reset the form.
        } catch (error) { 
            console.error('Failed to submit form:', error); 
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Form for adding a new resident */}
            <div>
                <h3 className="heading-lg mb-4">Add New Resident</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <ImageUpload
                        value={formData.photoUrl || undefined}
                        onChange={handleImageUpload}
                        placeholder="Click to upload a profile picture"
                    />
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

            {/* List of current residents */}
            <div>
                <h3 className="heading-lg mb-4">Current Residents</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-glass pr-2">
                    {loading ? (
                        <p className="text-text-secondary">Loading residents...</p>
                    ) : residents.length > 0 ? (
                        residents.map(resident => (
                           <GlassCard 
                                key={resident.id} 
                                variant="subtle" 
                                className="p-3 cursor-pointer"
                                hover
                                // Navigate to the resident's detail page on click.
                                // The database context will persist through the AuthProvider.
                                onClick={() => router.push(`/residents/${resident.id}`)}
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
