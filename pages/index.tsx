import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import SurgerySelector from '../components/SurgerySelector';
import { Analytics } from "@vercel/analytics/next"

interface PastEvaluation {
  id: string;
  surgery: string;
  date: string;
  residentName?: string;
  withVideo?: boolean;
  videoAnalysis?: boolean; // FIX: Add videoAnalysis to the interface
}

export default function Home() {
  const [selectedSurgery, setSelectedSurgery] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState('');
  const [pastEvaluations, setPastEvaluations] = useState<PastEvaluation[]>([]);
  const [residentName, setResidentName] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [videoAnalysis, setVideoAnalysis] = useState(true);
  const router = useRouter();

  const isVideo = useMemo(() => file?.type.startsWith('video/'), [file]);

  const fetchPastEvaluations = async () => {
    try {
      const response = await fetch('/api/evaluations');
      if (!response.ok) {
        throw new Error('Failed to fetch past evaluations');
      }
      const data = await response.json();
      setPastEvaluations(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPastEvaluations();
  }, []);

  const pollJobStatus = async (jobId: string) => {
    try {
      const response = await fetch(`/api/job-status/${jobId}`);
      if (!response.ok) {
        throw new Error('Could not retrieve job status. The process may be running in the background.');
      }

      const data = await response.json();

      switch (data.status) {
        case 'pending':
          setProgress(25);
          setProgressStep('Job submitted. Waiting for processing...');
          setTimeout(() => pollJobStatus(jobId), 5000);
          break;
        case 'processing-transcription':
          setProgress(50);
          setProgressStep('Audio transcription in progress...');
          setTimeout(() => pollJobStatus(jobId), 5000);
          break;
        case 'processing-in-gemini':
          setProgress(65);
          setProgressStep('Visual analysis in progress with Gemini...');
          setTimeout(() => pollJobStatus(jobId), 5000);
          break;
        case 'processing-evaluation':
          setProgress(75);
          setProgressStep('AI text evaluation in progress...');
          setTimeout(() => pollJobStatus(jobId), 5000);
          break;
        case 'complete':
          setProgress(100);
          setProgressStep('Analysis complete!');
          router.push(`/results/${data.id}`);
          break;
        case 'failed':
          throw new Error(data.error || 'The analysis job failed.');
      }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while checking status.';
        setError(errorMessage);
        setIsAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSurgery || !file || !residentName) {
      setError("Please select a surgery, enter the resident's name, and upload an audio or video file.");
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setProgress(0);
    setProgressStep('Preparing file upload...');

    try {
      const signedUrlResponse = await fetch('/api/generate-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });

      if (!signedUrlResponse.ok) {
        throw new Error('Could not get a secure upload URL.');
      }

      const { signedUrl, destination } = await signedUrlResponse.json();
      if (!destination) {
        throw new Error('API did not return a valid destination path.');
      }
      
      setProgress(10);
      setProgressStep('Uploading file...');
      
      await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      setProgressStep('File uploaded. Submitting for analysis...');
      const gcsUrl = `https://storage.googleapis.com/${process.env.NEXT_PUBLIC_GCS_BUCKET_NAME}/${destination}`;

      const jobResponse = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gcsUrl,
          gcsObjectPath: destination,
          surgeryName: selectedSurgery,
          residentName,
          additionalContext,
          withVideo: isVideo,
          videoAnalysis: isVideo && videoAnalysis,
        }),
      });

      if (!jobResponse.ok) {
        const errorData = await jobResponse.json();
        throw new Error(errorData.message || 'Failed to submit analysis job.');
      }

      const { jobId } = await jobResponse.json();
      pollJobStatus(jobId);

    } catch (error) {
      console.error('Error during analysis submission:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred.');
      setIsAnalyzing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this evaluation?')) {
        try {
            const response = await fetch(`/api/evaluations/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete evaluation.');
            }
            fetchPastEvaluations();
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An error occurred while deleting.');
        }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
      <div className="max-w-xl w-full mx-auto bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg">
        <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Surgical AI Evaluator
            </h1>
            <p className="text-md text-gray-500 dark:text-gray-400">
              Upload an audio or video recording of a procedure for automated evaluation.
            </p>
        </div>

        <div className="space-y-6">
          <SurgerySelector selected={selectedSurgery} setSelected={setSelectedSurgery} />
          <input
              type="text"
              value={residentName}
              onChange={(e) => setResidentName(e.target.value)}
              className="block w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white py-3 px-4 rounded-lg leading-tight focus:outline-none focus:bg-white dark:focus:bg-slate-600 focus:border-brand-green-500 shadow-sm"
              placeholder="Enter Resident's Name or Evaluation Title"
          />
          <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              className="block w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white py-3 px-4 rounded-lg leading-tight focus:outline-none focus:bg-white dark:focus:bg-slate-600 focus:border-brand-green-500 shadow-sm"
              placeholder="Additional Context (This was a simulation, patient had significant issues, etc.)"
              rows={3}
          />

          <div>
            <label htmlFor="file-upload" className="block text-lg font-medium text-gray-700 dark:text-gray-200">
              Upload Recording
            </label>
            <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 dark:border-gray-500/50 px-6 py-10">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12A2.25 2.25 0 0120.25 20.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
                </svg>
                <div className="mt-4 flex text-sm leading-6 text-gray-600 dark:text-gray-400">
                  <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white dark:bg-slate-800 font-semibold text-brand-green focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-green focus-within:ring-offset-2 dark:focus-within:ring-offset-slate-800 hover:text-brand-green-500">
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="audio/*,video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs leading-5 text-gray-600 dark:text-gray-400">{file ? file.name : "Audio or Video File"}</p>
              </div>
            </div>
          </div>
        </div>

        {isVideo && (
          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={videoAnalysis}
                onChange={(e) => setVideoAnalysis(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-green focus:ring-brand-green"
              />
              <span className="ml-2 text-gray-700 dark:text-gray-300">Enable Visual Analysis</span>
            </label>
          </div>
        )}

        {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 my-6 rounded-md" role="alert">
                <p className="font-bold">Error</p>
                <p>{error}</p>
            </div>
        )}

        <div className="mt-8">
          <button
            onClick={handleSubmit}
            disabled={isAnalyzing || !file || !selectedSurgery || !residentName}
            className="w-full bg-brand-green text-white px-6 py-3 rounded-lg shadow-md text-lg font-semibold
                      hover:bg-brand-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Recording'}
          </button>
        </div>

        {isAnalyzing && (
          <div className="mt-6 transition-opacity duration-500 ease-in-out opacity-100">
            <p className="text-center text-sm text-gray-600 dark:text-gray-300 mb-2">{progressStep}</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div
                className="progress-bar-glow h-2.5 rounded-full transition-all duration-500 ease-in-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {pastEvaluations.length > 0 && (
          <div className="mt-10">
            <details open>
              <summary className="text-lg font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                Past Evaluations
              </summary>
              <ul className="mt-4 space-y-3">
                {pastEvaluations.map(evalItem => {
                  // FIX: Determine which analysis was performed
                  const visualAnalysisPerformed = evalItem.withVideo && evalItem.videoAnalysis;
                  return (
                    <li key={evalItem.id} className="flex justify-between items-center p-3 border rounded-lg dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-slate-700">
                      <a href={`/results/${evalItem.id}`} className="flex-grow flex justify-between items-center">
                        <div>
                          <span className="font-medium text-gray-800 dark:text-gray-200">{evalItem.surgery}{evalItem.residentName ? ` - ${evalItem.residentName}`: ''}</span>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">
                            {evalItem.date}
                          </span>
                        </div>
                        <Image
                            src={visualAnalysisPerformed ? '/images/videoSmall.svg' : '/images/audioSmall.svg'}
                            alt={visualAnalysisPerformed ? 'Visual analysis' : 'Audio analysis'}
                            width={90}
                            height={90}
                            className="flex-shrink-0"
                        />
                      </a>
                      <button 
                        onClick={() => handleDelete(evalItem.id)}
                        className="ml-4 p-1.5 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        aria-label={`Delete evaluation for ${evalItem.surgery}`}
                      >
                          <Image src="/images/trashcanIcon.svg" alt="Delete" width={24} height={24} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </details>
          </div>
        )}
      </div>
      <Analytics />
    </div>
  );
}