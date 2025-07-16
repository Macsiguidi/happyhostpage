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

// NUEVO ENDPOINT para consultar disponibilidad general
app.get('/api/disponibles', async (req, res) => {
  const { checkin, checkout } = req.query;

  if (!checkin || !checkout) {
    return res.status(400).json({ success: false, message: 'Faltan fechas' });
  }

  try {
    const response = await axios.get('https://api.lodgify.com/v1/availability', {
      headers: {
        'X-ApiKey': API_KEY
      },
      params: {
        periodStart: checkin,
        periodEnd: checkout
      }
    });

    const disponibles = [];

    for (const item of response.data) {
      if (item.available === true) {
        disponibles.push(item.propertyId);
      }
    }

    res.json({ disponibles });

  } catch (err) {
    console.error('⛔ Error consultando API Lodgify:', err.message);
    res.status(500).json({ success: false, message: 'Error al consultar disponibilidad' });
  }
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

// Notificación por Pushover (reserva)
app.post('/notificar-reserva', async (req, res) => {
  const {
    nombre, telefono, email, comentarios,
    checkin, checkout, huespedes,
    propiedad, total, senia, cupon
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
💲 Seña: ${senia}
🎟️ ${cupon || 'Sin cupón'}`;

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

// Formulario de propietarios
app.post('/enviar-formulario-propietario', async (req, res) => {
  const {
    nombre, email, telefono, dia, hora, plan, mensaje
  } = req.body;

  const contenido = `Nuevo contacto de propietario:
👤 Nombre: ${nombre}
📧 Email: ${email}
📱 Teléfono: ${telefono}
📅 Día para llamada: ${dia}
🕒 Hora preferida: ${hora}
📦 Plan elegido: ${plan}
💬 Mensaje: ${mensaje}`;

  try {
    await axios.post('https://api.pushover.net/1/messages.json', {
      token: 'a9pjwizhvmj2gkmo6x27pxvjanw8zz',
      user: 'udbr5cvegxckcin59py95xt5wsq8jd',
      message: contenido
    });

    res.send({ status: 'Notificación enviada' });
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    res.status(500).send({ status: 'Error', error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () =>
  console.log(`⚡ Server corriendo en http://localhost:${PORT}`)
);
