import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import SurgerySelector from '../components/SurgerySelector';
import ResidentSelector from '../components/ResidentSelector';
import { GlassCard, GlassButton, GlassTextarea, PillToggle, GlassInput } from '../components/ui';
import { useApi } from '../lib/useApi';
import { AuthContext } from '../lib/auth';

interface Resident {
  id: string;
  name: string;
  photoUrl?: string | null;
  year?: string;
}
interface PastEvaluation { id: string; surgery: string; date: string; residentName?: string; withVideo?: boolean; type: 'video' | 'audio'; }

export default function Home() {
  const [selectedSurgery, setSelectedSurgery] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [gcsLink, setGcsLink] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [additionalContext, setAdditionalContext] = useState('');
  const [pastEvaluations, setPastEvaluations] = useState<PastEvaluation[]>([]);
  const [analysisType, setAnalysisType] = useState('audio');
  const router = useRouter();
  const { apiFetch } = useApi();
  const auth = useContext(AuthContext);

  const fetchData = async () => {
    try {
      const residentsData = await apiFetch('/api/residents');
      setResidents(residentsData);

      const evalsData = await apiFetch(`/api/evaluations?t=${new Date().getTime()}`);
      setPastEvaluations(evalsData);
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  };

  useEffect(() => {
    fetchData();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [apiFetch]);

  const handleSubmit = async () => {
    if (files.length === 0 && !gcsLink) {
      alert('Please select files to upload or provide a GCS link.');
      return;
    }
    if (!selectedResident) {
      alert('Please select a resident.');
      return;
    }
    setIsAnalyzing(true);

    try {
      let gcsPaths = [];
      if (files.length > 0) {
        for (const file of files) {
          const gcsPath = `uploads/${Date.now()}-${file.name.replace(/\s/g, '_')}`;
          const gcsResponse = await fetch('/api/generate-upload-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: gcsPath, fileType: file.type }),
          });

          if (!gcsResponse.ok) throw new Error('Failed to get upload URL');
          const { uploadUrl, filePath } = await gcsResponse.json();

          await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          });
          gcsPaths.push({
            url: `gs://${process.env.NEXT_PUBLIC_GCS_BUCKET_NAME || 'ai-surgical-evaluator'}/${filePath}`,
            path: filePath,
            type: file.type
          });
        }
      } else if (gcsLink) {
        // Basic validation for gs:// link
        if (!gcsLink.startsWith('gs://')) {
          alert('Invalid GCS link. It must start with "gs://".');
          setIsAnalyzing(false);
          return;
        }
        const bucketAndPath = gcsLink.substring(5);
        const [bucket, ...pathParts] = bucketAndPath.split('/');
        const path = pathParts.join('/');
        gcsPaths.push({
          url: gcsLink,
          path: path,
          type: 'video/mp4' // Assume mp4 for now, could be improved
        });
      }


      const submitUrl = new URL('/api/submit', window.location.origin);
      submitUrl.searchParams.append('db', auth?.database || 'testing');
      const analysisResponse = await fetch(submitUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gcsPaths: gcsPaths,
          surgeryName: selectedSurgery,
          residentId: selectedResident.id,
          additionalContext,
          analysisType
        }),
      });

      if (!analysisResponse.ok) throw new Error('Failed to start analysis');
      const { jobId } = await analysisResponse.json();
      router.push(`/results/${jobId}`);

    } catch (error) {
      console.error("Analysis failed:", error);
      alert(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 h-full">
      <div className="space-y-6">
        <div className="text-center xl:text-left">
          <h1 className="heading-xl text-gradient mb-2">New Evaluation</h1>
          <p className="text-text-tertiary text-lg">Analyze surgical performance with AI-powered evaluation</p>
        </div>
        <GlassCard variant="strong" className="p-8 space-y-6">
          <div className="relative z-30">
            <SurgerySelector selected={selectedSurgery} setSelected={setSelectedSurgery} />
          </div>
          <div className="relative z-20">
            <ResidentSelector residents={residents} selected={selectedResident} setSelected={setSelectedResident} />
          </div>
          <div>
            <label className="block mb-3 text-sm font-medium text-text-secondary">Additional Context</label>
            <GlassTextarea value={additionalContext} onChange={(e) => setAdditionalContext(e.target.value)} placeholder="Enter any additional context, simulation details, or special circumstances..." rows={4} />
          </div>
          <div>
            <label className="block mb-3 text-sm font-medium text-text-secondary">Analysis Type</label>
            <PillToggle options={[{ id: 'audio', label: 'Audio Analysis' }, { id: 'video', label: 'Visual Analysis' }]} defaultSelected={analysisType} onChange={setAnalysisType} />
          </div>
          <div>
            <label className="block mb-3 text-sm font-medium text-text-secondary">Upload Recordings</label>
            <div className="glassmorphism-subtle border-2 border-dashed border-glass-border-strong rounded-4xl p-8 text-center hover:border-brand-primary/50 transition-all duration-300 group">
              <div className="space-y-4">
                <div className="glassmorphism p-4 rounded-3xl w-fit mx-auto"><Image src="/images/upload-icon.svg" alt="Upload" width={48} height={48} className="opacity-60 group-hover:opacity-100 transition-opacity" /></div>
                <div>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-brand-primary font-semibold hover:text-brand-primary-hover transition-colors">Click to upload files</span>
                    <span className="text-text-tertiary"> or drag and drop</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="audio/*,video/*" onChange={handleFileChange} multiple />
                  </label>
                </div>
                <p className="text-xs text-text-quaternary">{files.length > 0 ? (<span className="text-brand-secondary font-medium">✓ {files.length} file(s) selected</span>) : ("MP3, MP4, MOV up to 500MB")}</p>
              </div>
            </div>
          </div>
          <div className="text-center text-text-tertiary">OR</div>
          <div>
            <label className="block mb-3 text-sm font-medium text-text-secondary">Import from GCS</label>
            <GlassInput
              value={gcsLink}
              onChange={(e) => setGcsLink(e.target.value)}
              placeholder="gs://bucket-name/path/to/file"
            />
          </div>
          <div className="pt-4">
            <GlassButton variant="primary" size="lg" onClick={handleSubmit} disabled={!selectedSurgery || !selectedResident || (files.length === 0 && !gcsLink)} loading={isAnalyzing} className="w-full">
              {isAnalyzing ? 'Analyzing Recording...' : 'Start AI Analysis'}
            </GlassButton>
          </div>
        </GlassCard>
      </div>
      <div className="space-y-6">
        <div className="text-center xl:text-left"><h2 className="heading-lg mb-2">Recent Evaluations</h2><p className="text-text-tertiary">View and analyze previous surgical assessments</p></div>
        <GlassCard variant="default" className="p-6">
          <div className="space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto scrollbar-glass">
            {pastEvaluations.map(evalItem => (
              <GlassCard key={evalItem.id} variant="subtle" hover onClick={() => router.push(`/results/${evalItem.id}`)} className="p-4 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex-1"><h4 className="font-semibold text-text-primary mb-1">{evalItem.surgery}</h4><p className="text-sm text-text-tertiary">{evalItem.residentName || 'N/A'} • {evalItem.date}</p></div>
                  <div className="flex items-center space-x-3">
                    <Image src={evalItem.type === 'video' ? '/images/visualAnalysis.svg' : '/images/audioAnalysis.svg'} alt="Media type" width={150} height={150} className="opacity-90" />
                    <Image src="/images/arrow-right-icon.svg" alt="View" width={16} height={16} className="opacity-50" />
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
          {pastEvaluations.length === 0 && (
            <div className="text-center py-12">
              <div className="glassmorphism-subtle p-6 rounded-3xl w-fit mx-auto mb-4"><Image src="/images/dashboard-icon.svg" alt="No data" width={32} height={32} className="opacity-50" /></div>
              <p className="text-text-tertiary">No evaluations yet</p><p className="text-text-quaternary text-sm">Start your first evaluation to see results here</p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}