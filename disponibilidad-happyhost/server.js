const express = require('express');
const cors    = require('cors');
const axios   = require('axios');
const ical    = require('node-ical');
const nodemailer = require('nodemailer');
const app      = express();
const PORT = process.env.PORT || 3000;
const API_KEY  = 'tQF5BDMXbeN/vkKMRZiWKwM461gD8wL16EtUbwboi1OayWd3VZ24FMNKAuCF+3+m';
const BASE_URL = 'https://api.lodgify.com';
const cache    = {};
const CACHE_TTL_MS = 1000 * 60 * 3; // 3 minutos

const propiedades = {
  601552: 'Calafate 1',
  601707: 'Calafate 2',
  601708: 'Calafate 3',
  601710: 'Calafate 4',
  601711: 'Calafate 5',
  601712: 'Calafate 6',
  601713: 'Calafate 7',
  601717: 'Cruz del Sur 4',
  601714: 'Cruz del Sur 5',
  601719: 'Las Nilidas',
  648950: 'Gurisa',
  601720: 'Paisajismo'
};

app.use(cors());
app.use(express.json());

// Endpoint para precios diarios
app.get('/api/precios-diarios', async (req, res) => {
  const { start, end, houseId, roomId } = req.query;
  if (!start || !end || !houseId || !roomId) {
    return res.status(400).json({ success: false, message: 'Faltan parámetros' });
  }

  try {
    const lodgifyRes = await axios.get(`${BASE_URL}/v1/rates/calendar`, {
      headers: { 'X-ApiKey': API_KEY, Accept: 'application/json' },
      params: { HouseId: houseId, RoomTypeId: roomId, startDate: start, endDate: end }
    });

    const raw    = lodgifyRes.data;
    const dias   = Array.isArray(raw) ? raw : raw.dailyRates || [];
    const extras = Array.isArray(raw)
      ? (raw.guest_based_prices || raw.guestBasedPrices || [])
      : (raw.guest_based_prices || raw.guestBasedPrices || []);

    res.json({ dias, extras });
  } catch (e) {
    console.error('⛔ precios-diarios:', e.response?.data || e.message);
    res.status(500).json({ success: false, message: 'Error al consultar precios diarios.' });
  }
});

// URLs de calendarios
const icsUrls = {
  calafate1: 'https://www.lodgify.com/c5ff6e9d-c94a-4a0f-9633-511c8069d3d7.ics',
  calafate2: 'https://www.lodgify.com/4c434567-54bf-460c-84dc-afd111b90f76.ics',
  calafate3: 'https://www.lodgify.com/7afbf491-bad1-443d-bca0-83cb960b7d9a.ics',
  calafate4: 'https://www.lodgify.com/32bdc6a2-1dc4-43dc-9c97-593d07714288.ics',
  calafate5: 'https://www.lodgify.com/3d9233f1-b2e6-4070-b7c9-67353f3f0e6f.ics',
  calafate6: 'https://www.lodgify.com/0bfc0b14-fea7-488c-bcc9-a07b6c063be7.ics',
  calafate7: 'https://www.lodgify.com/b8419f93-3be3-42f0-87dc-b8ad622de155.ics',
  cruzdelsur4: 'https://www.lodgify.com/6b8f84da-cbd7-43aa-83c1-3fa6e19f7132.ics',
  cruzdelsur5: 'https://www.lodgify.com/ed954054-39e2-4193-b06b-dc2013fed6b5.ics',
  nilidas:     'https://www.lodgify.com/62265ea3-79f4-4ead-ac12-95ed3266c6fb.ics',
  gurisa:      'https://www.lodgify.com/255b2a6d-26ce-469f-8d84-58443c3f361f.ics',
  paisajismo:  'https://www.lodgify.com/bd2720b5-ee80-4173-96bf-5fb5aafb84d1.ics'
};
// Endpoint de ocupados desde .ics
app.get('/api/ocupados/:casa', async (req, res) => {
  const nombre = req.params.casa;
  const url = icsUrls[nombre];

  if (!url) {
    return res.status(400).json({ success: false, message: 'Casa no encontrada' });
  }

  try {
    // Si está cacheado, devolvemos rápido
    if (cache[nombre] && (Date.now() - cache[nombre].timestamp < CACHE_TTL_MS)) {
      return res.json(cache[nombre].data);
    }

    const data = await ical.fromURL(url);
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

    const eventos = Object.values(data)
  .filter(ev => ev.type === 'VEVENT')
  .map(ev => {
    const inicio = new Date(ev.start);
    const fin    = new Date(ev.end);
    if (fin < hoy) return null; // ⛔ Ignoramos eventos que ya pasaron

    const desde = new Date(inicio);
    desde.setDate(desde.getDate() + 1);
    const from = desde.toISOString().split('T')[0];

    const hasta = new Date(fin);
    hasta.setDate(hasta.getDate() - 1);
    const to = hasta.toISOString().split('T')[0];

    console.log('⏳ Evento leído:', ev.summary, '→', from, 'a', to);

    return { from, to };
  })
  .filter(Boolean);


    // Guardamos en cache
    cache[nombre] = {
      data: eventos,
      timestamp: Date.now()
    };

    res.json(eventos);
  } catch (err) {
    console.error('⛔ Error al cargar el .ics:', err.message);
    res.status(500).json({ success: false, message: 'Error al cargar .ics' });
  }
});

// Chequear alojamientos disponibles
app.get('/api/disponibles', async (req, res) => {
  const { checkin, checkout } = req.query;

  if (!checkin || !checkout) {
    return res.status(400).json({ success: false, message: 'Faltan fechas' });
  }

  const cacheKey = `${checkin}-${checkout}`;
  const now = Date.now();

  if (cache[cacheKey] && (now - cache[cacheKey].timestamp < CACHE_TTL_MS)) {
    return res.json({ disponibles: cache[cacheKey].data });
  }

  const fechasBuscadas = [];
  const dInicio = new Date(checkin);
  const dFin    = new Date(checkout);
  for (let d = new Date(dInicio); d < dFin; d.setDate(d.getDate() + 1)) {
    fechasBuscadas.push(d.toISOString().split('T')[0]);
  }

  const disponibles = [];

  for (const [nombre, url] of Object.entries(icsUrls)) {
    try {
      const data = await ical.fromURL(url);
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

      const ocupadas = [];

      for (const ev of Object.values(data)) {
        if (ev.type !== 'VEVENT') continue;
        const inicio = new Date(ev.start);
        const fin    = new Date(ev.end);
        if (fin < hoy) continue;

        for (let d = new Date(inicio); d < fin; d.setDate(d.getDate() + 1)) {
          ocupadas.push(d.toISOString().split('T')[0]);
        }
      }

      const cruce = fechasBuscadas.some(f => ocupadas.includes(f));
      if (!cruce) disponibles.push(nombre);

    } catch (e) {
      console.error(`Error al procesar ${nombre}:`, e.message);
    }
  }

  cache[cacheKey] = {
    data: disponibles,
    timestamp: now
  };

  res.json({ disponibles });
});

// Enviar reserva por mail
app.post('/enviar-reserva', async (req, res) => {
  const {
    nombre, email, telefono, comentarios,
    propertyId, roomTypeId, checkInDate,
    checkOutDate, numberOfGuests, totalPrice
  } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'complejocalafatevla@gmail.com',
      pass: 'wumwuhlgxzqflbeu'
    }
  });

  const mailOptions = {
    from: 'complejocalafatevla@gmail.com',
    to: 'happyhostpatagonia@gmail.com',
    subject: '🛎️ Nueva solicitud de reserva - Happy Host',
    html: `
      <h2>Detalles de la reserva</h2>
      <p><strong>Nombre:</strong> ${nombre}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Teléfono:</strong> ${telefono}</p>
      <p><strong>Fechas:</strong> ${checkInDate} → ${checkOutDate}</p>
      <p><strong>Huéspedes:</strong> ${numberOfGuests}</p>
      <p><strong>Total:</strong> $${totalPrice}</p>
      <p><strong>Comentarios:</strong> ${comentarios || 'Sin comentarios'}</p>
      <p><strong>Property ID:</strong> ${propertyId}</p>
      <p><strong>Propiedad:</strong> ${propiedades[propertyId] || 'Desconocida'}</p>
      <p><strong>Room Type ID:</strong> ${roomTypeId}</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: '📨 Correo enviado con éxito' });
  } catch (err) {
    console.error('❌ Error al enviar el correo:', err);
    res.status(500).json({ success: false, message: 'Error al enviar el correo' });
  }
});

// Iniciar server
app.listen(PORT, () =>
  console.log(`⚡ Server corriendo en http://localhost:${PORT}`)
);



// notificaciones con Pushover


app.use(express.json());

// Habilitar CORS para permitir peticiones desde el navegador
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Podés reemplazar * por tu origen exacto si querés más seguro
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.post('/notificar-reserva', async (req, res) => {
  const {
    nombre,
    telefono,
    email,
    comentarios,
    checkin,
    checkout,
    huespedes,
    propiedad,
    total,
    senia
  } = req.body;

  const mensaje = `Nueva reserva:
🏡 Propiedad: ${propiedad}
👤 Nombre: ${nombre}
📧 Email: ${email}
📱 Teléfono: ${telefono}
💬 Comentarios: ${comentarios || 'Ninguno'}
📅 Check-in: ${checkin}
📅 Check-out: ${checkout}
👥 Huéspedes: ${huespedes}
💲 Total: ${total}
💲 Seña: ${senia}`;

  try {
    await axios.post('https://api.pushover.net/1/messages.json', {
      token: 'a8nyif562ezb7sc9buqt8aioybkp5n',
      user: 'uhwyimqvtop7fswmvs4p6i5e69nomg',
      message: mensaje
    });

    res.send({ status: 'Notificación enviada' });
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    res.status(500).send({ status: 'Error', error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Servidor corriendo en puerto 3000');
});

// servidor para formulario de propietarios

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// Claves de Pushover
const USER_KEY = "udbr5cvegxckcin59py95xt5wsq8jd";
const API_TOKEN = "a9pjwizhvmj2gkmo6x27pxvjanw8zz";

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Ruta para recibir datos del formulario
app.post("/notificacion", async (req, res) => {
  const { mensaje } = req.body;

  if (!mensaje) {
    return res.status(400).json({ error: "Falta el mensaje" });
  }

  try {
    await axios.post("https://api.pushover.net/1/messages.json", {
      token: API_TOKEN,
      user: USER_KEY,
      message: mensaje,
      title: "Nuevo contacto de propietario",
      sound: "gamelan",
      priority: 1
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error al enviar Pushover:", error.message);
    res.status(500).json({ error: "Error al enviar notificación" });
  }
});

// Inicio del servidor
app.listen(PORT, () => {
  console.log(`Servidor funcionando en puerto ${PORT}`);
});
