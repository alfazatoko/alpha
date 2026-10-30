import React, { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { formatInputRupiah, cn } from '../lib/utils'
import { supabase } from '../lib/supabase'

const SUMBER_APLIKASI_BANK = [
  { id: 'BANK', label: 'Bank UOB', sub: 'Bank', icon: 'fa-building-columns' },
  { id: 'DANA', label: 'DANA', sub: 'E-Wallet', icon: 'fa-wallet' },
  { id: 'ORDER KUOTA', label: 'Order Kuota', sub: 'PPOB', icon: 'fa-bolt' },
  { id: 'FLIP', label: 'Flip', sub: 'Transfer', icon: 'fa-arrow-right-arrow-left' },
];

const SUBCATEGORIES = [
  { id: 'TRANSFER_BANK', label: 'TRANSFER\nBANK', icon: 'fa-building-columns', color: 'bg-blue-100 text-blue-600', active: 'bg-[#0066ff] text-white', glow: 'shadow-[0_0_15px_rgba(0,102,255,0.4)]' },
  { id: 'TOPUP_EWALLET', label: 'TOPUP\nEWALLET', icon: 'fa-wallet', color: 'bg-emerald-100 text-emerald-600', active: 'bg-emerald-500 text-white', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.4)]' },
  { id: 'PPOB', label: 'PPOB', icon: 'fa-bolt', color: 'bg-amber-100 text-amber-600', active: 'bg-amber-500 text-white', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.4)]' },
];

const ITEMS: Record<string, { id: string, name: string, icon: string, color: string, fee?: number }[]> = {
  'TRANSFER_BANK': [
    { id: 'BANK BRI', name: 'BRI', icon: 'fa-building-columns', color: 'text-blue-600', fee: 0 },
    { id: 'BANK BNI', name: 'BNI', icon: 'fa-building-columns', color: 'text-orange-600', fee: 0 },
    { id: 'BANK BCA', name: 'BCA', icon: 'fa-building-columns', color: 'text-blue-800', fee: 0 },
    { id: 'BANK MANDIRI', name: 'MANDIRI', icon: 'fa-building-columns', color: 'text-yellow-600', fee: 0 },
    { id: 'BANK LAINNYA', name: 'LAINNYA', icon: 'fa-building-columns', color: 'text-slate-600', fee: 0 }
  ],
  'TOPUP_EWALLET': [
    { id: 'DANA', name: 'DANA', icon: 'fa-wallet', color: 'text-blue-500', fee: 200 },
    { id: 'GOPAY', name: 'GOPAY', icon: 'fa-wallet', color: 'text-green-500', fee: 900 },
    { id: 'OVO', name: 'OVO', icon: 'fa-wallet', color: 'text-purple-500', fee: 700 },
    { id: 'SHOPEEPAY', name: 'SHOPEEPAY', icon: 'fa-wallet', color: 'text-orange-500', fee: 100 },
    { id: 'LINKAJA', name: 'LINKAJA', icon: 'fa-wallet', color: 'text-red-500', fee: 800 }
  ],
  'PPOB': [
    { id: 'MAXIM', name: 'MAXIM', icon: 'fa-car', color: 'text-yellow-500', fee: 2200 },
    { id: 'PULSA', name: 'PULSA', icon: 'fa-mobile-screen', color: 'text-amber-500', fee: 0 },
    { id: 'TOKEN LISTRIK', name: 'TOKEN LISTRIK', icon: 'fa-bolt', color: 'text-amber-500', fee: 1850 },
    { id: 'PDAM', name: 'PDAM', icon: 'fa-faucet-drip', color: 'text-blue-400', fee: 0 },
    { id: 'TAGIHAN LAIN', name: 'TAGIHAN LAIN', icon: 'fa-file-invoice', color: 'text-slate-500', fee: 0 }
  ],
  'TARIK_TUNAI': [
    { id: 'EDC / ATM', name: 'EDC/ATM', icon: 'fa-credit-card', color: 'text-slate-600' },
    { id: 'QRIS', name: 'QRIS', icon: 'fa-qrcode', color: 'text-[#0066ff]' },
    { id: 'TRANSFER BANK', name: 'TRANSFER', icon: 'fa-building-columns', color: 'text-blue-600' },
    { id: 'DANA', name: 'DANA', icon: 'fa-wallet', color: 'text-blue-500' },
    { id: 'GOPAY', name: 'GOPAY', icon: 'fa-wallet', color: 'text-green-500' }
  ],
  'AKSESORIS': [
    { id: 'CHARGER', name: 'CHARGER', icon: 'fa-plug', color: 'text-blue-500' },
    { id: 'KABEL DATA', name: 'KABEL DATA', icon: 'fa-bolt', color: 'text-amber-500' },
    { id: 'HEADSET', name: 'HEADSET', icon: 'fa-headphones', color: 'text-purple-500' },
    { id: 'TEMPERED GLASS', name: 'TEMPERED GLASS', icon: 'fa-mobile-screen', color: 'text-emerald-500' },
    { id: 'CASING', name: 'CASING', icon: 'fa-shield-halved', color: 'text-indigo-500' },
    { id: 'POWERBANK', name: 'POWERBANK', icon: 'fa-battery-full', color: 'text-teal-500' },
    { id: 'SPEAKER', name: 'SPEAKER', icon: 'fa-volume-high', color: 'text-rose-500' },
    { id: 'MEMORY / OTG', name: 'MEMORY / OTG', icon: 'fa-hard-drive', color: 'text-cyan-500' },
    { id: 'HOLDER HP', name: 'HOLDER HP', icon: 'fa-mobile', color: 'text-orange-500' },
    { id: 'LAINNYA', name: 'LAINNYA', icon: 'fa-box-open', color: 'text-slate-600' }
  ]
};

export const DEFAULT_CUSTOM_BUTTON_LABELS: Record<string, string> = {
  'DIGITAL': 'Transfer',
  'TARIK': 'Tarik Tunai',
  'AKSESORIS': 'Aksesoris',
  'VOUCHER': 'Voucher',
  'BANK': 'Bank UOB',
  'DANA': 'DANA',
  'ORDER KUOTA': 'Order Kuota',
  'FLIP': 'Flip',
  'EDC / ATM': 'EDC/ATM',
  'QRIS': 'QRIS',
  'TRANSFER BANK': 'TRANSFER',
  'TARIK_DANA': 'DANA',
  'GOPAY': 'GOPAY'
};

interface TransactionFormProps {
  onSave: (data: { kategori: string, nominal: string, admin: string, keterangan: string }, options?: { activeTab: string, subTab: string, isAdminNonTunai: boolean, isSplit?: boolean, nonTunaiAmount?: number }) => void
  isSaving?: boolean
  presets?: any[]
  onOpenVoucherJualCepat?: () => void
  activeStoreId?: string
  adminRules?: Record<string, any>
  initialMode?: 'DIGITAL' | 'TARIK' | 'AKSESORIS' | 'VOUCHER'
  onModeChange?: (mode: string) => void
  hideModeTabs?: boolean
  hideHeader?: boolean
  lastTx?: any
  onOpenRiwayatDetail?: (tx: any) => void
  isOwner?: boolean
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  onSave, isSaving, presets = [], onOpenVoucherJualCepat, activeStoreId, adminRules, initialMode, onModeChange, hideModeTabs, hideHeader, lastTx, onOpenRiwayatDetail, isOwner
}) => {
  const userRole = isOwner !== undefined 
    ? (isOwner ? 'owner' : 'kasir') 
    : (localStorage.getItem('alphaPro_role') || 'kasir');
  const isActualOwner = userRole === 'owner';

  const [customLabels, setCustomLabels] = useState<Record<string, any>>(() => {
    try {
      const storeKey = activeStoreId ? `alphaPro_${activeStoreId}_custom_labels` : 'alphaPro_custom_labels';
      const saved = localStorage.getItem(storeKey);
      if (saved) {
        return { ...DEFAULT_CUSTOM_BUTTON_LABELS, ...JSON.parse(saved) };
      }
    } catch (e) {}
    return DEFAULT_CUSTOM_BUTTON_LABELS;
  });

  const [isEditLabelsModalOpen, setIsEditLabelsModalOpen] = useState(false);
  const [tempLabels, setTempLabels] = useState<Record<string, any>>(customLabels);
  const [isSavingLabels, setIsSavingLabels] = useState(false);

  // Sync customLabels dari Presets, Supabase & Realtime per-toko
  useEffect(() => {
    if (!activeStoreId || activeStoreId === 'all') return;

    const storeKey = `alphaPro_${activeStoreId}_custom_labels`;

    // 1. Cek dari presets prop (_CUSTOM_LABELS_) jika tersedia
    const labelPreset = presets?.find((p: any) => p && p.id === '_CUSTOM_LABELS_');
    if (labelPreset && labelPreset.data && typeof labelPreset.data === 'object') {
      const merged = { ...DEFAULT_CUSTOM_BUTTON_LABELS, ...labelPreset.data };
      setCustomLabels(merged);
      setTempLabels(merged);
      localStorage.setItem(storeKey, JSON.stringify(labelPreset.data));
    } else {
      const saved = localStorage.getItem(storeKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const merged = { ...DEFAULT_CUSTOM_BUTTON_LABELS, ...parsed };
          setCustomLabels(merged);
          setTempLabels(merged);
        } catch (e) {}
      }
    }

    // 2. Fetch dari cloud Supabase (tabel khusus store_custom_labels)
    const fetchLabels = async () => {
      try {
        const { data, error } = await supabase
          .from('store_custom_labels')
          .select('labels')
          .eq('store_id', activeStoreId)
          .maybeSingle();

        if (data && data.labels && typeof data.labels === 'object') {
          const merged = { ...DEFAULT_CUSTOM_BUTTON_LABELS, ...data.labels };
          setCustomLabels(merged);
          setTempLabels(merged);
          localStorage.setItem(storeKey, JSON.stringify(data.labels));
        }
      } catch (e) {
        // Abaikan jika tabel belum dibuat di schema Supabase (tetap pakai presets / local)
      }
    };

    fetchLabels();

    // 3. Realtime listener per store_id: saat Owner simpan, seluruh HP kasir langsung ter-update seketika
    let channel: any = null;
    try {
      const channelName = `rt_custom_labels_${activeStoreId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'store_custom_labels',
            filter: `store_id=eq.${activeStoreId}`
          },
          (payload: any) => {
            if (payload.new && payload.new.labels && typeof payload.new.labels === 'object') {
              const merged = { ...DEFAULT_CUSTOM_BUTTON_LABELS, ...payload.new.labels };
              setCustomLabels(merged);
              setTempLabels(merged);
              localStorage.setItem(storeKey, JSON.stringify(payload.new.labels));
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Custom labels realtime subscribe warning:', e);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (e) {}
      }
    };
  }, [activeStoreId, presets]);

  // Listener event update customLabels lokal & realtime lintas komponen
  useEffect(() => {
    const handleLabelsEvent = (e: any) => {
      const detail = e.detail;
      const labels = detail?.labels || detail;
      const storeId = detail?.storeId;
      if (labels && typeof labels === 'object') {
        if (!storeId || !activeStoreId || storeId === activeStoreId) {
          const merged = { ...DEFAULT_CUSTOM_BUTTON_LABELS, ...labels };
          setCustomLabels(merged);
          setTempLabels(merged);
        }
      }
    };
    window.addEventListener('alphaCustomLabelsUpdated', handleLabelsEvent);
    return () => window.removeEventListener('alphaCustomLabelsUpdated', handleLabelsEvent);
  }, [activeStoreId]);

  const handleSaveCustomLabels = async () => {
    setIsSavingLabels(true);
    try {
      const storeKey = activeStoreId ? `alphaPro_${activeStoreId}_custom_labels` : 'alphaPro_custom_labels';
      setCustomLabels(tempLabels);
      localStorage.setItem(storeKey, JSON.stringify(tempLabels));
      window.dispatchEvent(new CustomEvent('alphaCustomLabelsUpdated', { 
        detail: { labels: tempLabels, storeId: activeStoreId } 
      }));

      const visibleTransfer = ['BANK', 'DANA', 'FLIP', 'ORDER KUOTA'].filter(m => !tempLabels['HIDE_' + m]);
      if (visibleTransfer.length > 0) {
        setActiveTransferMethods(visibleTransfer);
        if (tempLabels['HIDE_' + sumberAplikasi]) {
          setSumberAplikasi(visibleTransfer[0]);
        }
      }

      if (activeStoreId && activeStoreId !== 'all') {
        localStorage.setItem(`alphaPro_${activeStoreId}_transferMethods`, JSON.stringify(visibleTransfer));
        window.dispatchEvent(new CustomEvent('alphaUpdateTransferMethods', { detail: visibleTransfer }));

        // Simpan juga ke App.tsx agar tersimpan ke cloud Supabase store_settings.presets._CUSTOM_LABELS_
        window.dispatchEvent(new CustomEvent('alphaUpdateCustomLabels', { 
          detail: { labels: tempLabels, storeId: activeStoreId } 
        }));

        try {
          await supabase
            .from('store_custom_labels')
            .upsert({
              store_id: activeStoreId,
              labels: tempLabels,
              updated_at: new Date().toISOString()
            });
        } catch (e) {}
      }

      setIsEditLabelsModalOpen(false);
    } catch (e) {
      console.error('Gagal simpan custom labels ke cloud:', e);
      setIsEditLabelsModalOpen(false);
    } finally {
      setIsSavingLabels(false);
    }
  };

  const handleResetCustomLabels = () => {
    const resetObj: Record<string, any> = { ...DEFAULT_CUSTOM_BUTTON_LABELS };
    ['BANK', 'DANA', 'ORDER KUOTA', 'FLIP', 'EDC / ATM', 'QRIS', 'TRANSFER BANK', 'TARIK_DANA', 'GOPAY'].forEach(k => {
      resetObj['HIDE_' + k] = false;
    });
    setTempLabels(resetObj);
  };

  const [kategori, setKategori] = useState('')
  const [nominal, setNominal] = useState('')
  const [admin, setAdmin] = useState('')
  const [keterangan, setKeterangan] = useState('')

  const [activeMode, setActiveModeState] = useState<'DIGITAL' | 'TARIK' | 'AKSESORIS' | 'VOUCHER' | ''>(initialMode || '')
  const setActiveMode = (mode: 'DIGITAL' | 'TARIK' | 'AKSESORIS' | 'VOUCHER' | '') => {
    setActiveModeState(mode)
    if (onModeChange && mode) onModeChange(mode)
  }
  const [subMode, setSubMode] = useState<'NORMAL' | 'KHUSUS' | 'NON_TUNAI'>('NORMAL')
  const [isAdminNonTunai, setIsAdminNonTunai] = useState(false)
  const [aksesorisPayMode, setAksesorisPayMode] = useState<'TUNAI' | 'QRIS'>('TUNAI')
  const [isKetAuto, setIsKetAuto] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [selectedBank, setSelectedBank] = useState('BRI')
  const [selectedSumber, setSelectedSumber] = useState('QRIS')
  const [sumberAplikasi, setSumberAplikasi] = useState('')
  const [classicPopupMode, setClassicPopupMode] = useState<'BANK'|'ORDER_KUOTA'|'FLIP'|'DANA'|'AKSESORIS'|null>(null)
  const [selectedTujuan, setSelectedTujuan] = useState('')
  const [selectedTujuanFee, setSelectedTujuanFee] = useState(0)
  const [tujuanMasuk, setTujuanMasuk] = useState('TUNAI LACI KASIR')
  const [activeSubCategory, setActiveSubCategory] = useState<string>('')
  const [customInputModal, setCustomInputModal] = useState<{
    isOpen: boolean;
    category: 'BANK' | 'AKSESORIS' | 'PPOB' | 'FLIP' | 'DANA';
    title: string;
    subtitle: string;
    placeholder: string;
    chips: string[];
    fee?: number;
    item?: any;
  } | null>(null)
  const [customInputValue, setCustomInputValue] = useState('')
  const [customInputError, setCustomInputError] = useState(false)
  const customInputRef = useRef<HTMLInputElement>(null)
  const [nominalCashSplit, setNominalCashSplit] = useState('')
  const [nominalNonTunaiSplit, setNominalNonTunaiSplit] = useState('')
  const [isSumberModalOpen, setIsSumberModalOpen] = useState(false)
  const [isTujuanModalOpen, setIsTujuanModalOpen] = useState(false)
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false)
  const [orderKuotaMode, setOrderKuotaMode] = useState<'MODAL_JUAL' | 'NOMINAL_ADMIN'>(() => {
    const username = localStorage.getItem('alphaPro_username') || 'unknown';
    const saved = localStorage.getItem(`app_order_kuota_mode_${username}`);
    return (saved === 'MODAL_JUAL' || saved === 'NOMINAL_ADMIN') ? saved : 'MODAL_JUAL';
  })

  const [activeTheme, setActiveTheme] = useState(() => {
    const username = localStorage.getItem('alphaPro_username') || 'unknown';
    const saved = localStorage.getItem(`app_active_theme_${username}`);
    return saved ? saved : 'TEMA_2';
  });

  // Ambil data dari Supabase saat pertama kali load
  useEffect(() => {
    const username = localStorage.getItem('alphaPro_username');
    if (!username || username === 'unknown') return;

    supabase.from('cashier_settings').select('preferences').eq('username', username).maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("Gagal load setting kasir dari Supabase", error);
          return;
        }
        if (data && data.preferences) {
           const prefs = data.preferences as any;
           if (prefs.orderKuotaMode) {
              setOrderKuotaMode(prefs.orderKuotaMode);
              localStorage.setItem(`app_order_kuota_mode_${username}`, prefs.orderKuotaMode);
           }
           if (prefs.activeTheme) {
              setActiveTheme(prefs.activeTheme);
              localStorage.setItem(`app_active_theme_${username}`, prefs.activeTheme);
           }
        }
      });
  }, []);

  // Simpan ke Supabase jika ada perubahan (supaya sync online)
  const isSettingsFirstRender = useRef(true);
  useEffect(() => {
    if (isSettingsFirstRender.current) {
      isSettingsFirstRender.current = false;
      return;
    }
    const username = localStorage.getItem('alphaPro_username');
    if (!username || username === 'unknown') return;

    localStorage.setItem(`app_order_kuota_mode_${username}`, orderKuotaMode);
    localStorage.setItem(`app_active_theme_${username}`, activeTheme);

    const preferences = { orderKuotaMode, activeTheme };
    supabase.from('cashier_settings').upsert({ username, preferences }, { onConflict: 'username' })
      .then(({ error }) => {
        if (error) console.error("Gagal simpan setting kasir ke Supabase", error);
        else console.log('Cashier settings tersimpan di online database.');
      });
  }, [orderKuotaMode, activeTheme]);
  const [isTema3SheetOpen, setIsTema3SheetOpen] = useState(false)
  const [tema3Step, setTema3Step] = useState<'MAIN' | 'DIGITAL' | 'TARIK' | 'BANK_SELECTION'>('MAIN')
  const [activeTransferMethods, setActiveTransferMethods] = useState<string[]>(['BANK', 'DANA', 'FLIP', 'ORDER KUOTA'])

  const effectiveStoreId = (activeStoreId && activeStoreId !== 'all') 
    ? activeStoreId 
    : (localStorage.getItem('alphaPro_active_store_id') && localStorage.getItem('alphaPro_active_store_id') !== 'all'
        ? localStorage.getItem('alphaPro_active_store_id')
        : (localStorage.getItem('alphaPro_pantau_store_id') || null));

  const DEFAULT_POPUP_LISTS: Record<string, any[]> = React.useMemo(() => ({
    BANK: ITEMS['TRANSFER_BANK'],
    ORDER_KUOTA: [...ITEMS['TOPUP_EWALLET'], ...ITEMS['PPOB']],
    FLIP: [...ITEMS['TRANSFER_BANK'], ...ITEMS['TOPUP_EWALLET']],
    DANA: [],
    AKSESORIS: ITEMS['AKSESORIS']
  }), []);

  const mergePopupListWithDefaults = React.useCallback((sourceLists: Record<string, any[]>) => {
    if (!sourceLists || typeof sourceLists !== 'object') return DEFAULT_POPUP_LISTS;
    const res: Record<string, any[]> = { ...DEFAULT_POPUP_LISTS };
    for (const key of ['BANK', 'ORDER_KUOTA', 'FLIP', 'DANA', 'AKSESORIS']) {
      const src = sourceLists[key];
      const def = DEFAULT_POPUP_LISTS[key] || [];
      if (Array.isArray(src)) {
        if (src.length === 0) {
          res[key] = [];
        } else {
          res[key] = src.map(item => {
            const defaultItem = def.find((d: any) => d.id === item.id || d.name === item.name);
            const hasFee = item.fee !== undefined && item.fee !== null && !isNaN(Number(item.fee));
            const itemFee = hasFee ? Number(item.fee) : (defaultItem?.fee !== undefined ? Number(defaultItem.fee) : 0);
            return {
              ...(defaultItem || {}),
              ...item,
              fee: itemFee
            };
          });
        }
      } else {
        res[key] = def;
      }
    }
    return res;
  }, [DEFAULT_POPUP_LISTS]);

  const [popupLists, setPopupLists] = useState<Record<string, any[]>>(() => {
    try {
      const popupPreset = presets?.find((p: any) => p && p.id === '_POPUP_LISTS_');
      if (popupPreset && popupPreset.data) {
        return mergePopupListWithDefaults(popupPreset.data);
      }
    } catch(e) {}
    
    const storeKey = effectiveStoreId ? `alphaPro_${effectiveStoreId}_popup_lists` : 'alphaPro_popup_lists';
    const saved = localStorage.getItem(storeKey) || localStorage.getItem('alphaPro_popup_lists');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return mergePopupListWithDefaults(parsed);
      } catch (e) {}
    }
    return DEFAULT_POPUP_LISTS;
  });

  // Sync popupLists saat presets atau effectiveStoreId berubah
  React.useEffect(() => {
    const popupPreset = presets?.find((p: any) => p && p.id === '_POPUP_LISTS_');
    if (popupPreset && popupPreset.data) {
      const merged = mergePopupListWithDefaults(popupPreset.data);
      setPopupLists(merged);
      if (effectiveStoreId) {
        localStorage.setItem(`alphaPro_${effectiveStoreId}_popup_lists`, JSON.stringify(merged));
      }
      return;
    }

    if (effectiveStoreId) {
      const saved = localStorage.getItem(`alphaPro_${effectiveStoreId}_popup_lists`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setPopupLists(mergePopupListWithDefaults(parsed));
          return;
        } catch (e) {}
      }
    }
  }, [presets, effectiveStoreId, mergePopupListWithDefaults]);

  // Sinkronisasi Online Database Supabase (store_popup_lists) & Realtime
  React.useEffect(() => {
    const sId = effectiveStoreId;
    if (!sId) return;

    // 1. Fetch langsung dari tabel online store_popup_lists
    const fetchOnlineLists = async () => {
      try {
        const { data, error } = await supabase.from('store_popup_lists').select('lists').eq('store_id', sId).maybeSingle();
        if (!error && data?.lists) {
          const merged = mergePopupListWithDefaults(data.lists);
          setPopupLists(merged);
          localStorage.setItem(`alphaPro_${sId}_popup_lists`, JSON.stringify(merged));
        }
      } catch (e) {}
    };
    fetchOnlineLists();

    // 2. Realtime listener Postgres Changes dengan nama channel unik & aman
    let channel: any = null;
    try {
      const channelName = `rt_popup_lists_${sId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      channel = supabase.channel(channelName)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'store_popup_lists',
          filter: `store_id=eq.${sId}`
        }, (payload: any) => {
          if (payload.new && payload.new.lists) {
            const merged = mergePopupListWithDefaults(payload.new.lists);
            setPopupLists(merged);
            localStorage.setItem(`alphaPro_${sId}_popup_lists`, JSON.stringify(merged));
          }
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime channel subscribe warning:', e);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (e) {}
      }
    };
  }, [effectiveStoreId, mergePopupListWithDefaults]);

  // Realtime update listener dari App.tsx untuk popupLists per toko
  React.useEffect(() => {
    const handlePopupChanged = (e: any) => {
      const detail = e.detail;
      if (detail && detail.lists) {
        if (!detail.storeId || !effectiveStoreId || detail.storeId === effectiveStoreId) {
          setPopupLists(prev => ({
            ...prev,
            ...detail.lists,
            AKSESORIS: detail.lists.AKSESORIS || prev.AKSESORIS || ITEMS['AKSESORIS']
          }));
        }
      }
    };
    window.addEventListener('alphaPopupListsChanged', handlePopupChanged);
    return () => window.removeEventListener('alphaPopupListsChanged', handlePopupChanged);
  }, [effectiveStoreId]);
  
  const [isEditingPopup, setIsEditingPopup] = useState(false);

  const handleUpdatePopupList = async (mode: string, newList: any[]) => {
    const updated = { ...popupLists, [mode]: newList };
    setPopupLists(updated);
    
    const sId = effectiveStoreId;
    // Simpan terisolasi per toko di localStorage
    if (sId) {
      localStorage.setItem(`alphaPro_${sId}_popup_lists`, JSON.stringify(updated));
    }
    localStorage.setItem('alphaPro_popup_lists', JSON.stringify(updated));
    
    // Dispatch ke App.tsx dengan menyertakan storeId aktif agar disinkronkan ke Supabase per-toko
    window.dispatchEvent(new CustomEvent('alphaUpdatePopupLists', { 
      detail: { lists: updated, storeId: sId } 
    }));

    // Simpan langsung ke Supabase store_popup_lists (Online Database)
    if (sId) {
      try {
        await supabase.from('store_popup_lists').upsert({
          store_id: sId,
          lists: updated,
          updated_at: new Date().toISOString()
        }, { onConflict: 'store_id' });
      } catch (e) {
        console.error('Gagal simpan ke store_popup_lists:', e);
      }
    }
  };

  const getPopupMode = (categoryKey: string): 'BANK' | 'ORDER_KUOTA' | 'FLIP' | 'DANA' | null => {
    if (categoryKey === 'BANK') return 'BANK';
    if (categoryKey === 'ORDER KUOTA' || categoryKey === 'ORDER_KUOTA') return 'ORDER_KUOTA';
    if (categoryKey === 'FLIP') return 'FLIP';
    if (categoryKey === 'DANA') return 'DANA';
    return null;
  };

  const handleTransferCategoryClick = (categoryKey: string, isExplicitDoubleClick: boolean = false) => {
    const mode = getPopupMode(categoryKey);
    const isAlreadyActive = (sumberAplikasi === categoryKey);

    if (categoryKey !== sumberAplikasi) {
      setSelectedTujuan('');
      setSelectedTujuanFee(0);
    }

    setSumberAplikasi(categoryKey);
    setIsKetAuto(true);
    setIsAdminManuallyEdited(false);
    setActiveSubCategory('');

    if (!mode) return;

    const subList = popupLists[mode] || [];
    const hasSubList = subList.length > 0;

    if (hasSubList) {
      // 1. Jika ADA sub pilihan:
      // Cukup 1x klik -> LANGSUNG muncul popup sub-tujuannya!
      setClassicPopupMode(mode);
    } else {
      // 2. Jika TIDAK ADA sub pilihan (kosong):
      if (isAlreadyActive || isExplicitDoubleClick) {
        // Klik 2x (atau klik sekali lagi saat tombol sudah aktif) -> Buka popup sub-tujuan!
        setClassicPopupMode(mode);
      } else {
        // Klik 1x biasa saat tombol belum aktif:
        // Langsung otomatis masuk & fokus ke kolom keterangan
        setClassicPopupMode(null);
        setKeterangan('');
        setTimeout(() => {
          keteranganRef.current?.focus();
          keteranganRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
    }
  };

  const handleAddNewPopupItem = () => {
    if (!classicPopupMode) return;
    const name = window.prompt(classicPopupMode === 'AKSESORIS' ? "Masukkan nama aksesoris baru:" : "Masukkan nama pilihan tujuan transaksi baru:");
    if (name && name.trim()) {
      const trimmedName = name.trim().toUpperCase();
      let fee = 0;
      if (classicPopupMode === 'ORDER_KUOTA' || classicPopupMode === 'FLIP' || classicPopupMode === 'BANK' || classicPopupMode === 'DANA') {
        const feeStr = window.prompt(`Atur Fee Aplikasi untuk "${trimmedName}":\n(Isi nominal angka fee, atau isi 0 jika tidak ada fee)`, "0");
        if (feeStr !== null) {
          const cleanDigits = feeStr.trim().replace(/[^0-9]/g, '');
          fee = cleanDigits === '' ? 0 : parseInt(cleanDigits, 10);
        }
      }
      const icon = classicPopupMode === 'AKSESORIS' ? 'fa-headset' : (classicPopupMode === 'BANK' ? 'fa-building-columns' : 'fa-wallet');
      const color = classicPopupMode === 'AKSESORIS' ? 'text-purple-500' : 'text-blue-500';
      const newItem = { id: trimmedName, name: trimmedName, icon, color, fee };
      const currentList = popupLists[classicPopupMode] || [];
      handleUpdatePopupList(classicPopupMode, [...currentList, newItem]);
    }
  };

  const isLainnyaItem = (name: string, id?: string) => {
    const n = (name || '').toUpperCase().trim();
    const i = (id || '').toUpperCase().trim();
    return (
      n === 'LAINNYA' ||
      n === 'LAIN NYA' ||
      n === 'TAGIHAN LAIN' ||
      n === 'BANK LAINNYA' ||
      n.includes('LAINNYA') ||
      n.includes('TAGIHAN LAIN') ||
      i.includes('LAINNYA') ||
      i.includes('TAGIHAN LAIN')
    );
  };

  const openCustomInputModal = (mode: 'BANK' | 'ORDER_KUOTA' | 'FLIP' | 'DANA' | 'AKSESORIS', item?: any) => {
    let cat: 'BANK' | 'AKSESORIS' | 'PPOB' | 'FLIP' | 'DANA' = 'BANK';
    let title = 'TULIS KETERANGAN TUJUAN';
    let subtitle = 'Tulis nama tujuan transaksi atau pilih tombol cepat';
    let placeholder = 'Tulis keterangan disini...';
    let chips: string[] = [];

    if (mode === 'BANK') {
      cat = 'BANK';
      title = 'PILIH / TULIS BANK TUJUAN';
      subtitle = 'Tulis nama Bank lain atau pilih quick chip di bawah';
      placeholder = 'Tulis keterangan disini... (Contoh: Jago, Neo, Permata)';
      chips = ['JAGO', 'NEO COMMERCE', 'PERMATA', 'CIMB NIAGA', 'DANAMON', 'BANK BJB', 'MUAMALAT', 'PANIN'];
    } else if (mode === 'AKSESORIS') {
      cat = 'AKSESORIS';
      title = 'TULIS AKSESORIS LAINNYA';
      subtitle = 'Tulis nama barang aksesoris atau pilih quick chip di bawah';
      placeholder = 'Tulis keterangan disini... (Contoh: Tripod, Ring HP, Lem LCD)';
      chips = ['TRIPOD', 'RING HP', 'BATERAI', 'LEM LCD', 'MIC WIRELESS', 'CONNECTOR', 'KARTU MEMORI', 'OTG'];
    } else if (mode === 'ORDER_KUOTA') {
      cat = 'PPOB';
      title = 'PILIH / TULIS TAGIHAN PPOB';
      subtitle = 'Tulis jenis layanan / tagihan atau pilih quick chip di bawah';
      placeholder = 'Tulis keterangan disini... (Contoh: BPJS, Indihome, FIF)';
      chips = ['BPJS', 'INDIHOME', 'FIF', 'ADIRA', 'TOPUP ML', 'FREE FIRE', 'BAF', 'ICONNET', 'MEGA FINANCE'];
    } else if (mode === 'FLIP') {
      cat = 'FLIP';
      title = 'PILIH / TULIS TUJUAN FLIP';
      subtitle = 'Tulis nama Bank / E-Wallet tujuan transfer via Flip';
      placeholder = 'Tulis keterangan disini... (Contoh: Jago, SeaBank, OVO)';
      chips = ['JAGO', 'SEABANK', 'NEO', 'PERMATA', 'CIMB', 'DANAMON', 'OVO', 'SHOPEEPAY'];
    } else if (mode === 'DANA') {
      cat = 'DANA';
      title = 'PILIH / TULIS SUB-TUJUAN DANA';
      subtitle = 'Tulis nama tujuan transfer via Dana';
      placeholder = 'Tulis keterangan disini... (Contoh: Rekening Bank, Saldo)';
      chips = ['REKENING BANK', 'SALDO DANA', 'TARIK TUNAI', 'JAGO', 'SEABANK'];
    }

    setCustomInputValue('');
    setCustomInputError(false);
    setCustomInputModal({
      isOpen: true,
      category: cat,
      title,
      subtitle,
      placeholder,
      chips,
      fee: item?.fee !== undefined && item?.fee !== null ? Number(item.fee) : 0,
      item
    });

    setTimeout(() => {
      customInputRef.current?.focus();
    }, 120);
  };

  const handleCustomInputSubmit = (val: string) => {
    const cleanVal = (val || '').trim().toUpperCase();
    if (!cleanVal) {
      setCustomInputError(true);
      if (customInputRef.current) {
        customInputRef.current.focus();
      }
      return;
    }

    if (!customInputModal) return;
    const { category, item } = customInputModal;

    setIsKetAuto(true);

    if (category === 'AKSESORIS') {
      setKeterangan(cleanVal);
      setCustomInputModal(null);
      setClassicPopupMode(null);
      setTimeout(() => {
        nominalRef.current?.focus();
        nominalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      return;
    }

    if (category === 'BANK') {
      setSelectedBank('LAINNYA');
      setKeterangan(cleanVal);
      setCustomInputModal(null);
      setClassicPopupMode(null);
      setTimeout(() => {
        nominalRef.current?.focus();
        nominalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      return;
    }

    // PPOB, ORDER_KUOTA, FLIP, DANA
    setSelectedTujuan(item?.name || 'TAGIHAN LAIN');
    if (item?.fee !== undefined && item?.fee !== null) {
      setSelectedTujuanFee(Number(item.fee));
    } else {
      setSelectedTujuanFee(0);
    }
    setKeterangan(cleanVal);
    setCustomInputModal(null);
    setClassicPopupMode(null);
    setTimeout(() => {
      nominalRef.current?.focus();
      nominalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  // Sync initialMode when it changes externally
  React.useEffect(() => {
    if (initialMode) {
      setActiveModeState(initialMode)
      const modeToKategori: Record<string, string> = { DIGITAL: 'Transfer Bank', TARIK: 'Tarik Tunai', AKSESORIS: 'Aksesoris', VOUCHER: 'Voucher' }
      setKategori(modeToKategori[initialMode] || '')
    }
  }, [initialMode])

  React.useEffect(() => {
    const handleUpdate = () => {
      try {
        const transferPreset = presets?.find((p: any) => p.id === '_TRANSFER_METHODS_');
        let methods = ['BANK', 'DANA', 'FLIP', 'ORDER KUOTA'];
        if (transferPreset && transferPreset.data) {
          methods = transferPreset.data;
        } else {
          const saved = localStorage.getItem(`alphaPro_${activeStoreId}_transferMethods`);
          if (saved) methods = JSON.parse(saved);
        }
        const filtered = methods.filter((m: string) => !customLabels['HIDE_' + m]);
        const finalMethods = filtered.length > 0 ? filtered : methods;
        setActiveTransferMethods(finalMethods);
        setSumberAplikasi(prev => finalMethods.includes(prev) ? prev : (finalMethods[0] || 'BANK'));
      } catch (e) {
        const fallback = ['BANK', 'DANA', 'FLIP', 'ORDER KUOTA'].filter(m => !customLabels['HIDE_' + m]);
        setActiveTransferMethods(fallback.length > 0 ? fallback : ['BANK', 'DANA', 'FLIP', 'ORDER KUOTA']);
      }
    };
    handleUpdate();
    window.addEventListener('alphaSyncUpdate', handleUpdate);
    return () => window.removeEventListener('alphaSyncUpdate', handleUpdate);
  }, [activeStoreId, presets, customLabels]);

  React.useEffect(() => {
    const isCurrentTarikHidden = (
      (selectedSumber === 'QRIS' && customLabels['HIDE_QRIS']) ||
      (selectedSumber === 'DANA' && customLabels['HIDE_TARIK_DANA']) ||
      ((selectedSumber === 'ATM' || selectedSumber === 'ATM/EDC') && customLabels['HIDE_EDC / ATM']) ||
      (selectedSumber === 'GOPAY' && customLabels['HIDE_GOPAY']) ||
      ((selectedSumber === 'BANK' || selectedSumber === 'TRANSFER') && customLabels['HIDE_TRANSFER BANK'])
    );
    if (isCurrentTarikHidden) {
      const visibleTarik = ITEMS['TARIK_TUNAI'].filter(item => {
        const hKey = item.id === 'DANA' ? 'HIDE_TARIK_DANA' : 'HIDE_' + item.id;
        return !customLabels[hKey];
      });
      if (visibleTarik.length > 0) {
        const first = visibleTarik[0];
        const val = first.name === 'EDC/ATM' ? 'ATM/EDC' : first.name === 'TRANSFER' ? 'BANK' : first.name;
        setSelectedSumber(val);
        setTujuanMasuk(val);
      }
    }
  }, [customLabels, selectedSumber]);
  // --- KALKULATOR STATE ---
  const [showCalc, setShowCalc] = useState(false)
  const [calcDisplay, setCalcDisplay] = useState('0')
  const [calcExpression, setCalcExpression] = useState('')
  const [calcPrev, setCalcPrev] = useState<number | null>(null)
  const [calcOperator, setCalcOperator] = useState<string | null>(null)
  const [calcNewInput, setCalcNewInput] = useState(true)

  // Effect untuk auto-focus saat ganti layar di Tema 3
  React.useEffect(() => {
    if (isTema3SheetOpen) {
      const timer = setTimeout(() => {
        const activeSlide = document.querySelector('#tema3-bottom-sheet .translate-x-0');
        if (activeSlide) {
           const focusBtn = activeSlide.querySelector('button[data-autofocus="true"]') as HTMLElement;
           if (focusBtn) focusBtn.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [tema3Step, isTema3SheetOpen]);

  const BANK_LIST = ['BRI','BNI','BCA','MANDIRI','LAINNYA']
  const SUMBER_LIST = ['BANK','GoPay','QRIS','DANA','ATM/EDC']
  const sumberToKategori: Record<string,string> = { 'BANK':'Transfer Bank','FLIP':'FLIP','ORDER KUOTA':'Order Kuota','DANA':'DANA' }

  // Global Keyboard Shortcuts (berlaku di mana saja di halaman beranda)
  React.useEffect(() => {
    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (isSumberModalOpen || isTujuanModalOpen) return;
      
      const active = document.activeElement;
      const isTyping = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;

      if (!isTyping && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (e.key === 'Escape') {
          if (isTema3SheetOpen) setIsTema3SheetOpen(false);
        }
        if (e.key === 'q' || e.key === 'Q') { 
          e.preventDefault(); 
          if (activeTheme === 'TEMA_3') {
            if (isTema3SheetOpen) setIsTema3SheetOpen(false);
            else { setTema3Step('MAIN'); setIsTema3SheetOpen(true); }
          } else {
            setActiveMode('DIGITAL'); setKategori(sumberToKategori[sumberAplikasi] || 'Transfer Bank'); setIsAdminManuallyEdited(false);
          }
          return;
        }
        if (e.key === 'w' || e.key === 'W') { e.preventDefault(); setActiveMode('TARIK'); setKategori('Tarik Tunai'); setIsAdminManuallyEdited(false); return; }
        if (e.key === 'e' || e.key === 'E') { e.preventDefault(); setActiveMode('AKSESORIS'); setKategori('Aksesoris'); setIsAdminManuallyEdited(false); setClassicPopupMode('AKSESORIS'); return; }
        if (e.key === 'r' || e.key === 'R') { e.preventDefault(); if (onOpenVoucherJualCepat) onOpenVoucherJualCepat(); return; }
        if (e.key === 'a' || e.key === 'A') { e.preventDefault(); setIsSumberModalOpen(true); return; }
        if (e.key === 's' || e.key === 'S') { e.preventDefault(); setIsTujuanModalOpen(true); return; }
        if (['1','2','3','4','5'].includes(e.key)) {
          const idx = parseInt(e.key) - 1;
          if (activeMode === 'DIGITAL' && sumberAplikasi === 'BANK') { 
            const bName = BANK_LIST[idx] || 'BRI';
            if (bName === 'LAINNYA') {
              openCustomInputModal('BANK', { id: 'BANK LAINNYA', name: 'LAINNYA' });
            } else {
              setSelectedBank(bName); 
              setIsAdminManuallyEdited(false); 
            }
          }
          else if (activeMode === 'TARIK') setSelectedSumber(SUMBER_LIST[idx] || 'QRIS');
          return;
        }
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [
    isSumberModalOpen, isTujuanModalOpen, isTema3SheetOpen, activeTheme, 
    activeMode, sumberAplikasi, onOpenVoucherJualCepat
  ]);

  // Sync sumberAplikasi → kategori
  React.useEffect(() => {
    if (activeMode === 'DIGITAL') setKategori(sumberToKategori[sumberAplikasi] || 'Transfer Bank')
  }, [sumberAplikasi, activeMode])

  // Sync tujuanMasuk → subMode
  React.useEffect(() => {
    setSubMode(tujuanMasuk === 'NON TUNAI' ? 'NON_TUNAI' : 'NORMAL')
  }, [tujuanMasuk])
  
  // Auto Keterangan Logic (Prefix calculation)
  const autoTextPrefix = React.useMemo(() => {
    if (!isKetAuto) return '';
    let autoText = '';
    
    const bankLabel = customLabels['BANK'] || 'Bank UOB';
    const flipLabel = customLabels['FLIP'] || 'Flip';
    const orderKuotaLabel = customLabels['ORDER KUOTA'] || 'Order Kuota';
    const danaLabel = customLabels['DANA'] || 'DANA';
    const tarikLabel = customLabels['TARIK'] || 'Tarik Tunai';
    const tarikSubLabel = selectedSumber === 'DANA' 
      ? (customLabels['TARIK_DANA'] || 'DANA') 
      : (selectedSumber === 'BANK' || selectedSumber === 'TRANSFER')
      ? 'Bank'
      : (customLabels[selectedSumber] || selectedSumber);

    if (activeMode === 'DIGITAL') {
      if (sumberAplikasi === 'BANK') {
        autoText = selectedBank ? `${bankLabel} > ${selectedBank}` : bankLabel;
      } else if (sumberAplikasi === 'FLIP') {
        const dest = (selectedTujuan || '').replace(/^BANK\s+/i, 'Bank ');
        autoText = dest ? `${flipLabel} > ${dest}` : flipLabel;
      } else if (sumberAplikasi === 'ORDER KUOTA') {
        autoText = selectedTujuan ? `${orderKuotaLabel} > ${selectedTujuan}` : orderKuotaLabel;
      } else if (sumberAplikasi === 'DANA') {
        autoText = selectedTujuan ? `${danaLabel} > ${selectedTujuan}` : (customLabels['DANA'] ? danaLabel : `${danaLabel} > Aplikasi Dana`);
      } else {
        autoText = `Topup > ${customLabels[sumberAplikasi] || sumberAplikasi}`;
      }
    } else if (activeMode === 'TARIK') {
      autoText = `${tarikLabel} > ${tarikSubLabel}`;
    } else if (activeMode === 'AKSESORIS') {
      autoText = customLabels['AKSESORIS'] || 'Aksesoris';
    } else {
      const modeCustom = customLabels[activeMode] || kategori;
      autoText = `${modeCustom}`;
    }
    
    return autoText.toUpperCase();
  }, [isKetAuto, kategori, nominal, activeMode, selectedBank, selectedSumber, sumberAplikasi, selectedTujuan, activeTheme, customLabels]);
  
  // Split Payment Logic
  const handleNominalCashChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '')
    const numVal = parseInt(rawVal || '0', 10)
    setNominalCashSplit(formatInputRupiah(rawVal))
    const tot = parseInt(nominal.replace(/\D/g, '') || '0', 10)
    const remain = Math.max(0, tot - numVal)
    setNominalNonTunaiSplit(formatInputRupiah(remain.toString()))
  }
  const handleNominalNonTunaiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '')
    const numVal = parseInt(rawVal || '0', 10)
    setNominalNonTunaiSplit(formatInputRupiah(rawVal))
    const tot = parseInt(nominal.replace(/\D/g, '') || '0', 10)
    const remain = Math.max(0, tot - numVal)
    setNominalCashSplit(formatInputRupiah(remain.toString()))
  }

  // Auto Admin Logic
  const [isAdminManuallyEdited, setIsAdminManuallyEdited] = useState(false);

  React.useEffect(() => {
    if (kategori === 'Order Kuota' || !kategori || !activeStoreId) return;
    if (isAdminManuallyEdited) return; // Prevent overwriting if user typed manually
    
    try {
      if (adminRules) {
        const catRules = adminRules[kategori] || [];
        const numNominal = parseInt(nominal.replace(/[^0-9]/g, '')) || 0;
        
        let foundAdmin = 0;
        for (const rule of catRules) {
          if (numNominal <= rule.max) {
            foundAdmin = rule.admin;
            break;
          }
        }
        
        if (foundAdmin > 0) {
          setAdmin(formatInputRupiah(foundAdmin.toString()));
        } else if (numNominal > 0 && catRules.length > 0) {
           // If it exceeds all max, use the last rule's admin
           const lastRule = catRules[catRules.length - 1];
           if (numNominal > lastRule.max) {
             setAdmin(formatInputRupiah(lastRule.admin.toString()));
           }
        }
      }
    } catch (e) {
      console.error('Failed to parse admin rules', e);
    }
  }, [nominal, kategori, activeStoreId, isAdminManuallyEdited, setAdmin, adminRules]);
  
  // --- KALKULATOR LOGIC ---
  const handleCalcBtn = (btn: string) => {
    if (btn === 'C') {
      setCalcDisplay('0'); setCalcExpression(''); setCalcPrev(null); setCalcOperator(null); setCalcNewInput(true); return;
    }
    if (btn === '⌫') {
      setCalcDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0'); return;
    }
    if (btn === '±') {
      setCalcDisplay(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev); return;
    }
    if (['+', '−', '×', '÷'].includes(btn)) {
      const opMap: Record<string,string> = {'−':'-','×':'*','÷':'/'}
      const op = opMap[btn] || btn
      const cur = parseFloat(calcDisplay.replace(/\./g,'').replace(',','.')) || 0
      if (calcPrev !== null && calcOperator && !calcNewInput) {
        const res = calcOperator === '+' ? calcPrev + cur : calcOperator === '-' ? calcPrev - cur : calcOperator === '*' ? calcPrev * cur : calcPrev / cur
        setCalcDisplay(res % 1 === 0 ? res.toLocaleString('id-ID') : res.toLocaleString('id-ID', {maximumFractionDigits: 2}))
        setCalcPrev(res)
      } else {
        setCalcPrev(cur)
      }
      setCalcOperator(op); setCalcNewInput(true)
      setCalcExpression(calcDisplay + ' ' + btn)
      return;
    }
    if (btn === '=') {
      if (calcPrev === null || calcOperator === null) return
      const cur = parseFloat(calcDisplay.replace(/\./g,'').replace(',','.')) || 0
      const res = calcOperator === '+' ? calcPrev + cur : calcOperator === '-' ? calcPrev - cur : calcOperator === '*' ? calcPrev * cur : calcOperator === '/' && cur !== 0 ? calcPrev / cur : 0
      const formatted = res % 1 === 0 ? res.toLocaleString('id-ID') : res.toLocaleString('id-ID', {maximumFractionDigits: 2})
      setCalcExpression(calcExpression + ' ' + calcDisplay + ' =')
      setCalcDisplay(formatted)
      setCalcPrev(null); setCalcOperator(null); setCalcNewInput(true)
      return;
    }
    if (btn === ',') {
      if (calcDisplay.includes(',')) return
      setCalcDisplay(prev => calcNewInput ? '0,' : prev + ',')
      setCalcNewInput(false); return;
    }
    // Angka
    const digit = btn
    if (calcNewInput) {
      setCalcDisplay(digit === '0' ? '0' : digit)
      setCalcNewInput(false)
    } else {
      const raw = calcDisplay.replace(/\./g, '') // hapus separator ribuan
      if (raw === '0') { setCalcDisplay(digit) }
      else {
        const newRaw = raw + digit
        const num = parseInt(newRaw)
        setCalcDisplay(num.toLocaleString('id-ID'))
      }
    }
  }

  const applyCalcToNominal = () => {
    const rawNum = calcDisplay.replace(/\./g, '').replace(',', '.')
    const num = parseFloat(rawNum)
    if (isNaN(num) || num <= 0) return
    const formatted = Math.floor(num).toLocaleString('id-ID')
    setNominal(formatted)
    setIsAdminManuallyEdited(false)
    setShowCalc(false)
    setTimeout(() => nominalRef.current?.focus(), 100)
  }

  // Refs for navigation
  const btnDigitalRef = useRef<HTMLButtonElement>(null)
  const btnTarikRef = useRef<HTMLButtonElement>(null)
  const btnAksesorisRef = useRef<HTMLButtonElement>(null)
  const btnVoucherRef = useRef<HTMLButtonElement>(null)
  const catRefs = useRef<(HTMLButtonElement | null)[]>([])
  const nominalRef = useRef<HTMLInputElement>(null)
  const adminRef = useRef<HTMLInputElement>(null)
  const keteranganRef = useRef<HTMLTextAreaElement>(null)
  const optTunaiRef = useRef<HTMLSelectElement>(null)
  const sumberRef = useRef<HTMLSelectElement>(null)
  const btnSimpanRef = useRef<HTMLButtonElement>(null)
  const btnTema3MainRef = useRef<HTMLButtonElement>(null)

  const handleGlobalKeyDown = (e: React.KeyboardEvent) => {
    // Intercept when modals are open
    if (isSumberModalOpen) {
      const arr = activeTransferMethods;
      const idx = arr.indexOf(sumberAplikasi);
      if (e.key === 'ArrowDown') { e.preventDefault(); if (idx < arr.length - 1) setSumberAplikasi(arr[idx + 1]); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (idx > 0) setSumberAplikasi(arr[idx - 1]); }
      else if (e.key === 'Enter') { 
        e.preventDefault(); 
        setIsKetAuto(true); setIsAdminManuallyEdited(false); setIsSumberModalOpen(false); 
        optTunaiRef.current?.focus();
      }
      else if (e.key === 'Escape') { e.preventDefault(); setIsSumberModalOpen(false); }
      return;
    }

    if (isTujuanModalOpen) {
      const arr = ['TUNAI LACI KASIR', 'NON TUNAI', '2X BAYAR (TUNAI & NON TUNAI)'];
      const idx = arr.indexOf(tujuanMasuk);
      if (e.key === 'ArrowDown') { e.preventDefault(); if (idx < arr.length - 1) setTujuanMasuk(arr[idx + 1]); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (idx > 0) setTujuanMasuk(arr[idx - 1]); }
      else if (e.key === 'Enter') { 
        e.preventDefault(); setIsTujuanModalOpen(false); keteranganRef.current?.focus();
      }
      else if (e.key === 'Escape') { e.preventDefault(); setIsTujuanModalOpen(false); }
      return;
    }

    const active = document.activeElement

    // Arrow Keys Navigation
    if (e.key === 'ArrowRight') {
      if (active === nominalRef.current) adminRef.current?.focus()
      else if (activeTheme !== 'TEMA_3') {
        if (active === btnDigitalRef.current) btnTarikRef.current?.focus()
        else if (active === btnTarikRef.current) btnAksesorisRef.current?.focus()
        else if (active === btnAksesorisRef.current) btnVoucherRef.current?.focus()
      }
    } else if (e.key === 'ArrowLeft') {
      if (active === adminRef.current) nominalRef.current?.focus()
      else if (activeTheme !== 'TEMA_3') {
        if (active === btnTarikRef.current) btnDigitalRef.current?.focus()
        else if (active === btnAksesorisRef.current) btnTarikRef.current?.focus()
        else if (active === btnVoucherRef.current) btnAksesorisRef.current?.focus()
      }
    } else if (e.key === 'ArrowDown') {
      if (activeTheme === 'TEMA_3') {
         if (active === btnTema3MainRef.current) keteranganRef.current?.focus()
         else if (active === keteranganRef.current) nominalRef.current?.focus()
         else if (active === nominalRef.current || active === adminRef.current) btnSimpanRef.current?.focus()
      } else {
         if ([btnDigitalRef,btnTarikRef,btnAksesorisRef,btnVoucherRef].some(r=>active===r.current)) sumberRef.current?.focus()
         else if (active === sumberRef.current) optTunaiRef.current?.focus()
         else if (active === optTunaiRef.current) keteranganRef.current?.focus()
         else if (active === keteranganRef.current) nominalRef.current?.focus()
         else if (active === nominalRef.current || active === adminRef.current) btnSimpanRef.current?.focus()
      }
    } else if (e.key === 'ArrowUp') {
      if (activeTheme === 'TEMA_3') {
         if (active === btnSimpanRef.current) nominalRef.current?.focus()
         else if (active === nominalRef.current || active === adminRef.current) keteranganRef.current?.focus()
         else if (active === keteranganRef.current) btnTema3MainRef.current?.focus()
      } else {
         if (active === sumberRef.current) btnDigitalRef.current?.focus()
         else if (active === optTunaiRef.current) sumberRef.current?.focus()
         else if (active === keteranganRef.current) optTunaiRef.current?.focus()
         else if (active === nominalRef.current || active === adminRef.current) keteranganRef.current?.focus()
         else if (active === btnSimpanRef.current) nominalRef.current?.focus()
      }
    }

    if (e.key === 'Enter') {
      if (active === keteranganRef.current) { e.preventDefault(); nominalRef.current?.focus() }
      else if (active === nominalRef.current) { e.preventDefault(); adminRef.current?.focus() }
      else if (active === adminRef.current) { e.preventDefault(); btnSimpanRef.current?.focus() }
      else if (active === btnSimpanRef.current) { e.preventDefault(); onSaveInternal() }
    }
  }

  const handleInputFocus = (e: React.FocusEvent<HTMLElement>) => {
    const target = e.target;
    setTimeout(() => {
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  const handleSlideKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      setIsTema3SheetOpen(false);
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Backspace'].includes(e.key)) {
      e.stopPropagation(); // Mencegah bentrok dengan global handler
    } else {
      return;
    }

    const activeSlide = document.querySelector('#tema3-bottom-sheet .translate-x-0') as HTMLElement;
    if (!activeSlide) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const buttons = Array.from(activeSlide.querySelectorAll('button')) as HTMLElement[];
      let current = document.activeElement as HTMLElement;
      
      if (current && current.tagName !== 'BUTTON') {
         const closest = current.closest('button');
         if (closest) current = closest;
      }
      
      let index = buttons.indexOf(current);
      if (index === -1 && buttons.length > 0) {
        buttons[0].focus();
        return;
      }
      
      if (e.key === 'ArrowDown') {
        const next = index >= 0 && index < buttons.length - 1 ? buttons[index + 1] : buttons[0];
        if (next) next.focus();
      } else if (e.key === 'ArrowUp') {
        const prev = index > 0 ? buttons[index - 1] : buttons[buttons.length - 1];
        if (prev) prev.focus();
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
      e.preventDefault();
      if (tema3Step === 'DIGITAL' || tema3Step === 'TARIK') setTema3Step('MAIN');
      else if (tema3Step === 'BANK_SELECTION') setTema3Step(activeMode === 'DIGITAL' ? 'DIGITAL' : 'TARIK');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const current = document.activeElement as HTMLElement;
      const btn = current.tagName === 'BUTTON' ? current : current.closest('button');
      if (btn) btn.click();
    }
  };

  // Handler pemilihan preset otomatis:
  // Ketika kasir memilih preset, fee aplikasi tombol otomatis ditiadakan (di-nol-kan)
  // dan tujuan transaksi diselaraskan, sehingga modal & harga jual 100% menggunakan preset.
  const handleSelectPresetItem = (p: any) => {
    if (!p) return;
    const pCat = p.kategori || 'Order Kuota';
    const safeKat = kategori || '';
    const cleanPKet = (p.keterangan || '').replace(new RegExp(`^${safeKat}\\s*(=|:|>)\\s*`, 'i'), '').trim();
    const upper = cleanPKet.toUpperCase();
    const pModal = Number(p.modal) || 0;
    const pJual = Number(p.jual) || 0;
    const isOrderKuota = pCat.toLowerCase() === 'order kuota';

    // 1. Sinkronkan nama tujuan transaksi sesuai produk preset otomatis
    let matchedTujuan = selectedTujuan;
    if (upper.includes('PULSA')) matchedTujuan = 'PULSA';
    else if (upper.includes('TOKEN') || upper.includes('PLN') || upper.includes('LISTRIK')) matchedTujuan = 'TOKEN LISTRIK';
    else if (upper.includes('DANA')) matchedTujuan = 'DANA';
    else if (upper.includes('GOPAY')) matchedTujuan = 'GOPAY';
    else if (upper.includes('OVO')) matchedTujuan = 'OVO';
    else if (upper.includes('SHOPEE')) matchedTujuan = 'SHOPEEPAY';
    else if (upper.includes('LINKAJA')) matchedTujuan = 'LINKAJA';
    else if (upper.includes('MAXIM')) matchedTujuan = 'MAXIM';
    else if (upper.includes('PDAM')) matchedTujuan = 'PDAM';
    else if (!matchedTujuan) {
      matchedTujuan = cleanPKet.toUpperCase();
    }
    setSelectedTujuan(matchedTujuan);

    if (!selectedBank && (sumberAplikasi === 'BANK' || safeKat.toLowerCase().includes('bank'))) {
      if (upper.includes('BRI')) setSelectedBank('BANK BRI');
      else if (upper.includes('BCA')) setSelectedBank('BANK BCA');
      else if (upper.includes('BNI')) setSelectedBank('BANK BNI');
      else if (upper.includes('MANDIRI')) setSelectedBank('BANK MANDIRI');
    }

    // 2. KUNCI UTAMA: Tiadakan (nol-kan) fee aplikasi jika memilih preset otomatis!
    setSelectedTujuanFee(0);

    // 3. Set Keterangan produk: Simpan nama preset apa adanya (misal MAXIM ISI 40)
    setKeterangan(cleanPKet.toUpperCase());
    setIsKetAuto(true);

    // 4. Set Nominal & Admin (Modal & Jual)
    if (isOrderKuota) {
      if (orderKuotaMode === 'NOMINAL_ADMIN') {
        setOrderKuotaMode('MODAL_JUAL');
      }
      setNominal(pModal.toLocaleString('id-ID').replace(/,/g, '.'));
      setAdmin(pJual.toLocaleString('id-ID').replace(/,/g, '.'));
      setTimeout(() => adminRef.current?.focus(), 50);
    } else {
      setNominal(pModal.toLocaleString('id-ID').replace(/,/g, '.'));
      if (pJual > 0) setAdmin(pJual.toLocaleString('id-ID').replace(/,/g, '.'));
      setTimeout(() => nominalRef.current?.focus(), 50);
    }
  };

  const onSaveInternal = () => {
    setErrorMsg(null)

    // Validasi Wajib Keterangan jika subteks tidak dipilih pada mode DIGITAL
    if (activeMode === 'DIGITAL') {
      const mode = getPopupMode(sumberAplikasi);
      const subList = mode ? (popupLists[mode] || []) : [];
      const hasSubList = subList.length > 0;

      const hasSubteks = (sumberAplikasi === 'BANK' && (!hasSubList || Boolean(selectedBank && selectedBank.trim()))) ||
                         (sumberAplikasi === 'ORDER KUOTA' && (!hasSubList || Boolean(selectedTujuan && selectedTujuan.trim()))) ||
                         (sumberAplikasi === 'FLIP' && (!hasSubList || Boolean(selectedTujuan && selectedTujuan.trim()))) ||
                         (sumberAplikasi === 'DANA' && (!hasSubList || Boolean(selectedTujuan && selectedTujuan.trim())));

      if (!hasSubteks && !keterangan.trim()) {
        setErrorMsg('Pilih sub-kategori/tujuan atau isi keterangan transaksi!');
        keteranganRef.current?.focus();
        return;
      }
    }
    
    // Combine manual keterangan with auto prefix if needed
    let finalKeteranganBase = '';
    if (activeMode === 'TARIK') {
      const tarikSubLabel = selectedSumber === 'DANA' 
        ? (customLabels['TARIK_DANA'] || 'DANA') 
        : (selectedSumber === 'BANK' || selectedSumber === 'TRANSFER')
        ? 'Bank'
        : (customLabels[selectedSumber] || selectedSumber);
      const tarikPrefix = `TARIK TUNAI > ${tarikSubLabel}`.toUpperCase();
      const cleanManualKet = keterangan.replace(/^TARIK_TUNAI\|/i, '').trim();
      finalKeteranganBase = cleanManualKet ? `${tarikPrefix}\n${cleanManualKet}` : tarikPrefix;
    } else {
      finalKeteranganBase = (isKetAuto && autoTextPrefix) 
        ? (keterangan.trim() ? `${autoTextPrefix}\n${keterangan.trim()}` : autoTextPrefix)
        : (keterangan.trim() ? keterangan.trim() : (autoTextPrefix || kategori));
    }

    if (((kategori === 'Order Kuota' && orderKuotaMode === 'NOMINAL_ADMIN') || kategori === 'FLIP' || sumberAplikasi === 'DANA') && selectedTujuanFee > 0) {
      finalKeteranganBase += ` [FEE_APP:${selectedTujuanFee}]`;
    }

    if (activeMode === 'AKSESORIS') {
      const cleanNominal = parseInt(nominal.replace(/[^0-9]/g, '')) || 0
      if (cleanNominal <= 0) {
        setErrorMsg('Harga wajib diisi!')
        return
      }
      setAdmin('0')
      const isNonTunai = aksesorisPayMode === 'QRIS'
      let ketAksesoris = finalKeteranganBase
      if (isNonTunai && !ketAksesoris.toUpperCase().includes('[NON_TUNAI]')) {
        ketAksesoris += ' [NON_TUNAI]'
      }
      onSave(
        { kategori, nominal, admin: '0', keterangan: ketAksesoris }, 
        { activeTab: isNonTunai ? 'LAIN' : 'BARU', subTab: isNonTunai ? 'NON_TUNAI' : 'NORMAL', isAdminNonTunai: false }
      )
      setIsKetAuto(true)
      return
    }
    
    // Validasi Khusus Transfer & Tarik Tunai
    if (activeMode === 'DIGITAL' || activeMode === 'TARIK') {
      let cleanNominal = parseInt(nominal.replace(/[^0-9]/g, '')) || 0
      let cleanAdmin = parseInt(admin.replace(/[^0-9]/g, '')) || 0
      
      let saveNominal = nominal;
      let saveAdmin = admin;

      if (kategori === 'Order Kuota' && orderKuotaMode === 'NOMINAL_ADMIN') {
         const calculatedModal = cleanNominal + selectedTujuanFee;
         const calculatedJual = cleanNominal + cleanAdmin;
         
         cleanNominal = calculatedModal;
         cleanAdmin = calculatedJual;
         saveNominal = formatInputRupiah(calculatedModal.toString());
         saveAdmin = formatInputRupiah(calculatedJual.toString());
      }
      
      if (cleanNominal <= 0 || cleanAdmin <= 0) {
        setErrorMsg('Nominal & Admin Wajib diisi!')
        return
      }

      // Validasi khusus Order Kuota: Jual HARUS lebih besar dari Modal
      if (kategori === 'Order Kuota') {
        if (cleanAdmin <= cleanNominal) {
          setErrorMsg(`Harga JUAL (${saveAdmin}) harus lebih besar dari MODAL (${saveNominal})!`)
          adminRef.current?.focus()
          return
        }
      } else {
        // Untuk kategori lain: Admin harus lebih kecil dari Nominal (reminder saja, tidak block)
        if (cleanAdmin >= cleanNominal) {
          setErrorMsg('⚠️ Perhatian: ADMIN biasanya lebih kecil dari NOMINAL. Pastikan tidak terbalik!')
          return
        }
      }
      
      // Lanjutkan dengan saveNominal dan saveAdmin
      const activeTab = subMode === 'NORMAL' ? 'BARU' : 'LAIN'
      const subTab = subMode === 'NORMAL' ? 'KHUSUS' : subMode
      
      if (tujuanMasuk === '2X BAYAR (TUNAI & NON TUNAI)') {
        const nonTunaiAmount = parseInt(nominalNonTunaiSplit.replace(/\D/g, '') || '0', 10)
        const tunaiAmount = parseInt(nominalCashSplit.replace(/\D/g, '') || '0', 10)
        const totNominal = parseInt(saveNominal.replace(/\D/g, '') || '0', 10)
        
        if (tunaiAmount + nonTunaiAmount !== totNominal) {
          setErrorMsg('Total Tunai + Non Tunai harus sama dengan Nominal!')
          return
        }
        
        const splitKeterangan = `${finalKeteranganBase} [SPLIT: Tunai ${tunaiAmount.toLocaleString('id-ID')}, NonTunai ${nonTunaiAmount.toLocaleString('id-ID')}]`
        onSave({ kategori, nominal: saveNominal, admin: saveAdmin, keterangan: splitKeterangan }, { activeTab, subTab: subMode === 'NORMAL' ? 'KHUSUS' : (subTab as any), isAdminNonTunai, isSplit: true, nonTunaiAmount })
      } else {
        onSave({ kategori, nominal: saveNominal, admin: saveAdmin, keterangan: finalKeteranganBase }, { activeTab, subTab: subMode === 'NORMAL' ? 'KHUSUS' : (subTab as any), isAdminNonTunai })
      }
      setIsKetAuto(true)
      return;
    }

    const activeTab = subMode === 'NORMAL' ? 'BARU' : 'LAIN'
    const subTab = subMode === 'NORMAL' ? 'KHUSUS' : subMode
    
    if (tujuanMasuk === '2X BAYAR (TUNAI & NON TUNAI)') {
      const nonTunaiAmount = parseInt(nominalNonTunaiSplit.replace(/\D/g, '') || '0', 10)
      const tunaiAmount = parseInt(nominalCashSplit.replace(/\D/g, '') || '0', 10)
      const totNominal = parseInt(nominal.replace(/\D/g, '') || '0', 10)
      
      if (tunaiAmount + nonTunaiAmount !== totNominal) {
        setErrorMsg('Total Tunai + Non Tunai harus sama dengan Nominal!')
        return
      }
      
      const splitKeterangan = `${finalKeteranganBase} [SPLIT: Tunai ${tunaiAmount.toLocaleString('id-ID')}, NonTunai ${nonTunaiAmount.toLocaleString('id-ID')}]`
      onSave({ kategori, nominal, admin, keterangan: splitKeterangan }, { activeTab, subTab: subMode === 'NORMAL' ? 'KHUSUS' : (subTab as any), isAdminNonTunai, isSplit: true, nonTunaiAmount })
    } else {
      onSave({ kategori, nominal, admin, keterangan: finalKeteranganBase }, { activeTab, subTab: subMode === 'NORMAL' ? 'KHUSUS' : (subTab as any), isAdminNonTunai })
    }
    setIsKetAuto(true)
  }

  const [prevSaving, setPrevSaving] = useState(isSaving)
  React.useEffect(() => {
    if (prevSaving && !isSaving) {
      setNominal('')
      setAdmin('')
      setKeterangan('')
      setNominalCashSplit('')
      setNominalNonTunaiSplit('')
    }
    setPrevSaving(isSaving)
  }, [isSaving, prevSaving])

  return (
    <div className="relative w-full pb-4 pt-3 outline-none font-sans rounded-3xl overflow-hidden" onKeyDown={handleGlobalKeyDown} tabIndex={0}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10" style={{background: '#ffffff'}}>
      </div>
      
      {/* HEADER ACTION BUTTONS */}
      <div className={cn("flex items-center mb-3 px-3", hideHeader ? "justify-end" : "justify-between")}>
        {!hideHeader && (
          <div className="flex flex-col">
            <h2 className="text-[22px] font-black text-[#1a1a1a] leading-none tracking-tight">Form Transaksi</h2>
            <p className="text-[12px] font-bold text-[#666666] leading-tight mt-0.5">Kategori Layanan</p>
          </div>
        )}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-gray-200 rounded-full shadow-sm">
          {isActualOwner && (
            <button
              type="button"
              onClick={() => {
                setTempLabels({ ...customLabels });
                setIsEditLabelsModalOpen(true);
              }}
              className="w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-sm hover:scale-105 transition-all"
              title="Kustomisasi Nama Tombol (Khusus Owner)"
            >
              <i className="fa-solid fa-pencil text-[13px]"></i>
            </button>
          )}

          <button
            onClick={() => { setShowCalc(v => !v); setIsThemeMenuOpen(false); }}
            className="w-8 h-8 rounded-full bg-[#0066ff] text-white flex items-center justify-center shadow-sm hover:bg-blue-700 transition-all"
          >
            <i className="fa-solid fa-calculator text-[14px]"></i>
          </button>

          <div className="relative z-50">
            <button 
              onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
              className="w-8 h-8 rounded-full bg-[#0066ff] text-white flex items-center justify-center shadow-sm hover:scale-105 transition-all"
            >
              <i className="fa-solid fa-palette text-[14px]"></i>
            </button>
          
            {isThemeMenuOpen && (
              <div className="absolute right-0 top-10 w-40 bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <p className="px-3 pb-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">Pilih Tema</p>
                <button onClick={() => { setActiveTheme('TEMA_1'); setIsThemeMenuOpen(false); }} className={cn("w-full text-left px-3 py-2 text-[11px] font-bold transition-colors", activeTheme === 'TEMA_1' ? "text-blue-600 bg-blue-50" : "text-slate-700 hover:bg-blue-50 hover:text-blue-600")}>Tema 1 (Classic)</button>
                <button onClick={() => { setActiveTheme('TEMA_2'); setIsThemeMenuOpen(false); }} className={cn("w-full text-left px-3 py-2 text-[11px] font-bold transition-colors", activeTheme === 'TEMA_2' ? "text-blue-600 bg-blue-50" : "text-slate-700 hover:bg-blue-50 hover:text-blue-600")}>Tema 2 (Utama)</button>
                <button onClick={() => { setActiveTheme('TEMA_3'); setIsThemeMenuOpen(false); }} className={cn("w-full text-left px-3 py-2 text-[11px] font-bold transition-colors", activeTheme === 'TEMA_3' ? "text-blue-600 bg-blue-50" : "text-slate-700 hover:bg-blue-50 hover:text-blue-600")}>Tema 3 (Sidebar)</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== PANEL KALKULATOR ===== */}
      {showCalc && (
        <div className="mb-4 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.4)] border border-slate-700">
            {/* Layar kalkulator */}
            <div className="bg-slate-950/80 rounded-xl px-4 py-3 mb-3 min-h-[68px] flex flex-col justify-end items-end border border-slate-700/50">
              <p className="text-slate-500 text-[10px] font-mono leading-none min-h-[14px] truncate w-full text-right">{calcExpression || '\u00a0'}</p>
              <p className="text-white text-2xl font-black font-mono leading-tight tracking-wider mt-1 truncate max-w-full">{calcDisplay}</p>
            </div>
            {/* Grid tombol */}
            {([
              ['C', '±', '⌫', '÷'],
              ['7', '8', '9', '×'],
              ['4', '5', '6', '−'],
              ['1', '2', '3', '+'],
              ['0', ',', '=', '='],
            ] as const).map((row, ri) => (
              <div key={ri} className="grid grid-cols-4 gap-1.5 mb-1.5">
                {row.map((btn, bi) => {
                  if (ri === 4 && bi === 2) return null
                  const isOp = ['+', '−', '×', '÷'].includes(btn)
                  const isEq = btn === '='
                  const isClear = btn === 'C'
                  const opToInternal: Record<string,string> = {'÷':'/','×':'*','−':'-','+':'+'}
                  const isActiveOp = calcOperator === (opToInternal[btn] || '') && calcNewInput
                  return (
                    <button
                      key={`${ri}-${bi}`}
                      onClick={() => handleCalcBtn(btn)}
                      className={cn(
                        'h-12 rounded-xl font-black text-[15px] transition-all active:scale-95 select-none',
                        ri === 4 && bi === 3 ? 'col-span-2' : '',
                        isClear ? 'bg-rose-500 text-white hover:bg-rose-400 shadow-sm'
                          : isEq ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm hover:from-amber-300'
                          : isOp ? cn('hover:bg-slate-600', isActiveOp ? 'bg-slate-500 text-amber-400' : 'bg-slate-700 text-amber-400')
                          : btn === '±' || btn === '⌫' ? 'bg-slate-600 text-slate-200 hover:bg-slate-500'
                          : 'bg-slate-700 text-white hover:bg-slate-600'
                      )}
                    >
                      {btn}
                    </button>
                  )
                })}
              </div>
            ))}
            {/* Tombol Pakai */}
            <button
              onClick={applyCalcToNominal}
              className="w-full mt-2 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-2 hover:from-emerald-400 transition-all shadow-md active:scale-[0.98]"
            >
              <i className="fa-solid fa-check-double text-sm"></i>
              Pakai sebagai Nominal
            </button>
          </div>
        </div>
      )}

      {activeTheme === 'TEMA_1' ? (
      <>
      <div className="grid grid-cols-4 gap-1.5 mb-1.5 px-3">
        {([
          { id: 'DIGITAL', label: customLabels['DIGITAL'] || 'Transfer', icon: 'fa-paper-plane', key: 'Q', ref: btnDigitalRef, active: 'from-blue-500 to-blue-700 shadow-blue-500/40', ic: 'text-blue-500', hov: 'hover:bg-blue-50 hover:border-blue-200' },
          { id: 'TARIK', label: customLabels['TARIK'] || 'Tarik Tunai', icon: 'fa-money-bill-transfer', key: 'W', ref: btnTarikRef, active: 'from-red-500 to-red-700 shadow-red-500/40', ic: 'text-red-500', hov: 'hover:bg-red-50 hover:border-red-200' },
          { id: 'AKSESORIS', label: customLabels['AKSESORIS'] || 'Aksesoris', icon: 'fa-headset', key: 'E', ref: btnAksesorisRef, active: 'from-emerald-500 to-emerald-700 shadow-emerald-500/40', ic: 'text-emerald-500', hov: 'hover:bg-emerald-50 hover:border-emerald-200' },
          { id: 'VOUCHER', label: customLabels['VOUCHER'] || 'Voucher', icon: 'fa-ticket', key: 'R', ref: btnVoucherRef, active: 'from-orange-500 to-orange-700 shadow-orange-500/40', ic: 'text-orange-500', hov: 'hover:bg-orange-50 hover:border-orange-200' },
        ] as const).map((mode) => {
          const isAct = activeMode === mode.id
          return (
            <button
              key={mode.id}
              ref={mode.ref as any}
              onClick={() => {
                if (mode.id === 'VOUCHER') { if (onOpenVoucherJualCepat) onOpenVoucherJualCepat(); return }
                if (activeMode === mode.id) {
                  setActiveMode('');
                  return;
                }
                setActiveMode(mode.id as any); setIsAdminManuallyEdited(false)
                if (mode.id === 'TARIK') {
                  setKategori('Tarik Tunai')
                } else if (mode.id === 'AKSESORIS') {
                  setKategori('Aksesoris')
                  setClassicPopupMode('AKSESORIS')
                } else {
                  setKategori('')
                  setSumberAplikasi('')
                  setActiveSubCategory('')
                }
              }}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
              className={cn(
                'relative flex flex-col items-center justify-center py-2 px-1 rounded-xl border-2 transition-all duration-300 gap-1 outline-none overflow-hidden min-w-0',
                isAct ? `bg-gradient-to-br ${mode.active} border-transparent text-white shadow-sm scale-[1.02] z-10` : cn('bg-white border-gray-100 text-gray-600', mode.hov)
              )}
            >
              {/* Shortcut Badge */}
              <span className={cn('absolute top-1 left-1.5 text-[7.5px] font-black leading-none px-1 py-0.5 rounded', isAct ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-400')}>{mode.key}</span>
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center', isAct ? 'bg-white/20 shadow-inner' : 'bg-gray-50')}>
                <i className={cn('fa-solid', mode.icon, 'text-[12px]', isAct ? 'text-white' : mode.ic)}></i>
              </div>
              <span className={cn('text-[8.5px] font-black uppercase tracking-tight text-center leading-none', isAct ? 'text-white' : 'text-gray-700')}>{mode.label}</span>
            </button>
          )
        })}
      </div>

      <div className="space-y-1">
        {/* === WIZARD TRANSFER (DIGITAL) === */}
        {activeMode === 'DIGITAL' && (
          <div className="bg-white rounded-2xl border border-gray-100 pt-1.5 px-2 pb-1 shadow-sm mb-1 animate-in fade-in slide-in-from-top-2">
            {/* KOLOM 1: SUMBER UANG KELUAR */}
            <div className="mb-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[10px] font-black text-[#0c1f44] flex items-center gap-1.5 uppercase tracking-wider">
                  <div className="w-1.5 h-3 bg-[#0066ff] rounded-full"></div>
                  PILIH SUMBER APLIKASI BANK
                </h3>
                <button 
                  onClick={() => setIsTujuanModalOpen(true)}
                  className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-100 text-[7.5px] font-black uppercase shadow-xs hover:bg-emerald-100 transition-colors"
                  title="Pilih Tujuan Masuk"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span>{tujuanMasuk === 'TUNAI LACI KASIR' ? 'Masuk: Laci' : tujuanMasuk}</span>
                  <i className="fa-solid fa-chevron-down text-[6px] ml-0.5"></i>
                </button>
              </div>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.max(1, SUMBER_APLIKASI_BANK.filter(src => activeTransferMethods.includes(src.id) && !customLabels['HIDE_' + src.id]).length)}, minmax(0, 1fr))` }}>
                {SUMBER_APLIKASI_BANK.filter(src => activeTransferMethods.includes(src.id) && !customLabels['HIDE_' + src.id]).map(src => {
                  const isSel = sumberAplikasi === src.id;
                  return (
                    <button
                      key={src.id}
                      onClick={() => handleTransferCategoryClick(src.id, false)}
                      onDoubleClick={() => handleTransferCategoryClick(src.id, true)}
                      className={cn(
                        "relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl border-2 transition-all duration-300",
                        isSel ? "border-[#0c1f44] shadow-sm scale-[1.02]" : "border-gray-100 hover:border-gray-300"
                      )}
                    >
                      {isSel && (
                         <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center border border-white shadow-sm">
                           <i className="fa-solid fa-check text-[6.5px]"></i>
                         </div>
                      )}
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center mb-0.5", isSel ? "bg-[#0c1f44] text-white" : "bg-blue-50 text-[#0066ff]")}>
                        <i className={cn("fa-solid text-xs", src.icon)}></i>
                      </div>
                      <span className={cn("text-[8.5px] font-black leading-tight text-center", isSel ? "text-[#0c1f44]" : "text-gray-700")}>{customLabels[src.id] || src.label}</span>
                      <span className="text-[6.5px] font-bold text-gray-400 leading-none">{src.sub}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Quick Picker - Sumber (Tarik Tunai) */}
        {activeMode === 'TARIK' && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 bg-gray-50/80 rounded-2xl border border-gray-100 p-2">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1"><i className="fa-solid fa-credit-card text-emerald-500"></i> Pilih Sumber Masuk:</p>
            </div>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.max(1, ITEMS['TARIK_TUNAI'].filter(item => !customLabels[item.id === 'DANA' ? 'HIDE_TARIK_DANA' : 'HIDE_' + item.id]).length)}, minmax(0, 1fr))` }}>
              {ITEMS['TARIK_TUNAI'].filter(item => !customLabels[item.id === 'DANA' ? 'HIDE_TARIK_DANA' : 'HIDE_' + item.id]).map((item) => {
                const isSelected = selectedSumber === (item.name === 'EDC/ATM' ? 'ATM/EDC' : item.name === 'TRANSFER' ? 'BANK' : item.name);
                return (
                  <button
                    key={item.id}
                    onClick={() => { 
                      const val = item.name === 'EDC/ATM' ? 'ATM/EDC' : item.name === 'TRANSFER' ? 'BANK' : item.name;
                      setSelectedSumber(val); 
                      setIsKetAuto(true);
                      setSumberAplikasi('TUNAI LACI KASIR');
                      setTujuanMasuk(val);
                      setTimeout(() => keteranganRef.current?.focus(), 100);
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 transition-all duration-300 relative bg-white overflow-hidden",
                      isSelected ? "border-emerald-500 shadow-[0_4px_12px_-4px_rgba(16,185,129,0.4)] scale-[1.03]" : "border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-0 right-0 w-8 h-8 bg-emerald-500 rotate-45 translate-x-4 -translate-y-4">
                        <i className="fa-solid fa-check text-white text-[8px] absolute bottom-1 left-3.5 -rotate-45"></i>
                      </div>
                    )}
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                      isSelected ? "bg-emerald-500 text-white" : "bg-gray-50 text-gray-400"
                    )}>
                      <i className={cn("fa-solid text-[11px]", item.icon, isSelected ? "text-white" : item.color)}></i>
                    </div>
                    <span className={cn(
                      "text-[8px] font-black uppercase text-center leading-tight",
                      isSelected ? "text-[#0c1f44]" : "text-gray-500"
                    )}>{item.id === 'DANA' ? (customLabels['TARIK_DANA'] || 'DANA') : (item.id === 'TRANSFER BANK' || item.name === 'TRANSFER') ? 'BANK' : (customLabels[item.id] || item.name)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick Picker / Selector - Aksesoris */}
        {activeMode === 'AKSESORIS' && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 bg-emerald-50/80 rounded-2xl border border-emerald-100 p-2 mb-1.5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1">
                <i className="fa-solid fa-headset text-emerald-600"></i> Pilihan Aksesoris:
              </p>
              <button
                type="button"
                onClick={() => setClassicPopupMode('AKSESORIS')}
                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[8px] font-black uppercase tracking-wider shadow-xs flex items-center gap-1 transition-all"
              >
                <i className="fa-solid fa-grid-2 text-[7px]"></i>
                <span>PILIH / UBAH</span>
              </button>
            </div>
            <div 
              onClick={() => setClassicPopupMode('AKSESORIS')}
              className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-emerald-200 cursor-pointer hover:border-emerald-400 transition-colors"
            >
              <span className="text-[11px] font-black text-slate-800">
                {keterangan || <span className="text-slate-400 italic">Klik untuk memilih jenis aksesoris</span>}
              </span>
              <span className="text-[9px] font-bold text-emerald-600">
                Pilih
              </span>
            </div>
          </div>
        )}

        <div className="relative group px-2 mb-1.5">
          <div className="bg-[#f4f7ff] rounded-xl border border-blue-100 px-2 py-1.5">
            <div className="flex justify-between items-center mb-1 px-0.5">
              <label className="text-[10px] font-black text-slate-800 flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-[#0066ff] flex items-center justify-center shadow-sm">
                  <i className="fa-solid fa-file-lines text-white text-[8px]"></i>
                </div>
                Keterangan Transaksi
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={isKetAuto} onChange={(e) => setIsKetAuto(e.target.checked)} className="w-3 h-3 accent-[#0066ff] rounded-sm cursor-pointer" />
                <span className="text-[9px] font-black text-[#0066ff] uppercase tracking-widest">OTOMATIS</span>
              </label>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 px-2 py-1 focus-within:ring-2 focus-within:ring-blue-100 transition-all flex flex-col">
              {isKetAuto && autoTextPrefix && (
                <div className="text-[11px] font-bold text-[#0066ff] mb-1 pb-1 border-b border-gray-100">
                  {autoTextPrefix}
                </div>
              )}
              <textarea 
                ref={keteranganRef}
                onFocus={handleInputFocus}
                rows={isKetAuto ? 1 : 2} 
                placeholder="Ketik keterangan tambahan disini" 
                value={activeMode === 'TARIK' && keterangan.startsWith('TARIK_TUNAI|') ? keterangan.substring(12) : keterangan}
                onChange={(e) => {
                  const val = e.target.value ? e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) : '';
                  setKeterangan(val);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setTimeout(() => {
                      nominalRef.current?.focus();
                      nominalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 10);
                  }
                }}
                className="w-full resize-none text-[10.5px] font-bold text-gray-700 bg-transparent outline-none p-0 min-h-[20px]"
              ></textarea>
            </div>
          </div>

          {/* Autocomplete Suggestions */}
          {presets && presets.length > 0 && (activeMode === 'DIGITAL' || activeMode === 'TARIK') && (
            <div className="mt-1 flex flex-wrap gap-1">
              {(() => {
                const safeKet = keterangan || selectedTujuan || selectedBank || '';
                const safeKat = kategori || '';
                const cleanQuery = safeKet.toUpperCase()
                  .replace(safeKat.toUpperCase(), '')
                  .replace(/=/g, '')
                  .replace(/-/g, '')
                  .replace(/>/g, '')
                  .trim()
                  .toLowerCase();
                const searchWords = cleanQuery.split(/\s+/).filter(Boolean);
                
                // Only show if user has typed something and there's a match
                if (searchWords.length === 0) return null;
                
                const filtered = presets.filter(p => {
                  if (!p || p.id?.startsWith?.('_') || typeof p.keterangan !== 'string' || !p.keterangan.trim()) return false;
                  const pCat = p.kategori || 'Order Kuota';
                  const pKetLower = p.keterangan.toLowerCase();
                  return pCat.toLowerCase() === safeKat.toLowerCase() && searchWords.every(w => pKetLower.includes(w));
                });
                
                if (filtered.length === 0) return null;
                
                return filtered.map(p => {
                  const pCat = p.kategori || 'Order Kuota';
                  const pKet = p.keterangan || '';
                  const pModal = Number(p.modal) || 0;
                  const pJual = Number(p.jual) || 0;
                  const isOrderKuota = pCat.toLowerCase() === 'order kuota';
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPresetItem(p)}
                      className="bg-purple-100 hover:bg-purple-200 text-purple-700 text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-md transition-all text-left cursor-pointer"
                    >
                      {isOrderKuota
                        ? `${pKet} (M:${pModal / 1000}k J:${pJual / 1000}k)` 
                        : pKet}
                    </button>
                  );
                })
              })()}
            </div>
          )}
        </div>

        {/* PAYMENT MODE TOGGLE FOR AKSESORIS */}
        {activeMode === 'AKSESORIS' && (
          <div className="flex gap-2 mb-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <button
              onClick={() => setAksesorisPayMode('TUNAI')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all',
                aksesorisPayMode === 'TUNAI'
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_4px_12px_-4px_rgba(16,185,129,0.5)]'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-emerald-300'
              )}
            >
              <i className="fa-solid fa-cash-register text-[11px]"></i>
              <span>CASH / LACI</span>
              {aksesorisPayMode === 'TUNAI' && <i className="fa-solid fa-check text-[10px]"></i>}
            </button>
            <button
              onClick={() => setAksesorisPayMode('QRIS')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all',
                aksesorisPayMode === 'QRIS'
                  ? 'bg-blue-500 border-blue-500 text-white shadow-[0_4px_12px_-4px_rgba(59,130,246,0.5)]'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'
              )}
            >
              <i className="fa-solid fa-qrcode text-[11px]"></i>
              <span>NON TUNAI / QRIS</span>
              {aksesorisPayMode === 'QRIS' && <i className="fa-solid fa-check text-[10px]"></i>}
            </button>
          </div>
        )}

        {/* INPUT MODE TOGGLE (ORDER KUOTA ONLY) */}
        {kategori === 'Order Kuota' && (
          <div className="flex items-center justify-between px-3 mb-2 bg-blue-50/50 rounded-xl p-2 border border-blue-100">
             <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Mode Input:</span>
             <div className="flex gap-1 bg-white rounded-lg p-1 border border-blue-100 shadow-sm">
                <button 
                  onClick={() => { setOrderKuotaMode('MODAL_JUAL'); setNominal(''); setAdmin(''); }}
                  className={cn("px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all", orderKuotaMode === 'MODAL_JUAL' ? "bg-[#0066ff] text-white shadow-sm" : "text-gray-500 hover:bg-gray-50")}
                >Modal & Jual</button>
                <button 
                  onClick={() => { setOrderKuotaMode('NOMINAL_ADMIN'); setNominal(''); setAdmin(''); }}
                  className={cn("px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all", orderKuotaMode === 'NOMINAL_ADMIN' ? "bg-[#0066ff] text-white shadow-sm" : "text-gray-500 hover:bg-gray-50")}
                >Nominal & Admin</button>
             </div>
          </div>
        )}

        <div className="flex gap-2 flex-nowrap px-2">
          <div className="relative group flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1.5 px-1">
              <label className="flex items-center text-[10px] font-black text-gray-700 uppercase tracking-widest gap-1.5 whitespace-nowrap">
                <i className={cn("fa-solid", kategori === 'Order Kuota' ? "fa-box text-blue-500" : "fa-coins text-blue-500")}></i>
                {kategori === 'Order Kuota' ? (orderKuotaMode === 'NOMINAL_ADMIN' ? 'Nominal Asli' : 'Modal') : 'Nominal'}
              </label>
              {true && (
                <label
                  className={`flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded-md shadow-sm transition-colors ml-auto ${tujuanMasuk === '2X BAYAR (TUNAI & NON TUNAI)' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-[#0066ff] hover:bg-blue-700'}`}
                  onClick={e => e.stopPropagation()}
                >
                  <input type="checkbox" checked={tujuanMasuk === '2X BAYAR (TUNAI & NON TUNAI)'} onChange={e => {
                    e.stopPropagation();
                    if (e.target.checked) setTujuanMasuk('2X BAYAR (TUNAI & NON TUNAI)')
                    else setTujuanMasuk('TUNAI LACI KASIR')
                  }} className="w-3 h-3 accent-white rounded-sm" />
                  <span className="text-[9px] font-bold text-white whitespace-nowrap">2x Pay</span>
                </label>
              )}
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs pointer-events-none">Rp</div>
              <input 
                ref={nominalRef}
                type="text" 
                inputMode="numeric" 
                placeholder="0" 
                value={nominal}
                onFocus={handleInputFocus}
                onChange={(e) => { setNominal(formatInputRupiah(e.target.value)); setErrorMsg(null); setIsAdminManuallyEdited(false); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setTimeout(() => {
                      if (activeMode === 'AKSESORIS') btnSimpanRef.current?.click();
                      else if (kategori === 'Order Kuota' && orderKuotaMode !== 'NOMINAL_ADMIN') btnSimpanRef.current?.click();
                      else {
                        adminRef.current?.focus();
                        adminRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }, 10);
                  }
                }}
                className="w-full text-[14px] font-black h-[36px] pl-9 pr-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-50 outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          {activeMode !== 'AKSESORIS' && (
          <div className="relative group flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 px-1">
              <label className="flex items-center text-[10px] font-black text-gray-700 uppercase tracking-widest gap-1.5 whitespace-nowrap">
                <i className={cn("fa-solid text-[10px]", kategori === 'Order Kuota' ? "fa-tag text-blue-500" : "fa-hand-holding-dollar text-blue-500")}></i>
                {kategori === 'Order Kuota' ? (orderKuotaMode === 'NOMINAL_ADMIN' ? 'Admin Kasir' : 'Jual') : 'Admin'}
              </label>
              <label className={`flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded-md shadow-sm transition-colors ml-auto ${isAdminNonTunai ? 'bg-purple-600 hover:bg-purple-700' : 'bg-[#0066ff] hover:bg-blue-700'}`}>
                <input
                  type="checkbox"
                  checked={isAdminNonTunai}
                  onChange={(e) => setIsAdminNonTunai(e.target.checked)}
                  className="w-3 h-3 accent-white rounded-sm"
                />
                <span className="text-[9px] font-bold text-white whitespace-nowrap">Non Tunai</span>
              </label>
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs pointer-events-none">Rp</div>
              <input 
                ref={adminRef}
                type="text" 
                inputMode="numeric" 
                placeholder="0" 
                value={admin}
                onFocus={(e) => {
                  handleInputFocus(e);
                  e.target.select();
                }}
                onChange={(e) => { setAdmin(formatInputRupiah(e.target.value)); setErrorMsg(null); setIsAdminManuallyEdited(true); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setTimeout(() => btnSimpanRef.current?.click(), 10);
                  }
                }}
                className={cn(
                  "w-full text-[14px] font-black h-[36px] pl-9 pr-3 rounded-xl border outline-none transition-all shadow-sm focus:ring-4",
                  kategori === 'Order Kuota' && (() => {
                    let m = parseInt(nominal.replace(/[^0-9]/g, '')) || 0
                    let j = parseInt(admin.replace(/[^0-9]/g, '')) || 0
                    if (orderKuotaMode === 'NOMINAL_ADMIN') {
                       j = m + j; // Jual = Nominal + Admin
                       m = m + selectedTujuanFee; // Modal = Nominal + Fee
                    }
                    return m > 0 && j > 0 && j <= m
                      ? "bg-red-50 text-red-700 border-red-300 focus:border-red-400 focus:ring-red-100"
                      : m > 0 && j > m
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100"
                        : "bg-gray-50/50 border-gray-200 text-gray-900 focus:bg-white focus:border-emerald-400 focus:ring-emerald-50"
                  })() || (isAdminNonTunai 
                    ? "bg-purple-50/80 text-purple-700 border-purple-300 focus:border-purple-400 focus:ring-purple-100" 
                    : "bg-gray-50/50 border-gray-200 text-gray-900 focus:bg-white focus:border-purple-400 focus:ring-purple-50")
                )}
              />
              {/* Indikator real-time untuk Order Kuota */}
              {kategori === 'Order Kuota' && (() => {
                let m = parseInt(nominal.replace(/[^0-9]/g, '')) || 0
                let j = parseInt(admin.replace(/[^0-9]/g, '')) || 0
                if (orderKuotaMode === 'NOMINAL_ADMIN') {
                   j = m + j;
                   m = m + selectedTujuanFee;
                }
                if (m > 0 && j > 0) {
                  if (j > m) {
                    return (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow">
                        <i className="fa-solid fa-check text-white text-[10px]"></i>
                      </div>
                    )
                  } else {
                    return (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow animate-pulse">
                        <i className="fa-solid fa-xmark text-white text-[10px]"></i>
                      </div>
                    )
                  }
                }
                return null
              })()}
            </div>
          </div>
          )}
        </div>

        {tujuanMasuk === '2X BAYAR (TUNAI & NON TUNAI)' && (
          <div className="flex gap-2 w-full mb-3 px-3 animate-in fade-in slide-in-from-top-2">
            <div className="relative flex-1">
              <input 
                type="text" inputMode="numeric"
                placeholder="Tunai"
                value={nominalCashSplit}
                onChange={handleNominalCashChange}
                className="w-full text-[13px] font-black h-[38px] px-3 rounded-xl border border-emerald-200 bg-emerald-50 focus:border-emerald-500 outline-none appearance-none transition-all text-emerald-900 placeholder:text-emerald-300"
              />
            </div>
            <div className="relative flex-1">
              <input 
                type="text" inputMode="numeric"
                placeholder="Non Tunai"
                value={nominalNonTunaiSplit}
                onChange={handleNominalNonTunaiChange}
                className="w-full text-[13px] font-black h-[38px] px-3 rounded-xl border border-blue-200 bg-blue-50 focus:border-[#0066ff] outline-none appearance-none transition-all text-[#0066ff] placeholder:text-blue-300"
              />
            </div>
          </div>
        )}

        {/* Peringatan real-time Order Kuota: Jual < Modal */}
        {kategori === 'Order Kuota' && (() => {
          let m = parseInt(nominal.replace(/[^0-9]/g, '')) || 0
          let j = parseInt(admin.replace(/[^0-9]/g, '')) || 0
          if (orderKuotaMode === 'NOMINAL_ADMIN') {
             j = m + j; // Jual = Nominal + Admin Kasir
             m = m + selectedTujuanFee; // Modal = Nominal + Fee App
          }
          if (m > 0 && j > 0 && j <= m) {
            return (
              <div className="-mt-1 bg-red-50 border border-red-200 px-3 py-2 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <i className="fa-solid fa-triangle-exclamation text-red-500 text-sm shrink-0"></i>
                <p className="text-[10px] font-black text-red-700 uppercase tracking-wide leading-tight">
                  Harga JUAL ({j.toLocaleString('id-ID')}) harus lebih besar dari MODAL ({m.toLocaleString('id-ID')})!
                </p>
              </div>
            )
          }
          if (m > 0 && j > m) {
            return (
              <div className="-mt-1 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl flex items-center gap-2 animate-in fade-in duration-200">
                <i className="fa-solid fa-circle-check text-emerald-500 text-sm shrink-0"></i>
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wide">
                  Laba: Rp {(j - m).toLocaleString('id-ID')} ✓
                </p>
              </div>
            )
          }
          return null
        })()}
        {/* Reminder untuk kategori BUKAN Order Kuota */}
        {kategori !== 'Order Kuota' && activeMode === 'DIGITAL' && (() => {
          const n = parseInt(nominal.replace(/[^0-9]/g, '')) || 0
          const a = parseInt(admin.replace(/[^0-9]/g, '')) || 0
          if (n > 0 && a >= n) {
            return (
              <div className="-mt-1 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <i className="fa-solid fa-triangle-exclamation text-amber-500 text-sm shrink-0"></i>
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-wide leading-tight">
                  Admin ({a.toLocaleString('id-ID')}) harusnya lebih kecil dari Nominal ({n.toLocaleString('id-ID')}). Cek kembali!
                </p>
              </div>
            )
          }
          return null
        })()}

        {errorMsg && (
          <div className="bg-red-50/80 border border-red-200 p-2.5 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-300 backdrop-blur-sm shadow-sm">
            <p className="text-[10px] font-black text-red-600 uppercase text-center tracking-widest flex items-center justify-center gap-2">
              <i className="fa-solid fa-triangle-exclamation text-red-500 text-lg"></i> {errorMsg}
            </p>
          </div>
        )}

        <button 
          ref={btnSimpanRef}
          onClick={onSaveInternal} 
          disabled={isSaving || (activeMode === 'DIGITAL' && !kategori)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
          className="group relative w-full overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white text-[13px] font-black py-3 rounded-2xl shadow-[0_8px_20px_-6px_rgba(79,70,229,0.5)] transition-all duration-300 hover:shadow-[0_12px_25px_-6px_rgba(79,70,229,0.6)] active:scale-[0.98] focus:ring-4 focus:ring-indigo-300 outline-none uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-700 ease-in-out"></div>
          {isSaving ? (
            <i className="fa-solid fa-circle-notch fa-spin text-lg"></i>
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
              <i className="fa-solid fa-paper-plane text-sm"></i>
            </div>
          )}
          {isSaving ? 'MEMPROSES...' : `SIMPAN TRANSAKSI${(() => { const n = parseInt(nominal.replace(/[^0-9]/g,'')) || 0; return n > 0 ? ` (Rp ${n.toLocaleString('id-ID')})` : '' })()}`}
        </button>
      </div>
      </>
      ) : activeTheme === 'TEMA_2' ? (
      <>
        {/* 4 TOMBOL LAYANAN */}
        <div className="grid grid-cols-4 gap-1.5 mb-2 px-3">
          {([
            { id: 'DIGITAL',   label: (customLabels['DIGITAL'] || 'TRANSFER').toUpperCase(),     icon: 'fa-paper-plane',        iconBg: '#0066ff' },
            { id: 'TARIK',     label: (customLabels['TARIK'] || 'TARIK TUNAI').toUpperCase(),  icon: 'fa-money-bill-transfer', iconBg: '#10b981' },
            { id: 'AKSESORIS', label: (customLabels['AKSESORIS'] || 'AKSESORIS').toUpperCase(),    icon: 'fa-headset',             iconBg: '#7c3aed' },
            { id: 'VOUCHER',   label: (customLabels['VOUCHER'] || 'VOUCHER').toUpperCase(),       icon: 'fa-ticket',              iconBg: '#f97316' },
          ] as const).map((mode) => {
            const isAct = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => {
                  if (mode.id === 'VOUCHER') { if (onOpenVoucherJualCepat) onOpenVoucherJualCepat(); return; }
                  if (activeMode === mode.id) {
                    setActiveMode('');
                    return;
                  }
                  setActiveMode(mode.id as any);
                  setIsAdminManuallyEdited(false);
                  if (mode.id === 'TARIK') setKategori('Tarik Tunai');
                  else if (mode.id === 'AKSESORIS') {
                    setKategori('Aksesoris');
                    setClassicPopupMode('AKSESORIS');
                  }
                  else setKategori(sumberToKategori[sumberAplikasi] || 'Transfer Bank');
                }}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-1 rounded-xl border-2 bg-white transition-all duration-200 outline-none",
                  isAct 
                    ? "border-[#0066ff] bg-[#f0f7ff] shadow-sm scale-[1.02]" 
                    : "border-gray-100 bg-white shadow-xs hover:border-blue-100"
                )}
              >
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center mb-1 transition-transform"
                  style={{backgroundColor: mode.iconBg}}
                >
                  <i className={cn("fa-solid text-white text-[11.5px]", mode.icon)}></i>
                </div>
                <span className={cn("text-[8.5px] font-black uppercase tracking-tight text-center leading-tight", isAct ? "text-[#0040cc]" : "text-[#374151]")}>{mode.label}</span>
              </button>
            )
          })}
        </div>

        {/* SUMBER / METODE */}
        {activeMode === 'DIGITAL' && (
          <div className="mb-2 px-3">
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.max(1, SUMBER_APLIKASI_BANK.filter(src => activeTransferMethods.includes(src.id) && !customLabels['HIDE_' + src.id]).length)}, minmax(0, 1fr))` }}>
              {SUMBER_APLIKASI_BANK.filter(src => activeTransferMethods.includes(src.id) && !customLabels['HIDE_' + src.id]).map(src => {
                const isSel = sumberAplikasi === src.id;
                // Warna icon per sumber
                const iconColors: Record<string, string> = {
                  'BANK': 'bg-[#0066ff]',
                  'DANA': 'bg-blue-500',
                  'ORDER KUOTA': 'bg-amber-500',
                  'FLIP': 'bg-orange-500',
                };
                return (
                  <button
                    key={src.id}
                    onClick={() => handleTransferCategoryClick(src.id, false)}
                    onDoubleClick={() => handleTransferCategoryClick(src.id, true)}
                    className={cn(
                      "relative flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl border-2 transition-all duration-300 bg-white overflow-hidden",
                      isSel ? "border-emerald-500 shadow-[0_4px_12px_-4px_rgba(16,185,129,0.4)] scale-[1.03]" : "border-gray-100 shadow-sm hover:border-emerald-200 hover:bg-emerald-50/50"
                    )}
                  >
                    {isSel && (
                      <div className="absolute top-0 right-0 w-8 h-8 bg-emerald-500 rotate-45 translate-x-4 -translate-y-4">
                        <i className="fa-solid fa-check text-white text-[8px] absolute bottom-1 left-3.5 -rotate-45"></i>
                      </div>
                    )}
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                      isSel ? "bg-emerald-500 text-white" : 'bg-gray-100 text-gray-400'
                    )}>
                      <i className={cn("fa-solid text-[11px]", src.icon, isSel ? "text-white" : "text-gray-500")}></i>
                    </div>
                    <span className={cn("text-[8px] font-black uppercase tracking-tight text-center leading-tight", isSel ? "text-[#0c1f44]" : "text-gray-600")}>{customLabels[src.id] || src.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
        {activeMode === 'TARIK' && (
          <div className="mb-2 px-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1"><i className="fa-solid fa-credit-card text-emerald-500"></i> Pilih Sumber Masuk:</p>
            </div>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.max(1, ITEMS['TARIK_TUNAI'].filter(item => !customLabels[item.id === 'DANA' ? 'HIDE_TARIK_DANA' : 'HIDE_' + item.id]).length)}, minmax(0, 1fr))` }}>
              {ITEMS['TARIK_TUNAI'].filter(item => !customLabels[item.id === 'DANA' ? 'HIDE_TARIK_DANA' : 'HIDE_' + item.id]).map((item) => {
                const isSelected = selectedSumber === (item.name === 'EDC/ATM' ? 'ATM/EDC' : item.name === 'TRANSFER' ? 'BANK' : item.name);
                return (
                  <button
                    key={item.id}
                    onClick={() => { 
                      const val = item.name === 'EDC/ATM' ? 'ATM/EDC' : item.name === 'TRANSFER' ? 'BANK' : item.name;
                      setSelectedSumber(val); 
                      setIsKetAuto(true);
                      setSumberAplikasi('TUNAI LACI KASIR');
                      setTujuanMasuk(val);
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 transition-all duration-300 relative bg-white overflow-hidden",
                      isSelected ? "border-emerald-500 shadow-[0_4px_12px_-4px_rgba(16,185,129,0.4)] scale-[1.03]" : "border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-0 right-0 w-8 h-8 bg-emerald-500 rotate-45 translate-x-4 -translate-y-4">
                        <i className="fa-solid fa-check text-white text-[8px] absolute bottom-1 left-3.5 -rotate-45"></i>
                      </div>
                    )}
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                      isSelected ? "bg-emerald-500 text-white" : "bg-gray-50 text-gray-400"
                    )}>
                      <i className={cn("fa-solid text-[11px]", item.icon, isSelected ? "text-white" : item.color)}></i>
                    </div>
                    <span className={cn(
                      "text-[8px] font-black uppercase text-center leading-tight",
                      isSelected ? "text-[#0c1f44]" : "text-gray-500"
                    )}>{item.id === 'DANA' ? (customLabels['TARIK_DANA'] || 'DANA') : (item.id === 'TRANSFER BANK' || item.name === 'TRANSFER') ? 'BANK' : (customLabels[item.id] || item.name)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* SUMBER KELUAR & MASUK ROW */}
        {activeMode === 'DIGITAL' && (
          <div className="mx-4 grid grid-cols-2 gap-2 mb-2">
            {/* KOLOM 1: UANG KELUAR */}
            <div 
              className="flex items-center gap-2 bg-white rounded-xl px-2.5 py-1.5 shadow-sm border border-red-100 cursor-pointer hover:border-red-400 hover:shadow-md transition-all"
              onClick={() => setIsSumberModalOpen(true)}
            >
              <div className="w-6 h-6 rounded-lg bg-red-500 text-white flex items-center justify-center shrink-0">
                <i className="fa-solid fa-arrow-up text-[10px]"></i>
              </div>
              <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
                <span className="text-[10px] font-black text-[#0c1f44] uppercase leading-tight truncate">
                  {sumberAplikasi || selectedSumber || 'Pilih Keluar'}
                </span>
                <i className="fa-solid fa-chevron-down text-[8px] text-red-400 shrink-0"></i>
              </div>
            </div>

            {/* KOLOM 2: UANG MASUK */}
            <div 
              className="flex items-center gap-2 bg-white rounded-xl px-2.5 py-1.5 shadow-sm border border-emerald-100 cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all"
              onClick={() => setIsTujuanModalOpen(true)}
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <i className="fa-solid fa-arrow-down text-[10px]"></i>
              </div>
              <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
                <span className="text-[10px] font-black text-[#0c1f44] uppercase leading-tight truncate">
                  {tujuanMasuk || 'Pilih Masuk'}
                </span>
                <i className="fa-solid fa-chevron-down text-[8px] text-emerald-400 shrink-0"></i>
              </div>
            </div>
          </div>
        )}

        {/* Banner Aksesoris Tema 2 */}
        {activeMode === 'AKSESORIS' && (
          <div className="mb-2 px-4 animate-in fade-in slide-in-from-top-2">
            <div 
              onClick={() => setClassicPopupMode('AKSESORIS')}
              className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl px-3 py-2 cursor-pointer hover:border-purple-400 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
                  <i className="fa-solid fa-headset text-xs"></i>
                </div>
                <div>
                  <span className="text-[7.5px] font-bold text-purple-700 uppercase tracking-wider block">Jenis Aksesoris Terpilih:</span>
                  <span className="text-[11px] font-black text-slate-800">
                    {keterangan || <span className="text-slate-400 font-medium">Klik untuk memilih aksesoris</span>}
                  </span>
                </div>
              </div>
              <span className="px-2 py-1 bg-white border border-purple-200 text-purple-700 rounded-lg text-[8px] font-black uppercase tracking-wider shadow-xs flex items-center gap-1">
                <i className="fa-solid fa-pen-to-square text-[8px]"></i>
                <span>PILIH</span>
              </span>
            </div>
          </div>
        )}

        {/* KETERANGAN */}
        <div className="mb-1 px-5">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-black text-[#0c1f44]">Keterangan</label>
              {activeMode === 'DIGITAL' && (
                <button
                  type="button"
                  onClick={() => {
                    const mode = getPopupMode(sumberAplikasi) || 'BANK';
                    setClassicPopupMode(mode);
                  }}
                  className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md text-[8px] font-bold hover:bg-blue-100 transition-colors flex items-center gap-1 shadow-sm border border-blue-100"
                >
                  <i className="fa-solid fa-list text-[7px]"></i> PILIH TUJUAN
                </button>
              )}
              {activeMode === 'AKSESORIS' && (
                <button
                  type="button"
                  onClick={() => setClassicPopupMode('AKSESORIS')}
                  className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-md text-[8px] font-black hover:bg-purple-100 transition-colors flex items-center gap-1 shadow-sm border border-purple-200"
                >
                  <i className="fa-solid fa-list text-[7px]"></i> PILIH AKSESORIS
                </button>
              )}
            </div>
            <label className="flex items-center gap-1 cursor-pointer bg-[#0066ff] px-1 py-0.5 rounded-md shadow-sm hover:bg-blue-700 transition-colors">
              <input type="checkbox" checked={isKetAuto} onChange={e => setIsKetAuto(e.target.checked)} className="w-2.5 h-2.5 accent-white rounded-sm" />
              <span className="text-[8px] font-bold text-white uppercase tracking-widest">OTOMATIS</span>
            </label>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 px-2 py-1.5 focus-within:ring-2 focus-within:ring-[#0066ff] transition-all flex flex-col shadow-sm">
            {isKetAuto && autoTextPrefix && (
              <div className="text-[10px] font-bold text-[#0066ff] mb-1 pb-1 border-b border-gray-100">
                {autoTextPrefix}
              </div>
            )}
            <textarea 
              ref={keteranganRef}
              onFocus={handleInputFocus}
              rows={1}
              placeholder="Masukkan keterangan transaksi..."
              value={activeMode === 'TARIK' && keterangan.startsWith('TARIK_TUNAI|') ? keterangan.substring(12) : keterangan}
              onChange={(e) => {
                const val = e.target.value ? e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) : '';
                setKeterangan(val);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setTimeout(() => nominalRef.current?.focus(), 10);
                }
              }}
              className="w-full resize-none text-[11px] font-bold text-gray-700 bg-transparent outline-none p-0 min-h-[18px]"
            ></textarea>
          </div>

          {/* Autocomplete Suggestions */}
          {presets && presets.length > 0 && (activeMode === 'DIGITAL' || activeMode === 'TARIK') && (() => {
            const safeKet = keterangan || selectedTujuan || selectedBank || '';
            const safeKat = kategori || '';
            const cleanQuery = safeKet.toUpperCase()
              .replace(safeKat.toUpperCase(), '')
              .replace(/=/g, '')
              .replace(/-/g, '')
              .replace(/>/g, '')
              .trim()
              .toLowerCase();
            const searchWords = cleanQuery.split(/\s+/).filter(Boolean);
            if (searchWords.length === 0) return null;
            const filtered = presets.filter(p => {
              if (!p || p.id?.startsWith?.('_') || typeof p.keterangan !== 'string' || !p.keterangan.trim()) return false;
              const pCat = p.kategori || 'Order Kuota';
              const pKetLower = p.keterangan.toLowerCase();
              return pCat.toLowerCase() === safeKat.toLowerCase() && searchWords.every(w => pKetLower.includes(w));
            });
            if (filtered.length === 0) return null;
            
            return (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {filtered.map(p => {
                  const pCat = p.kategori || 'Order Kuota';
                  const pKet = p.keterangan || '';
                  const pModal = Number(p.modal) || 0;
                  const pJual = Number(p.jual) || 0;
                  const isOrderKuota = pCat.toLowerCase() === 'order kuota';
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPresetItem(p)}
                      className="bg-[#faf5ff] hover:bg-purple-100 border border-purple-100 text-purple-700 text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-xl transition-all text-left shadow-sm cursor-pointer"
                    >
                      {isOrderKuota
                        ? `${pKet} (M:${pModal / 1000}k J:${pJual / 1000}k)` 
                        : pKet}
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* AKSESORIS PAY MODE */}
        {activeMode === 'AKSESORIS' && (
          <div className="flex gap-2 mb-2 px-5 animate-in fade-in slide-in-from-top-2 duration-300">
            <button
              onClick={() => setAksesorisPayMode('TUNAI')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all',
                aksesorisPayMode === 'TUNAI'
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-emerald-300'
              )}
            >
              <i className="fa-solid fa-cash-register text-[10px]"></i>
              <span>CASH / LACI</span>
            </button>
            <button
              onClick={() => setAksesorisPayMode('QRIS')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all',
                aksesorisPayMode === 'QRIS'
                  ? 'bg-[#0066ff] border-[#0066ff] text-white'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'
              )}
            >
              <i className="fa-solid fa-qrcode text-[10px]"></i>
              <span>NON TUNAI / QRIS</span>
            </button>
          </div>
        )}

        {/* NOMINAL & ADMIN */}
        <div className="flex gap-2 flex-nowrap mb-2 px-4">
          <div className="relative group flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1.5 px-1">
              <label className="flex items-center text-[10px] font-black text-gray-700 uppercase tracking-widest gap-1.5 whitespace-nowrap">
                <i className={cn("fa-solid", kategori === 'Order Kuota' ? "fa-box text-blue-500" : "fa-coins text-blue-500")}></i>
                {kategori === 'Order Kuota' ? 'Modal' : 'Nominal'}
              </label>
              {true && (
                <label
                  className={`flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded-md shadow-sm transition-colors ml-auto ${tujuanMasuk === '2X BAYAR (TUNAI & NON TUNAI)' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-[#0066ff] hover:bg-blue-700'}`}
                  onClick={e => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={tujuanMasuk === '2X BAYAR (TUNAI & NON TUNAI)'}
                    onChange={e => {
                      e.stopPropagation();
                      setTujuanMasuk(e.target.checked ? '2X BAYAR (TUNAI & NON TUNAI)' : 'TUNAI LACI KASIR');
                    }}
                    className="w-3 h-3 accent-white rounded-sm"
                  />
                  <span className="text-[9px] font-bold text-white whitespace-nowrap">2x Pay</span>
                </label>
              )}
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs pointer-events-none">Rp</div>
              <input 
                ref={nominalRef}
                type="text" 
                inputMode="numeric" 
                placeholder="0" 
                value={nominal}
                onFocus={handleInputFocus}
                onChange={(e) => { setNominal(formatInputRupiah(e.target.value)); setErrorMsg(null); setIsAdminManuallyEdited(false); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setTimeout(() => {
                      if (activeMode === 'AKSESORIS') btnSimpanRef.current?.click();
                      else if (kategori === 'Order Kuota') btnSimpanRef.current?.click();
                      else adminRef.current?.focus();
                    }, 10);
                  }
                }}
                className="w-full text-[14px] font-black h-[36px] pl-9 pr-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-50 outline-none transition-all shadow-sm"
              />
            </div>
          </div>
          {activeMode !== 'AKSESORIS' && (
          <div className="relative group flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 px-1">
              <label className="flex items-center text-[10px] font-black text-gray-700 uppercase tracking-widest gap-1.5 whitespace-nowrap">
                <i className={cn("fa-solid text-[10px]", kategori === 'Order Kuota' ? "fa-tag text-blue-500" : "fa-hand-holding-dollar text-blue-500")}></i>
                {kategori === 'Order Kuota' ? 'Jual' : 'Admin'}
              </label>
              <label className={`flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded-md shadow-sm transition-colors ml-auto ${isAdminNonTunai ? 'bg-purple-600 hover:bg-purple-700' : 'bg-[#0066ff] hover:bg-blue-700'}`}>
                <input
                  type="checkbox"
                  checked={isAdminNonTunai}
                  onChange={(e) => setIsAdminNonTunai(e.target.checked)}
                  className="w-3 h-3 accent-white rounded-sm"
                />
                <span className="text-[9px] font-bold text-white whitespace-nowrap">Non Tunai</span>
              </label>
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs pointer-events-none">Rp</div>
              <input 
                ref={adminRef}
                type="text" 
                inputMode="numeric" 
                placeholder="0" 
                value={admin}
                onFocus={(e) => {
                  handleInputFocus(e);
                  e.target.select();
                }}
                onChange={(e) => { setAdmin(formatInputRupiah(e.target.value)); setErrorMsg(null); setIsAdminManuallyEdited(true); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setTimeout(() => btnSimpanRef.current?.click(), 10);
                  }
                }}
                className={cn(
                  "w-full text-[14px] font-black h-[36px] pl-9 pr-3 rounded-xl border outline-none transition-all shadow-sm focus:ring-4",
                  kategori === 'Order Kuota' && (() => {
                    const m = parseInt(nominal.replace(/[^0-9]/g, '')) || 0
                    const j = parseInt(admin.replace(/[^0-9]/g, '')) || 0
                    return m > 0 && j > 0 && j <= m
                      ? "bg-red-50 text-red-700 border-red-300 focus:border-red-400 focus:ring-red-100"
                      : m > 0 && j > m
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100"
                        : "bg-gray-50/50 border-gray-200 text-gray-900 focus:bg-white focus:border-emerald-400 focus:ring-emerald-50"
                  })() || (isAdminNonTunai 
                    ? "bg-purple-50/80 text-purple-700 border-purple-300 focus:border-purple-400 focus:ring-purple-100" 
                    : "bg-gray-50/50 border-gray-200 text-gray-900 focus:bg-white focus:border-purple-400 focus:ring-purple-50")
                )}
              />
              {/* Indikator real-time untuk Order Kuota */}
              {kategori === 'Order Kuota' && (() => {
                const m = parseInt(nominal.replace(/[^0-9]/g, '')) || 0
                const j = parseInt(admin.replace(/[^0-9]/g, '')) || 0
                if (m > 0 && j > 0) {
                  if (j > m) {
                    return (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow">
                        <i className="fa-solid fa-check text-white text-[10px]"></i>
                      </div>
                    )
                  } else {
                    return (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow animate-pulse">
                        <i className="fa-solid fa-xmark text-white text-[10px]"></i>
                      </div>
                    )
                  }
                }
                return null
              })()}
            </div>
          </div>
          )}
        </div>



        {tujuanMasuk === '2X BAYAR (TUNAI & NON TUNAI)' && (
          <div className="flex gap-2 w-full mb-3 px-5 animate-in fade-in slide-in-from-top-2">
            <div className="relative flex-1">
              <input 
                type="text" inputMode="numeric"
                placeholder="Tunai"
                value={nominalCashSplit}
                onChange={handleNominalCashChange}
                className="w-full text-[13px] font-black h-[38px] px-3 rounded-xl border border-emerald-200 bg-emerald-50 focus:border-emerald-500 outline-none appearance-none transition-all text-emerald-900 placeholder:text-emerald-300"
              />
            </div>
            <div className="relative flex-1">
              <input 
                type="text" inputMode="numeric"
                placeholder="Non Tunai"
                value={nominalNonTunaiSplit}
                onChange={handleNominalNonTunaiChange}
                className="w-full text-[13px] font-black h-[38px] px-3 rounded-xl border border-blue-200 bg-blue-50 focus:border-[#0066ff] outline-none appearance-none transition-all text-[#0066ff] placeholder:text-blue-300"
              />
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-3 mx-5 bg-red-50 border border-red-200 p-2.5 rounded-xl">
            <p className="text-[11px] font-black text-red-600 uppercase text-center flex items-center justify-center gap-1.5">
              <i className="fa-solid fa-triangle-exclamation"></i> {errorMsg}
            </p>
          </div>
        )}

        <div className="px-5">
          <button 
            ref={btnSimpanRef}
            onClick={onSaveInternal} 
            disabled={isSaving || (activeMode === 'DIGITAL' && !kategori)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
            className="group relative w-full overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white text-[12px] font-black py-2 rounded-xl shadow-[0_4px_12px_-4px_rgba(79,70,229,0.5)] transition-all duration-300 hover:shadow-[0_8px_20px_-6px_rgba(79,70,229,0.6)] active:scale-[0.98] focus:ring-4 focus:ring-indigo-300 outline-none uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-700 ease-in-out"></div>
            {isSaving ? (
              <i className="fa-solid fa-circle-notch fa-spin text-lg"></i>
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-paper-plane text-sm"></i>
              </div>
            )}
            {isSaving ? 'MEMPROSES...' : `SIMPAN TRANSAKSI${(() => { const n = parseInt(nominal.replace(/[^0-9]/g,'')) || 0; return n > 0 ? ` (Rp ${n.toLocaleString('id-ID')})` : '' })()}`}
          </button>
        </div>
      </>
      ) : (
      <>
        {/* TEMA 3 LAYOUT (KOMPAK & SIDEBAR) */}
        <div className="px-4">
        <button 
          ref={btnTema3MainRef}
          onClick={() => { 
            setTema3Step('MAIN'); 
            setIsTema3SheetOpen(true); 
            setActiveMode('');
            setSumberAplikasi('');
            setActiveSubCategory('');
            setSelectedSumber('');
            setKategori('');
            setKeterangan('');
          }}
          className="w-full bg-white border-2 border-gray-100 rounded-[24px] p-3 flex items-center justify-between mb-1 shadow-sm active:scale-[0.98] transition-all group hover:border-blue-300"
        >
           <div className="flex items-center gap-4">
             <div className="relative w-14 h-14 rounded-[18px] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30 group-hover:shadow-lg group-hover:scale-105 transition-all">
               <i className="fa-solid fa-bars text-2xl"></i>
               <span className="absolute top-1.5 right-1.5 text-[9px] font-black text-white bg-white/20 px-1.5 py-0.5 rounded backdrop-blur-sm">Q</span>
             </div>
             <div className="flex flex-col items-start gap-1">
               <span className="text-[10px] font-black text-[#64748b] tracking-widest uppercase">Mode Layanan Aktif</span>
               <span className="text-[15px] font-black text-[#1e293b] uppercase tracking-wider leading-none">
                 {activeMode === 'DIGITAL' && sumberAplikasi ? `TRANSFER - ${sumberAplikasi}` : 
                  activeMode === 'DIGITAL' ? 'BANK' :
                  activeMode === 'TARIK' && selectedSumber ? `TARIK TUNAI - ${selectedSumber}` : 
                  activeMode === 'TARIK' ? 'TARIK TUNAI' :
                  activeMode === 'AKSESORIS' ? 'AKSESORIS' : 
                  activeMode === 'VOUCHER' ? 'JUAL VOUCHER' : 'PILIH LAYANAN'}
               </span>
             </div>
           </div>
           <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mr-1">
             <i className="fa-solid fa-chevron-right text-[#64748b] text-[12px]"></i>
           </div>
        </button>
        </div>

        {/* SUMBER KELUAR & MASUK ROW - TEMA 3 */}
        {activeMode === 'DIGITAL' && (
          <div className="mb-4 px-5 animate-in fade-in slide-in-from-top-2">
            <div className="grid grid-cols-2 gap-2">
              {/* KOLOM 1: UANG KELUAR */}
              <div 
                className="flex flex-col justify-between bg-white rounded-xl px-3 py-2.5 shadow-sm border border-gray-200 cursor-pointer hover:border-[#0066ff] hover:ring-2 hover:ring-blue-50 transition-all"
                onClick={() => setIsSumberModalOpen(true)}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[8px] font-bold text-[#64748b] leading-none uppercase tracking-wider">Sumber Aplikasi Uang Keluar</span>
                  <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-chevron-down text-[8px] text-red-500"></i>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-[8px] bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                  </div>
                  <span className="text-[11px] font-black text-[#0c1f44] uppercase leading-tight truncate">
                    {sumberAplikasi || selectedSumber || 'Pilih Keluar'}
                  </span>
                </div>
              </div>

              {/* KOLOM 2: UANG MASUK */}
              <div 
                className="flex flex-col justify-between bg-white rounded-xl px-3 py-2.5 shadow-sm border border-gray-200 cursor-pointer hover:border-[#0066ff] hover:ring-2 hover:ring-blue-50 transition-all"
                onClick={() => setIsTujuanModalOpen(true)}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[8px] font-bold text-[#64748b] leading-none uppercase tracking-wider">Sumber Uang Masuk</span>
                  <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-chevron-down text-[8px] text-emerald-500"></i>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-[8px] bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-arrow-down-left-from-square text-[10px]"></i>
                  </div>
                  <span className="text-[11px] font-black text-[#0c1f44] uppercase leading-tight truncate">
                    {tujuanMasuk || 'Pilih Masuk'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Banner Aksesoris Tema 3 */}
        {activeMode === 'AKSESORIS' && (
          <div className="mb-3 px-5 animate-in fade-in slide-in-from-top-2">
            <div 
              onClick={() => setClassicPopupMode('AKSESORIS')}
              className="flex items-center justify-between bg-purple-50/60 border border-purple-200 rounded-xl px-3 py-2.5 cursor-pointer hover:border-purple-400 transition-all shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm">
                  <i className="fa-solid fa-headset text-sm"></i>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-purple-700 uppercase tracking-wider block">Sub-Kategori Aksesoris</span>
                  <span className="text-[12px] font-black text-slate-800">
                    {keterangan || <span className="text-slate-400 font-normal">Pilih Aksesoris (Charger, Headset, dll)</span>}
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-white border border-purple-200 text-purple-700 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-xs">
                PILIH
              </span>
            </div>
          </div>
        )}

        {/* KETERANGAN ROW */}
        <div className="mb-4 px-5">
          <div className="flex justify-between items-center mb-2 px-1">
            <label className="text-[10px] font-black text-[#334155] tracking-widest flex items-center gap-1.5">
              <i className="fa-solid fa-align-left text-gray-400"></i> KETERANGAN
            </label>
            <label className="flex items-center gap-1 cursor-pointer bg-[#0066ff] px-1.5 py-0.5 rounded-md shadow-sm hover:bg-blue-700 transition-colors">
              <input type="checkbox" checked={isKetAuto} onChange={e => setIsKetAuto(e.target.checked)} className="w-3 h-3 accent-white rounded-sm" />
              <span className="text-[9px] font-bold text-white uppercase tracking-widest">OTOMATIS</span>
            </label>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-2 focus-within:ring-2 focus-within:ring-blue-100 transition-all flex flex-col shadow-sm">
            {isKetAuto && autoTextPrefix && (
              <div className="text-[12px] font-bold text-[#0066ff] mb-1.5 pb-1.5 border-b border-gray-100">
                {autoTextPrefix}
              </div>
            )}
            <textarea 
              ref={keteranganRef}
              onFocus={handleInputFocus}
              rows={isKetAuto ? 1 : 2}
              placeholder="Ketik keterangan tambahan disini" 
              value={activeMode === 'TARIK' && keterangan.startsWith('TARIK_TUNAI|') ? keterangan.substring(12) : keterangan}
              onChange={(e) => {
                const val = e.target.value ? e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) : '';
                setKeterangan(val);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setTimeout(() => nominalRef.current?.focus(), 10);
                }
              }}
              className="w-full resize-none text-[11px] font-bold text-gray-700 bg-transparent outline-none p-0 min-h-[24px]"
            ></textarea>
          </div>
          {/* Autocomplete Suggestions */}
          {presets && presets.length > 0 && (activeMode === 'DIGITAL' || activeMode === 'TARIK') && (
            <div className="mt-1.5 flex flex-wrap gap-1.5 px-1">
              {(() => {
                const safeKet = keterangan || selectedTujuan || selectedBank || '';
                const safeKat = kategori || '';
                const cleanQuery = safeKet.toUpperCase()
                  .replace(safeKat.toUpperCase(), '')
                  .replace(/=/g, '')
                  .replace(/-/g, '')
                  .replace(/>/g, '')
                  .trim()
                  .toLowerCase();
                const searchWords = cleanQuery.split(/\s+/).filter(Boolean);
                if (searchWords.length === 0) return null;
                const filtered = presets.filter(p => {
                  if (!p || p.id?.startsWith?.('_') || typeof p.keterangan !== 'string' || !p.keterangan.trim()) return false;
                  const pCat = p.kategori || 'Order Kuota';
                  const pKetLower = p.keterangan.toLowerCase();
                  return pCat.toLowerCase() === safeKat.toLowerCase() && searchWords.every(w => pKetLower.includes(w));
                });
                if (filtered.length === 0) return null;
                return filtered.map(p => {
                  const pCat = p.kategori || 'Order Kuota';
                  const pKet = p.keterangan || '';
                  const pModal = Number(p.modal) || 0;
                  const pJual = Number(p.jual) || 0;
                  const isOrderKuota = pCat.toLowerCase() === 'order kuota';
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPresetItem(p)}
                      className="bg-[#faf5ff] hover:bg-purple-100 border border-purple-100 text-purple-700 text-[9px] font-black uppercase tracking-wide px-2.5 py-1.5 rounded-xl transition-all text-left shadow-sm cursor-pointer"
                    >
                      {isOrderKuota 
                        ? `${pKet} (M:${pModal / 1000}k J:${pJual / 1000}k)` 
                        : pKet}
                    </button>
                  );
                })
              })()}
            </div>
          )}
        </div>

        {/* PAYMENT MODE TOGGLE FOR AKSESORIS - TEMA 3 */}
        {activeMode === 'AKSESORIS' && (
          <div className="flex gap-2 mb-3 px-5 animate-in fade-in slide-in-from-top-2 duration-300">
            <button
              onClick={() => setAksesorisPayMode('TUNAI')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all',
                aksesorisPayMode === 'TUNAI'
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_4px_12px_-4px_rgba(16,185,129,0.5)]'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-emerald-300'
              )}
            >
              <i className="fa-solid fa-cash-register text-[11px]"></i>
              <span>CASH / LACI</span>
              {aksesorisPayMode === 'TUNAI' && <i className="fa-solid fa-check text-[10px]"></i>}
            </button>
            <button
              onClick={() => setAksesorisPayMode('QRIS')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all',
                aksesorisPayMode === 'QRIS'
                  ? 'bg-blue-500 border-blue-500 text-white shadow-[0_4px_12px_-4px_rgba(59,130,246,0.5)]'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'
              )}
            >
              <i className="fa-solid fa-qrcode text-[11px]"></i>
              <span>NON TUNAI / QRIS</span>
              {aksesorisPayMode === 'QRIS' && <i className="fa-solid fa-check text-[10px]"></i>}
            </button>
          </div>
        )}

        {/* NOMINAL & ADMIN ROW */}
        <div className="flex gap-2 mb-3 px-5 w-full">
          <div className="relative group flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1.5 px-1">
              <label className="flex items-center text-[10px] font-black text-gray-700 uppercase tracking-widest gap-1.5 whitespace-nowrap">
                <i className={cn("fa-solid", kategori === 'Order Kuota' ? "fa-box text-blue-500" : "fa-coins text-blue-500")}></i>
                {kategori === 'Order Kuota' ? 'Modal' : 'Nominal'}
              </label>
              {true && (
                <label
                  className={`flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded-md shadow-sm transition-colors ml-auto ${tujuanMasuk === '2X BAYAR (TUNAI & NON TUNAI)' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-[#0066ff] hover:bg-blue-700'}`}
                  onClick={e => e.stopPropagation()}
                >
                  <input type="checkbox" checked={tujuanMasuk === '2X BAYAR (TUNAI & NON TUNAI)'} onChange={e => {
                    e.stopPropagation();
                    if (e.target.checked) setTujuanMasuk('2X BAYAR (TUNAI & NON TUNAI)');
                    else setTujuanMasuk('TUNAI LACI KASIR');
                  }} className="w-3 h-3 accent-white rounded-sm" />
                  <span className="text-[9px] font-bold text-white whitespace-nowrap">2x Pay</span>
                </label>
              )}
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs pointer-events-none">Rp</div>
              <input 
                ref={nominalRef}
                type="text" 
                inputMode="numeric" 
                placeholder="0" 
                value={nominal}
                onFocus={handleInputFocus}
                onChange={(e) => { setNominal(formatInputRupiah(e.target.value)); setErrorMsg(null); setIsAdminManuallyEdited(false); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setTimeout(() => {
                      if (activeMode === 'AKSESORIS') btnSimpanRef.current?.click();
                      else if (kategori === 'Order Kuota') btnSimpanRef.current?.click();
                      else adminRef.current?.focus();
                    }, 10);
                  }
                }}
                className="w-full text-[14px] font-black h-[36px] pl-9 pr-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-50 outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          {activeMode !== 'AKSESORIS' && (
            <div className="relative group flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <label className="flex items-center text-[10px] font-black text-gray-700 uppercase tracking-widest gap-1.5 whitespace-nowrap">
                  <i className={cn("fa-solid text-[10px]", kategori === 'Order Kuota' ? "fa-tag text-blue-500" : "fa-hand-holding-dollar text-blue-500")}></i>
                  {kategori === 'Order Kuota' ? 'Jual' : 'Admin'}
                </label>
                <label className={`flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded-md shadow-sm transition-colors ml-auto ${isAdminNonTunai ? 'bg-purple-600 hover:bg-purple-700' : 'bg-[#0066ff] hover:bg-blue-700'}`}>
                  <input
                    type="checkbox"
                    checked={isAdminNonTunai}
                    onChange={(e) => setIsAdminNonTunai(e.target.checked)}
                    className="w-3 h-3 accent-white rounded-sm"
                  />
                  <span className="text-[9px] font-bold text-white whitespace-nowrap">Non Tunai</span>
                </label>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs pointer-events-none">Rp</div>
                <input 
                  ref={adminRef}
                  type="text" 
                  inputMode="numeric" 
                  placeholder="0" 
                  value={admin}
                  onFocus={(e) => {
                    handleInputFocus(e);
                    e.target.select();
                  }}
                  onChange={(e) => { setAdmin(formatInputRupiah(e.target.value)); setErrorMsg(null); setIsAdminManuallyEdited(true); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setTimeout(() => btnSimpanRef.current?.click(), 10);
                    }
                  }}
                  className={cn(
                    "w-full text-[14px] font-black h-[36px] pl-9 pr-3 rounded-xl border outline-none transition-all shadow-sm focus:ring-4",
                    kategori === 'Order Kuota' && (() => {
                      const m = parseInt(nominal.replace(/[^0-9]/g, '')) || 0;
                      const j = parseInt(admin.replace(/[^0-9]/g, '')) || 0;
                      return m > 0 && j > 0 && j <= m
                        ? "bg-red-50 text-red-700 border-red-300 focus:border-red-400 focus:ring-red-100"
                        : m > 0 && j > m
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100"
                          : "bg-gray-50/50 border-gray-200 text-gray-900 focus:bg-white focus:border-emerald-400 focus:ring-emerald-50";
                    })() || (isAdminNonTunai 
                      ? "bg-purple-50/80 text-purple-700 border-purple-300 focus:border-purple-400 focus:ring-purple-100" 
                      : "bg-gray-50/50 border-gray-200 text-gray-900 focus:bg-white focus:border-purple-400 focus:ring-purple-50")
                  )}
                />
                {kategori === 'Order Kuota' && (() => {
                  const m = parseInt(nominal.replace(/[^0-9]/g, '')) || 0;
                  const j = parseInt(admin.replace(/[^0-9]/g, '')) || 0;
                  if (m > 0 && j > 0) {
                    if (j > m) {
                      return (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow">
                          <i className="fa-solid fa-check text-white text-[10px]"></i>
                        </div>
                      )
                    } else {
                      return (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow animate-pulse">
                          <i className="fa-solid fa-xmark text-white text-[10px]"></i>
                        </div>
                      )
                    }
                  }
                  return null;
                })()}
              </div>
            </div>
          )}
        </div>

        {/* 2X BAYAR SPLIT (MOVED BELOW NOMINAL ROW) */}
        {tujuanMasuk === '2X BAYAR (TUNAI & NON TUNAI)' && (
          <div className="flex gap-2 w-full mb-3 px-5 animate-in fade-in slide-in-from-top-2">
            <div className="relative flex-1">
              <input 
                type="text" inputMode="numeric"
                placeholder="Tunai"
                value={nominalCashSplit}
                onChange={handleNominalCashChange}
                className="w-full text-[13px] font-black h-[38px] px-3 rounded-xl border border-emerald-200 bg-emerald-50 focus:border-emerald-500 outline-none appearance-none transition-all text-emerald-900 placeholder:text-emerald-300"
              />
            </div>
            <div className="relative flex-1">
              <input 
                type="text" inputMode="numeric"
                placeholder="Non Tunai"
                value={nominalNonTunaiSplit}
                onChange={handleNominalNonTunaiChange}
                className="w-full text-[13px] font-black h-[38px] px-3 rounded-xl border border-blue-200 bg-blue-50 focus:border-[#0066ff] outline-none appearance-none transition-all text-[#0066ff] placeholder:text-blue-300"
              />
            </div>
          </div>
        )}

        {/* ERROR MESSAGES & ALERTS */}
        {errorMsg && (
          <div className="mb-4 bg-red-50/80 border border-red-200 p-3 rounded-xl">
            <p className="text-[10px] font-black text-red-600 uppercase text-center tracking-widest flex items-center justify-center gap-2">
              <i className="fa-solid fa-triangle-exclamation text-base"></i> {errorMsg}
            </p>
          </div>
        )}

        <button 
          ref={btnSimpanRef}
          onClick={onSaveInternal} 
          disabled={isSaving || (activeMode === 'DIGITAL' && !kategori)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
          className="group relative w-full overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white text-[13px] font-black py-3 rounded-2xl shadow-[0_8px_20px_-6px_rgba(79,70,229,0.5)] transition-all duration-300 hover:shadow-[0_12px_25px_-6px_rgba(79,70,229,0.6)] active:scale-[0.98] focus:ring-4 focus:ring-indigo-300 outline-none uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-700 ease-in-out"></div>
          {isSaving ? (
            <i className="fa-solid fa-circle-notch fa-spin text-lg"></i>
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
              <i className="fa-solid fa-paper-plane text-sm"></i>
            </div>
          )}
          {isSaving ? 'MEMPROSES...' : `SIMPAN TRANSAKSI${(() => { const n = parseInt(nominal.replace(/[^0-9]/g,'')) || 0; return n > 0 ? ` (Rp ${n.toLocaleString('id-ID')})` : '' })()}`}
        </button>
      </>
      )}

      {lastTx && (
        <div className="mt-4 bg-white border border-gray-200 rounded-[1.25rem] p-3 shadow-sm relative overflow-hidden animate-in slide-in-from-bottom-4 fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-inner">
                <i className="fa-solid fa-bolt text-[10px]"></i>
              </div>
              <p className="text-[10px] text-black font-black uppercase tracking-tighter">TERAKHIR</p>
            </div>
            {onOpenRiwayatDetail && (
              <button 
                onClick={() => onOpenRiwayatDetail(lastTx)}
                className="text-[10px] text-blue-600 font-black uppercase tracking-tighter hover:underline"
              >
                Detail Riwayat <i className="fa-solid fa-chevron-right text-[8px] ml-0.5"></i>
              </button>
            )}
          </div>
          <div className="w-full h-px bg-gray-100 mb-2"></div>
          <div className="flex justify-between items-start">
            <div className="min-w-0 pr-2">
              <h3 className="text-[13px] font-black text-black uppercase leading-none tracking-tight truncate">{lastTx.kategori}</h3>
              {lastTx.keterangan && (
                <p className="text-[11px] font-bold text-blue-700 mt-1.5 truncate">
                  {lastTx.keterangan.replace(/\[ADMIN_DALAM\]/ig, '').replace(/\[NON_TUNAI\]/ig, '').trim()}
                </p>
              )}
              <p className="text-[10px] text-gray-500 font-bold mt-1.5">{new Date(lastTx.timestamp).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })} • {new Date(lastTx.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.')}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[14px] font-black text-black leading-none">{(lastTx.nominal || 0).toLocaleString('id-ID')}</p>
              {(lastTx.adminFee || 0) > 0 && (
                <p className="text-[10px] font-black text-teal-600 mt-1 uppercase tracking-tighter">
                  {(lastTx.keterangan || '').toUpperCase().includes('[ADMIN_DALAM]') ? 'POTONG DALAM:' : 'ADMIN (TUNAI):'} {(lastTx.adminFee || 0).toLocaleString('id-ID')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Sumber Aplikasi */}
      {isSumberModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsSumberModalOpen(false)}>
          <div className="bg-white w-[85%] max-w-[280px] rounded-[20px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col py-2">
              {activeTransferMethods.filter(s => !customLabels['HIDE_' + s]).map((s, idx, arr) => (
                <button 
                  key={s}
                  onClick={() => {
                    setIsSumberModalOpen(false);
                    handleTransferCategoryClick(s, false);
                  }}
                  onDoubleClick={() => {
                    setIsSumberModalOpen(false);
                    handleTransferCategoryClick(s, true);
                  }}
                  className={cn(
                    "flex items-center justify-between p-3.5 text-left transition-colors hover:bg-gray-50",
                    idx !== arr.length - 1 && "border-b border-gray-100"
                  )}
                >
                  <span className="text-[15px] font-black text-slate-800">{s}</span>
                  {sumberAplikasi === s ? (
                    <div className="flex items-center justify-center w-[22px] h-[22px] rounded-full border-[3px] border-[#293659]">
                      <div className="w-[10px] h-[10px] rounded-full bg-[#293659]"></div>
                    </div>
                  ) : (
                    <div className="w-[22px] h-[22px] rounded-full border-2 border-gray-400"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Tujuan Masuk */}
      {isTujuanModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsTujuanModalOpen(false)}>
          <div className="bg-white w-[85%] max-w-[280px] rounded-[20px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col">
              {['TUNAI LACI KASIR', 'NON TUNAI', '2X BAYAR (TUNAI & NON TUNAI)'].map((t, idx, arr) => (
                <button
                  key={t}
                  onClick={() => {
                    setTujuanMasuk(t);
                    setIsTujuanModalOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between p-3.5 text-left transition-colors hover:bg-gray-50",
                    idx !== arr.length - 1 && "border-b border-gray-100"
                  )}
                >
                  <span className="text-[15px] font-black text-slate-800">{t}</span>
                  {tujuanMasuk === t ? (
                    <div className="flex items-center justify-center w-[22px] h-[22px] rounded-full border-[3px] border-[#293659]">
                      <div className="w-[10px] h-[10px] rounded-full bg-[#293659]"></div>
                    </div>
                  ) : (
                    <div className="w-[22px] h-[22px] rounded-full border-2 border-gray-400"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tema 3 Bottom Sheet / Drill-down Modal */}
      {isTema3SheetOpen && (
        <div id="tema3-bottom-sheet" className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsTema3SheetOpen(false)}>
          <div 
            className="bg-white w-full max-w-lg rounded-t-[32px] p-6 pb-10 shadow-2xl transform transition-transform animate-in slide-in-from-bottom-full duration-300 relative overflow-hidden flex flex-col" 
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleSlideKeyDown}
            style={{ height: '480px' }}
          >
            {/* Header Handle */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 shrink-0"></div>
            
            <div className="relative flex-1 w-full h-full overflow-hidden">
              {/* LAYAR 1: MAIN MENU */}
              <div className={cn("absolute inset-0 w-full h-full transition-transform duration-300 ease-in-out bg-white flex flex-col", 
                tema3Step === 'MAIN' ? "translate-x-0" : "-translate-x-full"
              )}>
                <h3 className="text-center text-[15px] font-black text-slate-800 mb-4 tracking-widest uppercase shrink-0 pt-2">Pilih Mode Utama</h3>
                <div className="flex flex-col gap-2 overflow-y-auto pb-4 px-2 -mx-2 pt-2">
                  {[
                    { id: 'DIGITAL', label: (customLabels['DIGITAL'] || 'TRANSFER').toUpperCase(), subtext: 'Transfer, Ewallet dan PPOB', icon: 'fa-paper-plane', color: 'text-blue-500', bg: 'bg-blue-50' },
                    { id: 'TARIK', label: (customLabels['TARIK'] || 'TARIK TUNAI').toUpperCase(), subtext: '', icon: 'fa-money-bill-transfer', color: 'text-red-500', bg: 'bg-red-50' },
                    { id: 'AKSESORIS', label: (customLabels['AKSESORIS'] || 'AKSESORIS').toUpperCase(), subtext: '', icon: 'fa-headset', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { id: 'VOUCHER', label: (customLabels['VOUCHER'] || 'VOUCHER').toUpperCase(), subtext: '', icon: 'fa-ticket', color: 'text-orange-500', bg: 'bg-orange-50' },
                  ].map(m => {
                    const isSelected = activeMode === m.id;
                    return (
                    <button 
                      key={m.id}
                      data-autofocus={m.id === 'DIGITAL' ? "true" : "false"}
                      onClick={() => {
                        if (m.id === 'VOUCHER') { 
                          setActiveMode('VOUCHER');
                          if (onOpenVoucherJualCepat) onOpenVoucherJualCepat(); 
                          setIsTema3SheetOpen(false); 
                          return; 
                        }
                        if (m.id === 'AKSESORIS') {
                          setActiveMode('AKSESORIS');
                          setKategori('Aksesoris');
                          setIsAdminManuallyEdited(false);
                          setIsTema3SheetOpen(false);
                          setClassicPopupMode('AKSESORIS');
                          return;
                        }
                        setActiveMode(m.id as any);
                        setTema3Step(m.id as any);
                      }}
                      className={cn(
                        "group px-5 py-4 rounded-[20px] border transition-all text-left flex items-center gap-4 shadow-sm outline-none focus:outline-none",
                        isSelected 
                          ? "bg-orange-500 border-orange-500 text-white active:scale-95" 
                          : "border-gray-100 bg-white hover:bg-orange-500 hover:border-orange-500 focus:bg-orange-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-200 active:scale-95"
                      )}
                    >
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors", 
                        isSelected ? "bg-white/20 text-white" : `${m.bg} ${m.color} group-hover:bg-white/20 group-hover:text-white group-focus:bg-white/20 group-focus:text-white`
                      )}>
                        <i className={cn("fa-solid text-lg", m.icon)}></i>
                      </div>
                      <div className="flex flex-col items-start gap-0.5">
                        <span className={cn("text-[13px] font-black uppercase tracking-widest transition-colors", 
                          isSelected ? "text-white" : "text-slate-700 group-hover:text-white group-focus:text-white"
                        )}>{m.label}</span>
                        {m.subtext && (
                          <span className={cn("text-[10px] font-medium transition-colors", 
                            isSelected ? "text-white/80" : "text-slate-500 group-hover:text-white/80 group-focus:text-white/80"
                          )}>{m.subtext}</span>
                        )}
                      </div>
                    </button>
                  )})}
                </div>
              </div>

              {/* LAYAR 2: SUB MENU (TWO COLUMN) */}
              <div className={cn("absolute inset-0 w-full h-full transition-transform duration-300 ease-in-out bg-white flex", 
                tema3Step !== 'MAIN' ? "translate-x-0" : "translate-x-full"
              )}>
                {/* Kolom Kiri: Header & Back Button */}
                <div className="w-[30%] bg-slate-50 border-r border-gray-100 flex flex-col items-center pt-8 px-2">
                  <button type="button" onClick={() => { setActiveMode(''); setTema3Step('MAIN'); }} className="mb-4 w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-slate-600 hover:bg-gray-100 focus:outline-none cursor-pointer active:scale-90 transition-all shadow-sm">
                    <i className="fa-solid fa-chevron-left text-[13px]"></i>
                  </button>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                    {tema3Step === 'DIGITAL' ? 'TRANSFER' : tema3Step === 'TARIK' ? 'TARIK TUNAI' : ''}
                  </span>
                </div>

                {/* Kolom Kanan: Pilihan Menu */}
                <div className="flex-1 flex flex-col overflow-y-auto pt-4 pb-4 px-4">
                  <div className="flex flex-col gap-2 mb-6">
                    {tema3Step === 'DIGITAL' && activeTransferMethods.filter(s => !customLabels['HIDE_' + s]).map((s, idx) => {
                      const isAct = sumberAplikasi === s;
                      const label = s === 'BANK' ? (customLabels['BANK'] || 'BANK') : (customLabels[s] || s);
                      const icon = s === 'BANK' ? 'fa-building-columns' : s === 'DANA' ? 'fa-wallet' : s === 'FLIP' ? 'fa-bolt' : 'fa-wifi';
                      const isSelected = activeMode === 'DIGITAL' && sumberAplikasi === s;
                      return (
                        <button 
                          key={s}
                          data-autofocus={idx === 0 ? "true" : "false"}
                          onClick={() => {
                            setActiveMode('DIGITAL');
                            setIsTema3SheetOpen(false);
                            handleTransferCategoryClick(s, false);
                          }}
                          onDoubleClick={() => {
                            setActiveMode('DIGITAL');
                            setIsTema3SheetOpen(false);
                            handleTransferCategoryClick(s, true);
                          }}
                          className={cn(
                            "group px-4 py-3.5 rounded-[16px] border transition-all text-left flex items-center gap-3.5 shadow-sm active:scale-95 outline-none focus:outline-none",
                            isSelected 
                              ? "bg-orange-500 border-orange-500 text-white" 
                              : "border-gray-100 bg-white hover:bg-orange-500 hover:border-orange-500 focus:bg-orange-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-200"
                          )}
                        >
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors", 
                            isSelected ? "bg-white/20 text-white" : "bg-blue-100 text-blue-600 group-hover:bg-white/20 group-hover:text-white group-focus:bg-white/20 group-focus:text-white"
                          )}>
                            <i className={cn("fa-solid text-lg", icon)}></i>
                          </div>
                          <span className={cn("text-[12px] font-black uppercase tracking-widest transition-colors", 
                            isSelected ? "text-white" : "text-slate-700 group-hover:text-white group-focus:text-white"
                          )}>{label}</span>
                        </button>
                      )
                    })}

                    {tema3Step === 'TARIK' && ['QRIS','DANA','ATM','GOPAY','BANK'].filter(s => {
                      const hKey = s === 'DANA' ? 'HIDE_TARIK_DANA' : s === 'ATM' ? 'HIDE_EDC / ATM' : s === 'BANK' ? 'HIDE_TRANSFER BANK' : 'HIDE_' + s;
                      return !customLabels[hKey];
                    }).map((s, idx) => {
                      const icon = s === 'QRIS' ? 'fa-qrcode' : s === 'ATM' ? 'fa-credit-card' : s === 'DANA' ? 'fa-wallet' : s === 'GOPAY' ? 'fa-wallet' : 'fa-building-columns';
                      const isSelected = activeMode === 'TARIK' && selectedSumber === s;
                      return (
                        <button 
                          key={s}
                          data-autofocus={idx === 0 ? "true" : "false"}
                          onClick={() => {
                            setActiveMode('TARIK');
                            setSelectedSumber(s);
                            setIsKetAuto(true);
                            setIsAdminManuallyEdited(false);
                            setIsTema3SheetOpen(false);
                          }}
                          className={cn(
                            "group px-4 py-3.5 rounded-[16px] border transition-all text-left flex items-center gap-3.5 shadow-sm active:scale-95 outline-none focus:outline-none",
                            isSelected 
                              ? "bg-orange-500 border-orange-500 text-white" 
                              : "border-gray-100 bg-white hover:bg-orange-500 hover:border-orange-500 focus:bg-orange-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-200"
                          )}
                        >
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors", 
                            isSelected ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-600 group-hover:bg-white/20 group-hover:text-white group-focus:bg-white/20 group-focus:text-white"
                          )}>
                            <i className={cn("fa-solid text-lg", icon)}></i>
                          </div>
                          <span className={cn("text-[12px] font-black uppercase tracking-widest transition-colors", 
                            isSelected ? "text-white" : "text-slate-700 group-hover:text-white group-focus:text-white"
                          )}>{s === 'DANA' ? (customLabels['TARIK_DANA'] || 'DANA') : s === 'ATM' ? (customLabels['EDC / ATM'] || 'ATM') : (s === 'BANK' || s === 'TRANSFER') ? 'BANK' : (customLabels[s] || s)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>


            </div>
          </div>
        </div>
      )}
      {/* POPUP MELAYANG (CLASSIC THEME) */}
      {classicPopupMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[24px] p-5 w-full max-w-sm shadow-2xl animate-in zoom-in-95 border border-white">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-[13px] font-black text-[#0c1f44] uppercase tracking-widest flex items-center gap-2">
                  <div className="w-2 h-4 bg-[#0066ff] rounded-full"></div>
                  {classicPopupMode === 'AKSESORIS' ? 'Pilih Jenis Aksesoris' : 'Pilih Tujuan Transaksi'}
                </h3>
                <p className="text-[10px] font-bold text-slate-500 mt-1">
                  {classicPopupMode === 'BANK' && "Silakan pilih nama Bank tujuan"}
                  {classicPopupMode === 'DANA' && "Silakan pilih sub-tujuan E-Wallet / Dana"}
                  {classicPopupMode === 'ORDER_KUOTA' && "Pilih PPOB atau E-Wallet"}
                  {classicPopupMode === 'FLIP' && "Pilih tujuan transfer via Flip"}
                  {classicPopupMode === 'AKSESORIS' && "Silakan pilih sub-kategori aksesoris"}
                </p>
              </div>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => setIsEditingPopup(!isEditingPopup)} 
                  className={cn("w-8 h-8 rounded-full transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-sm", isEditingPopup ? "bg-amber-500 text-white ring-2 ring-amber-300" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
                  title={isEditingPopup ? "Selesai Edit" : "Ubah Fee / Kelola Pilihan"}
                >
                  <i className={cn("fa-solid text-[11px]", isEditingPopup ? "fa-check" : "fa-pen")}></i>
                </button>
                <button 
                  type="button"
                  onClick={() => { setClassicPopupMode(null); setIsEditingPopup(false); }} 
                  className="w-8 h-8 bg-slate-100 rounded-full text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                  title="Tutup"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto no-scrollbar pb-2 pt-1">
              {(() => {
                const list = popupLists[classicPopupMode] || [];

                if (list.length === 0) {
                  return (
                    <div className="col-span-4 flex flex-col items-center justify-center py-6 px-3 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-2">
                        <i className="fa-solid fa-plus text-base"></i>
                      </div>
                      <p className="text-[11px] font-black text-slate-700 uppercase tracking-wide">Belum Ada Sub Pilihan</p>
                      <p className="text-[9.5px] font-medium text-slate-400 mt-0.5 mb-3">Klik tombol di bawah untuk menambahkan pilihan baru</p>
                      <button
                        type="button"
                        onClick={handleAddNewPopupItem}
                        className="px-4 py-2 bg-[#0066ff] hover:bg-blue-700 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <i className="fa-solid fa-plus"></i> Tambah Pilihan Baru
                      </button>
                    </div>
                  );
                }

                return (
                  <>
                    {list.map(item => (
                      <div key={item.id || item.name} className="relative">
                        <button 
                          type="button"
                          onClick={() => {
                            if (isEditingPopup) {
                               if (classicPopupMode === 'AKSESORIS') {
                                 const newName = window.prompt(`Ubah nama aksesoris "${item.name}":`, item.name);
                                 if (newName && newName.trim()) {
                                   const trimmed = newName.trim().toUpperCase();
                                   const currentList = popupLists[classicPopupMode] || [];
                                   const newList = currentList.map((x: any) => (x.id === item.id || x.name === item.name) ? { ...x, id: trimmed, name: trimmed } : x);
                                   handleUpdatePopupList(classicPopupMode, newList);
                                 }
                                 return;
                               }

                               // Langsung atur fee saja, tanpa perlu ganti nama
                               const currentFee = (item.fee !== undefined && item.fee !== null) ? Number(item.fee) : 0;
                               const feeStr = window.prompt(
                                 `Atur Fee Aplikasi untuk "${item.name}":\n(Ketik angka biaya fee, atau isi 0 jika tanpa fee)`,
                                 currentFee.toString()
                               );
                               if (feeStr === null) return; // user klik Batal
                               const cleanDigits = feeStr.trim().replace(/[^0-9]/g, '');
                               const newFee = cleanDigits === '' ? 0 : parseInt(cleanDigits, 10);

                               const currentList = popupLists[classicPopupMode] || [];
                               const newList = currentList.map((x: any) => 
                                 (x.id === item.id || x.name === item.name) 
                                   ? { ...x, fee: newFee } 
                                   : x
                               );
                               handleUpdatePopupList(classicPopupMode, newList);
                               return;
                            }
                            // Cek apakah item adalah pilihan "LAINNYA" atau "TAGIHAN LAIN"
                            if (isLainnyaItem(item.name, item.id)) {
                              openCustomInputModal(classicPopupMode, item);
                              return;
                            }

                            setIsKetAuto(true);
                            if (classicPopupMode === 'AKSESORIS') {
                               setKeterangan(item.name);
                               setClassicPopupMode(null);
                               setTimeout(() => {
                                 nominalRef.current?.focus();
                                 nominalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                               }, 150);
                               return;
                            }
                            if (classicPopupMode === 'BANK') {
                               setSelectedBank(item.name);
                            } else {
                               setSelectedTujuan(item.name);
                               if ((classicPopupMode === 'ORDER_KUOTA' || classicPopupMode === 'FLIP' || classicPopupMode === 'DANA') && (item.fee !== undefined && item.fee !== null)) {
                                  setSelectedTujuanFee(Number(item.fee));
                               } else {
                                  setSelectedTujuanFee(0);
                               }
                            }
                            setKeterangan(''); // Keterangan manual dibiarkan bersih / kosong
                            setClassicPopupMode(null);
                            setTimeout(() => {
                              keteranganRef.current?.focus();
                              keteranganRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 150);
                          }} 
                          className={cn(
                            "w-full flex flex-col items-center justify-center p-2 border rounded-[14px] transition-all group shadow-sm bg-white cursor-pointer relative",
                            isEditingPopup 
                              ? "border-amber-300 hover:border-amber-500 hover:bg-amber-50/60 ring-1 ring-amber-200" 
                              : "border-slate-100 hover:border-blue-300 hover:bg-blue-50"
                          )}
                        >
                          <i className={cn("fa-solid text-[18px] mb-1.5 transition-transform group-hover:scale-110", item.color, item.icon)}></i>
                          <span className="text-[8px] font-black text-center text-slate-700 leading-tight uppercase tracking-wide">{item.name}</span>
                          {item.fee !== undefined && item.fee !== null && Number(item.fee) > 0 ? (
                            <span className="absolute top-1 left-1 bg-amber-100 text-amber-700 text-[7px] font-black px-1.5 py-0.5 rounded shadow-sm">
                              +{item.fee}
                            </span>
                          ) : isEditingPopup ? (
                            <span className="absolute top-1 left-1 bg-slate-100 text-slate-400 text-[7px] font-bold px-1 py-0.2 rounded">
                              +0
                            </span>
                          ) : null}
                        </button>
                        {isEditingPopup && (
                          <button 
                            type="button"
                            title={`Hapus ${item.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (window.confirm(`Hapus "${item.name}" dari daftar pilihan?`)) {
                                const currentList = popupLists[classicPopupMode] || [];
                                const newList = currentList.filter((x: any) => x.id !== item.id && x.name !== item.name);
                                handleUpdatePopupList(classicPopupMode, newList);
                              }
                            }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 hover:bg-rose-600 active:scale-90 text-white rounded-full flex items-center justify-center shadow-md border-2 border-white transition-all z-20 cursor-pointer"
                          >
                            <i className="fa-solid fa-xmark text-[9px]"></i>
                          </button>
                        )}
                      </div>
                    ))}
                    {isEditingPopup && (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleAddNewPopupItem();
                        }}
                        className="flex flex-col items-center justify-center p-2 border border-dashed border-slate-300 rounded-[14px] hover:border-blue-400 hover:bg-blue-50 transition-all text-slate-400 hover:text-blue-500 cursor-pointer active:scale-95"
                      >
                        <i className="fa-solid fa-plus text-[18px] mb-1.5"></i>
                        <span className="text-[8px] font-black text-center leading-tight uppercase tracking-wide">Tambah</span>
                      </button>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* POPUP KETERANGAN KHUSUS "LAINNYA" (AUTO FOCUS + QUICK CHIPS + ENTER JUMP TO NOMINAL) */}
      {customInputModal && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setCustomInputModal(null)}
        >
          <div 
            className="bg-white rounded-[24px] p-5 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-[13px] font-black text-[#0c1f44] uppercase tracking-wider flex items-center gap-2">
                  <div className="w-2 h-4 bg-[#0066ff] rounded-full"></div>
                  {customInputModal.title}
                </h3>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                  {customInputModal.subtitle}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setCustomInputModal(null)} 
                className="w-8 h-8 bg-slate-100 rounded-full text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                title="Batal / Tutup"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Input Form */}
            <div className="mb-3.5">
              <div className={cn(
                "relative flex items-center bg-slate-50 border-2 rounded-2xl px-3 py-2.5 transition-all shadow-inner",
                customInputError 
                  ? "border-rose-500 ring-2 ring-rose-200 bg-rose-50/30" 
                  : "border-blue-500 focus-within:ring-4 focus-within:ring-blue-100"
              )}>
                <i className="fa-solid fa-pen-to-square text-[#0066ff] text-sm mr-2 shrink-0"></i>
                <input
                  ref={customInputRef}
                  type="text"
                  value={customInputValue}
                  onChange={(e) => {
                    setCustomInputValue(e.target.value);
                    if (customInputError) setCustomInputError(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCustomInputSubmit(customInputValue);
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setCustomInputModal(null);
                    }
                  }}
                  placeholder={customInputModal.placeholder}
                  className="text-[13px] font-black text-slate-800 bg-transparent outline-none w-full placeholder:text-slate-400 uppercase tracking-wide"
                />
                {customInputValue && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomInputValue('');
                      customInputRef.current?.focus();
                    }}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <i className="fa-solid fa-circle-xmark text-xs"></i>
                  </button>
                )}
              </div>
              {customInputError && (
                <p className="text-[10px] font-bold text-rose-500 mt-1 flex items-center gap-1 animate-in fade-in">
                  <i className="fa-solid fa-triangle-exclamation"></i> Harap tulis keterangan atau klik pilihan cepat di bawah!
                </p>
              )}
            </div>

            {/* Quick Chips Section */}
            {customInputModal.chips.length > 0 && (
              <div className="mb-4">
                <div className="text-[9.5px] font-black uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                  <i className="fa-solid fa-bolt text-amber-500"></i>
                  <span>Pilihan Cepat (Klik 1x Langsung Selesai):</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto no-scrollbar">
                  {customInputModal.chips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleCustomInputSubmit(chip)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-[#0066ff] hover:text-white text-slate-700 font-extrabold text-[10px] uppercase tracking-wide transition-all active:scale-95 cursor-pointer border border-slate-200/80 hover:border-[#0066ff] shadow-xs hover:shadow-md hover:shadow-blue-500/20"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="button"
              onClick={() => handleCustomInputSubmit(customInputValue)}
              className="w-full py-2.5 bg-[#0066ff] hover:bg-blue-700 active:scale-98 text-white font-black text-[11px] uppercase tracking-wider rounded-xl shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Lanjut ke Nominal</span>
              <kbd className="bg-white/20 px-1.5 py-0.5 rounded text-[9px] font-mono">ENTER ↵</kbd>
            </button>
          </div>
        </div>
      )}

      {/* MODAL KUSTOMISASI LABEL TOMBOL (KHUSUS OWNER) */}
      {isEditLabelsModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="px-5 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <i className="fa-solid fa-pencil text-sm text-white"></i>
                </div>
                <div>
                  <h3 className="text-[13px] font-black uppercase tracking-wider">Kustomisasi Nama Tombol</h3>
                  <p className="text-[10px] text-amber-100 font-bold">Khusus Owner • Terapkan Online ke Seluruh HP Kasir</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditLabelsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all"
              >
                <i className="fa-solid fa-xmark text-xs"></i>
              </button>
            </div>

            {/* Body Modal */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1 custom-scrollbar text-left">
              {/* Grup 1: Mode Layanan Utama */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Baris 1: Mode Layanan Utama</h4>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Transfer (Default: Transfer)</label>
                    <input
                      type="text"
                      value={tempLabels['DIGITAL'] ?? ''}
                      onChange={(e) => setTempLabels(prev => ({ ...prev, 'DIGITAL': e.target.value }))}
                      placeholder="Transfer"
                      className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 bg-white focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Tarik Tunai (Default: Tarik Tunai)</label>
                    <input
                      type="text"
                      value={tempLabels['TARIK'] ?? ''}
                      onChange={(e) => setTempLabels(prev => ({ ...prev, 'TARIK': e.target.value }))}
                      placeholder="Tarik Tunai"
                      className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 bg-white focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Aksesoris (Default: Aksesoris)</label>
                    <input
                      type="text"
                      value={tempLabels['AKSESORIS'] ?? ''}
                      onChange={(e) => setTempLabels(prev => ({ ...prev, 'AKSESORIS': e.target.value }))}
                      placeholder="Aksesoris"
                      className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 bg-white focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Voucher (Default: Voucher)</label>
                    <input
                      type="text"
                      value={tempLabels['VOUCHER'] ?? ''}
                      onChange={(e) => setTempLabels(prev => ({ ...prev, 'VOUCHER': e.target.value }))}
                      placeholder="Voucher"
                      className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 bg-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Grup 2: Sub-Kategori Transfer */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Pilihan Sumber Transfer</h4>
                  </div>
                  <span className="text-[8.5px] text-slate-400 font-bold">Atur Nama & Sembunyikan Tombol</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { key: 'BANK', defaultName: 'Bank UOB', icon: 'fa-building-columns' },
                    { key: 'DANA', defaultName: 'DANA', icon: 'fa-wallet' },
                    { key: 'ORDER KUOTA', defaultName: 'Order Kuota', icon: 'fa-bolt' },
                    { key: 'FLIP', defaultName: 'Flip', icon: 'fa-arrow-right-arrow-left' }
                  ].map(({ key, defaultName, icon }) => {
                    const isHidden = !!tempLabels['HIDE_' + key];
                    return (
                      <div 
                        key={key} 
                        className={cn(
                          "p-2.5 rounded-xl border transition-all flex flex-col justify-between",
                          isHidden 
                            ? "bg-red-50/50 border-red-200" 
                            : "bg-white border-slate-200/80 shadow-xs"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <i className={cn("fa-solid text-[10px]", icon, isHidden ? "text-red-400" : "text-emerald-600")}></i>
                            <span className={cn(
                              "text-[9px] font-black uppercase tracking-wider truncate",
                              isHidden ? "text-red-500 line-through" : "text-slate-700"
                            )}>
                              {defaultName}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setTempLabels(prev => ({
                                ...prev,
                                ['HIDE_' + key]: !prev['HIDE_' + key]
                              }));
                            }}
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 shrink-0",
                              isHidden
                                ? "bg-red-500 text-white shadow-xs"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100"
                            )}
                            title={isHidden ? "Klik untuk Menampilkan tombol ini di kasir" : "Klik untuk Menyembunyikan tombol ini dari kasir"}
                          >
                            <i className={cn("fa-solid text-[7.5px]", isHidden ? "fa-eye-slash" : "fa-eye")}></i>
                            {isHidden ? "Sembunyi" : "Tampil"}
                          </button>
                        </div>
                        <input
                          type="text"
                          value={tempLabels[key] ?? ''}
                          onChange={(e) => setTempLabels(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder={defaultName}
                          disabled={isHidden}
                          className={cn(
                            "w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border outline-none transition-all",
                            isHidden
                              ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed italic"
                              : "bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500 text-slate-800"
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Grup 3: Sub-Kategori Tarik Tunai */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                    <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Pilihan Sumber Tarik Tunai</h4>
                  </div>
                  <span className="text-[8.5px] text-slate-400 font-bold">Atur Nama & Sembunyikan Tombol</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { key: 'EDC / ATM', defaultName: 'EDC/ATM', icon: 'fa-credit-card' },
                    { key: 'QRIS', defaultName: 'QRIS', icon: 'fa-qrcode' },
                    { key: 'TRANSFER BANK', defaultName: 'TRANSFER', icon: 'fa-building-columns' },
                    { key: 'TARIK_DANA', defaultName: 'DANA', icon: 'fa-wallet' },
                    { key: 'GOPAY', defaultName: 'GOPAY', icon: 'fa-wallet', colSpan: true }
                  ].map(({ key, defaultName, icon, colSpan }) => {
                    const isHidden = !!tempLabels['HIDE_' + key];
                    return (
                      <div 
                        key={key} 
                        className={cn(
                          "p-2.5 rounded-xl border transition-all flex flex-col justify-between",
                          colSpan && "col-span-2",
                          isHidden 
                            ? "bg-red-50/50 border-red-200" 
                            : "bg-white border-slate-200/80 shadow-xs"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <i className={cn("fa-solid text-[10px]", icon, isHidden ? "text-red-400" : "text-purple-600")}></i>
                            <span className={cn(
                              "text-[9px] font-black uppercase tracking-wider truncate",
                              isHidden ? "text-red-500 line-through" : "text-slate-700"
                            )}>
                              {defaultName}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setTempLabels(prev => ({
                                ...prev,
                                ['HIDE_' + key]: !prev['HIDE_' + key]
                              }));
                            }}
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 shrink-0",
                              isHidden
                                ? "bg-red-500 text-white shadow-xs"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100"
                            )}
                            title={isHidden ? "Klik untuk Menampilkan tombol ini di kasir" : "Klik untuk Menyembunyikan tombol ini dari kasir"}
                          >
                            <i className={cn("fa-solid text-[7.5px]", isHidden ? "fa-eye-slash" : "fa-eye")}></i>
                            {isHidden ? "Sembunyi" : "Tampil"}
                          </button>
                        </div>
                        <input
                          type="text"
                          value={tempLabels[key] ?? ''}
                          onChange={(e) => setTempLabels(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder={defaultName}
                          disabled={isHidden}
                          className={cn(
                            "w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border outline-none transition-all",
                            isHidden
                              ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed italic"
                              : "bg-slate-50 border-slate-200 focus:bg-white focus:border-purple-500 text-slate-800"
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleResetCustomLabels}
                className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-[10px] font-black uppercase tracking-wider transition-all"
              >
                <i className="fa-solid fa-rotate-left mr-1"></i> Reset Default
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditLabelsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSavingLabels}
                  onClick={handleSaveCustomLabels}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-[10px] font-black uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5"
                >
                  {isSavingLabels ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin"></i> Menyimpan...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check"></i> Simpan & Terapkan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>

  )
}

export default TransactionForm
