// pages/attendings/[id].tsx

import React, { useState, useEffect, ChangeEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { GlassCard, GlassButton, GlassInput, ImageUpload } from '../../components/ui';
import { useApi } from '../../lib/useApi';
import toast from 'react-hot-toast';

interface Attending {
  id: string;
  name: string;
  email?: string | null;
  photoUrl?: string | null;
  title: string | null;
  primaryInstitution: string | null;
  specialty: string | null;
  residency: string | null;
  medicalSchool: string | null;
  fellowship: string | null;
  createdAt: string;
}

export default function AttendingProfile() {
  const router = useRouter();
  const { id } = router.query;
  const { apiFetch } = useApi();
  const [attending, setAttending] = useState<Attending | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedAttending, setEditedAttending] = useState<Attending | null>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const fetchAttendingData = async () => {
        setLoading(true);
        try {
            const attendingData = await apiFetch(`/api/attendings/${id}`);
            setAttending(attendingData);
            setEditedAttending(attendingData);

        } catch (error) {
            console.error(error);
            setAttending(null);
        } finally {
            setLoading(false);
        }
    };

    fetchAttendingData();
  }, [id, apiFetch]);

  const handleUpdate = async () => {
    if (!editedAttending) return;

    // Remove ID from the object to prevent validation errors
    const { id, ...updateData } = editedAttending;

    try {
        const updatedProfile = await apiFetch(`/api/attendings/${attending?.id}`, {
            method: 'PUT',
            body: updateData, // Pass the object directly
        });
        setAttending(updatedProfile);
        setEditedAttending(updatedProfile);
        setIsEditing(false);
        toast.success('Profile updated successfully!');
    } catch (error) {
        console.error('Failed to update attending', error);
        toast.error('Failed to update profile.');
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedAttending(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handlePhotoChange = (url: string) => {
    setEditedAttending(prev => prev ? { ...prev, photoUrl: url } : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center"><div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-text-tertiary">Loading attending profile...</p></div>
      </div>
    );
  }

  if (!attending) {
    return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center"><h2 className="heading-md text-red-400">Error</h2><p className="text-text-tertiary">Could not load attending profile.</p><GlassButton variant="secondary" onClick={() => router.push('/manage-profiles')} className="mt-4">Back to Profiles</GlassButton></div>
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
              src={attending.photoUrl || '/images/default-avatar.svg'}
              alt={attending.name}
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
            {isEditing && editedAttending ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="md:col-span-2">
                    <p className="text-sm text-text-quaternary mb-1">Profile Photo</p>
                    <ImageUpload
                        value={editedAttending.photoUrl || undefined}
                        onChange={handlePhotoChange}
                    />
                </div>
                <div>
                    <p className="text-sm text-text-quaternary mb-1">Name</p>
                    <GlassInput name="name" value={editedAttending.name} onChange={handleInputChange} />
                </div>
                <div>
                    <p className="text-sm text-text-quaternary mb-1">Email</p>
                    <GlassInput name="email" value={editedAttending.email || ''} onChange={handleInputChange} />
                </div>
                <div>
                    <p className="text-sm text-text-quaternary mb-1">Title</p>
                    <GlassInput name="title" value={editedAttending.title || ''} onChange={handleInputChange} />
                </div>
                <div>
                    <p className="text-sm text-text-quaternary mb-1">Primary Institution</p>
                    <GlassInput name="primaryInstitution" value={editedAttending.primaryInstitution || ''} onChange={handleInputChange} />
                </div>
                <div>
                    <p className="text-sm text-text-quaternary mb-1">Specialty</p>
                    <GlassInput name="specialty" value={editedAttending.specialty || ''} onChange={handleInputChange} />
                </div>
                <div>
                    <p className="text-sm text-text-quaternary mb-1">Residency</p>
                    <GlassInput name="residency" value={editedAttending.residency || ''} onChange={handleInputChange} />
                </div>
                <div>
                    <p className="text-sm text-text-quaternary mb-1">Medical School</p>
                    <GlassInput name="medicalSchool" value={editedAttending.medicalSchool || ''} onChange={handleInputChange} />
                </div>
                <div>
                    <p className="text-sm text-text-quaternary mb-1">Fellowship</p>
                    <GlassInput name="fellowship" value={editedAttending.fellowship || ''} onChange={handleInputChange} />
                </div>
                <div className="md:col-span-2 flex justify-end space-x-4 mt-4">
                    <GlassButton variant="secondary" onClick={() => setIsEditing(false)}>Cancel</GlassButton>
                    <GlassButton onClick={handleUpdate}>Save Changes</GlassButton>
                </div>
              </div>
            ) : (
                <>
                    <h1 className="heading-xl text-gradient mb-2">{attending.name}</h1>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-text-secondary">
                      <div><p className="text-sm text-text-quaternary mb-1">Title</p><p className="font-medium">{attending.title || 'N/A'}</p></div>
                      <div><p className="text-sm text-text-quaternary mb-1">Primary Institution</p><p className="font-medium">{attending.primaryInstitution || 'N/A'}</p></div>
                      <div><p className="text-sm text-text-quaternary mb-1">Specialty</p><p className="font-medium">{attending.specialty || 'N/A'}</p></div>
                      <div><p className="text-sm text-text-quaternary mb-1">Residency</p><p className="font-medium">{attending.residency || 'N/A'}</p></div>
                      <div><p className="text-sm text-text-quaternary mb-1">Medical School</p><p className="font-medium">{attending.medicalSchool || 'N/A'}</p></div>
                      <div><p className="text-sm text-text-quaternary mb-1">Fellowship</p><p className="font-medium">{attending.fellowship || 'N/A'}</p></div>
                      <div><p className="text-sm text-text-quaternary mb-1">Email</p><p className="font-medium">{attending.email || 'N/A'}</p></div>
                      <div><p className="text-sm text-text-quaternary mb-1">Member Since</p><p className="font-medium">{new Date(attending.createdAt).toLocaleDateString()}</p></div>
                    </div>
                </>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}