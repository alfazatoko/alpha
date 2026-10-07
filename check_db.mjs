const url = 'https://bxlxywxmrgsoimkjhtha.supabase.co/rest/v1/store_settings?select=store_id,kontak_data,kasbon_data,catatan_owner_data';
const key = 'sb_publishable_LvkCEAr8lgYz0VJbPMxiCw_kQsA8E3R';

async function main() {
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    
    if (!res.ok) {
      console.error("HTTP error:", res.status, await res.text());
      return;
    }
    
    const data = await res.json();
    console.log("Found", data.length, "store_settings records.");
    
    for (const store of data) {
      console.log(`\nStore: ${store.store_id}`);
      const kontak = store.kontak_data;
      const kasbon = store.kasbon_data;
      const catatan = store.catatan_owner_data;
      
      console.log(`  Kontak type: ${typeof kontak}, IsArray: ${Array.isArray(kontak)}, Length: ${Array.isArray(kontak) ? kontak.length : (kontak ? Object.keys(kontak).length : 0)}`);
      console.log(`  Kasbon type: ${typeof kasbon}, IsArray: ${Array.isArray(kasbon)}, Length: ${Array.isArray(kasbon) ? kasbon.length : (kasbon ? Object.keys(kasbon).length : 0)}`);
      console.log(`  Catatan type: ${typeof catatan}, IsArray: ${Array.isArray(catatan)}, Length: ${Array.isArray(catatan) ? catatan.length : (catatan ? Object.keys(catatan).length : 0)}`);
    }
  } catch (e) {
    console.error("Fetch error:", e);
  }
}

main();
