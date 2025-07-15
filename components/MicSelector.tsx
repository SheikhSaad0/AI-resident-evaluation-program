// components/MicSelector.tsx
import GlassSelect from './ui/GlassSelect'; // <-- FIX: Changed to a default import

interface MicSelectorProps {
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  setSelectedDeviceId: (deviceId: string) => void;
  disabled?: boolean;
}

const MicSelector = ({ devices, selectedDeviceId, setSelectedDeviceId, disabled }: MicSelectorProps) => {
  const micOptions = devices.map(device => ({
    value: device.deviceId,
    label: device.label || `Microphone ${devices.indexOf(device) + 1}`
  }));

  return (
    <GlassSelect
      options={micOptions}
      value={selectedDeviceId}
      // vvv FIX: Added the correct type for the event object
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedDeviceId(e.target.value)}
      // ^^^ FIX
      disabled={disabled}
      placeholder="Select a Microphone"
    />
  );
};

export default MicSelector;