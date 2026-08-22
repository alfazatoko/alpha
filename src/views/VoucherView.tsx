import React, { useState, useEffect } from 'react';
import VoucherApp from './voucher-app/App';
import { supabase } from '../lib/supabase';

interface VoucherViewProps {
  active: boolean
  isPc: boolean
  setActiveView: (view: string) => void
  showToast: (msg: string) => void
  onConfirm: (title: string, message: string, onConfirm: () => void) => void
  activeStoreId: string
  kasirRole: string
  kasirName?: string
  googleUid?: string
  currentUsername?: string
  kasirList?: Record<string, { name?: string; role?: string; pin?: string }>
  externalSearchQuery?: string
  externalTab?: string
  onClearExternalTab?: () => void
  onClearExternalSearchQuery?: () => void
}

export const VoucherView: React.FC<VoucherViewProps> = (props) => {
  // Fetch all stores owned by this user for "Salin ke Toko Lain" feature
  const [storeList, setStoreList] = useState<Array<{ id: string; name: string; subtext?: string }>>([]);

  useEffect(() => {
    if (!props.googleUid) return;
    supabase
      .from('stores')
      .select('id, name, subtext')
      .eq('user_id', props.googleUid)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setStoreList(data);
      });
  }, [props.googleUid]);

  return (
    <div className={`w-full h-full relative overflow-hidden bg-slate-50 dark:bg-[#07021a] ${props.active ? 'block' : 'hidden'}`}>
      {/* Render aplikasi stok voucher yang didownload secara seamless */}
      <VoucherApp 
        onExit={() => props.setActiveView('view-beranda')} 
        externalRole={props.kasirRole === 'owner' ? 'owner' : 'kasir'} 
        externalCashierName={props.kasirName} 
        activeStoreId={props.activeStoreId}
        googleUid={props.googleUid}
        kasirList={props.kasirList}
        externalSearchQuery={props.externalSearchQuery}
        externalTab={props.externalTab}
        onClearExternalTab={props.onClearExternalTab}
        onClearExternalSearchQuery={props.onClearExternalSearchQuery}
        storeList={storeList}
      />
    </div>
  )
}

export default VoucherView;
