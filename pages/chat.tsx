import { useState, useContext, useRef, useEffect, ReactNode } from 'react';
import Image from 'next/image';
import { GlassCard, GlassInput } from '../components/ui';
import SelectionModal from '../components/ui/SelectionModal';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import { AuthContext } from '../lib/auth';
import { useApi } from '../lib/useApi';

// --- TYPE DEFINITIONS ---
interface Message {
  text: string;
  sender: 'user' | 'gemini';
  context?: ChatContext;
}
interface Resident { id: string; name: string; photoUrl?: string | null; year?: string; }
interface Supervisor { id: string; name: string; photoUrl?: string | null; type: 'Attending' | 'Program Director'; }
interface Case { id: string; surgery: string; date: string; residentName?: string; surgeryName?: string; }
type ModalType = 'resident' | 'attending' | 'case' | null;

interface ChatContext {
  residents: { resident: any; evaluations: any[] }[];
  attendings: { supervisor: any; evaluations: any[] }[];
  cases: { caseData: any }[];
}

const initialContext: ChatContext = { residents: [], attendings: [], cases: [] };

// --- UI COMPONENTS ---

const MessageContextPills = ({ context }: { context: ChatContext }) => {
  const residents = context.residents.map(r => ({ ...r.resident, type: 'resident' as const }));
  const attendings = context.attendings.map(a => ({ ...a.supervisor, type: 'attending' as const }));
  const cases = context.cases.map(c => ({ ...c.caseData, id: c.caseData.id, name: c.caseData.surgeryName || `Case #${c.caseData.id}`, type: 'case' as const }));

  const allItems = [...residents, ...attendings, ...cases];

  if (allItems.length === 0) return null;

  return (
    <div className="mb-3 p-2 rounded-2xl bg-black bg-opacity-20">
      <div className="flex flex-wrap gap-2">
        {allItems.map(item => (
          <div key={`${item.type}-${item.id}`} className="flex items-center gap-2 bg-glass-400 rounded-full px-3 py-1 text-xs text-text-primary">
            <span>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const StagingContextPills = ({ context, onRemove }: { context: ChatContext; onRemove: (type: 'resident' | 'attending' | 'case', id: string) => void; }) => {
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
              <button onClick={() => onRemove(item.type, item.id)} className="text-text-tertiary hover:text-white text-lg leading-none">&times;</button>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};

// --- MAIN CHAT PAGE COMPONENT ---
const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<ChatContext>(initialContext);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalData, setModalData] = useState<any[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const auth = useContext(AuthContext);
  const { apiFetch } = useApi();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  const handleSendMessage = async () => {
    const isContextEmpty = context.residents.length === 0 && context.attendings.length === 0 && context.cases.length === 0;
    if (input.trim() === '' && isContextEmpty) return;

    const currentInput = input;
    const contextForMessage = { ...context };

    const newUserMessage: Message = {
        text: currentInput,
        sender: 'user',
        context: contextForMessage
    };

    const newMessages: Message[] = [...messages, newUserMessage];

    setMessages(newMessages);
    setInput('');
    setContext(initialContext);
    setIsLoading(true);

    const contextSummary = {
        residents: contextForMessage.residents.map(r => ({
            id: r.resident.id,
            name: r.resident.name,
            evaluations: r.evaluations.map(e => ({ id: e.id, surgeryName: e.surgery, finalScore: e.result?.finalScore, evaluation: e.result })),
        })),
        attendings: contextForMessage.attendings.map(a => ({
            id: a.supervisor.id,
            name: a.supervisor.name,
            type: a.supervisor.type,
            evaluations: a.evaluations.map(e => ({ id: e.id, surgeryName: e.surgery, residentName: e.residentName, finalScore: e.result?.finalScore, evaluation: e.result })),
        })),
        cases: contextForMessage.cases.map(c => ({
            id: c.caseData.id,
            surgeryName: c.caseData.surgeryName,
            residentName: c.caseData.residentName,
            evaluation: c.caseData.result,
        })),
    };

    try {
      const historyForApi = newMessages.map(({ text, sender }) => ({ text, sender }));
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        body: { history: historyForApi, message: currentInput, context: contextSummary },
      });
      setMessages(prev => [...prev, { text: res.response, sender: 'gemini' }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { text: 'Sorry, I encountered an error.', sender: 'gemini' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = async (type: ModalType) => {
    setModalType(type);
    let data = [];
    if (type === 'resident') data = await apiFetch('/api/residents');
    if (type === 'attending') data = await apiFetch('/api/attendings');
    if (type === 'case') data = await apiFetch('/api/evaluations');
    setModalData(data);
  };

  const handleSelect = async (item: any) => {
    if (modalType === 'resident') {
      if (context.residents.some(r => r.resident.id === item.id)) { setModalType(null); return; }
      const [resident, evaluations] = await Promise.all([
        apiFetch(`/api/residents/${item.id}`),
        apiFetch(`/api/residents/${item.id}/evaluations`)
      ]);
      setContext(prev => ({ ...prev, residents: [...prev.residents, { resident, evaluations }] }));
    }
    
    if (modalType === 'attending') {
      if (context.attendings.some(a => a.supervisor.id === item.id)) { setModalType(null); return; }
      const supervisor = item.type === 'Program Director' ? await apiFetch(`/api/program-directors/${item.id}`) : await apiFetch(`/api/attendings/${item.id}`);
      const evaluations = item.type === 'Program Director' ? await apiFetch(`/api/program-directors/evaluations?id=${item.id}`) : await apiFetch(`/api/attendings/evaluations?id=${item.id}`);
      setContext(prev => ({ ...prev, attendings: [...prev.attendings, { supervisor, evaluations }] }));
    }

    if (modalType === 'case') {
      if (context.cases.some(c => c.caseData.id === item.id)) { setModalType(null); return; }
      const caseData = await apiFetch(`/api/evaluations/${item.id}`);
      setContext(prev => ({ ...prev, cases: [...prev.cases, { caseData }] }));
    }
    
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

  const renderModalContent = (): ReactNode => {
    if (!modalData) return <p>Loading...</p>;

    const renderItem = (item: any, onClick: () => void) => {
      if (item.type === 'Attending' || item.type === 'Program Director' || 'year' in item) { // Resident or Supervisor
        const profile = item as Resident | Supervisor;
        return (
          <GlassCard key={profile.id} variant="subtle" hover onClick={onClick} className="p-3">
            <div className="flex items-center space-x-4">
              <Image src={profile.photoUrl || '/images/default-avatar.svg'} alt={profile.name} width={40} height={40} className="rounded-full object-cover" />
              <div>
                <p className="font-semibold text-text-primary">{profile.name}</p>
                <p className="text-sm text-text-tertiary">{'year' in profile ? profile.year : ('type' in profile ? profile.type : '')}</p>
              </div>
            </div>
          </GlassCard>
        );
      }
      if ('surgery' in item) { // Case
        const caseItem = item as Case;
        return (
          <GlassCard key={caseItem.id} variant="subtle" hover onClick={onClick} className="p-3">
            <p className="font-semibold text-text-primary">{caseItem.surgery}</p>
            <p className="text-sm text-text-tertiary">{caseItem.residentName} - {new Date(caseItem.date).toLocaleDateString()}</p>
          </GlassCard>
        );
      }
      return null;
    };

    return (
      <div className="space-y-2">
        {modalData.map((item) => renderItem(item, () => handleSelect(item)))}
      </div>
    );
  };

  return (
    <>
      <SelectionModal title={`Select ${modalType === 'attending' ? 'Supervisor' : modalType}`} isOpen={!!modalType} onClose={() => setModalType(null)}>
        {renderModalContent()}
      </SelectionModal>

      <div className="flex flex-col h-full bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-4xl">
        <div className="flex-grow overflow-y-auto p-6 space-y-4 scrollbar-glass">
          <div className="text-center mb-8">
            <h1 className="heading-xl text-animated-gradient">Hello, {auth?.user?.name?.split(' ')[0]}</h1>
            <p className="text-text-tertiary mt-2">How can I help you analyze performance today?</p>
          </div>
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'gemini' && <Image src="/images/logo.png" alt="Veritas" width={40} height={40} className="rounded-full mt-1 flex-shrink-0" />}
              <GlassCard variant={msg.sender === 'user' ? 'strong' : 'subtle'} className="p-4 max-w-3xl">
                {msg.sender === 'user' && msg.context && <MessageContextPills context={msg.context} />}
                
                {msg.sender === 'gemini' ? (
                  <MarkdownRenderer content={msg.text} />
                ) : (
                  msg.text && <p className="text-white whitespace-pre-wrap">{msg.text}</p>
                )}
              </GlassCard>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-4 justify-start">
              <Image src="/images/logo.png" alt="Veritas" width={40} height={40} className="rounded-full mt-1 flex-shrink-0" />
              <GlassCard variant="subtle" className="p-4 max-w-3xl">
                <div className="flex items-center gap-2 text-text-tertiary">
                  <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
                  <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </GlassCard>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <StagingContextPills context={context} onRemove={handleRemoveContextItem} />

        <div className="p-4">
          <GlassCard variant="strong" className="p-2 flex items-center gap-2">
            <div className="relative" ref={menuRef}>
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-3 text-white rounded-full hover:bg-glass-200 transition-colors">+</button>
              {isMenuOpen && (
                <div className="absolute bottom-full mb-2 w-48 bg-navy-700 rounded-xl shadow-lg p-2">
                  <button onClick={() => { openModal('resident'); setIsMenuOpen(false); }} className="modal-menu-item">Add Resident</button>
                  <button onClick={() => { openModal('attending'); setIsMenuOpen(false); }} className="modal-menu-item">Add Supervisor</button>
                  <button onClick={() => { openModal('case'); setIsMenuOpen(false); }} className="modal-menu-item">Add Case</button>
                </div>
              )}
            </div>
            <GlassInput
              className="flex-grow bg-transparent border-none focus:ring-0 text-lg"
              placeholder="Ask Veritas..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
            />
            <button onClick={handleSendMessage} className="p-3 text-white bg-brand-primary rounded-full hover:bg-brand-primary-hover transition-colors disabled:opacity-50" disabled={isLoading}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </GlassCard>
        </div>
      </div>
    </>
  );
};

export default ChatPage;