import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import SurgerySelector from '../components/SurgerySelector';
import { GlassCard, GlassButton, GlassSelect, GlassTextarea } from '../components/ui';

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
  const router = useRouter();

  // Mock data for demonstration
  useEffect(() => {
    setResidents([
      { id: '1', name: 'Dr. Sarah Johnson' },
      { id: '2', name: 'Dr. Michael Chen' },
      { id: '3', name: 'Dr. Emily Rodriguez' }
    ]);
    
    setPastEvaluations([
      { id: '1', surgery: 'Laparoscopic Cholecystectomy', date: '2024-01-15', residentName: 'Dr. Sarah Johnson', withVideo: true },
      { id: '2', surgery: 'Robotic Cholecystectomy', date: '2024-01-14', residentName: 'Dr. Michael Chen', withVideo: false },
      { id: '3', surgery: 'Laparoscopic Appendicectomy', date: '2024-01-13', residentName: 'Dr. Emily Rodriguez', withVideo: true }
    ]);
  }, []);

  const residentOptions = residents.map(resident => ({
    value: resident.id,
    label: resident.name
  }));

  const handleSubmit = async () => {
    console.log("Analysis started with:", {
      surgery: selectedSurgery,
      resident: selectedResidentId,
      file: file?.name,
      context: additionalContext
    });
    
    setIsAnalyzing(true);
    
    try {
      if (!file) {
        throw new Error('No file selected');
      }

      console.log("Processing file upload...");
      
      // First, get upload URL
      const uploadResponse = await fetch('/api/generate-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, filePath } = await uploadResponse.json();

      // Upload file to Google Cloud Storage
      const fileUploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!fileUploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      console.log("File uploaded successfully. Starting analysis...");

      // Submit for analysis
      const analysisResponse = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gcsUrl: `gs://ai-surgical-evaluator/${filePath}`,
          gcsObjectPath: filePath,
          surgeryName: selectedSurgery,
          residentId: selectedResidentId,
          additionalContext,
          withVideo: file.type.startsWith('video/'),
          videoAnalysis: file.type.startsWith('video/')
        }),
      });

      if (!analysisResponse.ok) {
        throw new Error('Failed to start analysis');
      }

      const { jobId } = await analysisResponse.json();
      console.log("Analysis job started:", jobId);
      
      // Redirect to results page to monitor progress
      router.push(`/results/${jobId}`);
      
    } catch (error) {
      console.error("Analysis failed:", error);
      alert(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 h-full">
      {/* --- LEFT COLUMN: EVALUATION FORM --- */}
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center xl:text-left">
          <h1 className="heading-xl text-gradient mb-2">New Evaluation</h1>
          <p className="text-text-tertiary text-lg">
            Analyze surgical performance with AI-powered evaluation
          </p>
        </div>

        {/* Main Form Card */}
        <GlassCard variant="strong" className="p-8 space-y-6">
          {/* Surgery Selection */}
          <SurgerySelector selected={selectedSurgery} setSelected={setSelectedSurgery} />
          
          {/* Resident Selection */}
          <div>
            <label className="block mb-3 text-sm font-medium text-text-secondary">
              Select Resident
            </label>
            <GlassSelect
              options={residentOptions}
              value={selectedResidentId}
              onChange={(e) => setSelectedResidentId(e.target.value)}
              placeholder="— Choose a resident —"
            />
          </div>

          {/* Additional Context */}
          <div>
            <label className="block mb-3 text-sm font-medium text-text-secondary">
              Additional Context
            </label>
            <GlassTextarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Enter any additional context, simulation details, or special circumstances..."
              rows={4}
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block mb-3 text-sm font-medium text-text-secondary">
              Upload Recording
            </label>
            <div className="glassmorphism-subtle border-2 border-dashed border-glass-border-strong rounded-4xl p-8 text-center hover:border-brand-primary/50 transition-all duration-300 group">
              <div className="space-y-4">
                <div className="glassmorphism p-4 rounded-3xl w-fit mx-auto">
                  <Image 
                    src="/images/upload-icon.svg" 
                    alt="Upload" 
                    width={48} 
                    height={48} 
                    className="opacity-60 group-hover:opacity-100 transition-opacity"
                  />
                </div>
                
                <div>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-brand-primary font-semibold hover:text-brand-primary-hover transition-colors">
                      Click to upload a file
                    </span>
                    <span className="text-text-tertiary"> or drag and drop</span>
                    <input 
                      id="file-upload" 
                      name="file-upload" 
                      type="file" 
                      className="sr-only" 
                      accept="audio/*,video/*"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
                
                <p className="text-xs text-text-quaternary">
                  {file ? (
                    <span className="text-brand-secondary font-medium">✓ {file.name}</span>
                  ) : (
                    "MP3, MP4, MOV up to 500MB"
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <GlassButton
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              disabled={!selectedSurgery || !selectedResidentId || !file}
              loading={isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? 'Analyzing Recording...' : 'Start AI Analysis'}
            </GlassButton>
          </div>
        </GlassCard>
      </div>

      {/* --- RIGHT COLUMN: PAST EVALUATIONS --- */}
      <div className="space-y-6">
        <div className="text-center xl:text-left">
          <h2 className="heading-lg mb-2">Recent Evaluations</h2>
          <p className="text-text-tertiary">
            View and analyze previous surgical assessments
          </p>
        </div>

        <GlassCard variant="default" className="p-6">
          <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-glass">
            {pastEvaluations.map(evalItem => (
              <GlassCard 
                key={evalItem.id} 
                variant="subtle" 
                hover
                className="p-4 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-text-primary mb-1">
                      {evalItem.surgery}
                    </h4>
                    <p className="text-sm text-text-tertiary">
                      {evalItem.residentName || 'N/A'} • {evalItem.date}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {/* Remove glassmorphism wrapper to show raw analysis images */}
                    <Image 
                      src={evalItem.withVideo ? '/images/visualAnalysis.svg' : '/images/audioAnalysis.svg'} 
                      alt="Media type" 
                      width={28} 
                      height={28}
                      className="opacity-90"
                    />
                    <Image 
                      src="/images/arrow-right-icon.svg" 
                      alt="View" 
                      width={16} 
                      height={16}
                      className="opacity-50"
                    />
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
          
          {pastEvaluations.length === 0 && (
            <div className="text-center py-12">
              <div className="glassmorphism-subtle p-6 rounded-3xl w-fit mx-auto mb-4">
                <Image src="/images/dashboard-icon.svg" alt="No data" width={32} height={32} className="opacity-50" />
              </div>
              <p className="text-text-tertiary">No evaluations yet</p>
              <p className="text-text-quaternary text-sm">Start your first evaluation to see results here</p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}