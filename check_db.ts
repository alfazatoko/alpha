import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bxlxywxmrgsoimkjhtha.supabase.co',
  'sb_publishable_LvkCEAr8lgYz0VJbPMxiCw_kQsA8E3R'
);

async function main() {
  const { data, error } = await supabase.from('store_settings').select('store_id, kontak_data, kasbon_data, catatan_owner_data');
  if (error) {
    console.error("Error fetching store_settings:", error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log("No store settings found.");
    return;
  }
  
  for (const store of data) {
    console.log(`\nStore: ${store.store_id}`);
    const kontak = store.kontak_data;
    const kasbon = store.kasbon_data;
    const catatan = store.catatan_owner_data;
    
    console.log(`  Kontak type: ${typeof kontak}, IsArray: ${Array.isArray(kontak)}, Length: ${Array.isArray(kontak) ? kontak.length : (kontak ? Object.keys(kontak).length : 0)}`);
    console.log(`  Kasbon type: ${typeof kasbon}, IsArray: ${Array.isArray(kasbon)}, Length: ${Array.isArray(kasbon) ? kasbon.length : (kasbon ? Object.keys(kasbon).length : 0)}`);
    console.log(`  Catatan type: ${typeof catatan}, IsArray: ${Array.isArray(catatan)}, Length: ${Array.isArray(catatan) ? catatan.length : (catatan ? Object.keys(catatan).length : 0)}`);
    
    if (Array.isArray(kontak) && kontak.length > 0) {
      console.log(`  Sample kontak:`, JSON.stringify(kontak[0]).slice(0, 100));
    }
  }
}

main().catch(console.error);
