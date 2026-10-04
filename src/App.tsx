import { useState, useEffect } from 'react';
import {
  Trophy,
  Utensils,
  Compass,
  Database,
  Send,
  Sparkles,
} from 'lucide-react';
import {
  initializeDatabase,
  db,
  INITIAL_TURF_STATE,
  INITIAL_MESS_STATE,
  INITIAL_TOUR_STATE,
  resetDatabaseToDefault,
} from './db/db';
import type { TurfState, MessState, TourState } from './types';
import { TurfModule } from './components/TurfModule';
import { MessModule } from './components/MessModule';
import { TourModule } from './components/TourModule';
import { MFSModal } from './components/MFSModal';
import { SchemaViewerModal } from './components/SchemaViewerModal';

export function App() {
  const [activeTab, setActiveTab] = useState<'turf' | 'mess' | 'tour'>('turf');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [turfState, setTurfState] = useState<TurfState>(INITIAL_TURF_STATE);
  const [messState, setMessState] = useState<MessState>(INITIAL_MESS_STATE);
  const [tourState, setTourState] = useState<TourState>(INITIAL_TOUR_STATE);

  const [mfsModal, setMfsModal] = useState<{
    isOpen: boolean;
    defaultAmount: number;
    defaultReason: string;
    defaultRecipientName?: string;
    defaultRecipientPhone?: string;
  }>({
    isOpen: false,
    defaultAmount: 400,
    defaultReason: 'HisabSplit share',
  });

  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState<boolean>(false);

  const loadDatabaseStates = async () => {
    try {
      await initializeDatabase();

      const turf = await db.turf_state.get('current-turf');
      if (turf) setTurfState(turf);

      const savedMessId = localStorage.getItem('hisabsplit_active_mess_id') || 'current-mess';
      let mess = await db.mess_state.get(savedMessId);
      if (!mess) {
        const all = await db.mess_state.toArray();
        if (all.length > 0) mess = all[0];
      }
      if (mess) setMessState(mess);

      const tour = await db.tour_state.get('current-tour');
      if (tour) setTourState(tour);
    } catch (err) {
      console.error('Error loading IndexedDB data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Detect URL query parameter for direct tab or mess invitation link
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const inviteParam = params.get('invite') || params.get('code');
      if (tabParam === 'mess' || inviteParam) {
        setActiveTab('mess');
      } else if (tabParam === 'turf' || tabParam === 'tour') {
        setActiveTab(tabParam);
      }
    }
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
            Loading HisabSplit...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#070A12] text-slate-100 pb-24 md:pb-16 font-sans">
      {/* Sleek Top Navigation */}
      <header className="sticky top-0 z-40 w-full bg-[#070A12]/85 backdrop-blur-2xl border-b border-slate-800/80">
        <div className="w-full px-4 sm:px-6 md:px-8 xl:px-12 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-black font-mono font-black text-base shadow-sm">
              ৳
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white tracking-tight">
                  Hisab<span className="text-emerald-400">Split</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60 hidden sm:inline-block">
                  Smart Splitter
                </span>
              </div>
            </div>
          </div>

          {/* Center Segmented Pill Switcher (Desktop) */}
          <div className="hidden md:flex items-center bg-[#111624] p-1 rounded-2xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('turf')}
              className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
                activeTab === 'turf'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Turf</span>
            </button>

            <button
              onClick={() => setActiveTab('mess')}
              className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
                activeTab === 'mess'
                  ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Mess</span>
            </button>

            <button
              onClick={() => setActiveTab('tour')}
              className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
                activeTab === 'tour'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Tour</span>
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                handleOpenMFS({
                  amount: 500,
                  reason: 'HisabSplit payment',
                })
              }
              className="px-3.5 py-1.5 bg-[#E2136E] hover:bg-[#C70059] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>MFS Request</span>
            </button>

            <button
              onClick={() => setIsSchemaModalOpen(true)}
              className="p-2 bg-[#111624] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs transition-colors"
              title="Schema & Database"
            >
              <Database className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Main App Container (100% Width Full Screen) */}
      <main className="w-full px-4 sm:px-6 md:px-8 xl:px-12 pt-6">
        {activeTab === 'turf' && (
          <TurfModule initialState={turfState} onOpenMFS={handleOpenMFS} />
        )}

        {activeTab === 'mess' && (
          <MessModule initialState={messState} onOpenMFS={handleOpenMFS} />
        )}

        {activeTab === 'tour' && (
          <TourModule initialState={tourState} onOpenMFS={handleOpenMFS} />
        )}
      </main>

      {/* Clean Mobile Floating Bottom Bar */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-40 bg-[#0E131F]/90 backdrop-blur-2xl border border-slate-800/80 rounded-2xl p-1.5 shadow-2xl flex items-center justify-around text-xs">
        <button
          onClick={() => setActiveTab('turf')}
          className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all ${
            activeTab === 'turf'
              ? 'bg-emerald-500/15 text-emerald-300 font-bold'
              : 'text-slate-400'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span className="text-[10px]">Turf</span>
        </button>

        <button
          onClick={() => setActiveTab('mess')}
          className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all ${
            activeTab === 'mess'
              ? 'bg-sky-500/15 text-sky-300 font-bold'
              : 'text-slate-400'
          }`}
        >
          <Utensils className="w-4 h-4" />
          <span className="text-[10px]">Mess</span>
        </button>

        <button
          onClick={() => setActiveTab('tour')}
          className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all ${
            activeTab === 'tour'
              ? 'bg-amber-500/15 text-amber-300 font-bold'
              : 'text-slate-400'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span className="text-[10px]">Tour</span>
        </button>
      </div>

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
