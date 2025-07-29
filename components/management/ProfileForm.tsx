import React from 'react';
import { GlassInput, GlassButton, ImageUpload } from '../ui';

export interface ProfileFormData {
    name: string;
    title: string;
    primaryInstitution: string;
    specialty: string;
    residency?: string;
    medicalSchool?: string;
    fellowship?: string;
    photoUrl?: string | null;
}

interface ProfileFormProps {
    formData: ProfileFormData;
    setFormData: React.Dispatch<React.SetStateAction<ProfileFormData>>;
    onSubmit: (e: React.FormEvent) => void;
    loading: boolean;
    profileType: 'Attending' | 'ProgramDirector';
}

const ProfileForm: React.FC<ProfileFormProps> = ({ formData, setFormData, onSubmit, loading, profileType }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = (url: string) => {
        setFormData(prev => ({ ...prev, photoUrl: url }));
    };

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <ImageUpload
              value={formData.photoUrl || undefined}
              onChange={handleImageUpload}
              placeholder="Click to upload a profile picture"
            />
            <GlassInput name="name" placeholder="Name" value={formData.name} onChange={handleChange} required />
            <GlassInput name="title" placeholder="Title (e.g., PGY-3, Attending Physician)" value={formData.title} onChange={handleChange} required />
            <GlassInput name="primaryInstitution" placeholder="Primary Institution" value={formData.primaryInstitution} onChange={handleChange} required />
            <GlassInput name="specialty" placeholder="Specialty" value={formData.specialty} onChange={handleChange} required />

            {profileType === 'Attending' && (
                <>
                    <GlassInput name="residency" placeholder="Residency (Optional)" value={formData.residency || ''} onChange={handleChange} />
                    <GlassInput name="medicalSchool" placeholder="Medical School (Optional)" value={formData.medicalSchool || ''} onChange={handleChange} />
                    <GlassInput name="fellowship" placeholder="Fellowship (Optional)" value={formData.fellowship || ''} onChange={handleChange} />
                </>
            )}

            <GlassButton type="submit" variant="primary" loading={loading} className="w-full">
                {loading ? 'Saving...' : 'Save Profile'}
            </GlassButton>
        </form>
    );
};

export default ProfileForm;