import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Mengizinkan request dari aplikasi React/Capacitor
app.use(express.json({ limit: '10mb' })); // Limit besar karena base64 gambar lumayan besar

app.get('/', (req, res) => {
  res.send('API AI Kasir Aktif! Gunakan endpoint /api/extract-voucher');
});

// Endpoint untuk mengekstrak foto voucher
app.post('/api/extract-voucher', async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Gambar tidak ditemukan di request" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Backend error: API Key belum dikonfigurasi di server." });
    }

    // Inisialisasi AI menggunakan kunci dari environment
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: { temperature: 0.1 }
    });

    console.log("Menerima request analisis gambar...");

    // Siapkan gambar untuk Gemini
    const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    
    const promptText = `
Anda adalah asisten AI Kasir.
Ekstrak daftar produk fisik / kartu fisik / voucher fisik dari gambar struk/kartu ini.
Abaikan logo, teks promo, alamat, dll. Fokus pada list barang yang bisa dijual (kartu perdana, voucher kuota, aksesoris, dll).
Kembalikan HANYA array JSON tanpa format markdown. Array harus berisi object dengan format: { name: string, category: string, hargaModal: number, hargaJual: number, stok: number }. category WAJIB pilih dari: TELKOMSEL, XL, AXIS, INDOSAT, TRI, SMARTFREN, BY.U, E-TOLL, LAINNYA. Jika kosong, asumsikan 0. Jangan jelaskan apapun, murni JSON.
`;

    const result = await model.generateContent([
      promptText,
      {
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg'
        }
      }
    ]);

    const outputText = result.response.text() || "";
    console.log("Ekstrak berhasil!");
    
    // Kirim balik ke front-end
    res.json({
      success: true,
      data: outputText
    });

  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ 
      error: "Gagal memproses gambar melalui AI",
      details: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`✅ Backend AI berjalan di port ${port}`);
  console.log(`URL Endpoint: http://localhost:${port}/api/extract-voucher`);
});
