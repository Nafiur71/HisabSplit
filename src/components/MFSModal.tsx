import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Send,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import type { MFSPlatform } from '../types';
import {
  generateMFSRequest,
  triggerNativeShare,
  copyToClipboard,
  MFS_CONFIG,
} from '../controllers/mfsController';

interface MFSModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAmount?: number;
  defaultReason?: string;
  defaultRecipientName?: string;
  defaultRecipientPhone?: string;
}

export const MFSModal: React.FC<MFSModalProps> = ({
  isOpen,
  onClose,
  defaultAmount = 500,
  defaultReason = 'Turf / Mess Split',
  defaultRecipientName = '',
  defaultRecipientPhone = '',
}) => {
  const [managerNumber, setManagerNumber] = useState<string>(() => {
    return localStorage.getItem('hisab_mfs_manager_number') || '01711223344';
  });
  const [platform, setPlatform] = useState<MFSPlatform>('bKash');
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [reason, setReason] = useState<string>(defaultReason);
  const [recipientName, setRecipientName] = useState<string>(defaultRecipientName);
  const [recipientPhone, setRecipientPhone] = useState<string>(defaultRecipientPhone);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setAmount(defaultAmount);
      setReason(defaultReason);
      setRecipientName(defaultRecipientName);
      setRecipientPhone(defaultRecipientPhone);
      setCopied(false);
    }
  }, [isOpen, defaultAmount, defaultReason, defaultRecipientName, defaultRecipientPhone]);

  useEffect(() => {
    localStorage.setItem('hisab_mfs_manager_number', managerNumber);
  }, [managerNumber]);

  if (!isOpen) return null;

  const mfsResult = generateMFSRequest(
    managerNumber,
    amount,
    reason,
    platform,
    recipientName,
    recipientPhone
  );

  const brand = MFS_CONFIG[platform];

  const handleCopy = async () => {
    const success = await copyToClipboard(mfsResult.message);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleNativeShare = async () => {
    await triggerNativeShare(`HisabSplit: ${reason}`, mfsResult.message);
  };

  const handleWhatsApp = () => {
    window.open(mfsResult.whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleMessenger = () => {
    window.open(mfsResult.messengerUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-[#0D1322] border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Brand Accent Line */}
        <div
          className="h-1.5 w-full transition-colors duration-300"
          style={{ backgroundColor: brand.color }}
        />

        <div className="p-6">
          {/* Title Row */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg transition-colors"
                style={{ backgroundColor: brand.color }}
              >
                {platform.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>MFS Payment Reminder</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-mono font-medium border"
                    style={{
                      borderColor: `${brand.color}55`,
                      color: brand.color,
                      backgroundColor: `${brand.color}15`,
                    }}
                  >
                    {brand.name} ({brand.bengaliName})
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Instant deep links for WhatsApp, Messenger & SMS
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Platform Selector Buttons */}
          <div className="grid grid-cols-4 gap-2 my-4">
            {(['bKash', 'Nagad', 'Rocket', 'Upay'] as MFSPlatform[]).map((p) => {
              const b = MFS_CONFIG[p];
              const isSelected = platform === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition-all border ${
                    isSelected
                      ? 'border-transparent text-white shadow-lg scale-102'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                  style={
                    isSelected
                      ? {
                          backgroundColor: b.color,
                          boxShadow: `0 0 16px ${b.color}55`,
                        }
                      : {}
                  }
                >
                  <span>{b.name}</span>
                  <span className="text-[10px] opacity-80">{b.bengaliName}</span>
                </button>
              );
            })}
          </div>

          {/* Form Inputs */}
          <div className="space-y-3.5 text-left text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Manager MFS Number ({platform})
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={managerNumber}
                    onChange={(e) => setManagerNumber(e.target.value)}
                    placeholder="e.g. 01711223344"
                    className="w-full bg-[#131C31] border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-fintech-cyan"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[10px] font-mono text-slate-500">
                    BD
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Amount (BDT)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-[#131C31] border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-turf-neon"
                  />
                  <span className="absolute right-2.5 top-2.5 text-xs font-bold text-turf-neon">
                    ৳
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Recipient Name (Optional)
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Siam / Rafi"
                  className="w-full bg-[#131C31] border border-slate-700/80 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Recipient Phone (For Direct WA)
                </label>
                <input
                  type="text"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="017xxxxxxxx"
                  className="w-full bg-[#131C31] border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Reason / Note
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Bashundhara Kings Turf match split"
                className="w-full bg-[#131C31] border border-slate-700/80 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-slate-500"
              />
            </div>

            {/* Generated Message Preview Card */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-turf-neon" />
                  Generated Reminder Message
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {mfsResult.message.length} chars
                </span>
              </div>
              <div className="p-3.5 bg-black/50 border border-slate-800 rounded-xl relative group">
                <p className="text-xs text-slate-200 leading-relaxed font-sans select-all whitespace-pre-wrap">
                  "{mfsResult.message}"
                </p>
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-turf-neon animate-pulse" />
                    USSD Code: <span className="font-mono text-white font-bold">{brand.ussdCode}</span>
                  </span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-slate-300 hover:text-white font-medium"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-turf-neon" />
                        <span className="text-turf-neon">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Sharing Buttons */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={handleWhatsApp}
              className="py-2.5 px-3 bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-[#25D366] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleMessenger}
              className="py-2.5 px-3 bg-[#0084FF]/15 hover:bg-[#0084FF]/25 border border-[#0084FF]/30 text-[#0084FF] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Messenger</span>
            </button>

            <button
              onClick={handleCopy}
              className={`py-2.5 px-3 border rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                copied
                  ? 'bg-turf-neon/20 border-turf-neon text-turf-neon'
                  : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              onClick={handleNativeShare}
              className="py-2.5 px-3 bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share...</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
