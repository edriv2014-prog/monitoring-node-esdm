// Vercel Serverless Function - akan jadi https://monitoring-node-esdm.vercel.app/api/send-email
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // CORS biar gak diblok
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html } = req.body;
  if (!to) return res.status(400).json({ error: 'Email tujuan kosong' });

  try {
    // Kalau belum set RESEND_API_KEY, jangan error, cuma log aja
    if (!process.env.RESEND_API_KEY) {
      console.log('[SKIP EMAIL] Belum set RESEND_API_KEY. To:', to, 'Subject:', subject);
      return res.json({ ok: true, skipped: true });
    }

    const data = await resend.emails.send({
      from: 'ESDM Monitoring <onboarding@resend.dev>', // ganti kalau udah verifikasi domain
      to: to,
      subject: subject,
      html: html,
    });

    console.log('Email terkirim:', data);
    return res.json({ ok: true, id: data.id });
  } catch (e) {
    console.error('Gagal kirim email:', e);
    return res.status(500).json({ error: e.message });
  }
}