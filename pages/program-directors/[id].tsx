// pages/program-directors/[id].tsx

import React, { useState, useEffect, ChangeEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { GlassCard, GlassButton, GlassInput, ImageUpload } from '../../components/ui';
import { useApi } from '../../lib/useApi';
import toast from 'react-hot-toast';

interface ProgramDirector {
  id: string;
  name: string;
  email?: string | null;
  photoUrl?: string | null;
  title: string | null;
  primaryInstitution: string | null;
  specialty: string | null;
  createdAt: string;
}

export default function ProgramDirectorProfile() {
  const router = useRouter();
  const { id } = router.query;
  const { apiFetch } = useApi();
  const [director, setDirector] = useState<ProgramDirector | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDirector, setEditedDirector] = useState<ProgramDirector | null>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const fetchDirectorData = async () => {
        setLoading(true);
        try {
            const directorData = await apiFetch(`/api/program-directors/${id}`);
            setDirector(directorData);
            setEditedDirector(directorData);
        } catch (error) {
            console.error(error);
            setDirector(null);
        } finally {
            setLoading(false);
        }
    };

    fetchDirectorData();
  }, [id, apiFetch]);

  const handleUpdate = async () => {
    if (!editedDirector) return;

    const { id, ...updateData } = editedDirector;

    try {
        const updatedProfile = await apiFetch(`/api/program-directors/${director?.id}`, {
            method: 'PUT',
            body: updateData, // Pass the object directly
        });
        setDirector(updatedProfile);
        setEditedDirector(updatedProfile);
        setIsEditing(false);
        toast.success('Profile updated successfully!');
    } catch (error) {
        console.error('Failed to update program director', error);
        toast.error('Failed to update profile.');
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedDirector(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handlePhotoChange = (url: string) => {
    setEditedDirector(prev => prev ? { ...prev, photoUrl: url } : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center"><div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-text-tertiary">Loading program director profile...</p></div>
      </div>
    );
  }

  if (!director) {
    return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center"><h2 className="heading-md text-red-400">Error</h2><p className="text-text-tertiary">Could not load program director profile.</p><GlassButton variant="secondary" onClick={() => router.push('/manage-profiles')} className="mt-4">Back to Profiles</GlassButton></div>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <GlassButton variant="ghost" onClick={() => router.back()}>← Back</GlassButton>
        <GlassButton onClick={() => setIsEditing(!isEditing)}>{isEditing ? 'Cancel' : 'Edit'}</GlassButton>
      </div>
      <GlassCard variant="strong" className="p-8 relative">
        <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-6">

        <div className="glassmorphism-subtle p-2 rounded-full">
          <div className="w-[120px] h-[120px] rounded-full overflow-hidden">
            <Image
              src={director.photoUrl || '/images/default-avatar.svg'}
              alt={director.name}
              width={120}
              height={120}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/default-avatar.svg';
              }}
            />
          </div>
       </div>

          <div className="flex-1">
            {isEditing && editedDirector ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="md:col-span-2">
                    <p className="text-sm text-text-quaternary mb-1">Profile Photo</p>
                    <ImageUpload
                        value={editedDirector.photoUrl || undefined}
                        onChange={handlePhotoChange}
                    />
                </div>
                <div>
                    <p className="text-sm text-text-quaternary mb-1">Name</p>
                    <GlassInput name="name" value={editedDirector.name} onChange={handleInputChange} />
                </div>
                <div>
                    <p className="text-sm text-text-quaternary mb-1">Email</p>
                    <GlassInput name="email" value={editedDirector.email || ''} onChange={handleInputChange} />
                </div>
                <div>
                    <p className="text-sm text-text-quaternary mb-1">Title</p>
                    <GlassInput name="title" value={editedDirector.title || ''} onChange={handleInputChange} />
                </div>
                <div>
                    <p className="text-sm text-text-quaternary mb-1">Primary Institution</p>
                    <GlassInput name="primaryInstitution" value={editedDirector.primaryInstitution || ''} onChange={handleInputChange} />
                </div>
                <div>
                    <p className="text-sm text-text-quaternary mb-1">Specialty</p>
                    <GlassInput name="specialty" value={editedDirector.specialty || ''} onChange={handleInputChange} />
                </div>
                <div className="md:col-span-2 flex justify-end space-x-4 mt-4">
                    <GlassButton variant="secondary" onClick={() => setIsEditing(false)}>Cancel</GlassButton>
                    <GlassButton onClick={handleUpdate}>Save Changes</GlassButton>
                </div>
              </div>
            ) : (
                <>
                    <h1 className="heading-xl text-gradient mb-2">{director.name}</h1>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-text-secondary">
                        <div><p className="text-sm text-text-quaternary mb-1">Title</p><p className="font-medium">{director.title || 'N/A'}</p></div>
                        <div><p className="text-sm text-text-quaternary mb-1">Primary Institution</p><p className="font-medium">{director.primaryInstitution || 'N/A'}</p></div>
                        <div><p className="text-sm text-text-quaternary mb-1">Specialty</p><p className="font-medium">{director.specialty || 'N/A'}</p></div>
                        <div><p className="text-sm text-text-quaternary mb-1">Email</p><p className="font-medium">{director.email || 'N/A'}</p></div>
                        <div><p className="text-sm text-text-quaternary mb-1">Member Since</p><p className="font-medium">{new Date(director.createdAt).toLocaleDateString()}</p></div>
                    </div>
                </>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}