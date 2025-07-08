import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import SurgerySelector from '../components/SurgerySelector';

// --- Interfaces ---
interface Resident { id: string; name: string; }
interface PastEvaluation { id: string; surgery: string; date: string; residentName?: string; withVideo?: boolean; }

export default function Home() {
  const [selectedSurgery, setSelectedSurgery] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [pastEvaluations, setPastEvaluations] = useState<PastEvaluation[]>([]);

  // Your existing handlers and useEffect would go here

  const handleSubmit = () => console.log("Submit clicked");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      {/* --- LEFT COLUMN: THE FORM --- */}
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">New Evaluation</h1>
          <p className="text-text-secondary mt-1">Fill out the details below to begin.</p>
        </div>

        <SurgerySelector selected={selectedSurgery} setSelected={setSelectedSurgery} />
        
        <div>
          <label className="block mb-2 text-sm font-medium text-text-secondary">Select Resident</label>
          <select
            value={selectedResidentId}
            onChange={(e) => setSelectedResidentId(e.target.value)}
            className="block appearance-none w-full bg-navy-800/50 border border-glass-border text-white py-3 px-4 pr-8 rounded-xl leading-tight focus:outline-none focus:ring-2 focus:ring-brand-teal"
          >
            <option value="">-- Choose a resident --</option>
            {residents.map((resident) => (
              <option key={resident.id} value={resident.id}>{resident.name}</option>
            ))}
          </select>
        </div>

        <textarea
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            className="block w-full bg-navy-800/50 border border-glass-border text-white py-3 px-4 rounded-xl leading-tight focus:outline-none focus:ring-2 focus:ring-brand-teal placeholder:text-text-tertiary"
            placeholder="Additional Context (e.g., simulation, patient issues)"
            rows={4}
        />

        <div>
            <label className="block mb-2 text-sm font-medium text-text-secondary">Upload Recording</label>
            <div className="mt-1 flex justify-center rounded-xl border-2 border-dashed border-glass-border px-6 py-10 hover:border-brand-teal transition-colors">
              <div className="text-center">
                <Image src="/images/upload-icon.svg" alt="Upload" width={48} height={48} className="mx-auto" />
                <div className="mt-4 flex text-sm text-text-secondary">
                  <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-semibold text-brand-teal hover:text-opacity-80">
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-text-tertiary mt-1">{file ? file.name : "MP3, MP4, MOV, etc."}</p>
              </div>
            </div>
        </div>

        <div className="mt-auto pt-4">
          <button
            onClick={handleSubmit}
            disabled={isAnalyzing}
            className="w-full bg-brand-teal text-white px-6 py-4 rounded-xl shadow-glow text-lg font-semibold transition-all hover:bg-brand-teal-hover disabled:bg-gray-500 disabled:shadow-none disabled:cursor-not-allowed"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Recording'}
          </button>
        </div>
      </div>

      {/* --- RIGHT COLUMN: HISTORY --- */}
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">Past Evaluations</h2>
        </div>
        <div className="space-y-3 overflow-y-auto">
          {pastEvaluations.map(evalItem => (
            <div key={evalItem.id} className="flex items-center justify-between p-4 rounded-xl bg-navy-800/50 hover:bg-navy-600 transition-all cursor-pointer">
              <div>
                <p className="font-semibold text-text-primary">{evalItem.surgery}</p>
                <p className="text-sm text-text-secondary">{evalItem.residentName || 'N/A'} - {evalItem.date}</p>
              </div>
              <Image src={evalItem.withVideo ? '/images/videoSmall.svg' : '/images/audioSmall.svg'} alt="Media type" width={32} height={32} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}