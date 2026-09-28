import React, { useState, useEffect } from 'react';
import {
  Database,
  X,
  Download,
  Upload,
  RotateCcw,
  Check,
  Table as TableIcon,
  Code,
  Layers,
  Copy,
} from 'lucide-react';
import { db, resetDatabaseToDefault, exportDatabaseToJson, importDatabaseFromJson } from '../db/db';
import type { User, Group, GroupMember, Transaction } from '../types';

interface SchemaViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataReset: () => void;
}

export const SchemaViewerModal: React.FC<SchemaViewerModalProps> = ({
  isOpen,
  onClose,
  onDataReset,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'groups' | 'group_members' | 'transactions' | 'raw_json'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rawJson, setRawJson] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchDatabaseData = async () => {
    try {
      const u = await db.users.toArray();
      const g = await db.groups.toArray();
      const gm = await db.group_members.toArray();
      const tx = await db.transactions.toArray();
      const json = await exportDatabaseToJson();

      setUsers(u);
      setGroups(g);
      setGroupMembers(gm);
      setTransactions(tx);
      setRawJson(json);
    } catch (err) {
      console.error('Failed to load DB schema:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDatabaseData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(rawJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportDownload = () => {
    const blob = new Blob([rawJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hisab_split_database_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Database exported successfully as JSON!');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const success = await importDatabaseFromJson(content);
      if (success) {
        setStatusMessage('Database imported successfully!');
        await fetchDatabaseData();
        onDataReset();
      } else {
        setStatusMessage('Failed to import database. Invalid JSON format.');
      }
      setTimeout(() => setStatusMessage(null), 3000);
    };
    reader.readAsText(file);
  };

  const handleResetToDefault = async () => {
    if (window.confirm('Reset local IndexedDB to Bangladeshi demo seed data?')) {
      await resetDatabaseToDefault();
      await fetchDatabaseData();
      onDataReset();
      setStatusMessage('Reset to Bangladeshi demo data!');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#0D1322] border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-fintech-cyan/15 border border-fintech-cyan/30 text-fintech-cyan flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Relational Database & Schema Inspector</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-turf-neon/15 text-turf-neon border border-turf-neon/30">
                  IndexedDB / Dexie.js
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Maps directly to relational concepts: Users, Groups, Group_Members & Transactions
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

        {/* Toolbar & Tabs */}
        <div className="p-3 sm:px-5 bg-[#090E1B] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'users'
                  ? 'bg-fintech-cyan/20 text-fintech-cyan border border-fintech-cyan/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Users ({users.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('groups')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'groups'
                  ? 'bg-fintech-cyan/20 text-fintech-cyan border border-fintech-cyan/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Groups ({groups.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('group_members')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'group_members'
                  ? 'bg-fintech-cyan/20 text-fintech-cyan border border-fintech-cyan/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Group_Members ({groupMembers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'transactions'
                  ? 'bg-fintech-cyan/20 text-fintech-cyan border border-fintech-cyan/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Transactions ({transactions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('raw_json')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'raw_json'
                  ? 'bg-turf-neon/20 text-turf-neon border border-turf-neon/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Full Raw JSON</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportDownload}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1 font-medium transition-colors"
              title="Download JSON Backup"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            <label className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1 font-medium cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>

            <button
              onClick={handleResetToDefault}
              className="px-2.5 py-1 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 rounded-lg flex items-center gap-1 font-medium transition-colors"
              title="Restore Bangladeshi Demo Data"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Data</span>
            </button>
          </div>
        </div>

        {/* Status Toast Alert */}
        {statusMessage && (
          <div className="px-5 py-2 bg-turf-neon/15 border-b border-turf-neon/30 text-turf-neon text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-xs">
          {/* USERS TABLE */}
          {activeTab === 'users' && (
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[#090E1B] text-slate-400 font-mono">
                  <tr>
                    <th className="p-3">id</th>
                    <th className="p-3">name</th>
                    <th className="p-3">phone</th>
                    <th className="p-3">registration_date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/30">
                      <td className="p-3 font-mono text-turf-neon">{u.id}</td>
                      <td className="p-3 font-bold text-white">{u.name}</td>
                      <td className="p-3 font-mono text-slate-300">{u.phone}</td>
                      <td className="p-3 font-mono text-slate-500">{u.registration_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* GROUPS TABLE */}
          {activeTab === 'groups' && (
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[#090E1B] text-slate-400 font-mono">
                  <tr>
                    <th className="p-3">id</th>
                    <th className="p-3">name</th>
                    <th className="p-3">type</th>
                    <th className="p-3">creator_id</th>
                    <th className="p-3">description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {groups.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-800/30">
                      <td className="p-3 font-mono text-amber-400">{g.id}</td>
                      <td className="p-3 font-bold text-white">{g.name}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded font-mono font-bold uppercase text-[10px] bg-slate-800 border border-slate-700 text-slate-300">
                          {g.type}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-400">{g.creator_id}</td>
                      <td className="p-3 text-slate-400">{g.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* GROUP MEMBERS TABLE */}
          {activeTab === 'group_members' && (
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[#090E1B] text-slate-400 font-mono">
                  <tr>
                    <th className="p-3">group_id</th>
                    <th className="p-3">user_id</th>
                    <th className="p-3">status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {groupMembers.map((gm, i) => (
                    <tr key={`${gm.group_id}-${gm.user_id}-${i}`} className="hover:bg-slate-800/30">
                      <td className="p-3 font-mono text-amber-400">{gm.group_id}</td>
                      <td className="p-3 font-mono text-turf-neon">{gm.user_id}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          {gm.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TRANSACTIONS TABLE */}
          {activeTab === 'transactions' && (
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[#090E1B] text-slate-400 font-mono">
                  <tr>
                    <th className="p-3">id</th>
                    <th className="p-3">group_id</th>
                    <th className="p-3">amount</th>
                    <th className="p-3">description</th>
                    <th className="p-3">split_data (JSON matrix)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/30">
                      <td className="p-3 font-mono text-fintech-cyan">{tx.id}</td>
                      <td className="p-3 font-mono text-amber-400">{tx.group_id}</td>
                      <td className="p-3 font-mono font-bold text-white">৳{tx.amount}</td>
                      <td className="p-3 text-slate-300">{tx.description}</td>
                      <td className="p-3">
                        <pre className="bg-black/60 p-2 rounded border border-slate-800 font-mono text-[10px] text-slate-300 max-w-xs overflow-x-auto">
                          {JSON.stringify(tx.split_data, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* RAW JSON VIEW */}
          {activeTab === 'raw_json' && (
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 font-mono text-[11px]">
                  Full IndexedDB Snapshot
                </span>
                <button
                  onClick={handleCopyJson}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center gap-1 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-turf-neon" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="bg-[#080D19] p-4 rounded-xl border border-slate-800 text-slate-300 font-mono text-xs overflow-x-auto max-h-[60vh]">
                {rawJson}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
