import React from 'react';
import { GlassSelect } from './ui';

// A list of surgeries that the user can select from.
// This could be fetched from a database in a real application.
const surgeries = [
  'Laparoscopic Inguinal Hernia Repair with Mesh (TEP)',
  'Laparoscopic Cholecystectomy',
  'Robotic Cholecystectomy',
  'Robotic Assisted Laparoscopic Inguinal Hernia Repair (TAPP)',
  'Robotic Lap Ventral Hernia Repair (TAPP)',
  'Laparoscopic Appendicectomy'
];

interface Props {
  selected: string;
  setSelected: (val: string) => void;
}

const SurgerySelector: React.FC<Props> = ({ selected, setSelected }) => {
  const surgeryOptions = surgeries.map(surgery => ({
    value: surgery,
    label: surgery
  }));

  return (
    <div>
      <label htmlFor="surgery-select" className="block mb-3 text-sm font-medium text-text-secondary">
        Select Surgery Type
      </label>
      <GlassSelect
        id="surgery-select"
        options={surgeryOptions}
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        placeholder="— Choose a procedure —"
        className="w-full"
      />
    </div>
  );
};

export default SurgerySelector;