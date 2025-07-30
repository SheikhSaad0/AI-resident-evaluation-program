import { useState } from 'react';
import { useRouter } from 'next/router';
import { useApi } from '../../lib/useApi';

export default function NewResident() {
  const [form, setForm] = useState({ name: '', program: '', year: '', medicalSchool: '', photo: null as File | null });
  const router = useRouter();
  const { apiFetch } = useApi();
  const handleChange = (e: any) => {
    const { name, value, files } = e.target;
    if (name === 'photo') setForm(f => ({ ...f, photo: files[0] }));
    else setForm(f => ({ ...f, [name]: value }));
  };
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => v && formData.append(k, v));
    await apiFetch('/api/residents', { method: 'POST', body: formData });
    router.push('/residents');
  };
  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto p-6 bg-white/20 rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Add Resident</h1>
      <input name="name" placeholder="Full Name" value={form.name} onChange={handleChange} className="block w-full mb-3 p-2 rounded" required />
      <input name="program" placeholder="Program Name or Company" value={form.program} onChange={handleChange} className="block w-full mb-3 p-2 rounded" required />
      <input name="medicalSchool" placeholder="Medical School" value={form.medicalSchool} onChange={handleChange} className="block w-full mb-3 p-2 rounded" required />
      <input name="year" placeholder="PGY Year" value={form.year} onChange={handleChange} className="block w-full mb-3 p-2 rounded" required />
      <input name="photo" type="file" accept="image/*" onChange={handleChange} className="block w-full mb-4" required />
      <button type="submit" className="bg-blue-700 text-white px-6 py-2 rounded">Create Resident</button>
    </form>
  );
}