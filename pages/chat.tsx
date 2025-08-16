import { useState, useContext, useRef, useEffect } from 'react';
import Image from 'next/image';
import { GlassCard, GlassInput } from '../components/ui';
import SelectionModal from '../components/ui/SelectionModal';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import { AuthContext } from '../lib/auth';
import { useApi } from '../lib/useApi';

// Type definitions
interface Message { text: string; sender: 'user' | 'gemini'; }
interface Resident { id: string; name: string; photoUrl?: string | null; year?: string; }
interface Supervisor { id: string; name: string; photoUrl?: string | null; type: 'Attending' | 'Program Director'; }
interface Case { id: string; surgery: string; date: string; residentName?: string; }
type ModalType = 'resident' | 'attending' | 'case' | null;

interface ChatContext {
  residents: { resident: any; evaluations: any[] }[];
  attendings: { supervisor: any; evaluations: any[] }[];
  cases: { caseData: any }[];
}

const initialContext: ChatContext = { residents: [], attendings: [], cases: [] };

// --- NEW COMPONENT: ContextPills ---
// This component displays the selected items for analysis above the chat input.
const ContextPills = ({ context, onRemove }: { context: ChatContext; onRemove: (type: 'resident' | 'attending' | 'case', id: string) => void; }) => {
  const residents = context.residents.map(r => ({ ...r.resident, type: 'resident' as const }));
  const attendings = context.attendings.map(a => ({ ...a.supervisor, type: 'attending' as const }));
  const cases = context.cases.map(c => ({ ...c.caseData, id: c.caseData.id, name: c.caseData.surgeryName || `Case #${c.caseData.id}`, type: 'case' as const }));

  const allItems = [...residents, ...attendings, ...cases];

  if (allItems.length === 0) return null;

  return (
    <div className="px-4 pb-2">
      <GlassCard variant="subtle" className="p-2">
        <div className="flex flex-wrap gap-2">
          {allItems.map(item => (
            <div key={`${item.type}-${item.id}`} className="flex items-center gap-2 bg-glass-300 rounded-full px-3 py-1 text-sm text-text-primary">
              <span>{item.name}</span>
              <button onClick={() => onRemove(item.type, item.id)} className="text-text-tertiary hover:text-white">
                &times;
              </button>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};


const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<ChatContext>(initialContext);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalData, setModalData] = useState<any[]>([]);

  const auth = useContext(AuthContext);
  const { apiFetch } = useApi();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- Message Handling ---
  const handleSendMessage = async () => {
    if (input.trim() === '' && messages.length === 0) return;
    const currentInput = input;
    const newMessages: Message[] = currentInput ? [...messages, { text: currentInput, sender: 'user' }] : [...messages];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Create a detailed summary of the context for the AI
    const contextSummary = {
      residents: context.residents.map(r => {
        // For each resident, map over their evaluations and include the detailed results
        const detailedEvaluations = r.evaluations.map(evaluation => {
          // Omit the lengthy transcript from each evaluation result
          const { transcription, ...restOfResult } = evaluation.result || {};
          return {
            id: evaluation.id,
            surgeryName: evaluation.surgeryName,
            finalScore: evaluation.finalScore,
            evaluation: restOfResult,
          };
        });

        return {
          id: r.resident.id,
          name: r.resident.name,
          evaluations: detailedEvaluations, // Send the detailed evaluations
        };
      }),
      attendings: context.attendings.map(a => ({
        id: a.supervisor.id,
        name: a.supervisor.name,
        evaluationCount: a.evaluations.length,
      })),
      cases: context.cases.map(c => {
        const { transcription, ...restOfResult } = c.caseData.result || {};
        return {
          id: c.caseData.id,
          surgeryName: c.caseData.surgeryName,
          residentName: c.caseData.residentName,
          evaluation: restOfResult,
        };
      }),
    };

    try {
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        body: { history: newMessages, message: currentInput, context: contextSummary },
      });
      setMessages(prev => [...prev, { text: res.response, sender: 'gemini' }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { text: 'Sorry, I encountered an error.', sender: 'gemini' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Context & Modal Management ---
  const openModal = async (type: ModalType) => {
    setModalType(type);
    let data = [];
    if (type === 'resident') data = await apiFetch('/api/residents');
    if (type === 'attending') data = await apiFetch('/api/attendings');
    if (type === 'case') data = await apiFetch('/api/evaluations');
    setModalData(data);
  };

  const handleSelect = async (item: any) => {
    let contextMessage = '';

    if (modalType === 'resident') {
      if (context.residents.some(r => r.resident.id === item.id)) { setModalType(null); return; }
      const resident = await apiFetch(`/api/residents/${item.id}`);
      const evaluations = await apiFetch(`/api/residents/${item.id}/evaluations`);
      setContext(prev => ({ ...prev, residents: [...prev.residents, { resident, evaluations }] }));
      contextMessage = `Added for analysis: ${resident.name}`;
    }
    if (modalType === 'attending') {
      if (context.attendings.some(a => a.supervisor.id === item.id)) { setModalType(null); return; }
      const supervisor = await apiFetch(`/api/attendings/${item.id}`);
      const evaluations = await apiFetch(`/api/attendings/evaluations?id=${item.id}`);
      setContext(prev => ({ ...prev, attendings: [...prev.attendings, { supervisor, evaluations }] }));
      contextMessage = `Added for analysis: ${supervisor.name}`;
    }
    if (modalType === 'case') {
      if (context.cases.some(c => c.caseData.id === item.id)) { setModalType(null); return; }
      const caseData = await apiFetch(`/api/evaluations/${item.id}`);
      setContext(prev => ({ ...prev, cases: [...prev.cases, { caseData }] }));
      contextMessage = `Added for analysis: Case #${item.id} (${caseData.surgeryName})`;
    }
    
    setMessages(prev => {
        if (prev.length > 0 && prev[prev.length - 1].text === contextMessage) {
            return prev;
        }
        return [...prev, { text: contextMessage, sender: 'gemini' }];
    });
    setModalType(null);
  };

  const handleRemoveContextItem = (type: 'resident' | 'attending' | 'case', id: string) => {
    setContext(prev => {
      const newContext = { ...prev };
      if (type === 'resident') newContext.residents = prev.residents.filter(r => r.resident.id !== id);
      if (type === 'attending') newContext.attendings = prev.attendings.filter(a => a.supervisor.id !== id);
      if (type === 'case') newContext.cases = prev.cases.filter(c => c.caseData.id !== id);
      return newContext;
    });
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => { /* ... */ };

  const renderModalContent = () => {
    if (!modalData) return <p>Loading...</p>;
    if (modalType === 'resident' || modalType === 'attending') {
      return (
        <div className="space-y-2">
          {modalData.map((item: Resident | Supervisor) => (
            <GlassCard key={item.id} variant="subtle" hover onClick={() => handleSelect(item)} className="p-3">
              <div className="flex items-center space-x-4">
                <Image src={item.photoUrl || '/images/default-avatar.svg'} alt={item.name} width={40} height={40} className="rounded-full object-cover" />
                <div>
                  <p className="font-semibold text-text-primary">{item.name}</p>
                  <p className="text-sm text-text-tertiary">{'year' in item ? item.year : ('type' in item ? item.type : '')}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      );
    }
    if (modalType === 'case') {
      return (
        <div className="space-y-2">
          {modalData.map((item: Case) => (
            <GlassCard key={item.id} variant="subtle" hover onClick={() => handleSelect(item)} className="p-3">
              <p className="font-semibold text-text-primary">{item.surgery}</p>
              <p className="text-sm text-text-tertiary">{item.residentName} - {new Date(item.date).toLocaleDateString()}</p>
            </GlassCard>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <SelectionModal title={`Select ${modalType}`} isOpen={!!modalType} onClose={() => setModalType(null)}>
        {renderModalContent()}
      </SelectionModal>

      <div className="flex flex-col h-full bg-navy-900 rounded-4xl">
        <div className="flex-grow overflow-y-auto p-6 space-y-4 scrollbar-glass">
          <div className="text-center mb-8">
            <h1 className="heading-xl text-gradient">Hello, {auth?.user?.name?.split(' ')[0]}</h1>
            <p className="text-text-tertiary mt-2">How can I help you analyze performance today?</p>
          </div>
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'gemini' && <Image src="/images/logo.svg" alt="Veritas" width={40} height={40} className="rounded-full mt-1 flex-shrink-0" />}
              <GlassCard variant={msg.sender === 'user' ? 'strong' : 'subtle'} className="p-4 max-w-3xl">
                {msg.sender === 'gemini' ? (
                  <MarkdownRenderer content={msg.text} />
                ) : (
                  <p className="text-white whitespace-pre-wrap">{msg.text}</p>
                )}
              </GlassCard>
            </div>
          ))}
          {isLoading && <div className="text-center text-gray-400">Veritas is thinking...</div>}
          <div ref={chatEndRef} />
        </div>

        <ContextPills context={context} onRemove={handleRemoveContextItem} />

        <div className="p-4">
          <GlassCard variant="strong" className="p-2 flex items-center gap-2">
            <div className="relative group">
              <button className="p-3 text-white rounded-full hover:bg-glass-200 transition-colors">+</button>
              <div className="absolute bottom-full mb-2 w-48 bg-navy-700 rounded-xl shadow-lg p-2 hidden group-hover:block">
                <button onClick={() => fileInputRef.current?.click()} className="modal-menu-item">Upload File</button>
                <button onClick={() => openModal('resident')} className="modal-menu-item">Add Resident</button>
                <button onClick={() => openModal('attending')} className="modal-menu-item">Add Supervisor</button>
                <button onClick={() => openModal('case')} className="modal-menu-item">Add Case</button>
              </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <GlassInput
              className="flex-grow bg-transparent border-none focus:ring-0 text-lg"
              placeholder="Ask Veritas..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
            />
            <button onClick={handleSendMessage} className="p-3 text-white bg-brand-primary rounded-full hover:bg-brand-primary-hover transition-colors disabled:opacity-50" disabled={isLoading}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </GlassCard>
        </div>
      </div>
    </>
  );
};

export default ChatPage;