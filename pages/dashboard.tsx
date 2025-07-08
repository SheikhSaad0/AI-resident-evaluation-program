import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';

interface Resident {
  id: string;
  name: string;
  photoUrl?: string | null;
}

interface Evaluation {
  id: string;
  surgery: string;
  date: string;
  residentName?: string;
}

// Main Dashboard Component
export default function Dashboard() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [stats, setStats] = useState({ totalEvals: 0, avgScore: 0 });
  const router = useRouter();

  useEffect(() => {
    // Fetch initial data
    const fetchData = async () => {
      try {
        const [residentsRes, evalsRes] = await Promise.all([
          fetch('/api/residents'),
          fetch('/api/evaluations'),
        ]);
        const residentsData = await residentsRes.json();
        const evalsData = await evalsRes.json();
        
        setResidents(residentsData);
        setEvaluations(evalsData);

        // In a real app, you would calculate stats from the evaluation results
        setStats({ totalEvals: evalsData.length, avgScore: 4.2 });
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      }
    };
    fetchData();
  }, []);

  const handleResidentAdded = (newResident: Resident) => {
    setResidents(prev => [newResident, ...prev]);
  };
  
  const handleResidentDeleted = (deletedResidentId: string) => {
    setResidents(prev => prev.filter(r => r.id !== deletedResidentId));
  }

  return (
    <div className="p-4 space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">An overview of all surgical evaluations.</p>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Evaluations" value={stats.totalEvals.toString()} icon="/images/eval-count-icon.svg" />
        <StatCard title="Average Score" value={stats.avgScore.toString()} icon="/images/avg-score-icon.svg" />
        <StatCard title="Practice Ready" value="85%" icon="/images/ready-icon.svg" />
        <StatCard title="Needs Improvement" value="15%" icon="/images/improve-icon.svg" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2 space-y-8">
          <RecentEvaluationsWidget evaluations={evaluations} />
          <ChartWidget />
        </div>
        <div className="lg:col-span-1">
          <ResidentsWidget 
            residents={residents} 
            onResidentAdded={handleResidentAdded} 
            onResidentDeleted={handleResidentDeleted}
          />
        </div>
      </div>
    </div>
  );
}

// Individual Widget Components

const StatCard = ({ title, value, icon }: { title: string, value: string, icon: string }) => (
  <div className="glassmorphism p-6 rounded-2xl flex items-center space-x-4 transition-all hover:bg-dark-card-hover hover:border-brand-primary">
    <div className="bg-dark-bg p-3 rounded-full">
      <Image src={icon} alt={title} width={32} height={32} />
    </div>
    <div>
      <p className="text-gray-400 text-sm">{title}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  </div>
);

const RecentEvaluationsWidget = ({ evaluations }: { evaluations: Evaluation[] }) => {
  const router = useRouter();
  return (
    <div className="glassmorphism p-6 rounded-2xl">
      <h3 className="text-xl font-semibold text-white mb-4">Recent Evaluations</h3>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {evaluations.map((e) => (
          <div 
            key={e.id} 
            onClick={() => router.push(`/results/${e.id}`)}
            className="flex items-center justify-between p-3 rounded-lg bg-dark-bg/50 hover:bg-dark-bg cursor-pointer transition-all"
          >
            <div>
              <p className="font-semibold text-white">{e.surgery}</p>
              <p className="text-sm text-gray-400">{e.residentName || 'N/A'} - {e.date}</p>
            </div>
            <Image src="/images/arrow-right-icon.svg" alt="View" width={24} height={24} />
          </div>
        ))}
      </div>
    </div>
  );
};

const ResidentsWidget = ({ residents, onResidentAdded, onResidentDeleted }: { residents: Resident[], onResidentAdded: (resident: Resident) => void, onResidentDeleted: (id: string) => void }) => {
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState('');
  
  const handleAddResident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    try {
        const response = await fetch('/api/residents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, photoUrl: photo }),
        });
        if (!response.ok) throw new Error("Failed to add resident");
        const newResident = await response.json();
        onResidentAdded(newResident);
        setName('');
        setPhoto('');
    } catch (error) {
        console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resident? This will also un-assign them from past evaluations.')) return;
    try {
        const response = await fetch(`/api/residents/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error("Failed to delete resident");
        onResidentDeleted(id);
    } catch (error) {
        console.error(error);
    }
  }

  return (
    <div className="glassmorphism p-6 rounded-2xl">
      <h3 className="text-xl font-semibold text-white mb-4">Manage Residents</h3>
      <form onSubmit={handleAddResident} className="space-y-4 mb-6">
        <input type="text" placeholder="Resident Name" value={name} onChange={e => setName(e.target.value)} className="w-full bg-dark-bg p-3 rounded-lg border border-glass-border focus:ring-brand-primary focus:border-brand-primary outline-none" />
        <input type="text" placeholder="Photo URL (optional)" value={photo} onChange={e => setPhoto(e.target.value)} className="w-full bg-dark-bg p-3 rounded-lg border border-glass-border focus:ring-brand-primary focus:border-brand-primary outline-none" />
        <button type="submit" className="w-full bg-brand-primary p-3 rounded-lg font-semibold hover:bg-opacity-80 transition-all shadow-glow-primary">Add Resident</button>
      </form>

      <h4 className="font-semibold text-gray-300 mb-2">Current Residents</h4>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {residents.map((r) => (
          <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-dark-bg/50">
            <div className="flex items-center space-x-3">
              <Image src={r.photoUrl || '/images/default-avatar.svg'} alt={r.name} width={40} height={40} className="rounded-full object-cover" />
              <span className="text-white font-medium">{r.name}</span>
            </div>
             <button onClick={() => handleDelete(r.id)} className="p-1 rounded-full hover:bg-red-500/20">
                 <Image src="/images/trashcanIcon.svg" alt="Delete" width={20} height={20} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChartWidget = () => (
    <div className="glassmorphism p-6 rounded-2xl">
        <h3 className="text-xl font-semibold text-white mb-4">Evaluations by Procedure</h3>
        <div className="h-64 flex items-center justify-center text-gray-400">
            {/* In a real app, you would use a library like Recharts or Chart.js here */}
            <p>Chart component would be rendered here.</p>
        </div>
    </div>
);