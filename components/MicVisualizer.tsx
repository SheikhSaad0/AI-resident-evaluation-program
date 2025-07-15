// components/MicVisualizer.tsx
import { useEffect, useRef } from 'react';

interface MicVisualizerProps {
  stream: MediaStream | null;
}

const MicVisualizer = ({ stream }: MicVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!stream || !canvasRef.current) return;

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let animationFrameId: number;

    const draw = () => {
      animationFrameId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      if (canvasCtx) {
        canvasCtx.fillStyle = 'rgba(26, 26, 36, 0.8)';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = dataArray[i] / 2;
          canvasCtx.fillStyle = `rgba(0, 122, 255, ${barHeight / 100})`;
          canvasCtx.fillRect(x, canvas.height - barHeight - 1, barWidth, barHeight);
          x += barWidth + 1;
        }
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      audioContext.close();
    };
  }, [stream]);

  return <canvas ref={canvasRef} width="200" height="40" className="rounded-lg" />;
};

export default MicVisualizer;