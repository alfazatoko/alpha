import React from 'react';
import { ArrowLeft } from 'lucide-react';
import VoucherApp from './voucher-app/App';

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
}

export const VoucherView: React.FC<VoucherViewProps> = (props) => {
  // if (!props.active) return null; // Removed to prevent unmount and allow background saving

  return (
    <div className={`w-full h-full relative overflow-hidden bg-slate-50 dark:bg-[#07021a] ${props.active ? 'block' : 'hidden'}`}>
      {/* Render aplikasi stok voucher yang didownload secara seamless */}
      <VoucherApp 
        onExit={() => props.setActiveView('view-beranda')} 
        externalRole={props.kasirRole === 'owner' ? 'owner' : 'kasir'} 
        externalCashierName={props.kasirName} 
        activeStoreId={props.activeStoreId}
        googleUid={props.googleUid}
      />
    </div>
  )
}

export default VoucherView;
