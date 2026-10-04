import React, { useState, useEffect } from 'react';
import {
  Utensils,
  Home,
  Wifi,
  Sparkles,
  Zap,
  UserPlus,
  Trash2,
  Send,
  Plus,
  CheckCircle2,
  Calendar,
  ShoppingBag,
  Receipt,
  ListChecks,
  Bell,
  Share2,
  Download,
  Printer,
  Users,
  Wallet,
  Clock,
  ChevronLeft,
  ChevronRight,
  Shield,
  UserCheck,
  Copy,
  MessageCircle,
  RotateCcw,
  Lock,
  Key,
  Building,
  FolderPlus,
  LogIn,
  Upload,
  ChevronDown,
  X,
} from 'lucide-react';
import type {
  MessState,
  MemberMeal,
  FixedCostsBreakdown,
  DailyMealRecord,
  BazarExpenseRecord,
  ShoppingWishlistItem,
  DepositRecord,
  MessRole,
} from '../types';
import {
  calculateMessCalculations,
  splitFixedCostsEquallyAction,
  updateMemberMealsCountAction,
  updateMemberDepositAction,
  addMessMemberAction,
  removeMessMemberAction,
  upsertDailyMealRecordAction,
  addBazarExpenseAction,
  deleteBazarExpenseAction,
  addDepositRecordAction,
  deleteDepositRecordAction,
  addShoppingItemAction,
  toggleShoppingItemBoughtAction,
  deleteShoppingItemAction,
  downloadMessCsv,
  generateMessInviteText,
  generateBazarDutyText,
  generateMealCutoffText,
  createFreshMessState,
  downloadMessBackupJson,
  importMessFromJson,
  generateMessDirectJoinLink,
} from '../controllers/messController';
import { db, getAllMessesFromDb, deleteMessFromDb } from '../db/db';



interface MessModuleProps {
  initialState: MessState;
  onOpenMFS: (opts: {
    amount: number;
    reason: string;
    recipientName?: string;
    recipientPhone?: string;
  }) => void;
}

type MessSubTab = 'meals' | 'bazar' | 'overview';

export const MessModule: React.FC<MessModuleProps> = ({
  initialState,
  onOpenMFS,
}) => {
  // Navigation & Role states
  const [activeTab, setActiveTab] = useState<MessSubTab>('meals');
  const [userRole, setUserRole] = useState<MessRole>('manager');
  const [activeViewerId, setActiveViewerId] = useState<string>(
    initialState.memberMeals?.[0]?.memberId || 'u1'
  );

  // Manager PIN Security State
  const [managerPin, setManagerPin] = useState<string>(
    initialState.settings?.managerPin || '1234'
  );
  const [isManagerUnlocked, setIsManagerUnlocked] = useState<boolean>(true);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  const [showChangePinModal, setShowChangePinModal] = useState<boolean>(false);
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [confirmNewPinInput, setConfirmNewPinInput] = useState<string>('');
  const [changePinError, setChangePinError] = useState<string | null>(null);
  const [changePinSuccess, setChangePinSuccess] = useState<boolean>(false);

  // Core Mess States
  const [messName, setMessName] = useState<string>(
    initialState.messName || 'Dhanmondi 27 Bachelor Flat'
  );
  const [month, setMonth] = useState<string>(
    initialState.month || 'October 2026'
  );
  const [fixedCosts, setFixedCosts] = useState<FixedCostsBreakdown>(
    initialState.fixedCosts || {
      houseRent: 24000,
      internetBill: 1200,
      maidBill: 3000,
      gasElectricity: 2800,
      others: 1000,
    }
  );
  const [memberMeals, setMemberMeals] = useState<MemberMeal[]>(
    initialState.memberMeals || []
  );

  // Extended Records (Daily Meals, Bazar, Deposits, Shopping List)
  const [dailyMeals, setDailyMeals] = useState<DailyMealRecord[]>(
    initialState.dailyMeals || []
  );
  const [bazarExpenses, setBazarExpenses] = useState<BazarExpenseRecord[]>(
    initialState.bazarExpenses || []
  );
  const [deposits, setDeposits] = useState<DepositRecord[]>(
    initialState.deposits || []
  );
  const [shoppingList, setShoppingList] = useState<ShoppingWishlistItem[]>(
    initialState.shoppingList || []
  );

  // Multi-Mess & Tenant Isolation State
  const [messId, setMessId] = useState<string>(
    initialState.id || localStorage.getItem('hisabsplit_active_mess_id') || 'current-mess'
  );
  const [allMesses, setAllMesses] = useState<(MessState & { id: string })[]>([]);
  const [showMessSwitcherModal, setShowMessSwitcherModal] = useState<boolean>(false);
  const [showCreateMessModal, setShowCreateMessModal] = useState<boolean>(false);
  const [showJoinMessModal, setShowJoinMessModal] = useState<boolean>(false);

  // Create Mess Form States
  const [createMessName, setCreateMessName] = useState<string>('');
  const [createMessMonth, setCreateMessMonth] = useState<string>('October 2026');
  const [createManagerName, setCreateManagerName] = useState<string>('');
  const [createManagerPhone, setCreateManagerPhone] = useState<string>('');
  const [createManagerPin, setCreateManagerPin] = useState<string>('1234');
  const [createHouseRent, setCreateHouseRent] = useState<string>('20000');

  // Join Mess Form States
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [importJsonInput, setImportJsonInput] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);
  const [copiedDirectLink, setCopiedDirectLink] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Switch Security & Verification Gatekeeper
  const [switchTargetMess, setSwitchTargetMess] = useState<(MessState & { id: string }) | null>(null);
  const [switchCodeInput, setSwitchCodeInput] = useState<string>('');
  const [switchCodeError, setSwitchCodeError] = useState<string | null>(null);
  const [showSwitchVerifyModal, setShowSwitchVerifyModal] = useState<boolean>(false);

  // Dynamic Mess Settings
  const [cutoffTime, setCutoffTime] = useState<string>(
    initialState.settings?.cutoffTime || '22:00'
  );
  const [inviteCode, setInviteCode] = useState<string>(
    initialState.settings?.inviteCode || 'MESS-D27'
  );

  // Date selection for Daily Meal Tracker
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Modals
  const [showAddMember, setShowAddMember] = useState<boolean>(false);
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberPhone, setNewMemberPhone] = useState<string>('');
  const [newMemberRole, setNewMemberRole] = useState<MessRole>('member');
  const [newMemberRoom, setNewMemberRoom] = useState<string>('Room 301');

  const [showAddBazar, setShowAddBazar] = useState<boolean>(false);
  const [bazarShopperId, setBazarShopperId] = useState<string>(
    memberMeals[0]?.memberId || ''
  );
  const [bazarAmount, setBazarAmount] = useState<string>('');
  const [bazarTitle, setBazarTitle] = useState<string>('');
  const [bazarItems, setBazarItems] = useState<string>('');
  const [bazarReceipt, setBazarReceipt] = useState<string>('');

  const [showAddDeposit, setShowAddDeposit] = useState<boolean>(false);
  const [depMemberId, setDepMemberId] = useState<string>(
    memberMeals[0]?.memberId || ''
  );
  const [depAmount, setDepAmount] = useState<string>('');
  const [depMethod, setDepMethod] = useState<'bKash' | 'Nagad' | 'Cash' | 'Rocket' | 'Bank'>('bKash');
  const [depNote, setDepNote] = useState<string>('');

  const [newWishItem, setNewWishItem] = useState<string>('');
  const [newWishQuantity, setNewWishQuantity] = useState<string>('');

  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [viewReceiptUrl, setViewReceiptUrl] = useState<string | null>(null);
  const [justSplitFlash, setJustSplitFlash] = useState<boolean>(false);
  const [copiedInvite, setCopiedInvite] = useState<boolean>(false);

  // Toast notification helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Refresh all messes from Dexie IndexedDB
  const refreshAllMesses = async () => {
    try {
      const list = await getAllMessesFromDb();
      setAllMesses(list);
      return list;
    } catch (e) {
      console.error('Error fetching messes:', e);
      return [];
    }
  };

  // Initial load: refresh all messes and check for URL invite code
  useEffect(() => {
    refreshAllMesses().then((list) => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const inviteParam = params.get('invite') || params.get('code');
        if (inviteParam) {
          const match = list.find(
            (m) => m.settings?.inviteCode?.toUpperCase() === inviteParam.toUpperCase()
          );
          if (match && match.id !== messId) {
            handleSwitchMess(match);
          }
        }
      }
    });
  }, []);

  // Compute live Bazar total from recorded bazarExpenses if available
  const computedMarketCost = bazarExpenses.length > 0
    ? bazarExpenses.reduce((sum, b) => sum + (Math.max(0, Number(b.amount)) || 0), 0)
    : initialState.totalMarketCost;

  // Compute live Meal sum from memberMeals
  const computedTotalMeals = memberMeals.reduce(
    (sum, m) => sum + (Math.max(0, Number(m.mealsCount)) || 0),
    0
  );

  // Live Pure Calculations
  const calculations = calculateMessCalculations(
    computedMarketCost,
    computedTotalMeals,
    memberMeals,
    fixedCosts
  );

  // Sync state to Dexie Database strictly isolated by active messId
  useEffect(() => {
    if (!messId) return;
    const updatedState: MessState & { id: string } = {
      id: messId,
      messName,
      month,
      totalMarketCost: computedMarketCost,
      totalMeals: calculations.totalMeals,
      fixedCosts,
      memberMeals,
      dailyMeals,
      bazarExpenses,
      deposits,
      shoppingList,
      settings: {
        cutoffTime,
        inviteCode,
        autoMealActive: true,
        managerPin,
      },
    };
    db.mess_state.put(updatedState).catch(console.error);
    // Keep allMesses fresh for switcher list
    setAllMesses((prev) => {
      const idx = prev.findIndex((m) => m.id === messId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updatedState;
        return next;
      }
      return [...prev, updatedState];
    });
  }, [
    messId,
    messName,
    month,
    computedMarketCost,
    calculations.totalMeals,
    fixedCosts,
    memberMeals,
    dailyMeals,
    bazarExpenses,
    deposits,
    shoppingList,
    cutoffTime,
    inviteCode,
    managerPin,
  ]);

  // Handler: Switch Mess with 100% Data Isolation
  const handleSwitchMess = (targetMess: MessState & { id: string }) => {
    setMessId(targetMess.id);
    setMessName(targetMess.messName);
    setMonth(targetMess.month || 'October 2026');
    setFixedCosts(
      targetMess.fixedCosts || {
        houseRent: 0,
        internetBill: 0,
        maidBill: 0,
        gasElectricity: 0,
        others: 0,
      }
    );
    setMemberMeals(targetMess.memberMeals || []);
    setDailyMeals(targetMess.dailyMeals || []);
    setBazarExpenses(targetMess.bazarExpenses || []);
    setDeposits(targetMess.deposits || []);
    setShoppingList(targetMess.shoppingList || []);
    setCutoffTime(targetMess.settings?.cutoffTime || '22:00');
    setInviteCode(targetMess.settings?.inviteCode || 'MES-D27');
    setManagerPin(targetMess.settings?.managerPin || '1234');
    setIsManagerUnlocked(false);
    setUserRole('member');
    setActiveViewerId(targetMess.memberMeals?.[0]?.memberId || '');
    localStorage.setItem('hisabsplit_active_mess_id', targetMess.id);
    setShowMessSwitcherModal(false);
    triggerToast(`Switched to "${targetMess.messName}"`);
  };

  // Handler: Verify Access Code before Switching Mess (Prevents unauthorized mess snooping)
  const handleVerifyAndSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!switchTargetMess) return;
    const cleanInput = switchCodeInput.trim().toUpperCase();
    const targetCode = switchTargetMess.settings?.inviteCode?.trim().toUpperCase();
    const targetPin = switchTargetMess.settings?.managerPin?.trim();

    if (cleanInput === targetCode || switchCodeInput.trim() === targetPin) {
      handleSwitchMess(switchTargetMess);
      setShowSwitchVerifyModal(false);
      setSwitchTargetMess(null);
      setSwitchCodeInput('');
      setSwitchCodeError(null);
      triggerToast(`🔓 Authorized! Switched to "${switchTargetMess.messName}"`);
    } else {
      setSwitchCodeError(
        `Access Denied: Incorrect code. You do not have permission to access "${switchTargetMess.messName}".`
      );
    }
  };

  // Handler: Create New Isolated Mess
  const handleCreateNewMess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createMessName.trim() || !createManagerName.trim()) return;

    const newMess = createFreshMessState({
      messName: createMessName.trim(),
      month: createMessMonth.trim() || 'October 2026',
      managerName: createManagerName.trim(),
      managerPhone: createManagerPhone.trim(),
      managerPin: createManagerPin.trim() || '1234',
      houseRent: Number(createHouseRent) || 0,
    });

    db.mess_state.put(newMess).then(async () => {
      const refreshed = await getAllMessesFromDb();
      setAllMesses(refreshed);
      handleSwitchMess(newMess);
      setIsManagerUnlocked(true);
      setUserRole('manager');
      setShowCreateMessModal(false);
      setCreateMessName('');
      setCreateManagerName('');
      setCreateManagerPhone('');
      setCreateHouseRent('20000');
      triggerToast(`🎉 Created "${newMess.messName}" with Invite Code: ${newMess.settings?.inviteCode || ''}!`);
    });
  };

  // Handler: Delete Mess (Protected)
  const handleDeleteMess = async (targetId: string) => {
    if (allMesses.length <= 1) {
      alert('Cannot delete the only remaining mess. You can clear its data using Reset / Clear.');
      return;
    }
    const messToDelete = allMesses.find((m) => m.id === targetId);
    if (
      !confirm(
        `Are you sure you want to permanently delete "${messToDelete?.messName || 'this mess'}"? All of its isolated records will be removed.`
      )
    ) {
      return;
    }
    await deleteMessFromDb(targetId);
    const refreshed = await getAllMessesFromDb();
    setAllMesses(refreshed);
    if (targetId === messId && refreshed.length > 0) {
      handleSwitchMess(refreshed[0]);
    }
    triggerToast('Mess removed.');
  };

  // Handler: Join Mess by Invite Code
  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (!cleanCode) return;
    const found = allMesses.find(
      (m) => m.settings?.inviteCode?.toUpperCase() === cleanCode
    );
    if (found) {
      handleSwitchMess(found);
      setShowJoinMessModal(false);
      setJoinCodeInput('');
      setJoinError(null);
    } else {
      setJoinError(
        `No mess with code "${cleanCode}" found stored in this browser. If your manager gave you a backup file (.json), import it below.`
      );
    }
  };

  // Handler: Import Mess from JSON
  const handleImportJson = (jsonString: string) => {
    const imported = importMessFromJson(jsonString);
    if (!imported) {
      setImportError('Invalid mess backup format. Please check the JSON data.');
      return;
    }
    db.mess_state.put(imported).then(async () => {
      const refreshed = await getAllMessesFromDb();
      setAllMesses(refreshed);
      handleSwitchMess(imported);
      setImportSuccess(true);
      setTimeout(() => {
        setShowJoinMessModal(false);
        setImportSuccess(false);
        setImportJsonInput('');
        setImportError(null);
        triggerToast(`Imported and switched to "${imported.messName}"!`);
      }, 1000);
    });
  };

  // Handler: File Upload for Backup JSON
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleImportJson(content);
      }
    };
    reader.readAsText(file);
  };


  // Handler: Split Fixed Costs Equally
  const handleSplitFixedCostsEqually = () => {
    const updated = splitFixedCostsEquallyAction(memberMeals, fixedCosts);
    setMemberMeals(updated);
    setJustSplitFlash(true);
    setTimeout(() => setJustSplitFlash(false), 2000);
  };

  // Handler: Add Member
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    const defaultFixed =
      calculations.fixedCostPerHead > 0 ? calculations.fixedCostPerHead : 0;
    setMemberMeals((prev) =>
      addMessMemberAction(
        prev,
        newMemberName,
        newMemberPhone,
        defaultFixed,
        newMemberRole,
        newMemberRoom
      )
    );
    setNewMemberName('');
    setNewMemberPhone('');
    setShowAddMember(false);
  };

  // Handler: Remove Member
  const handleRemoveMember = (memberId: string) => {
    if (confirm('Are you sure you want to remove this member from the mess?')) {
      setMemberMeals((prev) => removeMessMemberAction(prev, memberId));
    }
  };

  // Handler: Clear all demo data / start fresh
  const handleClearAllDemoData = () => {
    if (
      confirm(
        'Are you sure you want to clear all demo data? This will clear all members, expenses, deposits, and bills so you can start with a fresh empty mess.'
      )
    ) {
      setMemberMeals([]);
      setDailyMeals([]);
      setBazarExpenses([]);
      setDeposits([]);
      setShoppingList([]);
      setFixedCosts({
        houseRent: 0,
        internetBill: 0,
        maidBill: 0,
        gasElectricity: 0,
        others: 0,
      });
      setMessName('My Bachelor Flat');
      setActiveViewerId('');
    }
  };

  // Handler: Meal count delta (+ / -) in summary
  const handleMealCountChange = (memberId: string, delta: number) => {
    const target = memberMeals.find((m) => m.memberId === memberId);
    if (!target) return;
    const current = Math.max(0, target.mealsCount || 0);
    const updated = Math.max(0, current + delta);
    setMemberMeals((prev) => updateMemberMealsCountAction(prev, memberId, updated));
  };

  // Handler: Deposit input direct change
  const handleDepositChange = (memberId: string, deposit: number) => {
    setMemberMeals((prev) => updateMemberDepositAction(prev, memberId, deposit));
  };

  // Handler: Daily Meal update
  const handleDailyMealUpdate = (
    memberId: string,
    b: number,
    l: number,
    d: number,
    isOff = false,
    note = ''
  ) => {
    setDailyMeals((prev) =>
      upsertDailyMealRecordAction(prev, selectedDate, memberId, b, l, d, isOff, note)
    );

    const safeB = Math.max(0, Number(b) || 0);
    const safeL = Math.max(0, Number(l) || 0);
    const safeD = Math.max(0, Number(d) || 0);
    const dayTotal = isOff ? 0 : safeB + safeL + safeD;

    const prevRecord = dailyMeals.find(
      (r) => r.date === selectedDate && r.memberId === memberId
    );
    const prevTotal = prevRecord ? (prevRecord.isOff ? 0 : prevRecord.total) : 0;
    const diff = dayTotal - prevTotal;

    if (diff !== 0) {
      handleMealCountChange(memberId, diff);
    }
  };

  // Handler: Toggle Advance Meal Off for selected date
  const handleToggleMealOff = (memberId: string) => {
    const existing = dailyMeals.find(
      (r) => r.date === selectedDate && r.memberId === memberId
    );
    const willBeOff = existing ? !existing.isOff : true;
    handleDailyMealUpdate(
      memberId,
      existing?.breakfast ?? 0,
      existing?.lunch ?? 1,
      existing?.dinner ?? 1,
      willBeOff,
      willBeOff ? 'Advance Off' : ''
    );
  };

  // Handler: Auto-fill today's default meals
  const handleAutoFillDailyMeals = () => {
    memberMeals.forEach((m) => {
      const existing = dailyMeals.find(
        (r) => r.date === selectedDate && r.memberId === m.memberId
      );
      if (!existing) {
        handleDailyMealUpdate(m.memberId, 0, 1, 1, false, 'Auto meal');
      }
    });
    triggerToast(`Auto-filled meals for ${selectedDate}`);
  };

  // Handler: Turn All Meals ON for selected date
  const handleTurnAllMealsOn = () => {
    memberMeals.forEach((m) => {
      const existing = dailyMeals.find(
        (r) => r.date === selectedDate && r.memberId === m.memberId
      );
      const b = existing ? existing.breakfast : 0;
      const l = existing && existing.lunch > 0 ? existing.lunch : 1;
      const d = existing && existing.dinner > 0 ? existing.dinner : 1;
      handleDailyMealUpdate(m.memberId, b, l, d, false, 'All Meals ON');
    });
    triggerToast(`Turned ALL meals ON for ${selectedDate}`);
  };

  // Handler: Turn All Meals OFF for selected date
  const handleTurnAllMealsOff = () => {
    memberMeals.forEach((m) => {
      const existing = dailyMeals.find(
        (r) => r.date === selectedDate && r.memberId === m.memberId
      );
      const b = existing ? existing.breakfast : 0;
      const l = existing ? existing.lunch : 1;
      const d = existing ? existing.dinner : 1;
      handleDailyMealUpdate(m.memberId, b, l, d, true, 'All Meals OFF');
    });
    triggerToast(`Turned ALL meals OFF for ${selectedDate}`);
  };

  // Handler: Add Bazar Expense
  const handleAddBazarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const shopper = memberMeals.find((m) => m.memberId === bazarShopperId);
    if (!shopper || !bazarAmount) return;

    setBazarExpenses((prev) =>
      addBazarExpenseAction(
        prev,
        shopper.memberId,
        shopper.name,
        parseFloat(bazarAmount),
        bazarTitle || 'Daily Bazar',
        selectedDate,
        bazarItems,
        bazarReceipt
      )
    );
    setBazarAmount('');
    setBazarTitle('');
    setBazarItems('');
    setBazarReceipt('');
    setShowAddBazar(false);
  };

  // Handler: Image receipt upload to Base64
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBazarReceipt(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handler: Add Deposit Submit
  const handleAddDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = memberMeals.find((m) => m.memberId === depMemberId);
    if (!target || !depAmount) return;

    const amt = parseFloat(depAmount);
    setDeposits((prev) =>
      addDepositRecordAction(
        prev,
        target.memberId,
        target.name,
        amt,
        selectedDate,
        depMethod,
        depNote
      )
    );

    handleDepositChange(target.memberId, target.depositAmount + amt);

    setDepAmount('');
    setDepNote('');
    setShowAddDeposit(false);
  };

  // Handler: Add Shopping List item
  const handleAddShoppingItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWishItem.trim()) return;
    const activeViewer = memberMeals.find((m) => m.memberId === activeViewerId);
    setShoppingList((prev) =>
      addShoppingItemAction(
        prev,
        newWishItem,
        activeViewer?.name || 'General',
        newWishQuantity
      )
    );
    setNewWishItem('');
    setNewWishQuantity('');
  };

  // Convert wishlist item to Bazar entry
  const handleConvertWishToBazar = (item: ShoppingWishlistItem) => {
    setBazarTitle(`Bazar: ${item.item}`);
    setBazarItems(`${item.item} (${item.quantity || 'As needed'})`);
    if (item.approxCost) setBazarAmount(item.approxCost.toString());
    setShowAddBazar(true);
    setActiveTab('bazar');
  };

  // Notification Trigger: Browser Web Push
  const handleRequestPushNotification = async () => {
    if (!('Notification' in window)) {
      alert('Your browser does not support push notifications.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      new Notification('HisabSplit Mess Alert ⏰', {
        body: `Please confirm tomorrow's meals before ${cutoffTime}!`,
        icon: '/vite.svg',
      });
    }
  };

  // Date step forward/backward
  const handleDateShift = (deltaDays: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + deltaDays);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  return (
    <div className="w-full space-y-6">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 bg-emerald-500 text-black px-4 py-2.5 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Bar: Mess Brand, Code, Quick Invite, Role & Tools */}
      <div className="bg-[#0E131F] rounded-3xl p-4 sm:p-6 border border-slate-800/80 shadow-xl space-y-4">
        {/* Top Row: Mess Identity, Code Badge & Quick Switch */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={messName}
                    onChange={(e) => setMessName(e.target.value)}
                    className="text-lg sm:text-2xl font-black text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-emerald-500 focus:outline-none transition-colors"
                    title="Click to rename mess"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="font-mono text-slate-400">Month:</span>
                  <input
                    type="text"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="bg-transparent text-slate-300 hover:text-white border-b border-transparent hover:border-slate-600 focus:border-emerald-500 focus:outline-none w-28 font-mono text-xs uppercase"
                    title="Click to edit month"
                  />
                </div>
              </div>
            </div>

            {/* Invite Code Pill with 1-Click Copy */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(inviteCode);
                triggerToast(`Copied Mess Code: ${inviteCode}`);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#070A12] hover:bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold transition-all shadow-sm"
              title="Click to copy Mess Invite Code"
            >
              <span>🔑</span>
              <span>{inviteCode}</span>
              <Copy className="w-3 h-3 text-emerald-400" />
            </button>

            {/* Mess Switcher Button */}
            <button
              onClick={() => setShowMessSwitcherModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#070A12] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-semibold transition-all"
              title="Switch or manage multiple messes"
            >
              <Building className="w-3.5 h-3.5 text-sky-400" />
              <span>Switch Mess</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>

          {/* Top Right Action: Prominent Invite Roommates Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition-all transform hover:scale-[1.02]"
              title="Share mess invite code or direct link with roommates"
            >
              <Share2 className="w-4 h-4" />
              <span>+ Invite Roommates</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Role Mode Switcher, Active Viewer & Fast Utilities */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Role Toggle + Manager Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-[#070A12] border border-slate-800 rounded-2xl p-1">
              <button
                onClick={() => {
                  if (userRole === 'manager') return;
                  if (isManagerUnlocked) {
                    setUserRole('manager');
                  } else {
                    setEnteredPin('');
                    setPinError(null);
                    setShowPinModal(true);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  userRole === 'manager'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isManagerUnlocked ? (
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                )}
                Manager Mode
              </button>
              <button
                onClick={() => setUserRole('member')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  userRole === 'member'
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                Member View
              </button>
            </div>

            {userRole === 'manager' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setNewPinInput('');
                    setConfirmNewPinInput('');
                    setChangePinError(null);
                    setChangePinSuccess(false);
                    setShowChangePinModal(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 font-medium transition-all"
                  title="Change 4-digit Manager PIN"
                >
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  PIN
                </button>
                <button
                  onClick={() => {
                    setIsManagerUnlocked(false);
                    setUserRole('member');
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-rose-300 border border-slate-700/60 font-medium transition-all"
                  title="Lock Manager Mode"
                >
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  Lock
                </button>
              </div>
            )}
          </div>

          {/* Active Viewer Selector & Quick Reports */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#070A12] border border-slate-800 rounded-2xl px-3 py-1.5 text-slate-300">
              <span className="text-slate-500 text-[10px] uppercase font-mono">Viewing as:</span>
              <select
                value={activeViewerId}
                onChange={(e) => setActiveViewerId(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                {memberMeals.map((m) => (
                  <option key={m.memberId} value={m.memberId} className="bg-slate-900 text-white">
                    {m.name} {m.role === 'manager' ? '(Manager)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => downloadMessCsv(calculations, messName, month)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 transition-all"
              title="Download Excel / CSV Summary"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>

            <button
              onClick={() => setShowPrintModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 transition-all"
              title="Print Monthly Summary Slip"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Print</span>
            </button>

            {userRole === 'manager' && (
              <button
                onClick={handleClearAllDemoData}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all"
                title="Clear all demo data and start with an empty mess"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Sub-Tabs Navigation (3 Core Pillars) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-[#0E131F] border border-slate-800/80 rounded-3xl shadow-lg">
        <button
          onClick={() => setActiveTab('meals')}
          className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'meals'
              ? 'bg-sky-500 text-black shadow-lg shadow-sky-500/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>1. Daily Meals</span>
        </button>

        <button
          onClick={() => setActiveTab('bazar')}
          className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all relative ${
            activeTab === 'bazar'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>2. Bazar & Shopping</span>
          {shoppingList.filter((s) => !s.isBought).length > 0 && (
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-black ${
                activeTab === 'bazar'
                  ? 'bg-black text-amber-400'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {shoppingList.filter((s) => !s.isBought).length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'overview'
              ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Utensils className="w-4 h-4" />
          <span>3. Accounts & Balances</span>
        </button>
      </div>

      {/* 3. SUB-TAB 1: OVERVIEW & BALANCES */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top 5 KPI Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {/* Meal Rate Card */}
            <div className="bg-[#0E131F] rounded-3xl p-5 border border-emerald-500/30 relative overflow-hidden shadow-lg">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Current Meal Rate
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
                ৳{calculations.mealRate.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
                <span>Bazar ÷ Meals</span>
              </div>
            </div>

            {/* Total Bazar Card */}
            <div className="bg-[#0E131F] rounded-3xl p-5 border border-slate-800/80 shadow-lg">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Total Bazar Expenses
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                ৳{calculations.totalMarketCost.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                {bazarExpenses.length} Bazar Entries
              </div>
            </div>

            {/* Total Meals Card */}
            <div className="bg-[#0E131F] rounded-3xl p-5 border border-slate-800/80 shadow-lg">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Total Consumed Meals
              </div>
              <div className="text-2xl sm:text-3xl font-black text-sky-400 font-mono tracking-tight">
                {calculations.totalMeals}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                {memberMeals.length} Members
              </div>
            </div>

            {/* Cash in Hand / Mess Fund Card */}
            <div className={`bg-[#0E131F] rounded-3xl p-5 border shadow-lg ${
              calculations.cashInHand >= 0
                ? 'border-purple-500/40 bg-gradient-to-br from-[#0E131F] to-purple-950/20'
                : 'border-rose-500/40 bg-gradient-to-br from-[#0E131F] to-rose-950/20'
            }`}>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Mess Cash Fund (In Hand)
              </div>
              <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                calculations.cashInHand >= 0 ? 'text-purple-400' : 'text-rose-400'
              }`}>
                ৳{calculations.cashInHand.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                Total Deposits - Total Expenses
              </div>
            </div>

            {/* Total Fixed Overhead Card */}
            <div className="bg-[#0E131F] rounded-3xl p-5 border border-slate-800/80 shadow-lg col-span-2 lg:col-span-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Total Fixed Overhead
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight">
                ৳{calculations.totalFixedCost.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                Per Head: ৳{calculations.fixedCostPerHead.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Main 12-Column Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start w-full">
            {/* Left Column: Fixed Overhead Breakdown */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6">
              <div className="bg-[#0E131F] rounded-3xl p-6 border border-slate-800/80 shadow-xl space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <Home className="w-5 h-5 text-amber-400" />
                    <div>
                      <h3 className="text-base font-bold text-white">Fixed Overhead Costs</h3>
                      <p className="text-[11px] text-slate-400">Split equally each month among members</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSplitFixedCostsEqually}
                    disabled={userRole !== 'manager'}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      userRole === 'manager'
                        ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-500 border-slate-700'
                    } ${justSplitFlash ? 'bg-amber-400 text-black scale-105' : ''}`}
                    title="Split fixed costs equally among all members"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {justSplitFlash ? 'Split Done!' : 'Split Equally'}
                  </button>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="text-slate-300 font-medium mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Home className="w-3.5 h-3.5 text-slate-400" /> House Rent
                      </span>
                      <span className="font-mono text-slate-400">৳</span>
                    </label>
                    <input
                      type="number"
                      disabled={userRole !== 'manager'}
                      value={fixedCosts.houseRent || ''}
                      onChange={(e) =>
                        setFixedCosts((prev) => ({
                          ...prev,
                          houseRent: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="w-full bg-[#070A12] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:border-amber-400 focus:outline-none transition-colors disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-slate-400" /> Maid / Cook Bill
                      </span>
                      <span className="font-mono text-slate-400">৳</span>
                    </label>
                    <input
                      type="number"
                      disabled={userRole !== 'manager'}
                      value={fixedCosts.maidBill || ''}
                      onChange={(e) =>
                        setFixedCosts((prev) => ({
                          ...prev,
                          maidBill: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="w-full bg-[#070A12] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:border-amber-400 focus:outline-none transition-colors disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Wifi className="w-3.5 h-3.5 text-slate-400" /> Internet & Wi-Fi
                      </span>
                      <span className="font-mono text-slate-400">৳</span>
                    </label>
                    <input
                      type="number"
                      disabled={userRole !== 'manager'}
                      value={fixedCosts.internetBill || ''}
                      onChange={(e) =>
                        setFixedCosts((prev) => ({
                          ...prev,
                          internetBill: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="w-full bg-[#070A12] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:border-amber-400 focus:outline-none transition-colors disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-slate-400" /> Gas & Electricity
                      </span>
                      <span className="font-mono text-slate-400">৳</span>
                    </label>
                    <input
                      type="number"
                      disabled={userRole !== 'manager'}
                      value={fixedCosts.gasElectricity || ''}
                      onChange={(e) =>
                        setFixedCosts((prev) => ({
                          ...prev,
                          gasElectricity: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="w-full bg-[#070A12] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:border-amber-400 focus:outline-none transition-colors disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium mb-1 flex items-center justify-between">
                      <span>Other Utilities (Trash, Maintenance)</span>
                      <span className="font-mono text-slate-400">৳</span>
                    </label>
                    <input
                      type="number"
                      disabled={userRole !== 'manager'}
                      value={fixedCosts.others || ''}
                      onChange={(e) =>
                        setFixedCosts((prev) => ({
                          ...prev,
                          others: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="w-full bg-[#070A12] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:border-amber-400 focus:outline-none transition-colors disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Per Head Fixed Share:</span>
                  <span className="text-sm font-mono text-amber-400">
                    ৳{calculations.fixedCostPerHead.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Member Balances, Breakdown & Actions */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    Individual Member Balances ({memberMeals.length} Members)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Meal consumption + fixed overhead vs deposits
                  </p>
                </div>
                {userRole === 'manager' && (
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Member
                  </button>
                )}
              </div>

              {/* Members List Cards */}
              <div className="space-y-3.5">
                {calculations.memberCalculations.length === 0 ? (
                  <div className="bg-[#0E131F] rounded-3xl p-8 border border-dashed border-slate-800 text-center space-y-3">
                    <Users className="w-10 h-10 text-slate-600 mx-auto" />
                    <div className="text-sm font-semibold text-slate-300">No members added yet</div>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Click the "Add Member" button above to add your flatmates and start tracking meals and balances.
                    </p>
                    {userRole === 'manager' && (
                      <button
                        onClick={() => setShowAddMember(true)}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-all shadow-md inline-flex items-center gap-1.5"
                      >
                        <UserPlus className="w-4 h-4" /> Add First Member
                      </button>
                    )}
                  </div>
                ) : (
                  calculations.memberCalculations.map((m) => {
                  const targetMember = memberMeals.find((mem) => mem.memberId === m.memberId);
                  const isViewer = m.memberId === activeViewerId;

                  return (
                    <div
                      key={m.memberId}
                      className={`bg-[#0E131F] rounded-3xl p-5 border transition-all ${
                        isViewer
                          ? 'border-emerald-500/50 bg-gradient-to-r from-[#0E131F] to-emerald-950/20 shadow-lg'
                          : 'border-slate-800/80 hover:border-slate-700/80'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
                        {/* Member Identity */}
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm ${
                            m.role === 'manager'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {m.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-bold text-white">{m.name}</span>
                              {m.role === 'manager' && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  Manager
                                </span>
                              )}
                              {isViewer && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                              <span>{m.phone || '01XXXXXXXXX'}</span>
                              {targetMember?.roomNo && (
                                <>
                                  <span>•</span>
                                  <span>{targetMember.roomNo}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Balance Badge & MFS Action */}
                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <div className="text-right">
                            <div className="text-[11px] text-slate-400 uppercase font-mono">
                              {m.balance >= 0 ? 'Surplus (To Receive)' : 'Due (To Pay)'}
                            </div>
                            <div className={`text-lg sm:text-xl font-black font-mono tracking-tight ${
                              m.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {m.balance >= 0 ? `+৳${m.balance.toLocaleString()}` : `-৳${Math.abs(m.balance).toLocaleString()}`}
                            </div>
                          </div>

                          {/* Instant MFS Button if Member owes money */}
                          {m.balance < 0 && (
                            <button
                              onClick={() =>
                                onOpenMFS({
                                  amount: Math.abs(m.balance),
                                  reason: `${messName} (${month}) Mess Due Bill`,
                                  recipientName: m.name,
                                  recipientPhone: m.phone,
                                })
                              }
                              className="px-3 py-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                              title="Send bKash/Nagad reminder via WhatsApp"
                            >
                              <Send className="w-3.5 h-3.5" />
                              Request MFS
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Calculations Detail Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3.5 text-xs">
                        <div className="bg-[#070A12] p-2.5 rounded-2xl border border-slate-800/80">
                          <span className="text-[10px] text-slate-500 uppercase font-mono block mb-1">
                            Total Meals
                          </span>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-sky-400 font-mono">
                              {m.mealsCount} Meals
                            </span>
                            {userRole === 'manager' && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleMealCountChange(m.memberId, -1)}
                                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                                >
                                  -
                                </button>
                                <button
                                  onClick={() => handleMealCountChange(m.memberId, 1)}
                                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-[#070A12] p-2.5 rounded-2xl border border-slate-800/80">
                          <span className="text-[10px] text-slate-500 uppercase font-mono block mb-1">
                            Meal Cost
                          </span>
                          <span className="text-sm font-bold text-white font-mono">
                            ৳{m.mealCost.toLocaleString()}
                          </span>
                        </div>

                        <div className="bg-[#070A12] p-2.5 rounded-2xl border border-slate-800/80">
                          <span className="text-[10px] text-slate-500 uppercase font-mono block mb-1">
                            Fixed Overhead
                          </span>
                          <span className="text-sm font-bold text-amber-400 font-mono">
                            ৳{m.fixedCostShare.toLocaleString()}
                          </span>
                        </div>

                        <div className="bg-[#070A12] p-2.5 rounded-2xl border border-slate-800/80">
                          <span className="text-[10px] text-slate-500 uppercase font-mono block mb-1">
                            Total Deposit
                          </span>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-purple-400 font-mono">
                              ৳{m.depositAmount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Manager Controls: Delete */}
                      {userRole === 'manager' && (
                        <div className="flex items-center justify-end gap-2 pt-2 text-[11px] text-slate-500">
                          <button
                            onClick={() => handleRemoveMember(m.memberId)}
                            className="hover:text-rose-400 flex items-center gap-1 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" /> Remove
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              </div>
            </div>
          </div>

          {/* Mess Fund & Member Deposits Log */}
          <div className="bg-[#0E131F] rounded-3xl p-6 border border-slate-800/80 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-purple-400" />
                  Mess Fund & Member Deposits Log
                </h3>
                <p className="text-xs text-slate-400">
                  Total Deposits: ৳{calculations.totalDeposits.toLocaleString()} • Cash in Hand: ৳{calculations.cashInHand.toLocaleString()}
                </p>
              </div>
              {userRole === 'manager' && (
                <button
                  onClick={() => setShowAddDeposit(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-purple-500 hover:bg-purple-400 text-white font-semibold text-xs transition-all shadow-lg shadow-purple-500/20"
                >
                  <Plus className="w-4 h-4" />
                  Record Deposit
                </button>
              )}
            </div>

            {/* Deposit List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="pb-3 pl-2">Date</th>
                    <th className="pb-3">Member</th>
                    <th className="pb-3">Method</th>
                    <th className="pb-3">Note / TrxID</th>
                    <th className="pb-3 text-right">Amount</th>
                    {userRole === 'manager' && <th className="pb-3 text-right pr-2">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {deposits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No deposits recorded yet. Click "Record Deposit" above to log advance funds.
                      </td>
                    </tr>
                  ) : (
                    deposits.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 pl-2 font-mono text-slate-400">{d.date}</td>
                        <td className="py-3.5 font-bold text-white">{d.memberName}</td>
                        <td className="py-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {d.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3.5 text-slate-400 font-mono">{d.note || 'Advance Deposit'}</td>
                        <td className="py-3.5 text-right font-mono font-bold text-emerald-400 text-sm">
                          +৳{d.amount.toLocaleString()}
                        </td>
                        {userRole === 'manager' && (
                          <td className="py-3.5 text-right pr-2">
                            <button
                              onClick={() => setDeposits((prev) => deleteDepositRecordAction(prev, d.id))}
                              className="text-slate-500 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. SUB-TAB 2: DAILY MEAL TRACKING & ADVANCE BOOKING */}
      {activeTab === 'meals' && (
        <div className="space-y-6">
          {/* Date Selector & Cutoff Banner */}
          <div className="bg-[#0E131F] rounded-3xl p-5 border border-slate-800/80 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDateShift(-1)}
                  className="w-9 h-9 rounded-2xl bg-[#070A12] hover:bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-800 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 bg-[#070A12] px-4 py-2 rounded-2xl border border-slate-800 text-sm font-bold text-white font-mono">
                  <Calendar className="w-4 h-4 text-sky-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent focus:outline-none text-white cursor-pointer"
                  />
                </div>
                <button
                  onClick={() => handleDateShift(1)}
                  className="w-9 h-9 rounded-2xl bg-[#070A12] hover:bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-800 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedDate(todayStr)}
                  className={`text-xs px-3 py-2 rounded-2xl font-bold transition-all ${
                    selectedDate === todayStr
                      ? 'bg-sky-500 text-black shadow-md shadow-sky-500/25'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setSelectedDate(tomorrowStr)}
                  className={`text-xs px-3 py-2 rounded-2xl font-bold transition-all ${
                    selectedDate === tomorrowStr
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/25'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                  title="Plan meals for tomorrow"
                >
                  Tomorrow
                </button>
              </div>

              {/* Bulk Meal Actions for Manager */}
              {userRole === 'manager' && (
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={handleTurnAllMealsOn}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all shadow-sm"
                    title="Turn all members' meals ON for this day"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    All Meals ON
                  </button>
                  <button
                    onClick={handleTurnAllMealsOff}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all shadow-sm"
                    title="Turn all members' meals OFF for this day"
                  >
                    <X className="w-3.5 h-3.5 text-rose-400" />
                    All Meals OFF
                  </button>
                  <button
                    onClick={handleAutoFillDailyMeals}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold transition-all"
                    title="Auto-fill default lunch & dinner for today"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Auto-Fill
                  </button>
                </div>
              )}
            </div>

            {/* Cutoff Time Notification & 1-Click Reminder Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 flex-shrink-0 text-amber-400" />
                <span>
                  <strong>Meal Cut-off Rule:</strong> Next day's meals must be updated before {cutoffTime}. Roommates can turn off or advance book meals for tomorrow.
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleRequestPushNotification}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  title="Enable Browser Notification"
                >
                  <Bell className="w-3.5 h-3.5 text-rose-400" />
                  Push Alert
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    generateMealCutoffText(cutoffTime, 'tomorrow')
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                  title="Send Cutoff Notice to WhatsApp Group"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp Alert
                </a>
              </div>
            </div>
          </div>

          {/* Daily Meal Grid by Member */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {memberMeals.length === 0 ? (
              <div className="col-span-full bg-[#0E131F] rounded-3xl p-8 border border-dashed border-slate-800 text-center space-y-3">
                <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
                <div className="text-sm font-semibold text-slate-300">No members to track meals for</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Add flatmates in the Overview tab to start recording their daily meals.
                </p>
              </div>
            ) : (
              memberMeals.map((member) => {
              const record = dailyMeals.find(
                (r) => r.date === selectedDate && r.memberId === member.memberId
              );
              const b = record?.breakfast ?? 0;
              const l = record?.lunch ?? 1;
              const d = record?.dinner ?? 1;
              const isOff = record?.isOff ?? false;
              const total = isOff ? 0 : b + l + d;

              const canEdit = userRole === 'manager' || member.memberId === activeViewerId;

              return (
                <div
                  key={member.memberId}
                  className={`bg-[#0E131F] rounded-3xl p-5 border transition-all ${
                    isOff
                      ? 'border-rose-900/60 bg-gradient-to-b from-[#0E131F] to-rose-950/20 opacity-80'
                      : 'border-slate-800/80 hover:border-slate-700/80'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                    <div>
                      <div className="font-bold text-white text-base">{member.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {member.roomNo || 'Room 301'}
                      </div>
                    </div>
                    {/* Header Meal Status Indicator */}
                    <button
                      onClick={() => {
                        if (!canEdit) {
                          triggerToast(`Switch 'Viewing as: ${member.name}' or switch to Manager Mode to change.`);
                          return;
                        }
                        handleToggleMealOff(member.memberId);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-xl font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                        isOff
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                      }`}
                      title="Click to toggle Meal ON or OFF"
                    >
                      <span className={`w-2 h-2 rounded-full ${isOff ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400'}`} />
                      <span>{isOff ? 'Meal OFF' : 'Meal ON'}</span>
                    </button>
                  </div>

                  {/* Prominent Meal ON / OFF Toggle Switch */}
                  <div className="my-3 p-3 rounded-2xl bg-[#070A12] border border-slate-800/80 flex items-center justify-between gap-2 shadow-inner">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full flex items-center justify-center ${
                        isOff ? 'bg-rose-500 shadow-md shadow-rose-500/50' : 'bg-emerald-400 shadow-md shadow-emerald-400/50'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-black/60" />
                      </div>
                      <span className="text-xs font-semibold text-slate-300">
                        Meal: <strong className={isOff ? 'text-rose-400 uppercase tracking-wide' : 'text-emerald-400 uppercase tracking-wide'}>{isOff ? 'OFF' : 'ON'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center bg-slate-900 border border-slate-700/60 rounded-xl p-1 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!canEdit) {
                            triggerToast(`Switch 'Viewing as: ${member.name}' or switch to Manager Mode to change.`);
                            return;
                          }
                          if (isOff) handleToggleMealOff(member.memberId);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 ${
                          !isOff
                            ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/40 scale-105'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Turn Meal ON for this day"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>ON</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!canEdit) {
                            triggerToast(`Switch 'Viewing as: ${member.name}' or switch to Manager Mode to change.`);
                            return;
                          }
                          if (!isOff) handleToggleMealOff(member.memberId);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 ${
                          isOff
                            ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 scale-105'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Turn Meal OFF for this day"
                      >
                        <X className="w-3 h-3" />
                        <span>OFF</span>
                      </button>
                    </div>
                  </div>

                  {/* Meals Counters */}
                  <div className="space-y-3 py-3">
                    {/* Breakfast */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Breakfast:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={!canEdit || isOff}
                          onClick={() =>
                            handleDailyMealUpdate(
                              member.memberId,
                              Math.max(0, b - 0.5),
                              l,
                              d,
                              isOff
                            )
                          }
                          className="w-6 h-6 rounded-lg bg-[#070A12] border border-slate-800 flex items-center justify-center text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-mono font-bold text-white">
                          {b}
                        </span>
                        <button
                          disabled={!canEdit || isOff}
                          onClick={() =>
                            handleDailyMealUpdate(
                              member.memberId,
                              b + 0.5,
                              l,
                              d,
                              isOff
                            )
                          }
                          className="w-6 h-6 rounded-lg bg-[#070A12] border border-slate-800 flex items-center justify-center text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Lunch */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Lunch:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={!canEdit || isOff}
                          onClick={() =>
                            handleDailyMealUpdate(
                              member.memberId,
                              b,
                              Math.max(0, l - 1),
                              d,
                              isOff
                            )
                          }
                          className="w-6 h-6 rounded-lg bg-[#070A12] border border-slate-800 flex items-center justify-center text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-mono font-bold text-white">
                          {l}
                        </span>
                        <button
                          disabled={!canEdit || isOff}
                          onClick={() =>
                            handleDailyMealUpdate(
                              member.memberId,
                              b,
                              l + 1,
                              d,
                              isOff
                            )
                          }
                          className="w-6 h-6 rounded-lg bg-[#070A12] border border-slate-800 flex items-center justify-center text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Dinner */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Dinner:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={!canEdit || isOff}
                          onClick={() =>
                            handleDailyMealUpdate(
                              member.memberId,
                              b,
                              l,
                              Math.max(0, d - 1),
                              isOff
                            )
                          }
                          className="w-6 h-6 rounded-lg bg-[#070A12] border border-slate-800 flex items-center justify-center text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-mono font-bold text-white">
                          {d}
                        </span>
                        <button
                          disabled={!canEdit || isOff}
                          onClick={() =>
                            handleDailyMealUpdate(
                              member.memberId,
                              b,
                              l,
                              d + 1,
                              isOff
                            )
                          }
                          className="w-6 h-6 rounded-lg bg-[#070A12] border border-slate-800 flex items-center justify-center text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Day Total */}
                  <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-400">Day Total:</span>
                    <span className={`font-mono text-sm ${isOff ? 'text-rose-400 line-through' : 'text-sky-400 font-bold'}`}>
                      {total} Meals
                    </span>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>
      )}

      {/* 5. SUB-TAB 2: EXPENSE & BAZAR MONITORING + SHOPPING WISHLIST */}
      {activeTab === 'bazar' && (
        <div className="space-y-6">
          {/* Top Header Card */}
          <div className="bg-[#0E131F] rounded-3xl p-5 sm:p-6 border border-slate-800/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                Bazar & Grocery Management
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Total Bazar Spent: <span className="text-amber-300 font-bold">৳{computedMarketCost.toLocaleString()}</span> • Cash Fund in Hand: <span className={`font-bold ${calculations.cashInHand >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>৳{calculations.cashInHand.toLocaleString()}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  generateBazarDutyText('Flatmate', 'Tomorrow', 3500)
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="Send WhatsApp reminder to tomorrow's shopper"
              >
                <MessageCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Bazar Duty WhatsApp Notice</span>
              </a>

              {userRole === 'manager' && (
                <button
                  onClick={() => setShowAddBazar(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all shadow-lg shadow-amber-500/20"
                >
                  <Plus className="w-4 h-4" />
                  + Add Bazar Entry
                </button>
              )}
            </div>
          </div>

          {/* Section 1: Shared Shopping List (Wishlist) */}
          <div className="bg-[#0E131F] rounded-3xl p-5 sm:p-6 border border-slate-800/80 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-teal-400" />
                <h4 className="text-sm sm:text-base font-bold text-white">
                  Shared Shopping List ({shoppingList.filter((s) => !s.isBought).length} items pending)
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">
                Request groceries & items needed for the flat
              </span>
            </div>

            {/* Add Item Form */}
            <form
              onSubmit={handleAddShoppingItem}
              className="flex flex-col sm:flex-row gap-2.5"
            >
              <input
                type="text"
                placeholder="What is needed? (e.g. Soybean Oil 5L, Miniket Rice 25kg, Salt)"
                value={newWishItem}
                onChange={(e) => setNewWishItem(e.target.value)}
                className="flex-1 bg-[#070A12] border border-slate-800 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white focus:border-teal-400 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Qty / Weight (e.g. 5L, 2kg)"
                value={newWishQuantity}
                onChange={(e) => setNewWishQuantity(e.target.value)}
                className="w-full sm:w-40 bg-[#070A12] border border-slate-800 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white focus:border-teal-400 focus:outline-none"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-black font-bold text-xs transition-all shadow-md shadow-teal-500/20 whitespace-nowrap"
              >
                + Add to List
              </button>
            </form>

            {/* Wishlist Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {shoppingList.length === 0 ? (
                <div className="col-span-full py-6 text-center text-slate-500 text-xs">
                  Shopping list is empty. Add grocery or household items needed for the flat using the form above.
                </div>
              ) : (
                shoppingList.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-2xl p-3.5 border flex items-center justify-between gap-3 transition-all ${
                      item.isBought
                        ? 'border-slate-800/40 opacity-50 bg-[#070A12]'
                        : 'border-slate-800/80 bg-[#070A12] hover:border-teal-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShoppingList((prev) => toggleShoppingItemBoughtAction(prev, item.id))}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                          item.isBought
                            ? 'bg-teal-500 border-teal-500 text-black'
                            : 'border-slate-700 bg-slate-900 text-slate-400'
                        }`}
                        title={item.isBought ? 'Mark as not bought' : 'Mark as bought'}
                      >
                        {item.isBought && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                      <div>
                        <div className={`text-xs sm:text-sm font-semibold text-white ${item.isBought ? 'line-through text-slate-500' : ''}`}>
                          {item.item}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.quantity && <span className="text-teal-300 font-semibold">{item.quantity} • </span>}
                          <span>Requested by: {item.requestedBy}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!item.isBought && userRole === 'manager' && (
                        <button
                          onClick={() => handleConvertWishToBazar(item)}
                          className="text-[11px] px-2.5 py-1 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 transition-all font-medium whitespace-nowrap"
                          title="Convert this item into a recorded Bazar Entry"
                        >
                          Convert to Bazar
                        </button>
                      )}
                      <button
                        onClick={() => setShoppingList((prev) => deleteShoppingItemAction(prev, item.id))}
                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                        title="Delete item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 2: Recorded Bazar Expenses Log & Receipt Photos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                Recorded Bazar Expenses & Memo Receipts
              </h4>
              <span className="text-xs text-slate-400 font-mono">
                {bazarExpenses.length} entries
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {bazarExpenses.length === 0 ? (
                <div className="col-span-full bg-[#0E131F] rounded-3xl p-8 border border-dashed border-slate-800 text-center space-y-3">
                  <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto" />
                  <div className="text-sm font-semibold text-slate-300">No bazar expenses recorded yet</div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Click the "+ Add Bazar Entry" button above to log daily groceries, amounts, and receipt photos.
                  </p>
                </div>
              ) : (
                bazarExpenses.map((b) => (
                  <div
                    key={b.id}
                    className="bg-[#0E131F] rounded-3xl p-5 border border-slate-800/80 shadow-lg space-y-3"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                      <div>
                        <div className="text-xs font-mono text-amber-400 font-semibold">{b.date}</div>
                        <div className="font-bold text-white text-base mt-0.5">{b.title}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-emerald-400 font-mono">
                          ৳{b.amount.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Shopper: {b.shopperName}
                        </div>
                      </div>
                    </div>

                    {b.items && (
                      <div className="text-xs text-slate-300 bg-[#070A12] p-3 rounded-2xl border border-slate-800/60 font-sans leading-relaxed">
                        {b.items}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      {b.receiptImage ? (
                        <button
                          onClick={() => setViewReceiptUrl(b.receiptImage || null)}
                          className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-medium"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          View Memo Receipt
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-600 font-mono">No Receipt</span>
                      )}

                      {userRole === 'manager' && (
                        <button
                          onClick={() => setBazarExpenses((prev) => deleteBazarExpenseAction(prev, b.id))}
                          className="text-xs text-slate-500 hover:text-rose-400 transition-colors"
                          title="Delete Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD MEMBER */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#0E131F] border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              Add New Member
            </h3>
            <form onSubmit={handleAddMember} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Member Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tanvir Hossain"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full bg-[#070A12] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Phone Number (bKash/Nagad)</label>
                <input
                  type="text"
                  placeholder="e.g. 017XXXXXXXX"
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  className="w-full bg-[#070A12] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Room No</label>
                  <input
                    type="text"
                    value={newMemberRoom}
                    onChange={(e) => setNewMemberRoom(e.target.value)}
                    className="w-full bg-[#070A12] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Role</label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as MessRole)}
                    className="w-full bg-[#070A12] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="member">General Member</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-black font-semibold hover:bg-emerald-400 shadow-md shadow-emerald-500/20"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD BAZAR */}
      {showAddBazar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#0E131F] border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              Add Daily Bazar Expense
            </h3>
            <form onSubmit={handleAddBazarSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Who did the bazar?</label>
                <select
                  value={bazarShopperId}
                  onChange={(e) => setBazarShopperId(e.target.value)}
                  className="w-full bg-[#070A12] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                >
                  {memberMeals.map((m) => (
                    <option key={m.memberId} value={m.memberId}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Total Bazar Amount (BDT)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 3500"
                  value={bazarAmount}
                  onChange={(e) => setBazarAmount(e.target.value)}
                  className="w-full bg-[#070A12] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Bazar Title</label>
                <input
                  type="text"
                  placeholder="e.g. Kawran Bazar (Fish, Meat & Veggies)"
                  value={bazarTitle}
                  onChange={(e) => setBazarTitle(e.target.value)}
                  className="w-full bg-[#070A12] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Item Breakdown (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Beef 2kg (৳1500), Rui Fish (৳800), Oil & Spices..."
                  value={bazarItems}
                  onChange={(e) => setBazarItems(e.target.value)}
                  className="w-full bg-[#070A12] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Receipt Memo Voucher Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptUpload}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddBazar(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-black font-semibold hover:bg-amber-400 shadow-md shadow-amber-500/20"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD DEPOSIT */}
      {showAddDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#0E131F] border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-purple-400" />
              Record Member Deposit
            </h3>
            <form onSubmit={handleAddDepositSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Paying Member</label>
                <select
                  value={depMemberId}
                  onChange={(e) => setDepMemberId(e.target.value)}
                  className="w-full bg-[#070A12] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-purple-400 focus:outline-none"
                >
                  {memberMeals.map((m) => (
                    <option key={m.memberId} value={m.memberId}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Deposit Amount (BDT)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 5000"
                  value={depAmount}
                  onChange={(e) => setDepAmount(e.target.value)}
                  className="w-full bg-[#070A12] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:border-purple-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Payment Method</label>
                  <select
                    value={depMethod}
                    onChange={(e) => setDepMethod(e.target.value as any)}
                    className="w-full bg-[#070A12] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-purple-400 focus:outline-none"
                  >
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Cash">Cash</option>
                    <option value="Rocket">Rocket</option>
                    <option value="Bank">Bank</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">TrxID / Note</label>
                  <input
                    type="text"
                    placeholder="e.g. 9JA732BK"
                    value={depNote}
                    onChange={(e) => setDepNote(e.target.value)}
                    className="w-full bg-[#070A12] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-purple-400 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddDeposit(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-500 text-white font-semibold hover:bg-purple-400 shadow-md shadow-purple-500/20"
                >
                  Record Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: INVITE CODE, DIRECT LINK & DATA BACKUP */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-[#0E131F] border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 mx-auto flex items-center justify-center">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{messName}</h3>
              <p className="text-xs text-slate-400 mt-1">
                Share this unique invite code or direct link with flatmates to access this mess.
              </p>
            </div>

            {/* Big Code Display */}
            <div className="bg-[#070A12] border border-slate-800 rounded-2xl p-4 my-2">
              <span className="text-[10px] text-slate-500 block uppercase font-mono mb-1">
                Unique Mess Invite Code
              </span>
              <span className="text-2xl font-black text-sky-400 font-mono tracking-widest">
                {inviteCode}
              </span>
            </div>

            {/* Direct Join Link Bar */}
            <div className="bg-[#070A12] border border-slate-800 rounded-2xl p-3 text-left">
              <span className="text-[10px] text-slate-500 block uppercase font-mono mb-1">
                Direct Join Link
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-300 font-mono truncate select-all">
                  {generateMessDirectJoinLink(inviteCode)}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generateMessDirectJoinLink(inviteCode));
                    setCopiedDirectLink(true);
                    setTimeout(() => setCopiedDirectLink(false), 2000);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 text-[11px] font-semibold whitespace-nowrap flex items-center gap-1 transition-all"
                >
                  <Copy className="w-3 h-3" />
                  {copiedDirectLink ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    generateMessInviteText(messName, inviteCode)
                  );
                  setCopiedInvite(true);
                  setTimeout(() => setCopiedInvite(false), 2000);
                }}
                className="flex-1 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedInvite ? 'Copied Message!' : 'Copy Text'}
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  generateMessInviteText(messName, inviteCode)
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </a>
            </div>

            {/* Offline Backup Export / Share */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">Need offline sync?</span>
              <button
                onClick={() => {
                  const currentMessState: MessState & { id: string } = {
                    id: messId,
                    messName,
                    month,
                    totalMarketCost: computedMarketCost,
                    totalMeals: calculations.totalMeals,
                    fixedCosts,
                    memberMeals,
                    dailyMeals,
                    bazarExpenses,
                    deposits,
                    shoppingList,
                    settings: {
                      cutoffTime,
                      inviteCode,
                      autoMealActive: true,
                      managerPin,
                    },
                  };
                  downloadMessBackupJson(currentMessState);
                }}
                className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 text-[11px]"
              >
                <Download className="w-3 h-3" /> Export Backup (.json)
              </button>
            </div>

            <button
              onClick={() => setShowInviteModal(false)}
              className="text-xs text-slate-400 hover:text-white pt-1 block mx-auto"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MODAL 5: RECEIPT IMAGE VIEWER */}
      {viewReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-[#0E131F] border border-slate-800 rounded-3xl p-5 max-w-lg w-full space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-sky-400" />
                Bazar Cash Memo / Receipt Voucher
              </span>
              <button
                onClick={() => setViewReceiptUrl(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-slate-800"
              >
                ✕
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden max-h-[70vh] flex items-center justify-center bg-black">
              <img
                src={viewReceiptUrl}
                alt="Receipt"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: PRINTABLE SUMMARY SHEET */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 max-w-3xl w-full space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-300">
              <div>
                <h2 className="text-2xl font-black text-slate-900">{messName}</h2>
                <p className="text-xs text-slate-600 font-mono">
                  Monthly Final Statement & Meal Sheet • {month}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print Sheet
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-300"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-100 p-4 rounded-2xl">
              <div>
                <span className="text-slate-500 block">Total Bazar Expense:</span>
                <span className="font-bold text-slate-900 text-sm font-mono">
                  ৳{calculations.totalMarketCost.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Consumed Meals:</span>
                <span className="font-bold text-slate-900 text-sm font-mono">
                  {calculations.totalMeals}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Meal Rate:</span>
                <span className="font-bold text-emerald-700 text-sm font-mono">
                  ৳{calculations.mealRate.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Fixed Overhead:</span>
                <span className="font-bold text-slate-900 text-sm font-mono">
                  ৳{calculations.totalFixedCost.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Member Statement Table */}
            <table className="w-full text-left text-xs border border-slate-300 rounded-xl overflow-hidden">
              <thead className="bg-slate-200 font-semibold text-slate-700">
                <tr>
                  <th className="p-2.5">Member</th>
                  <th className="p-2.5 text-center">Meals</th>
                  <th className="p-2.5 text-right">Meal Cost</th>
                  <th className="p-2.5 text-right">Fixed Share</th>
                  <th className="p-2.5 text-right">Deposit Paid</th>
                  <th className="p-2.5 text-right">Final Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {calculations.memberCalculations.map((m) => (
                  <tr key={m.memberId}>
                    <td className="p-2.5 font-bold">{m.name}</td>
                    <td className="p-2.5 text-center font-mono">{m.mealsCount}</td>
                    <td className="p-2.5 text-right font-mono">৳{m.mealCost.toLocaleString()}</td>
                    <td className="p-2.5 text-right font-mono">৳{m.fixedCostShare.toLocaleString()}</td>
                    <td className="p-2.5 text-right font-mono">৳{m.depositAmount.toLocaleString()}</td>
                    <td className={`p-2.5 text-right font-mono font-bold ${
                      m.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {m.balance >= 0 ? `+৳${m.balance.toLocaleString()}` : `-৳${Math.abs(m.balance).toLocaleString()}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 7: MANAGER PIN SECURITY MODAL */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-[#0E131F] border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Manager PIN Required</h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter your 4-digit manager PIN to unlock full management and editing controls.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (enteredPin === managerPin) {
                  setIsManagerUnlocked(true);
                  setUserRole('manager');
                  setShowPinModal(false);
                  setPinError(null);
                } else {
                  setPinError('Incorrect PIN. Please try again.');
                }
              }}
              className="space-y-4"
            >
              <div>
                <input
                  type="password"
                  maxLength={4}
                  autoFocus
                  placeholder="● ● ● ●"
                  value={enteredPin}
                  onChange={(e) => {
                    setEnteredPin(e.target.value.replace(/\D/g, ''));
                    setPinError(null);
                  }}
                  className="w-36 text-center text-2xl font-mono tracking-widest bg-[#070A12] border border-slate-800 rounded-2xl py-2 text-white focus:border-amber-400 focus:outline-none"
                />
                {pinError && (
                  <p className="text-xs text-rose-400 font-medium mt-2">{pinError}</p>
                )}
              </div>

              <div className="bg-[#070A12] p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-500 font-mono">
                Default PIN: <strong className="text-amber-400">1234</strong> (can be changed anytime)
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-md shadow-amber-500/20"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: CHANGE MANAGER PIN */}
      {showChangePinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-[#0E131F] border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Change Manager PIN</h3>
              <p className="text-xs text-slate-400 mt-1">
                Set a secret 4-digit PIN so only you can access Manager Mode.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newPinInput.length !== 4) {
                  setChangePinError('PIN must be exactly 4 digits.');
                  return;
                }
                if (newPinInput !== confirmNewPinInput) {
                  setChangePinError('PINs do not match.');
                  return;
                }
                setManagerPin(newPinInput);
                setChangePinSuccess(true);
                setTimeout(() => {
                  setShowChangePinModal(false);
                  setChangePinSuccess(false);
                }, 1200);
              }}
              className="space-y-3 text-xs text-left"
            >
              <div>
                <label className="text-slate-300 font-medium block mb-1">New 4-Digit PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  placeholder="e.g. 5678"
                  value={newPinInput}
                  onChange={(e) => {
                    setNewPinInput(e.target.value.replace(/\D/g, ''));
                    setChangePinError(null);
                  }}
                  className="w-full text-center text-lg font-mono tracking-widest bg-[#070A12] border border-slate-800 rounded-xl py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Confirm New PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  placeholder="e.g. 5678"
                  value={confirmNewPinInput}
                  onChange={(e) => {
                    setConfirmNewPinInput(e.target.value.replace(/\D/g, ''));
                    setChangePinError(null);
                  }}
                  className="w-full text-center text-lg font-mono tracking-widest bg-[#070A12] border border-slate-800 rounded-xl py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {changePinError && (
                <p className="text-xs text-rose-400 font-medium text-center">{changePinError}</p>
              )}

              {changePinSuccess && (
                <p className="text-xs text-emerald-400 font-medium text-center">PIN successfully updated!</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangePinModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
                >
                  Save PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 9: MESS SWITCHER & LIST */}
      {showMessSwitcherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-[#0E131F] border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">My Messes & Multi-Mess Switcher</h3>
                  <p className="text-xs text-slate-400">
                    Switch between bachelor messes. Each mess has 100% isolated data.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMessSwitcherModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800/80"
              >
                ✕
              </button>
            </div>

            {/* List of Messes */}
            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
              {allMesses.map((m) => {
                const isActive = m.id === messId;
                const memberCount = m.memberMeals?.length || 0;
                return (
                  <div
                    key={m.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                        : 'bg-[#070A12] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white truncate">
                          {m.messName}
                        </span>
                        {isActive ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            Protected
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-1">
                        <span>{m.month || 'Current Month'}</span>
                        <span>•</span>
                        <span>{memberCount} Roommates</span>
                        <span>•</span>
                        {isActive ? (
                          <span className="text-sky-400 font-bold">{m.settings?.inviteCode}</span>
                        ) : (
                          <span className="text-slate-500 tracking-wider">Code: ••••••</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isActive ? (
                        <button
                          onClick={() => {
                            setSwitchTargetMess(m);
                            setSwitchCodeInput('');
                            setSwitchCodeError(null);
                            setShowSwitchVerifyModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-400 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <Lock className="w-3 h-3 text-amber-400" />
                          Unlock & Switch
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-400 font-semibold px-2 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Current
                        </span>
                      )}

                      {allMesses.length > 1 && (
                        <button
                          onClick={() => handleDeleteMess(m.id)}
                          className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                          title="Delete this mess"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setShowMessSwitcherModal(false);
                  setShowCreateMessModal(true);
                }}
                className="flex-1 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4" /> Create New Mess
              </button>
              <button
                onClick={() => {
                  setShowMessSwitcherModal(false);
                  setShowJoinMessModal(true);
                }}
                className="flex-1 py-2.5 rounded-2xl bg-[#070A12] hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <LogIn className="w-4 h-4 text-sky-400" /> Join via Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 10: CREATE NEW MESS */}
      {showCreateMessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-[#0E131F] border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create New Mess</h3>
                  <p className="text-xs text-slate-400">
                    Creates an isolated workspace with its own records & code.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateMessModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800/80"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewMess} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Mess / Flat Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mirpur 10 Bachelor Flat"
                  value={createMessName}
                  onChange={(e) => setCreateMessName(e.target.value)}
                  className="w-full bg-[#070A12] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Active Month</label>
                  <input
                    type="text"
                    placeholder="e.g. October 2026"
                    value={createMessMonth}
                    onChange={(e) => setCreateMessMonth(e.target.value)}
                    className="w-full bg-[#070A12] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">House Rent (৳)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 24000"
                    value={createHouseRent}
                    onChange={(e) => setCreateHouseRent(e.target.value)}
                    className="w-full bg-[#070A12] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Manager's Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Siam Ahmed"
                  value={createManagerName}
                  onChange={(e) => setCreateManagerName(e.target.value)}
                  className="w-full bg-[#070A12] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Manager Phone</label>
                  <input
                    type="tel"
                    placeholder="017XXXXXXXX"
                    value={createManagerPhone}
                    onChange={(e) => setCreateManagerPhone(e.target.value)}
                    className="w-full bg-[#070A12] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Manager PIN (4-digit)</label>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="1234"
                    value={createManagerPin}
                    onChange={(e) => setCreateManagerPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#070A12] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:border-emerald-500 focus:outline-none font-mono text-center tracking-widest"
                  />
                </div>
              </div>

              <div className="bg-[#070A12] p-3 rounded-2xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p>✨ A unique 6-character Invite Code will be generated automatically.</p>
                <p>🔒 All meals, receipts, deposits, and accounts will be 100% isolated.</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateMessModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition-all shadow-md shadow-emerald-500/20"
                >
                  Create & Switch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 11: JOIN MESS VIA CODE / BACKUP */}
      {showJoinMessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-[#0E131F] border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <LogIn className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Join Mess or Import Backup</h3>
                  <p className="text-xs text-slate-400">
                    Enter an invite code or upload a shared backup JSON file.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowJoinMessModal(false);
                  setJoinError(null);
                  setImportError(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800/80"
              >
                ✕
              </button>
            </div>

            {/* Option A: Search by Invite Code */}
            <form onSubmit={handleJoinByCode} className="space-y-2.5 text-xs">
              <label className="text-slate-300 font-medium block">Enter 6-Character Invite Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. MESS-D27 or MES-XXXX"
                  value={joinCodeInput}
                  onChange={(e) => {
                    setJoinCodeInput(e.target.value.toUpperCase());
                    setJoinError(null);
                  }}
                  className="flex-1 bg-[#070A12] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono uppercase focus:border-sky-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-bold transition-all shadow-md shadow-sky-500/20"
                >
                  Join
                </button>
              </div>

              {joinError && (
                <p className="text-xs text-amber-400 font-medium pt-1">{joinError}</p>
              )}
            </form>

            <div className="relative py-2 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <span className="relative bg-[#0E131F] px-3 text-[11px] text-slate-500 uppercase font-mono">
                OR IMPORT MESS BACKUP FILE
              </span>
            </div>

            {/* Option B: File Upload (.json) */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1.5">
                  Upload Backup File (.json)
                </label>
                <label className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-slate-800 hover:border-slate-700 bg-[#070A12] cursor-pointer group transition-all">
                  <Upload className="w-6 h-6 text-slate-500 group-hover:text-emerald-400 mb-1 transition-colors" />
                  <span className="text-[11px] text-slate-400 group-hover:text-slate-200">
                    Click to select a shared mess backup JSON file
                  </span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Option C: Paste JSON Text */}
              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Or Paste Mess Backup JSON Directly
                </label>
                <textarea
                  rows={3}
                  placeholder='{"app": "HisabSplit", "mess": { ... }}'
                  value={importJsonInput}
                  onChange={(e) => {
                    setImportJsonInput(e.target.value);
                    setImportError(null);
                  }}
                  className="w-full bg-[#070A12] border border-slate-800 rounded-xl p-2.5 text-[11px] font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
                {importJsonInput.trim() && (
                  <button
                    type="button"
                    onClick={() => handleImportJson(importJsonInput)}
                    className="mt-1.5 w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold transition-all"
                  >
                    Load Pasted Backup
                  </button>
                )}
              </div>

              {importError && (
                <p className="text-xs text-rose-400 font-medium text-center">{importError}</p>
              )}

              {importSuccess && (
                <p className="text-xs text-emerald-400 font-medium text-center">
                  Mess successfully imported and activated!
                </p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowJoinMessModal(false)}
                className="w-full py-2 text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 12: SWITCH ACCESS VERIFICATION GATEKEEPER */}
      {showSwitchVerifyModal && switchTargetMess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-[#0E131F] border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Private Mess Access</h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter the secret Mess Code or Manager PIN for <strong className="text-white">"{switchTargetMess.messName}"</strong> to switch.
              </p>
            </div>

            <form onSubmit={handleVerifyAndSwitch} className="space-y-3.5 text-xs text-left">
              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Mess Code or Manager PIN
                </label>
                <input
                  type="password"
                  autoFocus
                  required
                  placeholder="Enter code (e.g. MES-XXXX or PIN)"
                  value={switchCodeInput}
                  onChange={(e) => {
                    setSwitchCodeInput(e.target.value);
                    setSwitchCodeError(null);
                  }}
                  className="w-full text-center text-sm font-mono tracking-widest bg-[#070A12] border border-slate-800 rounded-xl py-2.5 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              {switchCodeError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] text-center font-medium">
                  {switchCodeError}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowSwitchVerifyModal(false);
                    setSwitchTargetMess(null);
                    setSwitchCodeInput('');
                    setSwitchCodeError(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-md shadow-amber-500/20"
                >
                  Verify & Switch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


