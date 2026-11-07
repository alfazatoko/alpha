import { supabase } from './supabase';

export interface AudioPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'synth' | 'file';
  url?: string;
}

export const AUDIO_PRESETS: AudioPreset[] = [
  {
    id: 'ting',
    name: 'Ting Klasik',
    description: 'Suara ting lembut elegan bawaan',
    icon: 'fa-bell',
    type: 'synth'
  },
  {
    id: 'koin',
    name: 'Koin Kasir',
    description: 'Bunyi koin jatuh ke laci kasir',
    icon: 'fa-coins',
    type: 'synth'
  },
  {
    id: 'bell',
    name: 'Bell Toko',
    description: 'Lonceng kasir / register toko renyah',
    icon: 'fa-concierge-bell',
    type: 'synth'
  },
  {
    id: 'chime',
    name: 'Chime Sukses',
    description: 'Nada ceria harmonis 3 tangga nada',
    icon: 'fa-music',
    type: 'synth'
  },
  {
    id: 'beep',
    name: 'Digital Beep',
    description: 'Bunyi scanner barcode POS modern',
    icon: 'fa-barcode',
    type: 'synth'
  },
  {
    id: 'musik_khusus',
    name: 'Musik Notifikasi Alfaza',
    description: 'Nada khusus toko (pilihan owner)',
    icon: 'fa-headphones',
    type: 'file',
    url: '/sounds/notif_khusus.mp3'
  }
];

const audioCache: Record<string, string> = {};

// Synthesizer Web Audio API murni (0KB, tidak butuh internet, suara jernih seketika)
export function playSynthSound(presetId: string = 'ting') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (presetId === 'koin') {
      // Dua nada frekuensi logam (B5 987Hz & E6 1318Hz)
      const now = ctx.currentTime;
      [987.77, 1318.51].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0, now + idx * 0.05);
        gain.gain.linearRampToValueAtTime(0.7, now + idx * 0.05 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.38);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.38);
      });
    } else if (presetId === 'bell') {
      // Bell register (880Hz A5 & 1760Hz A6)
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc2.frequency.setValueAtTime(1760, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.85, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.55);
      osc2.stop(now + 0.55);
    } else if (presetId === 'chime') {
      // Arpeggio 3 nada naik: C5 (523Hz), E5 (659Hz), G5 (784Hz)
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.07;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.75, startTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.45);
      });
    } else if (presetId === 'beep') {
      // Crisp POS barcode scanner beep (1400Hz)
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.65, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } else {
      // Default Ting Klasik (1046.50 Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch (e) {
    console.error('Web Audio API synth failed', e);
  }
}

export function playAudioUrl(url: string) {
  try {
    const audio = new Audio(url);
    audio.play().catch(e => {
      console.warn('Audio play failed, falling back to synth', e);
      playSynthSound('ting');
    });
  } catch (err) {
    playSynthSound('ting');
  }
}

export function playPresetSound(presetId: string, customUrl?: string) {
  if (presetId === 'custom' && customUrl) {
    playAudioUrl(customUrl);
    return;
  }
  const preset = AUDIO_PRESETS.find(p => p.id === presetId);
  if (preset?.type === 'file' && preset.url) {
    playAudioUrl(preset.url);
    return;
  }
  playSynthSound(presetId);
}

export async function preloadTransactionSound(storeId: string) {
  if (!storeId || storeId === 'all') return;
  try {
    const { data } = await supabase
      .from('store_settings')
      .select('audio_settings')
      .eq('store_id', storeId)
      .maybeSingle();

    if (data?.audio_settings) {
      const audioSettings = data.audio_settings;
      localStorage.setItem(`alphaPro_${storeId}_audio_settings`, JSON.stringify(audioSettings));

      if (audioSettings.transaction_sound_url && audioSettings.transaction_sound_type === 'custom') {
        const url = audioSettings.transaction_sound_url;
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          if (audioCache[storeId]) {
            URL.revokeObjectURL(audioCache[storeId]);
          }
          audioCache[storeId] = URL.createObjectURL(blob);
        } catch (e) {
          console.error('Failed to preload audio', e);
        }
      }
    }
  } catch (err) {
    console.error('Error preloading sound:', err);
  }
}

export function playTransactionSound(storeId?: string) {
  const targetStoreId = storeId || localStorage.getItem('alphaPro_active_store_id') || localStorage.getItem('alphaPro_pantau_store_id') || '';

  // 1. Cek dari localStorage (instan & offline)
  let audioSettings: any = null;
  if (targetStoreId && targetStoreId !== 'all') {
    const saved = localStorage.getItem(`alphaPro_${targetStoreId}_audio_settings`);
    if (saved) {
      try { audioSettings = JSON.parse(saved); } catch (e) {}
    }
  }
  if (!audioSettings) {
    const fallback = localStorage.getItem('alphaPro_audio_settings');
    if (fallback) {
      try { audioSettings = JSON.parse(fallback); } catch (e) {}
    }
  }

  // 2. Mainkan sesuai preset atau custom url
  if (audioSettings) {
    const soundType = audioSettings.transaction_sound_type || 'ting';
    if (soundType === 'custom' && audioSettings.transaction_sound_url) {
      playAudioUrl(audioSettings.transaction_sound_url);
      return;
    }
    if (soundType === 'custom' && targetStoreId && audioCache[targetStoreId]) {
      playAudioUrl(audioCache[targetStoreId]);
      return;
    }
    const preset = AUDIO_PRESETS.find(p => p.id === soundType);
    if (preset?.type === 'file' && preset.url) {
      playAudioUrl(preset.url);
      return;
    }
    playSynthSound(soundType);
    return;
  }

  // 3. Jika ada audioCache blob
  if (targetStoreId && audioCache[targetStoreId]) {
    playAudioUrl(audioCache[targetStoreId]);
    return;
  }

  // 4. Default Ting
  playSynthSound('ting');
}
