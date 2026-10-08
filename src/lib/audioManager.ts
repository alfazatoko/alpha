import { supabase } from './supabase';

const audioCache: Record<string, string> = {};

export async function preloadTransactionSound(storeId: string) {
  if (!storeId || storeId === 'all') return;
  try {
    const { data } = await supabase
      .from('store_settings')
      .select('audio_settings')
      .eq('store_id', storeId)
      .maybeSingle();

    if (data?.audio_settings?.transaction_sound_url) {
      const url = data.audio_settings.transaction_sound_url;
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        if (audioCache[storeId]) {
          URL.revokeObjectURL(audioCache[storeId]);
        }
        const blobUrl = URL.createObjectURL(blob);
        audioCache[storeId] = blobUrl;
      } catch (e) {
        console.error('Failed to preload audio', e);
      }
    } else {
        if (audioCache[storeId]) {
          URL.revokeObjectURL(audioCache[storeId]);
          delete audioCache[storeId];
        }
    }
  } catch (err) {
    console.error('Error preloading sound:', err);
  }
}

export function playTransactionSound(storeId: string) {
  if (audioCache[storeId]) {
    const audio = new Audio(audioCache[storeId]);
    audio.play().catch(e => console.error('Audio play failed', e));
    return;
  }
  
  // Default "Ting" sound using Web Audio API
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    // Frequency for a nice "Ting"
    osc.frequency.setValueAtTime(1046.50, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    // Quick attack, slow decay
    gainNode.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch(e) {
    console.error('Web Audio API failed', e);
  }
}
