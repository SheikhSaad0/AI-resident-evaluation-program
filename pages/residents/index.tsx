import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { GlassCard, GlassButton, GlassInput, ImageUpload } from '../../components/ui';

interface Resident {
  id: string;
  name: string;
  photoUrl?: string | null;
  company?: string;
  year?: string;
  medicalSchool?: string;
  email?: string;
}

export default function ResidentsPage() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [newResident, setNewResident] = useState({
    name: '',
    photoUrl: '',
    company: '',
    year: '',
    medicalSchool: '',
    email: ''
  });
  const [isAdding, setIsAdding] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchResidents = async () => {
      const response = await fetch('/api/residents');
      if (response.ok) {
        const data = await response.json();
        setResidents(data);
      }
    };
    fetchResidents();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewResident(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (url: string) => {
    setNewResident(prev => ({ ...prev, photoUrl: url }));
  };

  const handleAddResident = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const response = await fetch('/api/residents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newResident),
      });
      if (response.ok) {
        const addedResident = await response.json();
        setResidents(prev => [addedResident, ...prev]);
        setNewResident({ name: '', photoUrl: '', company: '', year: '', medicalSchool: '', email: '' });
      } else {
        throw new Error('Failed to add resident');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to add resident');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteResident = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this resident?')) {
      try {
        const response = await fetch(`/api/residents/${id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          setResidents(prev => prev.filter(r => r.id !== id));
        } else {
          throw new Error('Failed to delete resident');
        }
      } catch (error) {
        console.error(error);
        alert('Failed to delete resident');
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center lg:text-left">
        <h1 className="heading-xl text-gradient mb-2">Manage Residents</h1>
        <p className="text-text-tertiary text-lg">
          Add, view, and manage resident profiles
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1">
          <GlassCard variant="strong" className="p-6">
            <h3 className="heading-md mb-6">Add New Resident</h3>
            <form onSubmit={handleAddResident} className="space-y-4">
              <ImageUpload
                value={newResident.photoUrl}
                onChange={handlePhotoChange}
                placeholder="Upload Photo"
              />
              <GlassInput
                name="name"
                placeholder="Full Name"
                value={newResident.name}
                onChange={handleInputChange}
                required
              />
               <GlassInput
                name="email"
                type="email"
                placeholder="Email Address"
                value={newResident.email}
                onChange={handleInputChange}
              />
              <GlassInput
                name="company"
                placeholder="Program/Institution"
                value={newResident.company}
                onChange={handleInputChange}
              />
              <GlassInput
                name="medicalSchool"
                placeholder="Medical School"
                value={newResident.medicalSchool}
                onChange={handleInputChange}
              />
              <GlassInput
                name="year"
                placeholder="PGY (e.g., PGY-3)"
                value={newResident.year}
                onChange={handleInputChange}
              />
              <GlassButton type="submit" variant="primary" loading={isAdding} className="w-full">
                Add Resident
              </GlassButton>
            </form>
          </GlassCard>
        </div>

        <div className="xl:col-span-2">
          <GlassCard variant="strong" className="p-6">
            <h3 className="heading-md mb-6">All Residents ({residents.length})</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-glass">
              {residents.map(resident => (
                <GlassCard key={resident.id} variant="subtle" className="p-4">
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center space-x-4 cursor-pointer"
                      onClick={() => router.push(`/residents/${resident.id}`)}
                    >
                      <Image
                        src={resident.photoUrl || '/images/default-avatar.svg'}
                        alt={resident.name}
                        width={40}
                        height={40}
                        className="rounded-full object-cover w-10 h-10"
                      />
                      <div>
                        <p className="font-medium text-text-primary">{resident.name}</p>
                        <p className="text-sm text-text-tertiary">{resident.company || 'No program specified'}</p>
                      </div>
                    </div>
                    <GlassButton
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteResident(resident.id)}
                      className="p-2 hover:bg-red-500/20 text-red-400"
                    >
                      <Image src="/images/trashcanIcon.svg" alt="Delete" width={16} height={16} />
                    </GlassButton>
                  </div>
                </GlassCard>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}