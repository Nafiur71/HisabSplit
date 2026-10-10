import { useState, useEffect } from 'react';
import {
  Utensils,
  Database,
  Send,
  Sparkles,
} from 'lucide-react';
import {
  initializeDatabase,
  db,
  INITIAL_MESS_STATE,
  resetDatabaseToDefault,
} from './db/db';
import type { MessState } from './types';
import { MessModule } from './components/MessModule';
import { MFSModal } from './components/MFSModal';
import { SchemaViewerModal } from './components/SchemaViewerModal';

export function App() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [messState, setMessState] = useState<MessState>(INITIAL_MESS_STATE);

  const [mfsModal, setMfsModal] = useState<{
    isOpen: boolean;
    defaultAmount: number;
    defaultReason: string;
    defaultRecipientName?: string;
    defaultRecipientPhone?: string;
  }>({
    isOpen: false,
    defaultAmount: 400,
    defaultReason: 'Mess advance deposit',
  });

  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState<boolean>(false);

  const loadDatabaseStates = async () => {
    try {
      await initializeDatabase();

      const savedMessId = localStorage.getItem('hisabsplit_active_mess_id') || 'current-mess';
      let mess = await db.mess_state.get(savedMessId);
      if (!mess) {
        const all = await db.mess_state.toArray();
        if (all.length > 0) mess = all[0];
      }
      if (mess) setMessState(mess);
    } catch (err) {
      console.error('Error loading IndexedDB data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDatabaseStates();
  }, []);

  const handleOpenMFS = (opts: {
    amount: number;
    reason: string;
    recipientName?: string;
    recipientPhone?: string;
  }) => {
    setMfsModal({
      isOpen: true,
      defaultAmount: opts.amount,
      defaultReason: opts.reason,
      defaultRecipientName: opts.recipientName,
      defaultRecipientPhone: opts.recipientPhone,
    });
  };

  const handleResetData = async () => {
    await resetDatabaseToDefault();
    await loadDatabaseStates();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070A12] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 animate-pulse">
            <Sparkles className="w-5 h-5 animate-spin" />
          </div>
          <span className="text-xs font-mono text-slate-400">
            Loading HisabSplit Mess Tracker...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#090D16] text-slate-100 pb-16 font-sans relative selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Subtle Ambient Background Depth */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-emerald-500/8 blur-[120px] rounded-full" />
        <div className="absolute top-1/4 -right-40 w-[400px] h-[300px] bg-sky-500/5 blur-[100px] rounded-full" />
      </div>

      {/* Sleek Top Navigation */}
      <header className="sticky top-0 z-40 w-full bg-[#090D16]/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Mess Branding */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-mono font-black text-lg shadow-md shadow-emerald-500/20">
              ৳
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white tracking-tight">
                  Hisab<span className="text-emerald-400">Split</span>
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 flex items-center gap-1 font-medium">
                  <Utensils className="w-3 h-3" />
                  Mess & Meal Manager
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                handleOpenMFS({
                  amount: 1000,
                  reason: 'Mess advance deposit',
                })
              }
              className="px-3.5 py-1.5 bg-[#E2136E] hover:bg-[#C70059] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>MFS Request</span>
            </button>

            <button
              onClick={() => setIsSchemaModalOpen(true)}
              className="p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs transition-colors"
              title="Schema & Database"
            >
              <Database className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Main App Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 relative z-10">
        <MessModule initialState={messState} onOpenMFS={handleOpenMFS} />
      </main>

      {/* MFS Modal */}
      <MFSModal
        isOpen={mfsModal.isOpen}
        onClose={() => setMfsModal((prev) => ({ ...prev, isOpen: false }))}
        defaultAmount={mfsModal.defaultAmount}
        defaultReason={mfsModal.defaultReason}
        defaultRecipientName={mfsModal.defaultRecipientName}
        defaultRecipientPhone={mfsModal.defaultRecipientPhone}
      />

      {/* Schema Inspector Modal */}
      <SchemaViewerModal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
        onDataReset={handleResetData}
      />
    </div>
  );
}

export default App;

