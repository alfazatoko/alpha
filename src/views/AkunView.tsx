import React, { useState, useEffect } from 'react'
import { cn, compressImage } from '../lib/utils'

interface AkunViewProps {
  active: boolean
  isPc?: boolean
  kasirName?: string
  kasirRole?: string
  onLogout?: () => void
  onRequestLogout?: () => void
  runningTexts?: string[]
  mainAnnouncement?: string
  onSaveRunningTexts?: (texts: string[]) => void
  onSaveMainAnnouncement?: (text: string) => void
  storeName?: string
  storeSubtext?: string
  storePhoto?: string
  onSaveStoreName?: (v: string) => void
  onSaveStoreSubtext?: (v: string) => void
  onSaveStorePhoto?: (v: string) => void
  setActiveView?: (v: string) => void
  setIsSidePanelOpen?: (v: boolean) => void
  googleEmail?: string
  googleUid?: string
  onUploadToCloud?: () => Promise<void>
  onDownloadFromCloud?: (silent?: boolean) => Promise<void>
  onConfirm?: (title: string, message: string, onConfirm: () => void) => void
  currentUsername?: string
  kasirList?: Record<string, any>
  onSaveCashierSelf?: (username: string, updatedAccount: { name: string, pin: string, alamat?: string, tempatLahir?: string, tanggalLahir?: string, avatar?: string, [key: string]: any }) => Promise<void>
  activeStoreId?: string | 'all'
  transactions?: any[]
  forceTab?: string
  absensiList?: any[]
}

function calculateTenure(joinDateStr: string) {
  if (!joinDateStr) return null;
  const joinDate = new Date(joinDateStr);
  const today = new Date();
  
  if (isNaN(joinDate.getTime())) return null;

  let months = (today.getFullYear() - joinDate.getFullYear()) * 12;
  months -= joinDate.getMonth();
  months += today.getMonth();

  let days = today.getDate() - joinDate.getDate();
  if (days < 0) {
    months--;
    const tempDate = new Date(today.getFullYear(), today.getMonth(), 0);
    days += tempDate.getDate();
  }

  return { months, days, totalMonths: months };
}

function calculateAttendanceStats(username: string, cashierName: string, joinDateStr: string, absensiList: any[], activeStoreId: string) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed
  const todayDate = today.getDate();

  // Read izin list from localStorage
  let izinList: any[] = [];
  try {
    const saved = localStorage.getItem(`alphaPro_${activeStoreId}_catatanIzin`);
    if (saved) {
      izinList = JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to parse izin', e);
  }

  let hadir = 0;
  let izin = 0;
  let tidakAbsen = 0;

  // Loop from day 1 to todayDate of the current month
  for (let day = 1; day <= todayDate; day++) {
    const date = new Date(currentYear, currentMonth, day);
    const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD

    // If they joined after this date, skip
    if (joinDateStr) {
      const joinDate = new Date(joinDateStr);
      joinDate.setHours(0,0,0,0);
      const testDate = new Date(date);
      testDate.setHours(0,0,0,0);
      if (testDate < joinDate) {
        continue;
      }
    }

    // Check check-in
    const hasAbsen = (absensiList || []).some(
      a => a.username === username && a.tanggal === dateStr && a.waktu_masuk
    );

    if (hasAbsen) {
      hadir++;
    } else {
      // Check if they had izin
      const hasIzin = izinList.some(
        iz => (iz.nama === username || iz.nama === cashierName) && iz.tanggal === dateStr
      );

      if (hasIzin) {
        izin++;
      } else {
        tidakAbsen++;
      }
    }
  }

  return { hadir, izin, tidakAbsen };
}

const AkunView: React.FC<AkunViewProps> = (props) => {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const dayName = currentTime.toLocaleDateString('id-ID', { weekday: 'long' })
  const fullDate = currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const clockStr = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const [activeTab, setActiveTab] = useState(props.kasirRole === 'owner' ? 'profil' : 'kasirSelf')
  const [openCategory, setOpenCategory] = useState<string | null>(null)

  useEffect(() => {
    if (props.forceTab) {
      setActiveTab(props.forceTab)
      setOpenCategory(props.forceTab)
    } else {
      setActiveTab(props.kasirRole === 'owner' ? 'profil' : 'kasirSelf')
    }
  }, [props.kasirRole, props.forceTab])

  const getTabColorClasses = (color: string, isActive: boolean) => {
    if (isActive) return "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md"
    switch (color) {
      case 'emerald': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
      case 'blue': return 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400'
      case 'orange': return 'bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400'
      case 'indigo': return 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400'
      case 'red': return 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400'
      case 'purple': return 'bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400'
      default: return 'bg-slate-50 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400'
    }
  }

  const storageKeyPin = props.activeStoreId && props.activeStoreId !== 'all' ? `alphaPro_${props.activeStoreId}_isPinEnabled` : 'alphaPro_isPinEnabled'
  const storageKeyFilter = props.activeStoreId && props.activeStoreId !== 'all' ? `alphaPro_${props.activeStoreId}_showKasirFilter` : 'alphaPro_showKasirFilter'

  const [isPinEnabled, setIsPinEnabled] = useState(localStorage.getItem(storageKeyPin) !== 'false')

  useEffect(() => {
    setIsPinEnabled(localStorage.getItem(storageKeyPin) !== 'false')
  }, [storageKeyPin])

  // removed duplicated openCategory
  const [savedStatus, setSavedStatus] = useState(false)
  const [isCloudLoading, setIsCloudLoading] = useState(false)

  // State for cashier self-edit
  const [editKasirName, setEditKasirName] = useState('')
  const [editKasirPin, setEditKasirPin] = useState('')
  const [editKasirAlamat, setEditKasirAlamat] = useState('')
  const [editKasirTempatLahir, setEditKasirTempatLahir] = useState('')
  const [editKasirTanggalLahir, setEditKasirTanggalLahir] = useState('')
  const [editKasirAvatar, setEditKasirAvatar] = useState('')
  const [showKasirPin, setShowKasirPin] = useState(false)

  // State untuk Zoom, Drag & Crop Avatar
  const [showAvatarEditor, setShowAvatarEditor] = useState(false)
  const [avatarEditorSrc, setAvatarEditorSrc] = useState('')
  const [editorZoom, setEditorZoom] = useState(1)
  const [editorOffset, setEditorOffset] = useState({ x: 0, y: 0 })
  const [isDraggingEditor, setIsDraggingEditor] = useState(false)
  const [dragStartEditor, setDragStartEditor] = useState({ x: 0, y: 0 })

  // State untuk perbesar avatar karyawan di sisi Owner
  const [showKaryawanAvatarZoom, setShowKaryawanAvatarZoom] = useState(false)
  const [karyawanAvatarZoomSrc, setKaryawanAvatarZoomSrc] = useState('')

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDraggingEditor(true)
    setDragStartEditor({ x: e.clientX - editorOffset.x, y: e.clientY - editorOffset.y })
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingEditor) return
    const newX = e.clientX - dragStartEditor.x
    const newY = e.clientY - dragStartEditor.y
    setEditorOffset({ x: newX, y: newY })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDraggingEditor(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch (err) {}
  }

  const handleSaveCroppedImage = () => {
    if (!avatarEditorSrc) return
    const img = new Image()
    img.src = avatarEditorSrc
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = 400
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, 400, 400)
        ctx.beginPath()
        ctx.arc(200, 200, 200, 0, Math.PI * 2)
        ctx.clip()

        // Wadah preview adalah 256x256. Kita konversi ke canvas 400x400
        const scaleFactor = 400 / 256
        // Tarik gambar dengan transform zoom & offset
        // Center dari canvas adalah 200, 200. Center dari preview adalah 128, 128
        const cx = 200 + (editorOffset.x * scaleFactor)
        const cy = 200 + (editorOffset.y * scaleFactor)
        const size = 400 * editorZoom
        
        ctx.drawImage(img, cx - size/2, cy - size/2, size, size)
        
        const base64 = canvas.toDataURL('image/jpeg', 0.85)
        setEditKasirAvatar(base64)
        setShowAvatarEditor(false)
      }
    }
  }

  // State for owner managing karyawans
  const [showProfilPanel, setShowProfilPanel] = useState(false)
  const [selectedKaryawan, setSelectedKaryawan] = useState<string | null>(null)
  const [editKaryawanGaji, setEditKaryawanGaji] = useState('')
  const [editKaryawanJoin, setEditKaryawanJoin] = useState('')
  const [editKaryawanOff, setEditKaryawanOff] = useState('')
  const [editKaryawanCatatan, setEditKaryawanCatatan] = useState('')
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [isEditingJoinDate, setIsEditingJoinDate] = useState(false)
  const [paymentType, setPaymentType] = useState<'gaji' | 'bonus'>('gaji')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')



  // State untuk edit PIN Owner
  const [ownerPinOld, setOwnerPinOld] = useState('')
  const [ownerPinNew, setOwnerPinNew] = useState('')
  const [ownerPinConfirm, setOwnerPinConfirm] = useState('')
  const [showOwnerPin, setShowOwnerPin] = useState(false)

  // States for Native Bluetooth via Capacitor
  const [btConnected, setBtConnected] = useState(false);
  const [btConnecting, setBtConnecting] = useState(false);
  const [pairedDevices, setPairedDevices] = useState<any[]>([]);
  const [btMacAddress, setBtMacAddress] = useState<string | null>(localStorage.getItem('bluetooth_printer_mac'));
  const [isScanningBt, setIsScanningBt] = useState(false);

  useEffect(() => {
    if (btMacAddress && (window as any).bluetoothSerial) {
      (window as any).bluetoothSerial.isConnected(
        () => setBtConnected(true),
        () => setBtConnected(false)
      );
    } else if (btMacAddress && localStorage.getItem('use_web_bluetooth')) {
      setBtConnected(true);
    }
  }, [btMacAddress]);

  const requestBluetoothPermissions = (callback: () => void, errorCallback: (err: string) => void) => {
    const permissions = (window as any).cordova?.plugins?.permissions;
    if (!permissions) {
      callback();
      return;
    }
    const permsToRequest = [
      permissions.BLUETOOTH_CONNECT || "android.permission.BLUETOOTH_CONNECT",
      permissions.BLUETOOTH_SCAN || "android.permission.BLUETOOTH_SCAN",
      permissions.ACCESS_FINE_LOCATION || "android.permission.ACCESS_FINE_LOCATION",
      permissions.ACCESS_COARSE_LOCATION || "android.permission.ACCESS_COARSE_LOCATION"
    ];

    permissions.requestPermissions(permsToRequest, (status: any) => {
      callback();
    }, () => callback());
  };

  const scanBluetoothDevices = async () => {
    if ((window as any).bluetoothSerial) {
      setIsScanningBt(true);
      requestBluetoothPermissions(() => {
        (window as any).bluetoothSerial.list(
          (devices: any[]) => {
            setPairedDevices(devices);
            setIsScanningBt(false);
          },
          (error: any) => {
            alert('Gagal mengambil daftar Bluetooth: ' + error);
            setIsScanningBt(false);
          }
        );
      }, (err) => {
        alert(err);
        setIsScanningBt(false);
      });
    } else if ((navigator as any).bluetooth) {
      try {
        setIsScanningBt(true);
        const device = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [
            '000018f0-0000-1000-8000-00805f9b34fb',
            'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
            '49535343-fe7d-4ae5-8fa9-9fafd205e455'
          ]
        });
        
        setBtConnected(true);
        setBtMacAddress(device.name || device.id || 'Web Bluetooth Printer');
        localStorage.setItem('bluetooth_printer_mac', device.name || device.id || 'web_bt_printer');
        localStorage.setItem('use_web_bluetooth', 'true');
        alert('Printer ' + (device.name || '') + ' berhasil dipilih!');
      } catch (error: any) {
        alert('Gagal memilih printer: ' + error.message);
      } finally {
        setIsScanningBt(false);
      }
    } else {
      alert('Bluetooth tidak didukung di perangkat atau browser ini.');
    }
  };

  const connectToBluetooth = (macAddress: string) => {
    setBtConnecting(true);
    (window as any).bluetoothSerial.connect(
      macAddress,
      () => {
        setBtConnected(true);
        setBtConnecting(false);
        setBtMacAddress(macAddress);
        localStorage.setItem('bluetooth_printer_mac', macAddress);
        alert('Printer berhasil terhubung!');
      },
      (error: any) => {
        (window as any).bluetoothSerial.connectInsecure(
          macAddress,
          () => {
            setBtConnected(true);
            setBtConnecting(false);
            setBtMacAddress(macAddress);
            localStorage.setItem('bluetooth_printer_mac', macAddress);
            alert('Printer berhasil terhubung (Mode Insecure)!');
          },
          (err2: any) => {
            setBtConnected(false);
            setBtConnecting(false);
            alert(`Gagal terhubung ke printer:\nNormal: ${error}\nInsecure: ${err2}`);
          }
        );
      }
    );
  };

  const disconnectBluetooth = () => {
    if ((window as any).bluetoothSerial) {
      (window as any).bluetoothSerial.disconnect(() => {
        setBtConnected(false);
        setBtMacAddress(null);
        localStorage.removeItem('bluetooth_printer_mac');
      });
    } else {
      setBtConnected(false);
      setBtMacAddress(null);
      localStorage.removeItem('bluetooth_printer_mac');
      localStorage.removeItem('use_web_bluetooth');
    }
  };


  useEffect(() => {
    if (props.currentUsername && props.kasirList && props.kasirList[props.currentUsername]) {
      const data = props.kasirList[props.currentUsername];
      setEditKasirName(data.name || '')
      setEditKasirPin(data.pin || '')
      setEditKasirAlamat(data.alamat || '')
      setEditKasirTempatLahir(data.tempatLahir || '')
      setEditKasirTanggalLahir(data.tanggalLahir || '')
      setEditKasirAvatar(data.avatar || '')
    }
  }, [props.currentUsername, props.kasirList])

  // State for local smooth typing in Store Profile
  const [localStoreName, setLocalStoreName] = useState(props.storeName || '')
  const [localStoreSubtext, setLocalStoreSubtext] = useState(props.storeSubtext || '')

  useEffect(() => {
    setLocalStoreName(props.storeName || '')
  }, [props.storeName])

  useEffect(() => {
    setLocalStoreSubtext(props.storeSubtext || '')
  }, [props.storeSubtext])

  // State for local smooth typing in Promo Settings
  const [localMainAnnouncement, setLocalMainAnnouncement] = useState(props.mainAnnouncement || '')
  const [localRunningTextsText, setLocalRunningTextsText] = useState(() => {
    const texts = Array.isArray(props.runningTexts) ? props.runningTexts : Array(15).fill('')
    return texts.filter(t => t.trim() !== '').join('\n')
  })

  useEffect(() => {
    setLocalMainAnnouncement(props.mainAnnouncement || '')
  }, [props.mainAnnouncement])

  useEffect(() => {
    const texts = Array.isArray(props.runningTexts) ? props.runningTexts : Array(15).fill('')
    setLocalRunningTextsText(texts.filter(t => t.trim() !== '').join('\n'))
  }, [props.runningTexts])

  const handleUploadToCloud = async () => {
    if (!props.onUploadToCloud) return
    setIsCloudLoading(true)
    await props.onUploadToCloud()
    setIsCloudLoading(false)
  }

  const handleDownloadFromCloud = async () => {
    if (!props.onDownloadFromCloud) return

    if (props.onConfirm) {
      props.onConfirm(
        "DOWNLOAD DARI CLOUD",
        "Pengaturan lokal HP ini (Kasir, PIN, dll) akan DITIMPA oleh data dari Cloud. Lanjutkan?",
        async () => {
          setIsCloudLoading(true)
          await props.onDownloadFromCloud?.(false)
          setIsCloudLoading(false)
        }
      )
    } else {
      if (!confirm('PERINGATAN!\nPengaturan lokal HP ini (Kasir, PIN, dll) akan DITIMPA oleh data dari Cloud. Lanjutkan?')) return
      setIsCloudLoading(true)
      await props.onDownloadFromCloud(false)
      setIsCloudLoading(false)
    }
  }

  const handleSyncAll = async () => {
    if (!props.onUploadToCloud || !props.onDownloadFromCloud) return
    setIsCloudLoading(true)
    await props.onUploadToCloud()
    await props.onDownloadFromCloud(true)
    setIsCloudLoading(false)
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const compressedBase64 = await compressImage(file)
        props.onSaveStorePhoto?.(compressedBase64)
      } catch (err) {
        console.error("Compression failed", err)
        // Fallback to original if compression fails (though unlikely)
        const reader = new FileReader()
        reader.onloadend = () => {
          props.onSaveStorePhoto?.(reader.result as string)
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const togglePin = () => {
    const newValue = !isPinEnabled
    setIsPinEnabled(newValue)
    localStorage.setItem(storageKeyPin, newValue.toString())
  }

  const handleExportData = () => {
    const data = {
      transactions: props.kasirRole === 'owner' ? props.transactions : 'access_denied',
      settings: {
        storeName: props.storeName,
        storeSubtext: props.storeSubtext,
        runningTexts: props.runningTexts,
        mainAnnouncement: props.mainAnnouncement,
        isPinEnabled
      },
      exportDate: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ALPHA_BACKUP_${new Date().getTime()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCSV = () => {
    if (props.kasirRole !== 'owner') return alert("Akses ditolak");

    const txs = props.transactions || [];
    if (txs.length === 0) return alert("Belum ada data transaksi");

    // Create CSV header
    const headers = ["ID Transaksi", "Tanggal", "Waktu", "Kasir", "Kategori", "Keterangan", "Nominal (Rp)", "Admin/Fee (Rp)", "Tipe"];

    // Format rows
    const rows = txs.map((t: any) => {
      const date = new Date(t.timestamp);
      const tanggal = date.toLocaleDateString('id-ID');
      const waktu = date.toLocaleTimeString('id-ID');

      return [
        t.id,
        tanggal,
        waktu,
        t.kasirName || t.kasir_id || '-',
        t.kategori || '-',
        (t.keterangan || '-').replace(/,/g, ' '),
        t.nominal || 0,
        t.adminFee || 0,
        t.type || '-'
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ALFAZA_TRANSAKSI_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const handleResetSystem = () => {
    if (props.onConfirm) {
      props.onConfirm(
        "RESET SISTEM",
        "Semua data lokal (PIN, Nama Toko, Slogan) akan dikembalikan ke awal. Anda yakin ingin melanjutkan reset?",
        () => {
          localStorage.clear()
          window.location.reload()
        }
      )
    } else {
      if (confirm('PERINGATAN KRITIKAL!\n\nSemua data lokal (PIN, Nama Toko, Slogan) akan dikembalikan ke awal.\n\nLanjutkan reset?')) {
        localStorage.clear()
        window.location.reload()
      }
    }
  }

  if (props.isPc) {
    const tabs = props.kasirRole === 'owner' ? [
      { id: 'profil', label: 'Profil Toko', icon: 'fa-user-pen', color: 'emerald' },
      { id: 'keamanan', label: 'Keamanan & Akses', icon: 'fa-shield-halved', color: 'blue' },
      { id: 'karyawan', label: 'Manajemen Kasir & SDM', icon: 'fa-users-gear', color: 'indigo' },
      { id: 'promo', label: 'Tampilan & Promo', icon: 'fa-bullhorn', color: 'orange' },
      { id: 'pantau', label: 'Pantau Dashboard', icon: 'fa-eye', color: 'indigo' },
      { id: 'printer', label: 'Printer & Hardware', icon: 'fa-print', color: 'slate' },
      { id: 'backup', label: 'Backup & Reset', icon: 'fa-cloud-arrow-down', color: 'red' },
      { id: 'cloud', label: 'Sinkronisasi Cloud', icon: 'fa-cloud', color: 'purple' },
    ] : [
      { id: 'kasirSelf', label: 'PIN & Nama Kasir', icon: 'fa-user-lock', color: 'indigo' },
      { id: 'printer', label: 'Printer & Hardware', icon: 'fa-print', color: 'slate' },
      { id: 'cloud', label: 'Sinkronisasi Cloud', icon: 'fa-cloud', color: 'purple' },
    ]

    return (
      <div className={cn("flex-1 h-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden", props.active ? "flex" : "hidden")}>
        {/* Top Header/Breadcrumb */}
        <div className="flex items-center justify-between px-8 py-6 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 shadow-sm flex-shrink-0">
          <div>
            <h1 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-wide uppercase">Pengaturan Akun</h1>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">Kelola profil, keamanan, promosi, dan sinkronisasi data cloud</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSavedStatus(true);
                setTimeout(() => setSavedStatus(false), 2000);
              }}
              className={cn(
                "px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-md",
                savedStatus
                  ? "bg-emerald-600 text-white scale-[0.98]"
                  : "bg-slate-950 dark:bg-slate-700 text-white hover:bg-slate-900 dark:hover:bg-slate-600 active:scale-95"
              )}
              style={{ color: '#ffffff' }}
            >
              {savedStatus ? (
                <>
                  <i className="fa-solid fa-circle-check animate-bounce"></i>
                  Berhasil Disimpan
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk text-slate-400"></i>
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dual Pane Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Tabs Sidebar */}
          <div className="w-80 bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700 flex flex-col p-5 gap-2 overflow-y-auto shrink-0">
            <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2 mb-1">Kategori Pengaturan</p>
            {tabs.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all font-black text-xs uppercase tracking-wider text-left border",
                    isActive
                      ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-950 dark:border-white shadow-lg"
                      : "bg-white text-slate-700 border-slate-100 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/50 dark:hover:bg-slate-700/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0",
                      getTabColorClasses(tab.color, isActive)
                    )}>
                      <i className={cn("fa-solid text-xs", tab.icon)}></i>
                    </div>
                    <span>{tab.label}</span>
                  </div>
                  <i className="fa-solid fa-chevron-right text-[10px] opacity-30"></i>
                </button>
              )
            })}

            <div className="h-px bg-slate-100 dark:bg-slate-700 my-4" />

            <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2 mb-1">Akses Tambahan</p>

            {/* Teks Otomatis */}
            <button
              onClick={() => props.setActiveView?.('view-otomatis')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700/50 transition-all font-black text-xs uppercase tracking-wider text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 shrink-0">
                  <i className="fa-solid fa-bolt text-xs"></i>
                </div>
                <span>Teks Otomatis</span>
              </div>
              <i className="fa-solid fa-chevron-right text-[10px] opacity-30"></i>
            </button>

            {/* Keluar Aplikasi */}
            <button
              onClick={() => props.onRequestLogout?.()}
              className="w-full mt-auto flex items-center gap-3 p-4 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/10 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 transition-all font-black text-xs uppercase tracking-wider text-left"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 shrink-0">
                <i className="fa-solid fa-right-from-bracket"></i>
              </div>
              <span>Keluar Aplikasi</span>
            </button>
          </div>

          {/* Tab Content Panel */}
          <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-900 scrollbar-thin flex flex-col items-center">
            <div className="w-full max-w-4xl flex flex-col gap-6">
              {activeTab === 'profil' && props.kasirRole === 'owner' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {props.activeStoreId === 'all' && (
                    <div className="p-4 bg-amber-50 text-amber-800 rounded-2xl border border-amber-200 text-xs font-bold text-center uppercase tracking-widest">
                      <i className="fa-solid fa-circle-info mr-2"></i> Mode Pusat Monitoring. Pilih toko spesifik untuk mengedit profil toko.
                    </div>
                  )}
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-1">Identitas Konter / Agen</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-6 font-bold uppercase">Sesuaikan logo, nama toko, dan slogan utama yang tampil pada dashboard kasir dan nota cetak</p>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                      {/* Logo Toko */}
                      <div className="flex flex-col items-center gap-4 p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div className="relative group cursor-pointer" onClick={() => document.getElementById('photoInputPC')?.click()}>
                          {props.storePhoto ? (
                            <img src={props.storePhoto} alt="Store" className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-md transition-transform group-hover:scale-105" />
                          ) : (
                            <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 border-4 border-white dark:border-slate-800 shadow-md">
                              <i className="fa-solid fa-camera text-3xl"></i>
                            </div>
                          )}
                          <div className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-600 text-white rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center shadow-lg">
                            <i className="fa-solid fa-plus text-xs"></i>
                          </div>
                          <input id="photoInputPC" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                        </div>
                        <div className="text-center">
                          <h4 className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">Logo Toko</h4>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1">Format JPG/PNG, Max 2MB</p>
                        </div>
                      </div>

                      {/* Inputs */}
                      <div className="lg:col-span-2 space-y-4">
                        <div>
                          <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2 ml-1">Nama Toko / Bisnis</label>
                          <input
                            type="text"
                            value={localStoreName}
                            onChange={(e) => setLocalStoreName(e.target.value)}
                            onBlur={() => {
                              if (localStoreName !== props.storeName) {
                                props.onSaveStoreName?.(localStoreName)
                              }
                            }}
                            placeholder="Contoh: ALFAZA CELL"
                            disabled={props.activeStoreId === 'all'}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 outline-none transition-all"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2 ml-1">Sub-Teks / Slogan Pembukuan</label>
                          <input
                            type="text"
                            value={localStoreSubtext}
                            onChange={(e) => setLocalStoreSubtext(e.target.value)}
                            onBlur={() => {
                              if (localStoreSubtext !== props.storeSubtext) {
                                props.onSaveStoreSubtext?.(localStoreSubtext)
                              }
                            }}
                            placeholder="Contoh: Pembukuan Agen Brilink & Konter"
                            disabled={props.activeStoreId === 'all'}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Admin Account details info */}
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <i className="fa-brands fa-google text-lg"></i>
                    </div>
                    <div>
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Akun Cloud Terhubung</h4>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5">{props.googleEmail || 'Tidak terhubung'}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'keamanan' && props.kasirRole === 'owner' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {props.activeStoreId === 'all' && (
                    <div className="p-4 bg-amber-50 text-amber-800 rounded-2xl border border-amber-200 text-xs font-bold text-center uppercase tracking-widest">
                      <i className="fa-solid fa-circle-info mr-2"></i> Pilih toko spesifik untuk mengedit keamanan toko.
                    </div>
                  )}
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-1">Keamanan Aplikasi</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-6 font-bold uppercase">Kelola tingkat keamanan akses masuk kasir & owner</p>

                    <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-slate-700">
                          <i className="fa-solid fa-key text-sm"></i>
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">Gunakan PIN Keamanan Masuk</h4>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">Wajibkan Kasir & Owner memasukkan PIN saat membuka aplikasi</p>
                        </div>
                      </div>
                      <button
                        onClick={() => props.activeStoreId !== 'all' && togglePin()}
                        className={cn(
                          "w-14 h-8 rounded-full p-1 transition-all duration-300 relative",
                          isPinEnabled ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300",
                          isPinEnabled ? "translate-x-6" : "translate-x-0"
                        )}></div>
                      </button>
                    </div>

                    <div className="mt-6 p-5 bg-blue-50/30 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-950/30 rounded-2xl text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed font-semibold">
                      <i className="fa-solid fa-circle-info mr-2"></i>
                      Apabila PIN diaktifkan, pastikan setiap akun kasir telah dikonfigurasi dengan PIN masing-masing di tab Kasir atau menu absensi. PIN bawaan default untuk kasir baru adalah <strong className="text-blue-900 dark:text-blue-200">1234</strong>.
                    </div>
                  </div>

                  {/* Card Edit PIN Owner */}
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <i className="fa-solid fa-user-shield text-sm"></i>
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Ganti PIN Owner</h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Ubah PIN masuk khusus akun Owner</p>
                      </div>
                    </div>

                    <div className="space-y-4 mt-6">
                      <div>
                        <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2 ml-1">PIN Lama</label>
                        <div className="relative">
                          <input
                            type={showOwnerPin ? 'text' : 'password'}
                            inputMode="numeric"
                            maxLength={8}
                            value={ownerPinOld}
                            onChange={e => setOwnerPinOld(e.target.value.replace(/\D/g, ''))}
                            placeholder="Masukkan PIN lama"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 tracking-widest"
                          />
                          <button type="button" onClick={() => setShowOwnerPin(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                            <i className={showOwnerPin ? 'fa-solid fa-eye-slash text-sm' : 'fa-solid fa-eye text-sm'}></i>
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2 ml-1">PIN Baru (min. 4 digit)</label>
                        <input
                          type={showOwnerPin ? 'text' : 'password'}
                          inputMode="numeric"
                          maxLength={8}
                          value={ownerPinNew}
                          onChange={e => setOwnerPinNew(e.target.value.replace(/\D/g, ''))}
                          placeholder="Masukkan PIN baru"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 tracking-widest"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2 ml-1">Konfirmasi PIN Baru</label>
                        <input
                          type={showOwnerPin ? 'text' : 'password'}
                          inputMode="numeric"
                          maxLength={8}
                          value={ownerPinConfirm}
                          onChange={e => setOwnerPinConfirm(e.target.value.replace(/\D/g, ''))}
                          placeholder="Ulangi PIN baru"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 tracking-widest"
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (!ownerPinNew || ownerPinNew.length < 4) return alert('PIN baru minimal 4 digit!');
                          if (ownerPinNew !== ownerPinConfirm) return alert('Konfirmasi PIN tidak cocok!');
                          // Verifikasi PIN lama dari kasirList
                          const ownerAcc = props.kasirList?.['owner']
                          if (ownerAcc && ownerAcc.pin && ownerAcc.pin !== ownerPinOld) return alert('PIN lama tidak sesuai!');
                          // Simpan PIN baru
                          if (props.onSaveCashierSelf) {
                            props.onSaveCashierSelf('owner', { name: 'Owner', pin: ownerPinNew })
                              .then(() => {
                                setSavedStatus(true);
                                setTimeout(() => setSavedStatus(false), 2000);
                                setOwnerPinOld(''); setOwnerPinNew(''); setOwnerPinConfirm('');
                              })
                              .catch((err: any) => alert(err.message || 'Gagal menyimpan PIN'));
                          }
                        }}
                        disabled={props.activeStoreId === 'all'}
                        className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 mt-2"
                        style={{ color: '#ffffff' }}
                      >
                        <i className="fa-solid fa-shield-halved"></i>
                        Simpan PIN Owner Baru
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'karyawan' && props.kasirRole === 'owner' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {props.activeStoreId === 'all' && (
                    <div className="p-4 bg-amber-50 text-amber-800 rounded-2xl border border-amber-200 text-xs font-bold text-center uppercase tracking-widest">
                      <i className="fa-solid fa-circle-info mr-2"></i> Pilih toko spesifik untuk mengelola karyawan.
                    </div>
                  )}
                  {props.activeStoreId !== 'all' && (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm min-h-[500px] flex gap-8">
                      {/* Left: Karyawan List */}
                      <div className="w-1/3 border-r border-slate-100 dark:border-slate-700 pr-6 overflow-y-auto">
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-4">Daftar Karyawan</h3>
                        <div className="space-y-3">
                          {Object.entries(props.kasirList || {}).filter(([kId]) => kId !== 'owner').map(([kId, kData]) => (
                            <button
                              key={kId}
                              onClick={() => {
                                setSelectedKaryawan(kId);
                                setIsEditingJoinDate(false);
                                setEditKaryawanGaji(String(kData.gajiPokok || ''));
                                setEditKaryawanJoin(kData.tanggalJoin || '');
                                const stats = calculateAttendanceStats(kId, kData.name || '', kData.tanggalJoin, props.absensiList || [], props.activeStoreId || '');
                                setEditKaryawanOff(String(kData.totalOffBulanIni !== undefined && kData.totalOffBulanIni !== null ? kData.totalOffBulanIni : stats.tidakAbsen));
                                setEditKaryawanCatatan(kData.catatanAwalKerja || '');
                              }}
                              className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                                selectedKaryawan === kId
                                  ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800'
                                  : 'bg-slate-50 border-slate-100 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800/80'
                              }`}
                            >
                              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center shrink-0 overflow-hidden">
                                {kData.avatar ? (
                                  <img src={kData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <i className="fa-solid fa-user"></i>
                                )}
                              </div>
                              <div>
                                <p className={`text-xs font-black ${selectedKaryawan === kId ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-800 dark:text-slate-200'}`}>
                                  {kData.name || kId}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                                  {kData.role}
                                </p>
                              </div>
                            </button>
                          ))}
                          {Object.entries(props.kasirList || {}).filter(([kId]) => kId !== 'owner').length === 0 && (
                            <p className="text-[10px] text-slate-400 font-bold text-center mt-10">Belum ada karyawan.</p>
                          )}
                        </div>
                      </div>

                      {/* Right: Karyawan Detail & Edit */}
                      <div className="flex-1">
                        {selectedKaryawan && props.kasirList?.[selectedKaryawan] ? (
                          <div className="animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-5 mb-8 pb-6 border-b border-slate-100 dark:border-slate-700">
                              <div 
                                onClick={() => {
                                  if (props.kasirList?.[selectedKaryawan]?.avatar) {
                                    setKaryawanAvatarZoomSrc(props.kasirList[selectedKaryawan].avatar);
                                    setShowKaryawanAvatarZoom(true);
                                  }
                                }}
                                className={cn(
                                  "w-20 h-20 rounded-full border-4 border-slate-100 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800 flex items-center justify-center shadow-sm shrink-0",
                                  props.kasirList?.[selectedKaryawan]?.avatar && "cursor-pointer hover:opacity-90 active:scale-95 transition-all"
                                )}
                              >
                                {props.kasirList[selectedKaryawan].avatar ? (
                                  <img src={props.kasirList[selectedKaryawan].avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <i className="fa-solid fa-user text-3xl text-slate-300 dark:text-slate-600"></i>
                                )}
                              </div>
                              <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wider">{props.kasirList[selectedKaryawan].name}</h2>
                                <p className="text-xs font-bold text-indigo-500 mt-1 uppercase tracking-widest">{props.kasirList[selectedKaryawan].role} • ID: {selectedKaryawan}</p>
                              </div>
                            </div>

                            {(() => {
                              const kData = props.kasirList[selectedKaryawan];
                              const tenure = kData ? calculateTenure(kData.tanggalJoin) : null;
                              const isBonus = tenure && tenure.totalMonths > 0 && tenure.totalMonths % 6 === 0;
                              const stats = calculateAttendanceStats(selectedKaryawan, kData?.name || '', kData?.tanggalJoin || '', props.absensiList || [], props.activeStoreId || '');
                              
                              return (
                                <div className="space-y-6">
                                  {tenure && (
                                    <div className={`p-5 rounded-2xl border ${isBonus ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-indigo-50 border-indigo-100 text-indigo-900'} flex items-center justify-between`}>
                                      <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Masa Kerja (Terhitung dr tgl join)</p>
                                        <p className="text-lg font-black">{tenure.months} Bulan {tenure.days} Hari</p>
                                        {isBonus && <p className="text-xs font-bold text-amber-600 mt-1"><i className="fa-solid fa-gift mr-1 animate-bounce"></i> Waktunya Bonus 6 Bulanan!</p>}
                                      </div>
                                      <button onClick={() => setShowPaymentForm(!showPaymentForm)} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-sm active:scale-95 transition-all flex items-center gap-2 ${isBonus ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                                        <i className={showPaymentForm ? "fa-solid fa-xmark" : "fa-solid fa-money-bills"}></i>
                                        {showPaymentForm ? 'Batal' : 'Catat Pembayaran'}
                                      </button>
                                    </div>
                                  )}

                                  {/* Data yang diisi oleh Kasir */}
                                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 pb-2 flex items-center gap-2">
                                      <i className="fa-solid fa-user-gear text-indigo-600 dark:text-indigo-400"></i>
                                      Profil Kasir (Diisi oleh Kasir)
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                      <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nama Lengkap</p>
                                        <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{kData.name || '-'}</p>
                                      </div>
                                      <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PIN Aplikasi</p>
                                        <p className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded w-max mt-0.5">{kData.pin || '-'}</p>
                                      </div>
                                      <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Alamat Domisili</p>
                                        <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{kData.alamat || '-'}</p>
                                      </div>
                                      <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tempat, Tanggal Lahir</p>
                                        <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                                          {kData.tempatLahir || kData.tanggalLahir ? (
                                            `${kData.tempatLahir || '-'}${kData.tanggalLahir ? `, ${new Date(kData.tanggalLahir).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}` : ''}`
                                          ) : '-'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Rekap Kehadiran Bulan Ini */}
                                  <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-5 space-y-3">
                                    <div className="flex items-center justify-between text-indigo-900 dark:text-indigo-300 border-b border-indigo-100 dark:border-indigo-900/30 pb-2">
                                      <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                        <i className="fa-solid fa-fingerprint text-indigo-600 dark:text-indigo-400"></i>
                                        Kehadiran Bulan Ini (Absensi)
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                      <div className="bg-white dark:bg-slate-800 border border-indigo-50 dark:border-indigo-950/30 rounded-xl p-3">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Hadir</p>
                                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.hadir} Hari</p>
                                      </div>
                                      <div className="bg-white dark:bg-slate-800 border border-indigo-50 dark:border-indigo-950/30 rounded-xl p-3">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Izin / Cuti</p>
                                        <p className="text-sm font-black text-amber-600 dark:text-amber-400 mt-1">{stats.izin} Hari</p>
                                      </div>
                                      <div className="bg-white dark:bg-slate-800 border border-indigo-50 dark:border-indigo-950/30 rounded-xl p-3">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tidak Absen</p>
                                        <p className="text-sm font-black text-rose-600 dark:text-rose-400 mt-1">{stats.tidakAbsen} Hari</p>
                                      </div>
                                    </div>
                                    <p className="text-[9px] font-bold text-indigo-500/70 dark:text-indigo-400/70 text-center mt-1 uppercase tracking-widest">
                                      * Hari tidak absen dianggap sebagai Libur/Off Karyawan
                                    </p>
                                  </div>

                                  {/* Pengaturan Owner */}
                                  <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-5 space-y-5">
                                    <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 pb-2 flex items-center gap-2">
                                      <i className="fa-solid fa-user-lock text-indigo-600 dark:text-indigo-400"></i>
                                      Kelola HR & Catatan Kerja (Diatur oleh Owner)
                                    </h4>
                                    
                                    <div className="space-y-4">
                                      <div>
                                        <div className="flex justify-between items-center mb-1">
                                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Tanggal Masuk Kerja (Join)</label>
                                          {(!isEditingJoinDate && !!editKaryawanJoin) && (
                                            <button 
                                              type="button"
                                              onClick={() => setIsEditingJoinDate(true)}
                                              className="text-[8px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                            >
                                              <i className="fa-solid fa-pen text-[7px]"></i> Edit Tanggal
                                            </button>
                                          )}
                                        </div>
                                        <input
                                          type="date"
                                          value={editKaryawanJoin}
                                          onChange={e => setEditKaryawanJoin(e.target.value)}
                                          disabled={!isEditingJoinDate && !!editKaryawanJoin}
                                          className="w-full bg-slate-50 disabled:bg-slate-100 disabled:text-slate-500 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                          style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                                        />
                                      </div>

                                      <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Catatan Awal Kerja / Catatan Owner</label>
                                        <textarea
                                          value={editKaryawanCatatan}
                                          onChange={e => setEditKaryawanCatatan(e.target.value)}
                                          placeholder="Contoh: Mulai bekerja shift pagi, jaminan ijazah asli, performa awal baik, dll"
                                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 min-h-[80px] resize-y"
                                          style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                                        />
                                      </div>
                                    </div>
                                    
                                    <div className="flex gap-4">
                                      <button
                                        onClick={async () => {
                                          try {
                                            if (props.onSaveCashierSelf) {
                                              await props.onSaveCashierSelf(selectedKaryawan, {
                                                ...props.kasirList![selectedKaryawan],
                                                tanggalJoin: editKaryawanJoin,
                                                catatanAwalKerja: editKaryawanCatatan
                                              });
                                              setIsEditingJoinDate(false); // Kunci kembali setelah berhasil disimpan
                                              setSavedStatus(true);
                                              setTimeout(() => setSavedStatus(false), 2000);
                                            }
                                          } catch (err: any) {
                                            alert(err.message || "Gagal menyimpan HR kasir");
                                          }
                                        }}
                                        className={cn(
                                          "flex-1 font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95 shadow-md flex items-center justify-center gap-2",
                                          savedStatus
                                            ? "bg-emerald-600 text-white scale-[0.98]"
                                            : "bg-indigo-600 hover:bg-indigo-700 text-white"
                                        )}
                                        style={{ color: '#ffffff' }}
                                      >
                                        {savedStatus ? (
                                          <>
                                            <i className="fa-solid fa-circle-check animate-bounce"></i>
                                            Berhasil Disimpan!
                                          </>
                                        ) : (
                                          <>
                                            <i className="fa-solid fa-floppy-disk"></i>
                                            Simpan Data Karyawan
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Payment Section */}
                            {showPaymentForm ? (
                              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 animate-in fade-in duration-200">
                                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest mb-4">Form Pembayaran</h4>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                  <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Jenis Pembayaran</label>
                                    <select
                                      value={paymentType}
                                      onChange={e => setPaymentType(e.target.value as 'gaji' | 'bonus')}
                                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none"
                                      style={{ color: '#000000' }}
                                    >
                                      <option value="gaji">Gaji Bulanan</option>
                                      <option value="bonus">Bonus 6 Bulanan</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nominal (Rp)</label>
                                    <input
                                      type="number"
                                      value={paymentAmount}
                                      onChange={e => setPaymentAmount(e.target.value)}
                                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none"
                                      style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                                    />
                                  </div>
                                </div>
                                <div className="mb-4">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Keterangan / Catatan</label>
                                  <input
                                    type="text"
                                    value={paymentNote}
                                    onChange={e => setPaymentNote(e.target.value)}
                                    placeholder="Contoh: Gaji bulan Agustus, Bonus kinerja, dll"
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none"
                                    style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                                  />
                                </div>
                                <button
                                  onClick={async () => {
                                    if (!paymentAmount) return alert("Masukkan nominal!");
                                    try {
                                      const kData = props.kasirList![selectedKaryawan];
                                      const history = kData.paymentHistory || [];
                                      const newEntry = {
                                        id: Date.now().toString(),
                                        date: new Date().toISOString(),
                                        type: paymentType,
                                        amount: Number(paymentAmount),
                                        note: paymentNote
                                      };
                                      if (props.onSaveCashierSelf) {
                                        await props.onSaveCashierSelf(selectedKaryawan, {
                                          ...kData,
                                          paymentHistory: [newEntry, ...history]
                                        });
                                        setPaymentAmount('');
                                        setPaymentNote('');
                                        setShowPaymentForm(false);
                                        setSavedStatus(true);
                                        setTimeout(() => setSavedStatus(false), 2000);
                                      }
                                    } catch (e: any) {
                                      alert(e.message || "Gagal mencatat pembayaran");
                                    }
                                  }}
                                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                                  style={{ color: '#ffffff' }}
                                >
                                  Catat ke Riwayat
                                </button>
                              </div>
                            ) : (
                              <div className="border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden animate-in fade-in duration-200">
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 border-b border-slate-100 dark:border-slate-700">
                                  <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Riwayat Pembayaran Karyawan</h4>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-60 overflow-y-auto">
                                  {props.kasirList[selectedKaryawan].paymentHistory?.length ? (
                                    props.kasirList[selectedKaryawan].paymentHistory.map((ph: any) => (
                                      <div key={ph.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${ph.type === 'bonus' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                            <i className={`fa-solid ${ph.type === 'bonus' ? 'fa-gift' : 'fa-money-bill-wave'}`}></i>
                                          </div>
                                          <div>
                                            <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">{ph.type}</p>
                                            <p className="text-[9px] font-bold text-slate-400 mt-0.5">{new Date(ph.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-sm font-black text-slate-800 dark:text-slate-200">Rp {ph.amount.toLocaleString('id-ID')}</p>
                                          {ph.note && <p className="text-[9px] font-bold text-slate-400 mt-0.5 max-w-[120px] truncate">{ph.note}</p>}
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="p-8 text-center text-slate-400">
                                      <i className="fa-solid fa-clock-rotate-left text-2xl mb-2 opacity-50"></i>
                                      <p className="text-[9px] font-bold uppercase tracking-widest">Belum ada riwayat pembayaran</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-700">
                            <i className="fa-solid fa-id-card-clip text-6xl mb-4"></i>
                            <p className="text-xs font-bold uppercase tracking-widest">Pilih karyawan untuk melihat detail</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'promo' && props.kasirRole === 'owner' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {props.activeStoreId === 'all' && (
                    <div className="p-4 bg-amber-50 text-amber-800 rounded-2xl border border-amber-200 text-xs font-bold text-center uppercase tracking-widest">
                      <i className="fa-solid fa-circle-info mr-2"></i> Pilih toko spesifik untuk mengedit teks berjalan.
                    </div>
                  )}
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-1">Teks Berjalan & Pengumuman</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-6 font-bold uppercase">Atur pesan promosi atau instruksi kerja yang akan tampil di halaman utama</p>

                    <div className="space-y-6">
                      <div>
                        <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2 ml-1">Teks Pengumuman Utama (Highlight Card)</label>
                        <input
                          type="text"
                          value={localMainAnnouncement}
                          onChange={(e) => setLocalMainAnnouncement(e.target.value)}
                          onBlur={() => {
                            if (localMainAnnouncement !== props.mainAnnouncement) {
                              props.onSaveMainAnnouncement?.(localMainAnnouncement)
                            }
                          }}
                          placeholder="Contoh: INFO: Dapatkan cashback aksesoris s/d 20% hari ini!"
                          disabled={props.activeStoreId === 'all'}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 outline-none transition-all"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2 px-1">
                          <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Teks Slide Berjalan (Maksimal 15 Baris)</label>
                          <span className="text-[8px] font-black text-orange-600 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400 px-2.5 py-1 rounded-full uppercase tracking-wider">Animasi Teks Berjalan</span>
                        </div>
                        <div className="relative">
                          <textarea
                            rows={8}
                            value={localRunningTextsText}
                            onChange={(e) => setLocalRunningTextsText(e.target.value)}
                            onBlur={() => {
                              const lines = localRunningTextsText.split('\n');
                              const newTexts = Array(15).fill('');
                              lines.slice(0, 15).forEach((line, i) => {
                                newTexts[i] = line;
                              });
                              props.onSaveRunningTexts?.(newTexts);
                            }}
                            placeholder="Tulis pesan promosi Anda di sini (satu baris = satu pesan)...&#10;Contoh:&#10;Promo Transfer Bank admin cuma 3rb!&#10;Sedia voucher kuota internet terlengkap!&#10;Bayar listrik & BPJS cepat tanpa antre."
                            disabled={props.activeStoreId === 'all'}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 outline-none transition-all resize-none min-h-[180px]"
                          />
                          <div className="absolute bottom-3 right-4 text-[8px] font-black text-slate-400 dark:text-slate-500 pointer-events-none uppercase tracking-widest">
                            Tekan Enter untuk baris baru
                          </div>
                        </div>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-2 ml-1 italic">* Teks akan berganti secara otomatis setiap beberapa detik pada dashboard mobile kasir.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'pantau' && props.kasirRole === 'owner' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-1">Opsi Pemantauan</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-6 font-bold uppercase">Sesuaikan visualisasi dan kontrol kasir di halaman utama</p>

                    <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-100 dark:border-slate-700">
                          <i className="fa-solid fa-filter text-sm"></i>
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">Filter Kasir di Beranda</h4>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">Tampilkan opsi cek per kasir di Dashboard</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const current = localStorage.getItem(storageKeyFilter) !== 'false';
                          localStorage.setItem(storageKeyFilter, (!current).toString());
                          window.dispatchEvent(new Event('storage'));
                          setSavedStatus(true);
                          setTimeout(() => setSavedStatus(false), 2000);
                        }}
                        className={cn(
                          "w-14 h-8 rounded-full p-1 transition-all duration-300 relative",
                          (localStorage.getItem(storageKeyFilter) !== 'false') ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300",
                          (localStorage.getItem(storageKeyFilter) !== 'false') ? "translate-x-6" : "translate-x-0"
                        )}></div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'printer' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm max-w-xl w-full mx-auto">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-1">Koneksi Printer Bluetooth POS</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mb-6">Konfigurasi hardware thermal via Layanan Print RawBT.</p>

                    <div className="space-y-4">
                      {/* Native Bluetooth Section */}
                      <div className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full animate-pulse ${btConnected ? 'bg-emerald-500' : btConnecting ? 'bg-amber-400' : 'bg-red-500'}`}></div>
                            <div>
                              <h4 className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100 uppercase">PRINTER BLUETOOTH NATIVE</h4>
                              <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                                STATUS: {btConnected ? `TERHUBUNG (${btMacAddress})` : btConnecting ? 'MENYAMBUNGKAN...' : 'DISCONNECTED'}
                              </p>
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={btConnected ? disconnectBluetooth : scanBluetoothDevices}
                            disabled={btConnecting || isScanningBt}
                            className={`text-[9px] font-black px-4 py-2 rounded-lg active:scale-95 transition-all shadow-sm
                              ${btConnected 
                                ? 'bg-rose-50 border border-rose-200 text-rose-600 font-bold' 
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                              }
                            `}
                          >
                            {btConnected ? 'PUTUSKAN' : isScanningBt ? 'MENCARI...' : 'CARI PRINTER'}
                          </button>
                        </div>
                        
                        {!btConnected && pairedDevices.length > 0 && (
                          <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-3">
                            <p className="text-[9px] font-bold text-slate-500 mb-2">PILIH PRINTER YANG TERSEDIA:</p>
                            <div className="space-y-2 max-h-[150px] overflow-y-auto">
                              {pairedDevices.map((device) => (
                                <button
                                  key={device.address}
                                  onClick={() => connectToBluetooth(device.address)}
                                  disabled={btConnecting}
                                  className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-400 active:bg-blue-50 transition-colors text-left"
                                >
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200">{device.name || 'Unknown Device'}</p>
                                    <p className="text-[8px] font-mono text-slate-400">{device.address}</p>
                                  </div>
                                  <span className="text-[9px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">HUBUNGKAN</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/30 rounded-2xl">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                            <i className="fa-brands fa-bluetooth-b text-base"></i>
                          </div>
                          <div>
                            <h4 className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-0.5">Driver Printer RawBT</h4>
                            <p className="text-[9px] text-slate-600 dark:text-slate-400 font-bold leading-relaxed mb-3">
                              Aplikasi menggunakan intent. Pastikan aplikasi <strong className="text-blue-600 dark:text-blue-400">RawBT Print Service</strong> terinstal dari Play Store.
                            </p>
                            <div className="flex gap-2 flex-col">
                              <a 
                                href="https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter" 
                                target="_blank"
                                rel="noreferrer"
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all text-center"
                                style={{ color: '#ffffff' }}
                              >
                                <i className="fa-brands fa-google-play mr-1.5"></i> Download RawBT
                              </a>
                              <button 
                                onClick={() => {
                                  const w = 32;
                                  const center = (s: string) => ' '.repeat(Math.max(0, Math.floor((w - s.length) / 2))) + s;
                                  const text = center('TEST PRINT BERHASIL') + '\n'
                                    + center('Koneksi RawBT & Aplikasi Kasir') + '\n'
                                    + center('berjalan normal.') + '\n'
                                    + '-'.repeat(w) + '\n\n\n';
                                    
                                  const btMac = localStorage.getItem('bluetooth_printer_mac');
                                  if (btMac && (window as any).bluetoothSerial) {
                                    (window as any).bluetoothSerial.write(text, () => {}, (err: any) => alert('Test print native gagal: ' + err));
                                  } else {
                                    const url = `rawbt:${encodeURIComponent(text)}`;
                                    const a = document.createElement('a'); a.href = url; document.body.appendChild(a); a.click(); document.body.removeChild(a);
                                  }
                                }}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all"
                              >
                                <i className="fa-solid fa-print mr-1.5"></i> Tes Print
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[10px] font-bold uppercase mt-4">
                         <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 flex flex-col justify-center items-center text-center">
                            <i className="fa-solid fa-text-width text-slate-400 mb-2 text-lg"></i>
                            <span className="block text-[9px] text-slate-400 dark:text-slate-500 font-black mb-1">UKURAN KERTAS DUKUNGAN</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200">58mm & 80mm</span>
                         </div>
                         <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 flex flex-col justify-center items-center text-center">
                            <i className="fa-solid fa-bolt text-slate-400 mb-2 text-lg"></i>
                            <span className="block text-[9px] text-slate-400 dark:text-slate-500 font-black mb-1">MODE PENCETAKAN</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200">ESC/POS Teks Cepat</span>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'backup' && props.kasirRole === 'owner' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Backup Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6">
                          <i className="fa-solid fa-file-export text-lg"></i>
                        </div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-1">Ekspor Data Lokal</h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mb-4">Unduh salinan cadangan lengkap seluruh riwayat pembukuan kasir</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
                          Data akan diunduh dalam format berkas JSON terenkripsi. Berkas ini dapat digunakan untuk restore data pada perangkat kasir baru atau ketika memindahkan aplikasi.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-8">
                        <button
                          onClick={handleExportData}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95 shadow-md flex flex-col items-center justify-center gap-1"
                          style={{ color: '#ffffff' }}
                        >
                          <i className="fa-solid fa-file-code text-lg mb-1"></i>
                          JSON Backup
                        </button>
                        <button
                          onClick={handleExportCSV}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95 shadow-md flex flex-col items-center justify-center gap-1"
                          style={{ color: '#ffffff' }}
                        >
                          <i className="fa-solid fa-file-excel text-lg mb-1"></i>
                          Excel / CSV
                        </button>
                      </div>
                    </div>

                    {/* Reset Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-6">
                          <i className="fa-solid fa-triangle-exclamation text-lg"></i>
                        </div>
                        <h3 className="text-sm font-black text-rose-600 uppercase tracking-widest mb-1">Reset Sistem Aplikasi</h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mb-4">Kembalikan pengaturan & bersihkan cache lokal aplikasi</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
                          <strong className="text-rose-600">PERINGATAN!</strong> Tindakan ini akan menghapus semua kredensial login kasir, nama toko, subteks, serta data sementara di perangkat ini. Pastikan Anda telah melakukan sinkronisasi cloud terlebih dahulu.
                        </p>
                      </div>
                      <button
                        onClick={handleResetSystem}
                        className="mt-8 w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95 shadow-md flex items-center justify-center gap-2"
                        style={{ color: '#ffffff' }}
                      >
                        <i className="fa-solid fa-rotate-left"></i>
                        Reset Sistem
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'cloud' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex flex-col items-center text-center max-w-xl mx-auto py-6">
                      <div className="w-16 h-16 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-6 border border-purple-100 dark:border-purple-900/50 shadow-inner">
                        <i className={cn("fa-solid text-2xl", isCloudLoading ? "fa-circle-notch fa-spin" : "fa-cloud")}></i>
                      </div>

                      <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-1">Sinkronisasi Supabase Cloud</h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mb-6">Backup global dan sinkronisasi data antar kasir realtime</p>

                      <button
                        onClick={handleSyncAll}
                        disabled={isCloudLoading}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 px-6 rounded-2xl font-black text-xs shadow-lg shadow-purple-200 dark:shadow-none uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 mb-6"
                        style={{ color: '#ffffff' }}
                      >
                        <i className={isCloudLoading ? "fa-solid fa-circle-notch fa-spin" : "fa-solid fa-arrows-rotate"}></i>
                        {isCloudLoading ? 'Membaca dan Menyinkronkan...' : 'MULAI UPDATE SYNC'}
                      </button>

                      <div className="grid grid-cols-2 gap-4 w-full">
                        <button
                          onClick={handleUploadToCloud}
                          disabled={isCloudLoading}
                          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-3.5 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                        >
                          <i className="fa-solid fa-cloud-arrow-up text-purple-600"></i>
                          Upload Data
                        </button>
                        <button
                          onClick={handleDownloadFromCloud}
                          disabled={isCloudLoading}
                          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-3.5 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                        >
                          <i className="fa-solid fa-cloud-arrow-down text-purple-600"></i>
                          Download Data
                        </button>
                      </div>

                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter mt-8 leading-relaxed">
                        * Update Sync akan mengunggah data lokal Anda ke server cloud terlebih dahulu, lalu mengunduh versi komprehensif terbaru untuk disamakan pada semua perangkat kasir.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'kasirSelf' && props.kasirRole === 'kasir' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm max-w-xl">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-1">Pengaturan Profil Kasir</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-6 font-bold uppercase">Lengkapi biodata dan atur PIN pengaman kasir Anda</p>

                    <div className="space-y-4">
                      {/* Avatar Upload */}
                      <div className="flex justify-center mb-6">
                        <div 
                          onClick={() => {
                            setAvatarEditorSrc(editKasirAvatar || '');
                            setEditorZoom(1);
                            setEditorOffset({ x: 0, y: 0 });
                            setShowAvatarEditor(true);
                          }}
                          className="w-24 h-24 rounded-full border-4 border-slate-100 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800 flex items-center justify-center cursor-pointer hover:opacity-90 active:scale-95 transition-all shadow-sm"
                        >
                          {editKasirAvatar ? (
                            <img src={editKasirAvatar} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <i className="fa-solid fa-user text-3xl text-slate-300 dark:text-slate-600"></i>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2 ml-1">Nama Kasir / Petugas</label>
                          <input
                            type="text"
                            value={editKasirName}
                            onChange={e => setEditKasirName(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800"
                            style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2 ml-1">PIN Keamanan Kasir (Minimal 4 Angka)</label>
                          <div className="relative">
                            <input
                              type={showKasirPin ? "text" : "password"}
                              inputMode="numeric"
                              maxLength={8}
                              value={editKasirPin}
                              onChange={e => setEditKasirPin(e.target.value.replace(/\D/g, ''))}
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 tracking-widest"
                              style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowKasirPin(!showKasirPin)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                              <i className={showKasirPin ? "fa-solid fa-eye-slash text-sm" : "fa-solid fa-eye text-sm"}></i>
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2 ml-1">Alamat Domisili</label>
                          <input
                            type="text"
                            value={editKasirAlamat}
                            onChange={e => setEditKasirAlamat(e.target.value)}
                            placeholder="Opsional"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800"
                            style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                          />
                        </div>

                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2 ml-1">Tempat Lahir</label>
                            <input
                              type="text"
                              value={editKasirTempatLahir}
                              onChange={e => setEditKasirTempatLahir(e.target.value)}
                              placeholder="Opsional"
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800"
                              style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2 ml-1">Tanggal Lahir</label>
                            <input
                              type="date"
                              value={editKasirTanggalLahir}
                              onChange={e => setEditKasirTanggalLahir(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800"
                              style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={async () => {
                          if (!editKasirName.trim()) {
                            alert("Nama kasir tidak boleh kosong!");
                            return;
                          }
                          if (editKasirPin.length < 4) {
                            alert("PIN minimal harus 4 digit angka!");
                            return;
                          }
                          try {
                            if (props.onSaveCashierSelf && props.currentUsername) {
                              await props.onSaveCashierSelf(props.currentUsername, {
                                name: editKasirName.trim(),
                                pin: editKasirPin,
                                alamat: editKasirAlamat,
                                tempatLahir: editKasirTempatLahir,
                                tanggalLahir: editKasirTanggalLahir,
                                avatar: editKasirAvatar
                              });
                              setSavedStatus(true);
                              setTimeout(() => setSavedStatus(false), 2000);
                            }
                          } catch (err: any) {
                            alert(err.message || "Gagal menyimpan perubahan kasir");
                          }
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 mt-4"
                        style={{ color: '#ffffff' }}
                      >
                        <i className="fa-solid fa-circle-check"></i>
                        Simpan PIN & Nama Kasir
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("page-view hide-scrollbar bg-white", props.active && "active")}>
      {/* HEADER TOKO IDENTIK BERANDA */}
      <div className="relative theme-header" style={{ paddingBottom: '2.5rem' }}>
        <div className="px-4 pt-12 pb-2 flex items-center justify-between gap-3">
          <div className="flex-1 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {props.storePhoto ? (
                <img src={props.storePhoto} alt="Logo" className="w-12 h-12 rounded-full object-cover border-2 border-white/50 shadow-md" />
              ) : (
                <img src="/logo_icon.png" alt="Logo" className="w-12 h-12 object-contain" />
              )}
              <div>
                <h1 className="text-[13px] font-black text-white leading-tight uppercase tracking-widest">{props.storeName || 'ALFAZA CELL'}</h1>
                <p className="text-blue-200 text-[8px] font-bold uppercase tracking-tighter opacity-80">{props.storeSubtext || 'Pembukuan Agen brilink & Konter'}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-white text-[10px] font-black">{props.kasirName}</span>
                  <span className={cn("text-[7px] px-1.5 py-0.5 rounded-full font-black", props.kasirRole === 'owner' ? "bg-amber-400 text-amber-900" : "bg-white/25 text-white")}>
                    {props.kasirRole === 'owner' ? 'OWNER' : 'KASIR'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-blue-200 text-[8px] font-bold uppercase tracking-widest leading-none mb-1">{dayName}</p>
              <p className="text-white text-[10px] font-black tracking-tight leading-none mb-1">{fullDate}</p>
              <p className="text-blue-100 text-xs font-black tabular-nums tracking-widest">{clockStr}</p>
            </div>
          </div>

          <button onClick={() => props.setIsSidePanelOpen?.(true)} className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10 shadow-lg active:scale-90 hover:bg-white/20 transition-all">
            <i className="fa-solid fa-ellipsis-vertical text-sm"></i>
          </button>
        </div>
      </div>

      <div className="px-1.5 pt-6 pb-5 bg-gradient-to-r from-indigo-700 to-blue-600 text-white rounded-b-[2rem] shadow-lg shadow-blue-500/20 mb-6" style={{ marginTop: '-2.5rem', position: 'relative', zIndex: 10 }}>
        <div className="px-2 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-sm tracking-wide">Pengaturan Akun</h2>
            <p className="text-blue-100 text-[10px] opacity-90">Kelola profil dan keamanan</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
            <i className="fa-solid fa-user-gear text-white text-xs"></i>
          </div>
        </div>
      </div>

      <div className="px-1.5 pb-6">

        <div className="space-y-3">
          {/* Owner Only Settings */}
          {props.kasirRole === 'owner' && (() => {
            const ownerData = props.kasirList?.['owner'] || {};
            const ownerName = ownerData.name || props.kasirName || 'Owner';
            const ownerAvatar = ownerData.avatar || '';
            const ownerJoin = ownerData.tanggalJoin || '';
            const ownerTenure = ownerJoin ? calculateTenure(ownerJoin) : null;
            const ownerStats = calculateAttendanceStats('owner', ownerName, ownerJoin, props.absensiList || [], props.activeStoreId || '');
            const ownerTotal = ownerStats.hadir + ownerStats.izin + ownerStats.tidakAbsen;
            const ownerHadirRate = ownerTotal > 0 ? (ownerStats.hadir / ownerTotal) * 100 : 100;
            let ownerBadge = { label: 'Bintang', icon: '⭐', color: 'bg-amber-100 text-amber-700' };
            if (ownerHadirRate >= 95) ownerBadge = { label: 'Bintang', icon: '⭐', color: 'bg-amber-100 text-amber-700' };
            else if (ownerHadirRate >= 80) ownerBadge = { label: 'Rajin', icon: '🏅', color: 'bg-emerald-100 text-emerald-700' };
            else if (ownerHadirRate >= 60) ownerBadge = { label: 'Cukup', icon: '👍', color: 'bg-blue-100 text-blue-700' };
            return (
            <div className="mb-4 space-y-3">

              {/* ── KARTU PROFIL OWNER ── */}
              <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center gap-3.5">
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/20 border-2 border-white/40 flex items-center justify-center shadow-inner">
                      {ownerAvatar ? (
                        <img src={ownerAvatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-black text-white">{ownerName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[8px] font-black text-white/60 uppercase tracking-widest leading-none mb-0.5">PROFIL OWNER</p>
                    <p className="text-sm font-black text-white leading-tight truncate">{ownerName}</p>
                    <p className="text-[9px] text-blue-200 font-bold mt-0.5 truncate">{props.storeName || 'ALFAZA CELL'} · Owner</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-300/30 text-amber-200">👑 OWNER</span>
                      <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full', ownerBadge.color)}>{ownerBadge.icon} {ownerBadge.label}</span>
                    </div>
                  </div>
                </div>
                {ownerTenure && (
                  <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-[8px] font-black text-white/50 uppercase tracking-widest">Masa Kerja</p>
                      <p className="text-xs font-black text-white">{ownerTenure.months} Bln {ownerTenure.days} Hr</p>
                    </div>
                    <div className="flex gap-3 text-center">
                      <div><p className="text-sm font-black text-emerald-300">{ownerStats.hadir}</p><p className="text-[7px] font-black text-white/50 uppercase">Hadir</p></div>
                      <div><p className="text-sm font-black text-amber-300">{ownerStats.izin}</p><p className="text-[7px] font-black text-white/50 uppercase">Izin</p></div>
                      <div><p className="text-sm font-black text-rose-300">{ownerStats.tidakAbsen}</p><p className="text-[7px] font-black text-white/50 uppercase">Absen</p></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Akun Google */}
              <div className="bg-white border border-gray-100 p-3.5 rounded-2xl shadow-sm flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                  <i className="fa-brands fa-google text-xs"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-0.5">AKUN GOOGLE TERTAUT</p>
                  <p className="text-[11px] font-black text-gray-800 truncate">{props.googleEmail || 'Tidak diketahui'}</p>
                </div>
              </div>

              {/* ── MENU PENGATURAN FLAT LIST ── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-4 pt-3.5 pb-2">Pengaturan Toko</p>

                {/* Edit Profil Toko */}
                <button
                  onClick={() => setOpenCategory(openCategory === 'profil' ? null : 'profil')}
                  className="w-full flex items-center px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mr-3">
                    <i className="fa-solid fa-user-pen text-xs"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-gray-900 leading-tight">Edit Profil Toko</p>
                    <p className="text-[9px] text-gray-400 font-medium mt-0.5">Nama toko, logo, dan slogan utama</p>
                  </div>
                  <i className={cn("fa-solid fa-chevron-down text-[10px] text-gray-300 ml-2 transition-transform duration-200", openCategory === 'profil' && "rotate-180")} />
                </button>
                {openCategory === 'profil' && (
                  <div className="mt-2 p-5 bg-emerald-50/30 border border-emerald-100 rounded-[2rem] animate-in slide-in-from-top-2 duration-300 space-y-5">
                    {/* Photo Upload */}
                    <div className="flex flex-col items-center gap-3 pb-2">
                      <div className="relative group cursor-pointer" onClick={() => document.getElementById('photoInput')?.click()}>
                        {props.storePhoto ? (
                          <img src={props.storePhoto} alt="Store" className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md transition-transform group-hover:scale-105" />
                        ) : (
                          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 border-4 border-white shadow-md">
                            <i className="fa-solid fa-camera text-2xl"></i>
                          </div>
                        )}
                        <div className="absolute bottom-0 right-0 w-7 h-7 bg-emerald-600 text-white rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                          <i className="fa-solid fa-plus text-[10px]"></i>
                        </div>
                        <input id="photoInput" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                      </div>
                      <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Ganti Logo Toko</p>
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-emerald-600 uppercase tracking-tight ml-1 mb-2 block">Nama Toko</label>
                      <input
                        type="text"
                        value={localStoreName}
                        onChange={(e) => setLocalStoreName(e.target.value)}
                        onBlur={() => {
                          if (localStoreName !== props.storeName) {
                            props.onSaveStoreName?.(localStoreName)
                          }
                        }}
                        placeholder="Nama Toko Anda"
                        className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-3 text-xs font-black text-gray-900 focus:ring-4 focus:ring-emerald-100 transition-all outline-none"
                        style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-emerald-600 uppercase tracking-tight ml-1 mb-2 block">Sub-Teks / Slogan</label>
                      <input
                        type="text"
                        value={localStoreSubtext}
                        onChange={(e) => setLocalStoreSubtext(e.target.value)}
                        onBlur={() => {
                          if (localStoreSubtext !== props.storeSubtext) {
                            props.onSaveStoreSubtext?.(localStoreSubtext)
                          }
                        }}
                        placeholder="Contoh: Pembukuan Agen brilink & Konter"
                        className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-3 text-xs font-black text-gray-900 focus:ring-4 focus:ring-emerald-100 transition-all outline-none"
                        style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                      />
                    </div>
                  </div>
                )}

                {/* Divider navy */}
                <div className="h-px mx-4" style={{background:'rgba(15,23,42,0.12)'}} />

                {/* Keamanan & Akses */}
                <button
                  onClick={() => setOpenCategory(openCategory === 'keamanan' ? null : 'keamanan')}
                  className="w-full flex items-center px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mr-3">
                    <i className="fa-solid fa-shield-halved text-xs"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-gray-900 leading-tight">Keamanan &amp; Akses</p>
                    <p className="text-[9px] text-gray-400 font-medium mt-0.5">PIN login kasir dan keamanan aplikasi</p>
                  </div>
                  <i className={cn("fa-solid fa-chevron-down text-[10px] text-gray-300 ml-2 transition-transform duration-200", openCategory === 'keamanan' && "rotate-180")} />
                </button>
                {openCategory === 'keamanan' && (
                  <div className="mt-2 p-5 bg-blue-50/50 border border-blue-100 rounded-[2rem] animate-in slide-in-from-top-2 duration-300 overflow-hidden space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                          <i className="fa-solid fa-key text-xs"></i>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800">Gunakan PIN Masuk</p>
                          <p className="text-[9px] text-gray-500 font-medium">Wajibkan PIN saat login</p>
                        </div>
                      </div>
                      <button
                        onClick={togglePin}
                        className={cn(
                          "w-12 h-6 rounded-full p-1 transition-all duration-300 relative",
                          isPinEnabled ? "bg-blue-600" : "bg-gray-300"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300",
                          isPinEnabled ? "translate-x-6" : "translate-x-0"
                        )}></div>
                      </button>
                    </div>

                    {/* Ganti PIN Owner */}
                    {props.kasirRole === 'owner' && (
                      <div className="border-t border-blue-100 pt-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                            <i className="fa-solid fa-user-shield text-xs"></i>
                          </div>
                          <div>
                            <p className="text-xs font-black text-gray-800">Ganti PIN Owner</p>
                            <p className="text-[9px] text-gray-500 font-medium">Ubah PIN masuk akun Owner</p>
                          </div>
                        </div>
                        <div className="relative">
                          <input
                            type={showOwnerPin ? 'text' : 'password'}
                            inputMode="numeric"
                            maxLength={8}
                            value={ownerPinOld}
                            onChange={e => setOwnerPinOld(e.target.value.replace(/\D/g, ''))}
                            placeholder="PIN Lama"
                            className="w-full bg-white border border-blue-100 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 outline-none focus:ring-4 focus:ring-blue-50 tracking-widest"
                          />
                          <button type="button" onClick={() => setShowOwnerPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <i className={showOwnerPin ? 'fa-solid fa-eye-slash text-xs' : 'fa-solid fa-eye text-xs'}></i>
                          </button>
                        </div>
                        <input
                          type={showOwnerPin ? 'text' : 'password'}
                          inputMode="numeric"
                          maxLength={8}
                          value={ownerPinNew}
                          onChange={e => setOwnerPinNew(e.target.value.replace(/\D/g, ''))}
                          placeholder="PIN Baru (min. 4 digit)"
                          className="w-full bg-white border border-blue-100 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 outline-none focus:ring-4 focus:ring-blue-50 tracking-widest"
                        />
                        <input
                          type={showOwnerPin ? 'text' : 'password'}
                          inputMode="numeric"
                          maxLength={8}
                          value={ownerPinConfirm}
                          onChange={e => setOwnerPinConfirm(e.target.value.replace(/\D/g, ''))}
                          placeholder="Konfirmasi PIN Baru"
                          className="w-full bg-white border border-blue-100 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 outline-none focus:ring-4 focus:ring-blue-50 tracking-widest"
                        />
                        <button
                          onClick={() => {
                            if (!ownerPinNew || ownerPinNew.length < 4) return alert('PIN baru minimal 4 digit!');
                            if (ownerPinNew !== ownerPinConfirm) return alert('Konfirmasi PIN tidak cocok!');
                            const ownerAcc = props.kasirList?.['owner'];
                            if (ownerAcc && ownerAcc.pin && ownerAcc.pin !== ownerPinOld) return alert('PIN lama tidak sesuai!');
                            if (props.onSaveCashierSelf) {
                              props.onSaveCashierSelf('owner', { name: 'Owner', pin: ownerPinNew })
                                .then(() => {
                                  setOwnerPinOld(''); setOwnerPinNew(''); setOwnerPinConfirm('');
                                  alert('PIN Owner berhasil diubah!');
                                })
                                .catch((err: any) => alert(err.message || 'Gagal menyimpan PIN'));
                            }
                          }}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-2.5 rounded-xl text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                          style={{ color: '#ffffff' }}
                        >
                          <i className="fa-solid fa-shield-halved"></i>
                          Simpan PIN Owner
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Divider navy */}
                <div className="h-px mx-4" style={{background:'rgba(15,23,42,0.12)'}} />

                {/* Manajemen Kasir */}
                <button
                  onClick={() => setOpenCategory(openCategory === 'karyawan' ? null : 'karyawan')}
                  className="w-full flex items-center px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mr-3">
                    <i className="fa-solid fa-users-gear text-xs"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-gray-900 leading-tight">Manajemen Kasir</p>
                    <p className="text-[9px] text-gray-400 font-medium mt-0.5">Data karyawan, masa kerja, dan absensi</p>
                  </div>
                  <i className={cn("fa-solid fa-chevron-down text-[10px] text-gray-300 ml-2 transition-transform duration-200", openCategory === 'karyawan' && "rotate-180")} />
                </button>
                {openCategory === 'karyawan' && (
                    <div className="mt-2 p-5 bg-indigo-50/50 border border-indigo-100 rounded-[2rem] animate-in slide-in-from-top-2 duration-300 space-y-4">
                      {props.activeStoreId === 'all' ? (
                        <div className="p-4 bg-amber-50 text-amber-800 rounded-2xl border border-amber-200 text-[10px] font-bold text-center uppercase tracking-widest">
                          <i className="fa-solid fa-circle-info block text-xl mb-2"></i> Pilih toko spesifik di atas untuk melihat karyawan
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-900 border-b border-indigo-100 pb-2">Pilih Karyawan</h4>
                          <div className="flex overflow-x-auto gap-3 pb-2 hide-scrollbar snap-x">
                            {Object.entries(props.kasirList || {}).filter(([kId]) => kId !== 'owner').map(([kId, kData]) => (
                              <button
                                key={kId}
                                onClick={() => {
                                  setSelectedKaryawan(kId);
                                  setIsEditingJoinDate(false);
                                  setEditKaryawanGaji(String(kData.gajiPokok || ''));
                                  setEditKaryawanJoin(kData.tanggalJoin || '');
                                  const stats = calculateAttendanceStats(kId, kData.name || '', kData.tanggalJoin, props.absensiList || [], props.activeStoreId || '');
                                  setEditKaryawanOff(String(kData.totalOffBulanIni !== undefined && kData.totalOffBulanIni !== null ? kData.totalOffBulanIni : stats.tidakAbsen));
                                  setEditKaryawanCatatan(kData.catatanAwalKerja || '');
                                }}
                                className={cn(
                                  "flex flex-col items-center gap-2 p-3 min-w-[80px] rounded-2xl border snap-center shrink-0 transition-all",
                                  selectedKaryawan === kId ? "bg-indigo-600 border-indigo-600 text-white shadow-md" : "bg-white border-indigo-100 text-slate-700"
                                )}
                              >
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-100 text-indigo-400 flex items-center justify-center">
                                  {kData.avatar ? (
                                    <img src={kData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                  ) : (
                                    <i className="fa-solid fa-user"></i>
                                  )}
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest truncate w-full text-center">{kData.name || kId}</span>
                              </button>
                            ))}
                            {Object.entries(props.kasirList || {}).filter(([kId]) => kId !== 'owner').length === 0 && (
                              <p className="text-[9px] text-slate-400 font-bold">Belum ada karyawan.</p>
                            )}
                          </div>

                          {selectedKaryawan && props.kasirList?.[selectedKaryawan] && (
                            <div className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-sm mt-4 animate-in fade-in duration-300 space-y-4">
                              {(() => {
                                const kData = props.kasirList[selectedKaryawan];
                                const tenure = kData ? calculateTenure(kData.tanggalJoin) : null;
                                const isBonus = tenure && tenure.totalMonths > 0 && tenure.totalMonths % 6 === 0;
                                const stats = calculateAttendanceStats(selectedKaryawan, kData?.name || '', kData?.tanggalJoin || '', props.absensiList || [], props.activeStoreId || '');

                                return (
                                  <div className="space-y-4">
                                    {tenure && (
                                      <div className={`p-4 rounded-xl border ${isBonus ? 'bg-amber-50 border-amber-200' : 'bg-indigo-50 border-indigo-100'} flex flex-col gap-2`}>
                                        <div className="flex justify-between items-center">
                                          <div>
                                            <p className={`text-[8px] font-black uppercase tracking-widest ${isBonus ? 'text-amber-700/70' : 'text-indigo-900/70'}`}>Masa Kerja</p>
                                            <p className={`text-sm font-black ${isBonus ? 'text-amber-900' : 'text-indigo-900'}`}>{tenure.months} Bln {tenure.days} Hr</p>
                                          </div>
                                          <button onClick={() => setShowPaymentForm(!showPaymentForm)} className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest text-white shadow-sm active:scale-95 transition-all flex items-center gap-1.5 ${isBonus ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                                            <i className={showPaymentForm ? "fa-solid fa-xmark" : "fa-solid fa-money-bills"}></i>
                                            {showPaymentForm ? 'Batal' : 'Bayar'}
                                          </button>
                                        </div>
                                        {isBonus && <p className="text-[10px] font-bold text-amber-600"><i className="fa-solid fa-gift mr-1 animate-bounce"></i> Waktunya Bonus 6 Bulanan!</p>}
                                      </div>
                                    )}

                                    {/* Data yang diisi oleh Kasir */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                                      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                                        <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                          <i className="fa-solid fa-user-gear text-indigo-600"></i>
                                          Profil Kasir (Diisi oleh Kasir)
                                        </h4>
                                      </div>
                                      
                                      <div className="flex flex-col items-center mb-3">
                                        <div 
                                          onClick={() => {
                                            if (kData.avatar) {
                                              setKaryawanAvatarZoomSrc(kData.avatar);
                                              setShowKaryawanAvatarZoom(true);
                                            }
                                          }}
                                          className={cn(
                                            "w-20 h-20 rounded-full border-4 border-white shadow-sm overflow-hidden bg-indigo-100 flex items-center justify-center transition-all",
                                            kData.avatar ? "cursor-pointer hover:opacity-90 active:scale-95" : ""
                                          )}
                                        >
                                          {kData.avatar ? (
                                            <img src={kData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                          ) : (
                                            <i className="fa-solid fa-user text-2xl text-indigo-300"></i>
                                          )}
                                        </div>
                                        {kData.avatar && (
                                          <p className="text-[8px] font-bold text-slate-400 mt-1.5 uppercase tracking-widest text-center">Klik foto untuk perbesar</p>
                                        )}
                                      </div>

                                      <div className="grid grid-cols-2 gap-3 text-[10px]">
                                        <div>
                                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Nama Lengkap</p>
                                          <p className="font-bold text-slate-800 mt-0.5">{kData.name || '-'}</p>
                                        </div>
                                        <div>
                                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">PIN Aplikasi</p>
                                          <p className="font-mono font-bold text-slate-800 bg-slate-200/60 px-1.5 py-0.5 rounded w-max mt-0.5">{kData.pin || '-'}</p>
                                        </div>
                                        <div className="col-span-2">
                                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Alamat Domisili</p>
                                          <p className="font-bold text-slate-800 mt-0.5">{kData.alamat || '-'}</p>
                                        </div>
                                        <div className="col-span-2">
                                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tempat, Tanggal Lahir</p>
                                          <p className="font-bold text-slate-800 mt-0.5">
                                            {kData.tempatLahir || kData.tanggalLahir ? (
                                              `${kData.tempatLahir || '-'}${kData.tanggalLahir ? `, ${new Date(kData.tanggalLahir).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}` : ''}`
                                            ) : '-'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Rekap Kehadiran Bulan Ini */}
                                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3.5 space-y-2.5">
                                      <div className="flex items-center justify-between text-indigo-900 border-b border-indigo-100 pb-1.5">
                                        <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                          <i className="fa-solid fa-fingerprint text-indigo-600"></i>
                                          Kehadiran (Absensi)
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-white border border-indigo-50 rounded-lg p-2">
                                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Hadir</p>
                                          <p className="text-[11px] font-black text-emerald-600 mt-0.5">{stats.hadir} Hr</p>
                                        </div>
                                        <div className="bg-white border border-indigo-50 rounded-lg p-2">
                                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Izin</p>
                                          <p className="text-[11px] font-black text-amber-600 mt-0.5">{stats.izin} Hr</p>
                                        </div>
                                        <div className="bg-white border border-indigo-50 rounded-lg p-2">
                                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Absen</p>
                                          <p className="text-[11px] font-black text-rose-600 mt-0.5">{stats.tidakAbsen} Hr</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Pengaturan Owner */}
                                    <div className="space-y-4 pt-2 border-t border-slate-100">
                                      <div>
                                        <div className="flex justify-between items-center mb-1">
                                          <label className="text-[8px] font-black text-indigo-900 uppercase tracking-widest block">Tgl Masuk Kerja</label>
                                          {(!isEditingJoinDate && !!editKaryawanJoin) && (
                                            <button 
                                              type="button"
                                              onClick={() => setIsEditingJoinDate(true)}
                                              className="text-[8px] font-black uppercase tracking-widest text-indigo-600 hover:underline flex items-center gap-0.5"
                                            >
                                              <i className="fa-solid fa-pen text-[7px]"></i> Edit
                                            </button>
                                          )}
                                        </div>
                                        <input
                                          type="date"
                                          value={editKaryawanJoin}
                                          onChange={e => setEditKaryawanJoin(e.target.value)}
                                          disabled={!isEditingJoinDate && !!editKaryawanJoin}
                                          className="w-full bg-slate-50 disabled:bg-slate-100 disabled:text-slate-500 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500"
                                          style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[8px] font-black text-indigo-900 uppercase tracking-widest block mb-1">Catatan Awal Kerja</label>
                                        <textarea
                                          value={editKaryawanCatatan}
                                          onChange={e => setEditKaryawanCatatan(e.target.value)}
                                          placeholder="Catatan dari owner..."
                                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 min-h-[60px] resize-y"
                                          style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                                        />
                                      </div>
                                      
                                      <button
                                        onClick={async () => {
                                          try {
                                            if (props.onSaveCashierSelf) {
                                              await props.onSaveCashierSelf(selectedKaryawan, {
                                                ...props.kasirList![selectedKaryawan],
                                                tanggalJoin: editKaryawanJoin,
                                                catatanAwalKerja: editKaryawanCatatan
                                              });
                                              setIsEditingJoinDate(false); // Kunci kembali setelah berhasil disimpan
                                              setSavedStatus(true);
                                              setTimeout(() => setSavedStatus(false), 2000);
                                            }
                                          } catch (err: any) {
                                            alert(err.message || "Gagal menyimpan HR kasir");
                                          }
                                        }}
                                        className={cn(
                                          "w-full font-black py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-sm flex items-center justify-center gap-2 mt-2",
                                          savedStatus
                                            ? "bg-emerald-600 text-white scale-[0.98]"
                                            : "bg-indigo-600 hover:bg-indigo-700 text-white"
                                        )}
                                        style={{ color: '#ffffff' }}
                                      >
                                        {savedStatus ? (
                                          <>
                                            <i className="fa-solid fa-circle-check animate-bounce"></i>
                                            Berhasil Disimpan!
                                          </>
                                        ) : (
                                          <>
                                            <i className="fa-solid fa-floppy-disk"></i>
                                            Simpan Data
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Payment Section Mobile */}
                              {showPaymentForm ? (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4 animate-in fade-in duration-200 space-y-3">
                                  <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2">Form Pembayaran</h4>
                                  <div>
                                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Jenis Pembayaran</label>
                                    <select
                                      value={paymentType}
                                      onChange={e => setPaymentType(e.target.value as 'gaji' | 'bonus')}
                                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                                      style={{ color: '#000000' }}
                                    >
                                      <option value="gaji">Gaji Bulanan</option>
                                      <option value="bonus">Bonus 6 Bulanan</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Nominal (Rp)</label>
                                    <input
                                      type="number"
                                      value={paymentAmount}
                                      onChange={e => setPaymentAmount(e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                                      style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Keterangan / Catatan</label>
                                    <input
                                      type="text"
                                      value={paymentNote}
                                      onChange={e => setPaymentNote(e.target.value)}
                                      placeholder="Opsional"
                                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                                      style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                                    />
                                  </div>
                                  <button
                                    onClick={async () => {
                                      if (!paymentAmount) return alert("Masukkan nominal!");
                                      try {
                                        const kData = props.kasirList![selectedKaryawan];
                                        const history = kData.paymentHistory || [];
                                        const newEntry = {
                                          id: Date.now().toString(),
                                          date: new Date().toISOString(),
                                          type: paymentType,
                                          amount: Number(paymentAmount),
                                          note: paymentNote
                                        };
                                        if (props.onSaveCashierSelf) {
                                          await props.onSaveCashierSelf(selectedKaryawan, {
                                            ...kData,
                                            paymentHistory: [newEntry, ...history]
                                          });
                                          setPaymentAmount('');
                                          setPaymentNote('');
                                          setShowPaymentForm(false);
                                          setSavedStatus(true);
                                          setTimeout(() => setSavedStatus(false), 2000);
                                        }
                                      } catch (e: any) {
                                        alert(e.message || "Gagal mencatat pembayaran");
                                      }
                                    }}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-lg text-[9px] uppercase tracking-widest transition-all active:scale-95 shadow-sm mt-1"
                                    style={{ color: '#ffffff' }}
                                  >
                                    Simpan ke Riwayat
                                  </button>
                                </div>
                              ) : (
                                <div className="border border-slate-100 rounded-xl overflow-hidden mt-4 animate-in fade-in duration-200">
                                  <div className="bg-slate-50 p-3 border-b border-slate-100">
                                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Riwayat Pembayaran</h4>
                                  </div>
                                  <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                                    {props.kasirList[selectedKaryawan].paymentHistory?.length ? (
                                      props.kasirList[selectedKaryawan].paymentHistory.map((ph: any) => (
                                        <div key={ph.id} className="p-3 flex items-center justify-between bg-white">
                                          <div className="flex items-center gap-2">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${ph.type === 'bonus' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                              <i className={`fa-solid ${ph.type === 'bonus' ? 'fa-gift' : 'fa-money-bill-wave'}`}></i>
                                            </div>
                                            <div>
                                              <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{ph.type}</p>
                                              <p className="text-[8px] font-bold text-slate-400 mt-0.5">{new Date(ph.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: '2-digit'})}</p>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-xs font-black text-slate-800">Rp {ph.amount.toLocaleString('id-ID')}</p>
                                            {ph.note && <p className="text-[8px] font-bold text-slate-400 mt-0.5 max-w-[80px] truncate">{ph.note}</p>}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="p-4 text-center text-slate-400 bg-white">
                                        <p className="text-[8px] font-bold uppercase tracking-widest">Belum ada riwayat</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                {/* Divider navy */}
                <div className="h-px mx-4" style={{background:'rgba(15,23,42,0.12)'}} />

                {/* Tampilan & Promo */}
                <button
                  onClick={() => setOpenCategory(openCategory === 'promo' ? null : 'promo')}
                  className="w-full flex items-center px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0 mr-3">
                    <i className="fa-solid fa-bullhorn text-xs"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-gray-900 leading-tight">Tampilan &amp; Promo</p>
                    <p className="text-[9px] text-gray-400 font-medium mt-0.5">Banner, running text, dan pengumuman</p>
                  </div>
                  <i className={cn("fa-solid fa-chevron-down text-[10px] text-gray-300 ml-2 transition-transform duration-200", openCategory === 'promo' && "rotate-180")} />
                </button>
                {openCategory === 'promo' && (
                  <div className="mt-2 p-5 bg-orange-50/30 border border-orange-100 rounded-[2rem] animate-in slide-in-from-top-2 duration-300 space-y-5">
                    <div>
                      <label className="text-[9px] font-black text-orange-600 uppercase tracking-tight ml-1 mb-2 block">Teks Utama (Highlight)</label>
                      <input
                        type="text"
                        value={localMainAnnouncement}
                        onChange={(e) => setLocalMainAnnouncement(e.target.value)}
                        onBlur={() => {
                          if (localMainAnnouncement !== props.mainAnnouncement) {
                            props.onSaveMainAnnouncement?.(localMainAnnouncement)
                          }
                        }}
                        placeholder="Contoh: Promo Aksesoris 20%..."
                        className="w-full bg-white border border-orange-100 rounded-xl px-4 py-3 text-xs font-black text-gray-900 placeholder:text-gray-400 focus:ring-4 focus:ring-orange-100 transition-all outline-none"
                      />
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-tight">Teks Tambahan (Max 15 Baris)</label>
                        <span className="text-[8px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">Slide Berjalan</span>
                      </div>
                      <div className="relative group/textarea">
                        <textarea
                          rows={8}
                          value={localRunningTextsText}
                          onChange={(e) => setLocalRunningTextsText(e.target.value)}
                          onBlur={() => {
                            const lines = localRunningTextsText.split('\n');
                            const newTexts = Array(15).fill('');
                            lines.slice(0, 15).forEach((line, i) => {
                              newTexts[i] = line;
                            });
                            props.onSaveRunningTexts?.(newTexts);
                          }}
                          placeholder="Tulis pesan per baris di sini...&#10;Baris 1: Promo Pulsa&#10;Baris 2: Promo Aksesoris&#10;..."
                          className="w-full bg-white border border-gray-100 group-hover/textarea:border-orange-200 rounded-2xl px-4 py-3 text-[11px] font-bold text-gray-900 placeholder:text-gray-300 focus:bg-white focus:ring-4 focus:ring-orange-50 transition-all outline-none resize-none min-h-[200px]"
                        />
                        <div className="absolute bottom-3 right-4 text-[8px] font-black text-gray-300 pointer-events-none">
                          ENTER UNTUK BARIS BARU
                        </div>
                      </div>
                      <p className="text-[8px] text-gray-400 mt-2 ml-1 italic">* Setiap baris akan muncul bergantian di dashboard.</p>
                    </div>
                  </div>
                )}

                {/* Divider navy */}
                <div className="h-px mx-4" style={{background:'rgba(15,23,42,0.12)'}} />

                {/* Pantau Dashboard */}
                <button
                  onClick={() => setOpenCategory(openCategory === 'pantau' ? null : 'pantau')}
                  className="w-full flex items-center px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mr-3">
                    <i className="fa-solid fa-eye text-xs"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-gray-900 leading-tight">Pantau Dashboard</p>
                    <p className="text-[9px] text-gray-400 font-medium mt-0.5">Monitor aktivitas dan filter per kasir</p>
                  </div>
                  <i className={cn("fa-solid fa-chevron-down text-[10px] text-gray-300 ml-2 transition-transform duration-200", openCategory === 'pantau' && "rotate-180")} />
                </button>
                {openCategory === 'pantau' && (
                  <div className="mt-2 p-5 bg-indigo-50/50 border border-indigo-100 rounded-[2rem] animate-in slide-in-from-top-2 duration-300 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                          <i className="fa-solid fa-filter text-[10px]"></i>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800">Filter Kasir di Beranda</p>
                          <p className="text-[9px] text-gray-500 font-medium">Tampilkan opsi cek per kasir</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const current = localStorage.getItem(storageKeyFilter) !== 'false';
                          localStorage.setItem(storageKeyFilter, (!current).toString());
                          window.dispatchEvent(new Event('storage')); // Trigger update if needed
                          setSavedStatus(true);
                          setTimeout(() => setSavedStatus(false), 2000);
                        }}
                        className={cn(
                          "w-12 h-6 rounded-full p-1 transition-all duration-300 relative",
                          (localStorage.getItem(storageKeyFilter) !== 'false') ? "bg-indigo-600" : "bg-gray-300"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300",
                          (localStorage.getItem(storageKeyFilter) !== 'false') ? "translate-x-6" : "translate-x-0"
                        )}></div>
                      </button>
                    </div>
                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter px-1 text-center">
                      Aktifkan untuk memantau performa kasir tertentu langsung dari kartu Owner Control.
                    </p>
                  </div>
                )}

                {/* Divider navy */}
                <div className="h-px mx-4" style={{background:'rgba(15,23,42,0.12)'}} />

                {/* Backup & Keamanan */}
                <button
                  onClick={() => setOpenCategory(openCategory === 'backup' ? null : 'backup')}
                  className="w-full flex items-center px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0 mr-3">
                    <i className="fa-solid fa-cloud-arrow-down text-xs"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-gray-900 leading-tight">Backup &amp; Keamanan</p>
                    <p className="text-[9px] text-gray-400 font-medium mt-0.5">Export data JSON/CSV dan reset sistem</p>
                  </div>
                  <i className={cn("fa-solid fa-chevron-down text-[10px] text-gray-300 ml-2 transition-transform duration-200", openCategory === 'backup' && "rotate-180")} />
                </button>

                {openCategory === 'backup' && (
                  <div className="mt-2 p-5 bg-red-50/30 border border-red-100 rounded-[2rem] animate-in slide-in-from-top-2 duration-300 space-y-4">
                    <button
                      onClick={handleExportData}
                      className="w-full flex items-center gap-4 p-4 bg-white border border-red-100 rounded-2xl hover:bg-red-50 transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-md">
                        <i className="fa-solid fa-file-code text-sm"></i>
                      </div>
                      <div className="text-left">
                        <p className="text-[11px] font-black text-gray-800 uppercase tracking-widest leading-none">BACKUP (JSON)</p>
                        <p className="text-[9px] text-gray-400 font-bold mt-1">Format raw data aplikasi</p>
                      </div>
                    </button>

                    <button
                      onClick={handleExportCSV}
                      className="w-full flex items-center gap-4 p-4 bg-white border border-red-100 rounded-2xl hover:bg-red-50 transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-md">
                        <i className="fa-solid fa-file-excel text-sm"></i>
                      </div>
                      <div className="text-left">
                        <p className="text-[11px] font-black text-gray-800 uppercase tracking-widest leading-none">BACKUP EXCEL (CSV)</p>
                        <p className="text-[9px] text-gray-400 font-bold mt-1">Dapat dibuka di Excel & app lain</p>
                      </div>
                    </button>

                    <button
                      onClick={handleResetSystem}
                      className="w-full flex items-center gap-4 p-4 bg-white border border-red-100 rounded-2xl hover:bg-red-50 transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white shadow-md">
                        <i className="fa-solid fa-rotate text-sm"></i>
                      </div>
                      <div className="text-left">
                        <p className="text-[11px] font-black text-red-600 uppercase tracking-widest leading-none">RESET SISTEM</p>
                        <p className="text-[9px] text-gray-400 font-bold mt-1">Kembalikan pengaturan ke awal</p>
                      </div>
                    </button>

                    <p className="text-[8px] text-gray-400 font-bold text-center uppercase tracking-tighter px-4">
                      Selalu lakukan backup sebelum melakukan update besar atau pindah perangkat.
                    </p>
                  </div>
                )}
              </div>
            </div>
            );
          })()}

          {/* ── PROFIL KASIR CARD (di atas Sinkronisasi Cloud) ── */}
          {props.kasirRole === 'kasir' && (() => {
            const myData = props.kasirList?.[props.currentUsername || ''] || {};
            const myName = myData.name || props.kasirName || props.currentUsername || 'Kasir';
            const myAvatar = myData.avatar || '';
            const myJoin = myData.tanggalJoin || '';
            const myTenure = myJoin ? calculateTenure(myJoin) : null;
            const myStats = calculateAttendanceStats(
              props.currentUsername || '',
              myName,
              myJoin,
              props.absensiList || [],
              props.activeStoreId || ''
            );
            // Hitung badge kinerja
            const totalDays = myStats.hadir + myStats.izin + myStats.tidakAbsen;
            const hadirRate = totalDays > 0 ? (myStats.hadir / totalDays) * 100 : 0;
            let badge = { label: 'Baru', icon: '🌱', color: 'bg-slate-100 text-slate-500' };
            if (hadirRate >= 95) badge = { label: 'Bintang', icon: '⭐', color: 'bg-amber-100 text-amber-700' };
            else if (hadirRate >= 80) badge = { label: 'Rajin', icon: '🏅', color: 'bg-emerald-100 text-emerald-700' };
            else if (hadirRate >= 60) badge = { label: 'Cukup', icon: '👍', color: 'bg-blue-100 text-blue-700' };
            else if (totalDays > 0) badge = { label: 'Perlu Evaluasi', icon: '⚠️', color: 'bg-rose-100 text-rose-600' };

            return (
              <>
                {/* Profil Card */}
                <button
                  onClick={() => setShowProfilPanel(true)}
                  className="w-full bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex items-center gap-3.5 active:scale-[0.98] transition-all text-left hover:shadow-md"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-100 to-blue-100 border-2 border-indigo-200 flex items-center justify-center shadow-sm">
                      {myAvatar ? (
                        <img src={myAvatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-black text-indigo-400">{myName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    {/* Online dot */}
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">PROFIL KASIR</p>
                    <p className="text-sm font-black text-gray-900 leading-tight truncate">{myName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                        KASIR
                      </span>
                      <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full', badge.color)}>
                        {badge.icon} {badge.label}
                      </span>
                    </div>
                  </div>

                  {/* Chevron */}
                  <i className="fa-solid fa-chevron-right text-[11px] text-gray-300 shrink-0" />
                </button>

                {/* Bottom Sheet: Detail Profil */}
                {showProfilPanel && (
                  <div className="fixed inset-0 z-[200] flex flex-col justify-end" onClick={() => setShowProfilPanel(false)}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    {/* Sheet */}
                    <div
                      className="relative w-full max-w-md mx-auto bg-white rounded-t-[2rem] max-h-[90dvh] overflow-y-auto pb-10 animate-in slide-in-from-bottom-4 duration-300"
                      onClick={e => e.stopPropagation()}
                    >
                      {/* Handle bar */}
                      <div className="flex justify-center pt-3 pb-1">
                        <div className="w-10 h-1 bg-gray-200 rounded-full" />
                      </div>

                      {/* Header */}
                      <div className="px-5 pt-3 pb-4 border-b border-gray-100">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-100 to-blue-100 border-2 border-indigo-200 flex items-center justify-center shadow-md shrink-0">
                            {myAvatar ? (
                              <img src={myAvatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-3xl font-black text-indigo-400">{myName.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-black text-gray-900 leading-tight">{myName}</h2>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                🧑‍💼 KASIR
                              </span>
                              <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full', badge.color)}>
                                {badge.icon} {badge.label}
                              </span>
                            </div>
                          </div>
                          <button onClick={() => setShowProfilPanel(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-xmark text-gray-500 text-xs" />
                          </button>
                        </div>
                      </div>

                      <div className="px-5 pt-4 space-y-4">

                        {/* Statistik Kehadiran */}
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-3">📊 Kehadiran Bulan Ini</p>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-white rounded-xl p-3 text-center border border-emerald-100">
                              <p className="text-xl font-black text-emerald-600">{myStats.hadir}</p>
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-0.5">HADIR</p>
                            </div>
                            <div className="bg-white rounded-xl p-3 text-center border border-amber-100">
                              <p className="text-xl font-black text-amber-500">{myStats.izin}</p>
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-0.5">IZIN</p>
                            </div>
                            <div className="bg-white rounded-xl p-3 text-center border border-rose-100">
                              <p className="text-xl font-black text-rose-500">{myStats.tidakAbsen}</p>
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-0.5">ABSEN</p>
                            </div>
                          </div>
                          {totalDays > 0 && (
                            <div className="mt-3">
                              <div className="flex justify-between text-[8px] font-bold text-gray-400 mb-1">
                                <span>Tingkat Kehadiran</span>
                                <span className="font-black text-gray-700">{hadirRate.toFixed(0)}%</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all" style={{ width: `${hadirRate}%` }} />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Badge Kinerja */}
                        <div className={cn('rounded-2xl p-4 border flex items-center gap-3', badge.color.replace('text-', 'border-').replace('bg-', 'bg-') + '/40')}>
                          <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm border', badge.color)}>
                            {badge.icon}
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5">Badge Kinerja</p>
                            <p className="font-black text-sm">{badge.label}</p>
                            <p className="text-[9px] font-bold opacity-60 mt-0.5">
                              {hadirRate >= 95 ? 'Kehadiran sempurna! Luar biasa.' :
                               hadirRate >= 80 ? 'Kehadiran sangat baik, pertahankan!' :
                               hadirRate >= 60 ? 'Kehadiran cukup baik, bisa ditingkatkan.' :
                               totalDays > 0 ? 'Kehadiran rendah, perlu evaluasi.' : 'Belum ada data kehadiran.'}
                            </p>
                          </div>
                        </div>

                        {/* Masa Kerja */}
                        {myTenure && (
                          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">💼 Masa Kerja</p>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                <i className="fa-solid fa-calendar-days text-indigo-500 text-sm" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-gray-900">{myTenure.months} Bulan {myTenure.days} Hari</p>
                                <p className="text-[9px] text-gray-400 font-bold">
                                  Mulai {myJoin ? new Date(myJoin).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                </p>
                              </div>
                              {myTenure.totalMonths > 0 && myTenure.totalMonths % 6 === 0 && (
                                <span className="ml-auto text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-1 rounded-xl animate-bounce">🎁 Bonus!</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Data Pribadi */}
                        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">🧑 Data Pribadi</p>
                          <div className="space-y-2.5">
                            {[{ label: 'Nama Lengkap', value: myName, icon: 'fa-user' },
                              { label: 'Tempat, Tgl Lahir', value: [myData.tempatLahir, myData.tanggalLahir ? new Date(myData.tanggalLahir).toLocaleDateString('id-ID') : ''].filter(Boolean).join(', ') || '-', icon: 'fa-cake-candles' },
                              { label: 'Alamat', value: myData.alamat || '-', icon: 'fa-map-marker-alt' },
                              { label: 'Tgl Masuk Kerja', value: myJoin ? new Date(myJoin).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Belum diatur', icon: 'fa-calendar-check' },
                            ].map(({ label, value, icon }) => (
                              <div key={label} className="flex items-start gap-3">
                                <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                                  <i className={cn('fa-solid text-slate-400 text-[10px]', icon)} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">{label}</p>
                                  <p className="text-xs font-bold text-gray-800 leading-snug break-words">{value}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Tombol Edit Profil */}
                        <button
                          onClick={() => { setShowProfilPanel(false); setOpenCategory('kasirSelf'); }}
                          className="w-full bg-indigo-600 text-white font-black py-3 rounded-2xl text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-indigo-200"
                          style={{ color: '#ffffff' }}
                        >
                          <i className="fa-solid fa-pen-to-square" />
                          Edit Profil Saya
                        </button>

                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* Kategori: Pengaturan PIN & Nama Kasir Mandiri */}
          {props.kasirRole === 'kasir' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4 mt-2">
              <button
                onClick={() => setOpenCategory(openCategory === 'kasirSelf' ? null : 'kasirSelf')}
                className="w-full flex items-center px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mr-3">
                  <i className="fa-solid fa-user-lock text-xs"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-gray-900 leading-tight">PIN &amp; NAMA KASIR</p>
                  <p className="text-[9px] text-gray-400 font-medium mt-0.5">Edit nama dan PIN kasir Anda</p>
                </div>
                <i className={cn("fa-solid fa-chevron-down text-[10px] text-gray-300 ml-2 transition-transform duration-200", openCategory === 'kasirSelf' && "rotate-180")} />
              </button>

              {openCategory === 'kasirSelf' && (
                <div className="p-5 bg-indigo-50/30 border-t border-indigo-50 animate-in slide-in-from-top-2 duration-300 space-y-4">
                  {/* Avatar Upload */}
                  <div className="flex justify-center mb-4">
                    <div 
                      onClick={() => {
                        setAvatarEditorSrc(editKasirAvatar || '');
                        setEditorZoom(1);
                        setEditorOffset({ x: 0, y: 0 });
                        setShowAvatarEditor(true);
                      }}
                      className="w-20 h-20 rounded-full border-4 border-white shadow-sm overflow-hidden bg-indigo-100 flex items-center justify-center cursor-pointer hover:opacity-90 active:scale-95 transition-all"
                    >
                      {editKasirAvatar ? (
                        <img src={editKasirAvatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <i className="fa-solid fa-user text-2xl text-indigo-300"></i>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-indigo-900 uppercase tracking-widest block mb-1">Nama Kasir</label>
                    <input
                      type="text"
                      value={editKasirName}
                      onChange={e => setEditKasirName(e.target.value)}
                      className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-2.5 text-xs text-black outline-none focus:border-indigo-400 font-bold"
                      style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-indigo-900 uppercase tracking-widest block mb-1">PIN Kasir (Minimal 4 angka)</label>
                    <div className="relative">
                      <input
                        type={showKasirPin ? "text" : "password"}
                        inputMode="numeric"
                        maxLength={8}
                        value={editKasirPin}
                        onChange={e => setEditKasirPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-2.5 text-xs text-black outline-none focus:border-indigo-400 font-bold tracking-widest"
                        style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowKasirPin(!showKasirPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <i className={showKasirPin ? "fa-solid fa-eye-slash text-xs" : "fa-solid fa-eye text-xs"}></i>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-indigo-900 uppercase tracking-widest block mb-1">Alamat Domisili</label>
                    <input
                      type="text"
                      value={editKasirAlamat}
                      onChange={e => setEditKasirAlamat(e.target.value)}
                      placeholder="Opsional"
                      className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-2.5 text-xs text-black outline-none focus:border-indigo-400 font-bold"
                      style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                    />
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[9px] font-black text-indigo-900 uppercase tracking-widest block mb-1">Tempat Lahir</label>
                      <input
                        type="text"
                        value={editKasirTempatLahir}
                        onChange={e => setEditKasirTempatLahir(e.target.value)}
                        placeholder="Opsional"
                        className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-2.5 text-xs text-black outline-none focus:border-indigo-400 font-bold"
                        style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] font-black text-indigo-900 uppercase tracking-widest block mb-1">Tanggal Lahir</label>
                      <input
                        type="date"
                        value={editKasirTanggalLahir}
                        onChange={e => setEditKasirTanggalLahir(e.target.value)}
                        className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-2.5 text-xs text-black outline-none focus:border-indigo-400 font-bold"
                        style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      if (!editKasirName.trim()) {
                        alert("Nama kasir tidak boleh kosong!");
                        return;
                      }
                      if (editKasirPin.length < 4) {
                        alert("PIN minimal harus 4 digit angka!");
                        return;
                      }
                      try {
                        if (props.onSaveCashierSelf && props.currentUsername) {
                          await props.onSaveCashierSelf(props.currentUsername, {
                            name: editKasirName.trim(),
                            pin: editKasirPin,
                            alamat: editKasirAlamat,
                            tempatLahir: editKasirTempatLahir,
                            tanggalLahir: editKasirTanggalLahir,
                            avatar: editKasirAvatar
                          });
                          setSavedStatus(true);
                          setTimeout(() => setSavedStatus(false), 2000);
                        }
                      } catch (err: any) {
                        alert(err.message || "Gagal menyimpan perubahan kasir");
                      }
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 mt-2"
                    style={{ color: '#ffffff' }}
                  >
                    <i className="fa-solid fa-circle-check"></i>
                    Simpan Perubahan
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── KELOMPOK PENGATURAN SISTEM & APLIKASI ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
            
            {/* Sinkronisasi Cloud */}
            <button
              onClick={() => setOpenCategory(openCategory === 'cloud' ? null : 'cloud')}
              className="w-full flex items-center px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mr-3">
                <i className="fa-solid fa-cloud text-xs"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black text-gray-900 leading-tight">Sinkronisasi Cloud</p>
                <p className="text-[9px] text-gray-400 font-medium mt-0.5">Backup data & samakan setelan dengan perangkat lain</p>
              </div>
              <i className={cn("fa-solid fa-chevron-down text-[10px] text-gray-300 ml-2 transition-transform duration-200", openCategory === 'cloud' && "rotate-180")} />
            </button>
            {openCategory === 'cloud' && (
              <div className="p-5 bg-purple-50/50 border-t border-purple-50 animate-in slide-in-from-top-2 duration-300 space-y-3">
                <button
                  onClick={handleSyncAll}
                  disabled={isCloudLoading}
                  className="w-full bg-purple-600 border border-purple-600 text-white py-3.5 rounded-xl font-black text-[10px] shadow-lg shadow-purple-200 uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-purple-700 disabled:opacity-50"
                  style={{ color: '#ffffff' }}
                >
                  <i className={isCloudLoading ? "fa-solid fa-circle-notch fa-spin" : "fa-solid fa-arrows-rotate"}></i>
                  {isCloudLoading ? 'Sinkronisasi...' : 'Update Sync'}
                </button>
                <div className="flex gap-2">
                  <button onClick={handleUploadToCloud} disabled={isCloudLoading} className="flex-1 bg-white border border-purple-200 text-purple-700 py-2.5 rounded-xl font-black text-[9px] shadow-sm uppercase tracking-widest flex items-center justify-center gap-1.5 active:scale-95 transition-all hover:bg-purple-50 disabled:opacity-50">
                    <i className={isCloudLoading ? "fa-solid fa-circle-notch fa-spin" : "fa-solid fa-cloud-arrow-up"}></i>
                    Upload
                  </button>
                  <button onClick={handleDownloadFromCloud} disabled={isCloudLoading} className="flex-1 bg-white border border-purple-200 text-purple-700 py-2.5 rounded-xl font-black text-[9px] shadow-sm uppercase tracking-widest flex items-center justify-center gap-1.5 active:scale-95 transition-all hover:bg-purple-50 disabled:opacity-50">
                    <i className={isCloudLoading ? "fa-solid fa-circle-notch fa-spin" : "fa-solid fa-cloud-arrow-down"}></i>
                    Download
                  </button>
                </div>
                <p className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter px-1 text-center mt-1">Update Sync = Upload lokal ke cloud, lalu download terbaru dari cloud. Gunakan untuk menyamakan data antar perangkat.</p>
              </div>
            )}

            <div className="h-px mx-4" style={{background:'rgba(15,23,42,0.12)'}} />

            {/* Printer Bluetooth */}
            <button
              onClick={() => setOpenCategory(openCategory === 'printer' ? null : 'printer')}
              className="w-full flex items-center px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mr-3">
                <i className="fa-solid fa-print text-xs"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black text-gray-900 leading-tight">Printer Bluetooth</p>
                <p className="text-[9px] text-gray-400 font-medium mt-0.5">Koneksi Hardware Thermal</p>
              </div>
              <i className={cn("fa-solid fa-chevron-down text-[10px] text-gray-300 ml-2 transition-transform duration-200", openCategory === 'printer' && "rotate-180")} />
            </button>
            {openCategory === 'printer' && (
              <div className="p-5 bg-slate-50 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300 space-y-4">
                 {/* Native Bluetooth Section (Mobile) */}
                 <div className="p-4 bg-white border border-slate-200 rounded-xl">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${btConnected ? 'bg-emerald-500' : btConnecting ? 'bg-amber-400' : 'bg-red-500'}`}></div>
                        <div>
                          <h4 className="text-[10px] font-extrabold text-slate-800 uppercase">PRINTER NATIVE</h4>
                          <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">
                            {btConnected ? `TERHUBUNG (${btMacAddress})` : btConnecting ? 'MENYAMBUNGKAN...' : 'DISCONNECTED'}
                          </p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={btConnected ? disconnectBluetooth : scanBluetoothDevices}
                        disabled={btConnecting || isScanningBt}
                        className={`text-[8px] font-black px-3 py-1.5 rounded-lg active:scale-95 transition-all shadow-sm
                          ${btConnected 
                            ? 'bg-rose-50 border border-rose-200 text-rose-600' 
                            : 'bg-blue-600 text-white'
                          }
                        `}
                      >
                        {btConnected ? 'PUTUSKAN' : isScanningBt ? 'MENCARI...' : 'CARI'}
                      </button>
                    </div>
                    
                    {!btConnected && pairedDevices.length > 0 && (
                      <div className="mt-3 border-t border-slate-100 pt-2">
                        <p className="text-[8px] font-bold text-slate-500 mb-1.5">PILIH PRINTER:</p>
                        <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                          {pairedDevices.map((device) => (
                            <button
                              key={device.address}
                              onClick={() => connectToBluetooth(device.address)}
                              disabled={btConnecting}
                              className="w-full flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg active:bg-blue-50 text-left"
                            >
                              <div>
                                <p className="text-[9px] font-bold text-slate-800">{device.name || 'Unknown Device'}</p>
                                <p className="text-[7px] font-mono text-slate-400">{device.address}</p>
                              </div>
                              <span className="text-[8px] font-black text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">CONNECT</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                 </div>

                 <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                    <div className="flex items-start gap-3">
                       <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                          <i className="fa-brands fa-bluetooth-b"></i>
                       </div>
                       <div>
                          <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-0.5">Driver Printer RawBT</h4>
                          <p className="text-[9px] text-slate-600 font-bold leading-relaxed mb-3">
                            Aplikasi menggunakan intent. Pastikan aplikasi <strong className="text-blue-600">RawBT Print Service</strong> terinstal dari Play Store.
                          </p>
                          <div className="flex gap-2 flex-col">
                            <a 
                              href="https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter" 
                              target="_blank"
                              rel="noreferrer"
                              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all text-center"
                              style={{ color: '#ffffff' }}
                            >
                              <i className="fa-brands fa-google-play mr-1.5"></i> Download RawBT
                            </a>
                            <button 
                              onClick={() => {
                                const w = 32;
                                const center = (s: string) => ' '.repeat(Math.max(0, Math.floor((w - s.length) / 2))) + s;
                                const text = center('TEST PRINT BERHASIL') + '\n'
                                  + center('Koneksi RawBT & Aplikasi Kasir') + '\n'
                                  + center('berjalan normal.') + '\n'
                                  + '-'.repeat(w) + '\n\n\n';
                                  
                                const btMac = localStorage.getItem('bluetooth_printer_mac');
                                if (btMac && (window as any).bluetoothSerial) {
                                  (window as any).bluetoothSerial.write(text, () => {}, (err: any) => alert('Test print native gagal: ' + err));
                                } else {
                                  const url = `rawbt:${encodeURIComponent(text)}`;
                                  const a = document.createElement('a'); a.href = url; document.body.appendChild(a); a.click(); document.body.removeChild(a);
                                }
                              }}
                              className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all text-center"
                            >
                              <i className="fa-solid fa-print mr-1.5"></i> Tes Print
                            </button>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-500 font-semibold uppercase mt-4">
                    <div className="p-3 border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col justify-center items-center text-center">
                       <i className="fa-solid fa-text-width text-slate-400 mb-1.5"></i>
                       <span className="block text-[8px] text-slate-400 font-bold mb-0.5">DUKUNGAN</span>
                       <span className="font-extrabold text-slate-700">58mm & 80mm</span>
                    </div>
                    <div className="p-3 border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col justify-center items-center text-center">
                       <i className="fa-solid fa-bolt text-slate-400 mb-1.5"></i>
                       <span className="block text-[8px] text-slate-400 font-bold mb-0.5">MODE</span>
                       <span className="font-extrabold text-slate-700">ESC/POS</span>
                    </div>
                 </div>
              </div>
            )}

            <div className="h-px mx-4" style={{background:'rgba(15,23,42,0.12)'}} />

            {/* Teks Otomatis */}
            <button
              onClick={() => props.setActiveView?.('view-otomatis')}
              className="w-full flex items-center px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mr-3">
                <i className="fa-solid fa-bolt text-xs"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black text-gray-900 leading-tight">Teks Otomatis</p>
                <p className="text-[9px] text-gray-400 font-medium mt-0.5">Setting keterangan otomatis</p>
              </div>
              <i className="fa-solid fa-chevron-right text-[10px] text-gray-300 ml-2" />
            </button>
          </div>

          {/* Tombol Simpan Perubahan (Visual Confirmation) */}
          <button
            onClick={() => {
              setSavedStatus(true);
              setTimeout(() => setSavedStatus(false), 2000);
            }}
            className={cn(
              "w-full rounded-2xl font-black py-4 px-5 text-sm mt-8 shadow-lg transition-all flex items-center justify-center gap-3",
              savedStatus
                ? "bg-emerald-600 text-white scale-[0.98]"
                : "bg-slate-900 text-white hover:bg-slate-800 active:scale-95"
            )}
          >
            {savedStatus ? (
              <>
                <i className="fa-solid fa-circle-check animate-bounce"></i>
                BERHASIL DISIMPAN!
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk text-slate-400"></i>
                SIMPAN PERUBAHAN
              </>
            )}
          </button>

          <button
            onClick={() => {
              props.onRequestLogout?.();
            }}
            className="w-full bg-red-50 text-red-600 rounded-2xl font-bold py-4 px-5 text-sm mt-3 shadow-sm hover:bg-red-100 transition-all flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-right-from-bracket"></i>
            Keluar Aplikasi
          </button>
        </div>

        <p className="text-center text-[10px] text-gray-300 mt-10">Versi 1.2.0 (Production)</p>
      </div>

      {/* ── Avatar Crop & Detail Modal ── */}
      {showAvatarEditor && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center z-[999] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-700 flex flex-col items-center">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-1">Foto Profil Kasir</h3>
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-6">Geser & Zoom untuk memposisikan foto</p>

            {/* Crop Area Container */}
            <div className="relative w-64 h-64 rounded-full border-4 border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-900 shadow-inner flex items-center justify-center mb-6">
              {avatarEditorSrc ? (
                <div 
                  className="w-full h-full relative overflow-hidden select-none touch-none"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  style={{ cursor: isDraggingEditor ? 'grabbing' : 'grab' }}
                >
                  <img 
                    src={avatarEditorSrc} 
                    alt="Editor Preview" 
                    className="absolute max-w-none pointer-events-none select-none"
                    style={{
                      width: '256px',
                      height: '256px',
                      objectFit: 'cover',
                      left: '0px',
                      top: '0px',
                      transform: `translate(${editorOffset.x}px, ${editorOffset.y}px) scale(${editorZoom})`,
                      transformOrigin: 'center'
                    }}
                  />
                </div>
              ) : (
                <i className="fa-solid fa-user text-5xl text-slate-300 dark:text-slate-700"></i>
              )}
            </div>

            {/* Slider Zoom */}
            {avatarEditorSrc && (
              <div className="w-full px-6 mb-6">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  <span>Zoom</span>
                  <span>{Math.round(editorZoom * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="3" 
                  step="0.05"
                  value={editorZoom} 
                  onChange={(e) => setEditorZoom(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setShowAvatarEditor(false)}
                className="flex-1 py-3 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
              >
                Batal
              </button>
              
              {/* Hidden File Input */}
              <input 
                type="file" 
                id="avatar-editor-file-input"
                accept="image/*" 
                className="hidden" 
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      // Compress to base64 first
                      const base64 = await compressImage(file, 800, 800, 0.85);
                      setAvatarEditorSrc(base64);
                      setEditorZoom(1);
                      setEditorOffset({ x: 0, y: 0 });
                    } catch (err) {
                      alert("Gagal memproses foto");
                    }
                  }
                }} 
              />
              <button 
                onClick={() => document.getElementById('avatar-editor-file-input')?.click()}
                className="flex-1 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <i className="fa-solid fa-camera"></i> Ganti Foto
              </button>

              {avatarEditorSrc && (
                <button 
                  onClick={handleSaveCroppedImage}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-md flex items-center justify-center gap-1.5"
                  style={{ color: '#ffffff' }}
                >
                  <i className="fa-solid fa-check"></i> Simpan
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Karyawan Avatar Zoom Lightbox ── */}
      {showKaryawanAvatarZoom && (
        <div 
          onClick={() => setShowKaryawanAvatarZoom(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-[1000] p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={e => e.stopPropagation()} 
            className="relative max-w-xs w-full flex flex-col items-center animate-in zoom-in-95 duration-200"
          >
            {/* Round Avatar Zoom */}
            <div className="w-64 h-64 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-slate-900 flex items-center justify-center mb-6">
              <img src={karyawanAvatarZoomSrc} alt="Avatar Zoom" className="w-full h-full object-cover" />
            </div>

            {/* Tutup Button */}
            <button 
              onClick={() => setShowKaryawanAvatarZoom(false)}
              className="py-3 px-8 bg-white/10 hover:bg-white/20 text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all border border-white/20 backdrop-blur-sm shadow-md"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AkunView
