// server.js
const express     = require('express');
const cors        = require('cors');
const axios       = require('axios');
const ical        = require('node-ical');
const nodemailer  = require('nodemailer');
const path        = require('path');
const { randomUUID } = require('crypto');

const app         = express();
const PORT        = process.env.PORT || 3000;

// ⚠️ Recomendado: pasar a .env y ROTAR estas claves
const API_KEY     = 'tQF5BDMXbeN/vkKMRZiWKwM461gD8wL16EtUbwboi1OayWd3VZ24FMNKAuCF+3+m';
const BASE_URL    = 'https://api.lodgify.com';

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // sirve tus .html/.js/.css desde localhost:3000

// 👉 IDs por nombre (para endpoint /api/ocupados/:unidad)
const propiedades = {
  calafate1: 601552,
  calafate2: 601707,
  calafate3: 601708,
  calafate4: 601710,
  calafate5: 601711,
  calafate6: 601712,
  calafate7: 601713,
  cds4: 601717,
  cds5: 601714,
  nilidas: 601719,
  gurisa: 648950,
  paisajismo: 601720,
  koiquetrihue: 677269,
  mitiempo: 677286,
  refugiopatagonico: 677289
};

// 👉 Nombres para mostrar (para endpoint /api/disponibles)
const nombrePropiedades = {
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
  601720: 'Paisajismo',
  677269: 'Koi Quetrihue',
  677286: 'Mi Tiempo',
  677289: 'Refugio Patagónico'
};

/* ===========================
   Helpers Lodgify (MENSAJES + NOTAS)
   =========================== */
const LOD_HEADERS = {
  'X-ApiKey': API_KEY,
  'Accept': 'application/json',
  'Content-Type': 'application/json'
};

// Agrega un mensaje en la pestaña "Mensajes" del booking.
async function addBookingMessage(bookingId, text) {
  const body = [
    {
      subject: 'WEB - Detalles de cobro',
      message: text,
      type: 'Owner',            // lo deja como mensaje interno
      send_notification: false  // no notifica al huésped
    }
  ];

  await axios.post(
    `${BASE_URL}/v1/reservation/booking/${bookingId}/messages`,
    body,
    { headers: LOD_HEADERS, timeout: 15000 }
  );
}

// Setea el cuadro "Notas" del booking (con fallback si pide más campos).
async function updateBookingNotes(bookingId, text) {
  try {
    await axios.put(
      `${BASE_URL}/v1/reservation/booking`,
      { id: bookingId, notes: text },
      { headers: LOD_HEADERS, timeout: 15000 }
    );
  } catch (e1) {
    const details = (await axios.get(
      `${BASE_URL}/v1/reservation/booking/${bookingId}`,
      { headers: LOD_HEADERS, timeout: 15000 }
    )).data;

    const body = {
      id: bookingId,
      notes: text,
      arrival:   details.arrival,
      departure: details.departure,
      property_id: details.property_id || details.property?.id,
      status: details.status || 'booked',
      rooms:  details.rooms,
      guest:  details.guest
    };

    await axios.put(
      `${BASE_URL}/v1/reservation/booking`,
      body,
      { headers: LOD_HEADERS, timeout: 15000 }
    );
  }
}

/* ===========================
   P U S H O V E R
   =========================== */

// ⚠️ Recomendado: mover a .env y ROTAR claves
const PUSHOVER_TOKEN = 'a8nyif562ezb7sc9buqt8aioybkp5n'; // API Token/Key (app)
const PUSHOVER_USER  = 'uhwyimqvtop7fswmvs4p6i5e69nomg'; // User Key (tu cuenta)

// Envío con timeout + reintento simple
async function enviarPushover(message, title = 'Notificación', extra = {}) {
  const payload = {
    token: PUSHOVER_TOKEN,
    user:  PUSHOVER_USER,
    title,
    message,
    priority: extra.priority ?? 0,       // -2..2
    sound:   extra.sound ?? 'pushover',
    url:       extra.url,
    url_title: extra.url_title
  };

  try {
    await axios.post('https://api.pushover.net/1/messages.json', payload, { timeout: 10000 });
    console.log('✅ Pushover enviado');
  } catch (e) {
    const status = e.response?.status;
    console.error('❌ Pushover error:', e.response?.data || e.message);

    // Reintenta si fue rate limit o timeout/network
    if (!e.response || status === 429) {
      try {
        await new Promise(r => setTimeout(r, 1500));
        await axios.post('https://api.pushover.net/1/messages.json', payload, { timeout: 10000 });
        console.log('✅ Pushover enviado en reintento');
      } catch (e2) {
        console.error('❌ Pushover error (reintento):', e2.response?.data || e2.message);
      }
    }
  }
}

// Notificación manual (si querés llamarla desde el front)
app.post('/notificar-reserva', async (req, res) => {
  try {
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

    await enviarPushover(mensaje, '🟢 Nueva reserva');
    res.send({ status: 'Notificación enviada' });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send({ status: 'Error', error: error.message });
  }
});

// Formulario de propietarios
app.post('/enviar-formulario-propietario', async (req, res) => {
  try {
    const { nombre, email, telefono, dia, hora, plan, mensaje } = req.body;

    const contenido = `Nuevo contacto de propietario:
👤 Nombre: ${nombre}
📧 Email: ${email}
📱 Teléfono: ${telefono}
📅 Día para llamada: ${dia}
🕒 Hora preferida: ${hora}
📦 Plan elegido: ${plan}
💬 Mensaje: ${mensaje || '—'}`;

    await enviarPushover(contenido, '📣 Propietario: nuevo contacto');
    res.send({ status: 'Notificación enviada' });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send({ status: 'Error', error: error.message });
  }
});

// Test rápido para confirmar que Pushover está OK
app.get('/test-pushover', async (_req, res) => {
  await enviarPushover('🔔 Prueba de Pushover desde el servidor', 'Test Pushover');
  res.json({ ok: true });
});

/* ===========================
   Endpoints
   =========================== */

// 🟢 PRECIOS DIARIOS
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

    const raw = lodgifyRes.data;
    const dias = Array.isArray(raw) ? raw : raw.dailyRates || [];
    const extras = Array.isArray(raw)
      ? (raw.guest_based_prices || raw.guestBasedPrices || [])
      : (raw.guest_based_prices || raw.guestBasedPrices || []);

    res.json({ dias, extras });
  } catch (e) {
    console.error('⛔ precios-diarios:', e.response?.data || e.message);
    res.status(500).json({ success: false, message: 'Error al consultar precios diarios.' });
  }
});

// 🔍 DISPONIBILIDAD V1
app.get('/api/disponibles', async (req, res) => {
  const { checkin, checkout } = req.query;

  if (!checkin || !checkout) {
    return res.status(400).json({ success: false, message: 'Faltan fechas' });
  }

  try {
    const response = await axios.get(`${BASE_URL}/v1/availability`, {
      headers: { 'X-ApiKey': API_KEY },
      params: {
        periodStart: checkin,
        periodEnd: checkout,
        includeDetails: true
      }
    });

    const start = new Date(checkin);
    const end   = new Date(checkout);
    const diasRequeridos = [];

    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      diasRequeridos.push(new Date(d).toISOString().split('T')[0]);
    }

    const fechasDisponiblesPorPropiedad = {};

    for (const entrada of response.data) {
      const propId = entrada.property_id;
      if (entrada.available !== 1) continue;

      const fechaInicio = new Date(entrada.period_start);
      const fechaFin = new Date(entrada.period_end);

      for (let d = new Date(fechaInicio); d <= fechaFin; d.setDate(d.getDate() + 1)) {
        const fecha = d.toISOString().split('T')[0];
        if (!fechasDisponiblesPorPropiedad[propId]) {
          fechasDisponiblesPorPropiedad[propId] = new Set();
        }
        fechasDisponiblesPorPropiedad[propId].add(fecha);
      }
    }

    const disponibles = [];

    for (const [propId, fechasDisponibles] of Object.entries(fechasDisponiblesPorPropiedad)) {
      const cubreTodo = diasRequeridos.every(dia => fechasDisponibles.has(dia));
      if (cubreTodo) {
        disponibles.push({ id: Number(propId), nombre: nombrePropiedades[propId] });
      }
    }

    res.json({ disponibles });

  } catch (err) {
    console.error('⛔ ERROR en disponibilidad:', err.response?.data || err.message);
    res.status(500).json({ success: false, message: 'Error al consultar disponibilidad' });
  }
});

// 🔒 OCUPADOS por unidad usando /v1/availability/{propertyId}
app.get('/api/ocupados/:unidad', async (req, res) => {
  const unidad = req.params.unidad.toLowerCase();
  const propertyId = propiedades[unidad];

  if (!propertyId) {
    return res.status(400).json({ error: `Propiedad '${unidad}' no encontrada.` });
  }

  const periodStart = new Date().toISOString().split('T')[0];
  const periodEnd   = '2026-04-30';

  try {
    const response = await axios.get(`${BASE_URL}/v1/availability/${propertyId}`, {
      headers: { 'X-ApiKey': API_KEY },
      params: { periodStart, periodEnd }
    });

    const data = response.data;

    const ocupados = [];
    let bloque = null;

    for (let i = 0; i < data.length; i++) {
      const dia = data[i];
      if (dia.available === 0) {
        if (!bloque) {
          bloque = { from: dia.period_start, to: dia.period_end };
        } else {
          bloque.to = dia.period_end;
        }
      } else {
        if (bloque) {
          ocupados.push(bloque);
          bloque = null;
        }
      }
    }

    if (bloque) ocupados.push(bloque);

    res.json(ocupados);

  } catch (error) {
    console.error(`❌ Error al obtener ocupados de ${unidad}:`, error.message);
    res.status(500).json({ error: 'No se pudo obtener disponibilidad' });
  }
});

/* ===========================
   Crear reserva directa en Lodgify + Pushover
   =========================== */
app.post('/api/crear-reserva', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.arrival || !b.departure || !b.property_id || !Array.isArray(b.rooms) || !b.guest) {
      return res.status(400).json({ error: 'Faltan campos (arrival, departure, property_id, rooms, guest)' });
    }

    const idemKey = req.header('X-Idempotency-Key');

    // 1) Crear la reserva (marcamos canal/origen como Website)
    const payload = {
      ...b,
      source: b.source || 'Website',
      channel: b.channel || { type: 'Website' }
    };

    const createRes = await axios.post(
      `${BASE_URL}/v1/reservation/booking`,
      payload,
      {
        headers: {
          'X-ApiKey': API_KEY,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(idemKey ? { 'X-Idempotency-Key': idemKey } : {})
        },
        timeout: 20000
      }
    );

    const body    = createRes.data;
    const headers = createRes.headers || {};
    let bookingId =
      body?.id ||
      body?.booking_id ||
      body?.bookingId ||
      body?.data?.id ||
      null;

    // 🔎 Fallback: intentar extraer el ID desde Location/Content-Location
    if (!bookingId) {
      const loc = headers.location || headers.Location || headers['content-location'];
      if (loc) {
        const m = String(loc).match(/\/booking\/(\d+)/i) || String(loc).match(/(\d+)(?!.*\d)/);
        if (m) bookingId = parseInt(m[1], 10);
      }
    }

    console.log('✅ Crear reserva OK. status:', createRes.status, 'ID:', bookingId, 'keys:', body ? Object.keys(body) : []);

    // Si igualmente no hay ID, devolvemos lo recibido para inspección, pero sin romper.
    if (!bookingId) {
      return res.status(200).json({
        ok: true,
        warning: 'No se detectó ID; revisar headers Location/Content-Location',
        headers: {
          location: headers.location || headers.Location || headers['content-location'] || null
        },
        body: body ?? null
      });
    }

    // ===== Texto para notas/mensajes (con HUÉSPEDES y TELÉFONO) =====
    const totalUI = b._total_ui || '';
    const seniaUI = b._senia_ui || '';
    const cupon   = b._cupon || '';
    const comm    = b._comments || '';

    // Teléfono del huésped
    const phone = (b?.guest?.phone || b?.guest?.phone_number || '').toString().trim() || '—';

    // Huéspedes (sumamos adultos/menores de todos los rooms)
    const rooms = Array.isArray(b?.rooms) ? b.rooms : [];
    let adultsTotal = 0, childrenTotal = 0;
    rooms.forEach(r => {
      adultsTotal   += Number(r?.adults   || 0);
      childrenTotal += Number(r?.children || 0);
    });
    const guestsLine = childrenTotal > 0
      ? `${adultsTotal} adultos, ${childrenTotal} menores`
      : `${adultsTotal || '—'} huéspedes`;

    const textForNotes =
      `[WEB]
Total ARS: ${totalUI || '—'}
Seña: ${seniaUI || '—'}
Huéspedes: ${guestsLine}
Teléfono: ${phone}
Cupón: ${cupon || '—'}
Comentarios: ${comm || '—'}`;

    let messageAdded = false;
    let notesUpdated = false;
    let messageError = null;
    let notesError   = null;

    // 2) Agregar mensaje al hilo (si falla, no rompemos)
    try {
      await axios.post(
        `${BASE_URL}/v1/reservation/booking/${bookingId}/messages`,
        [{ subject: 'Datos de la reserva', message: textForNotes, type: 'Owner', send_notification: false }],
        { headers: { 'X-ApiKey': API_KEY, 'Accept': 'application/json', 'Content-Type': 'application/json' } }
      );
      messageAdded = true;
      console.log('✅ MENSAJE agregado');
    } catch (e) {
      messageError = e.response?.data || e.message;
      console.log('❌ MENSAJE no agregado:', messageError);
    }

    // 3) Actualizar notas (probamos notes y luego note)
    try {
      await axios.put(
        `${BASE_URL}/v1/reservation/booking/${bookingId}`,
        { notes: textForNotes },
        { headers: { 'X-ApiKey': API_KEY, 'Accept': 'application/json', 'Content-Type': 'application/json' } }
      );
      notesUpdated = true;
      console.log('✅ NOTAS actualizadas');
    } catch (e1) {
      try {
        await axios.put(
          `${BASE_URL}/v1/reservation/booking/${bookingId}`,
          { note: textForNotes },
          { headers: { 'X-ApiKey': API_KEY, 'Accept': 'application/json', 'Content-Type': 'application/json' } }
        );
        notesUpdated = true;
        console.log('✅ NOTA (singular) actualizada');
      } catch (e2) {
        notesError = e2.response?.data || e2.message;
        console.log('❌ NOTAS no actualizadas:', notesError);
      }
    }

    // === Pushover: avisar nueva reserva (no bloquea la respuesta)
    try {
      const propertyName = nombrePropiedades[b.property_id] || b.property_name || b.property_id;
      const totalGuests = (Array.isArray(b.rooms) ? b.rooms : [])
        .reduce((acc, r) => acc + Number(r?.adults || 0) + Number(r?.children || 0), 0);

      const msg =
`🟢 Nueva reserva
🏡 ${propertyName}
📅 ${b.arrival} → ${b.departure}
👥 Huéspedes: ${totalGuests || '—'}
👤 ${b?.guest?.firstName || ''} ${b?.guest?.lastName || ''}
📧 ${b?.guest?.email || '—'}
📱 ${b?.guest?.phone || b?.guest?.phone_number || '—'}
💲 Total: ${b._total_ui || '—'}
💲 Seña: ${b._senia_ui || '—'}
🎟️ Cupón: ${b._cupon || '—'}
💬 ${b._comments || '—'}`;

      // const urlToBooking = bookingId ? `https://app.lodgify.com/reservations/${bookingId}` : undefined;
      enviarPushover(msg, '🟢 Nueva reserva' /*, { url: urlToBooking, url_title: 'Abrir en Lodgify' }*/);
    } catch (npErr) {
      console.log('⚠️ Pushover (post-reserva) no enviado:', npErr?.message || npErr);
    }

    return res.json({
      ok: true,
      id: bookingId,
      bookingId,
      messageAdded,
      notesUpdated,
      messageError,
      notesError
    });

  } catch (err) {
    const status = err.response?.status || 500;
    const data   = err.response?.data || { error: 'Error al crear la reserva' };
    console.error('❌ Lodgify:', status, data);

    // Alerta de error por Pushover (opcional)
    try {
      enviarPushover(
        `❌ Error creando reserva: ${status} ${data?.message || JSON.stringify(data).slice(0,200)}`,
        'Error de reserva',
        { priority: 1 }
      );
    } catch (e) {
      console.log('⚠️ No se pudo notificar error por Pushover:', e.message);
    }

    return res.status(status).json(data);
  }
});


// Iniciar servidor
app.listen(PORT, () =>
  console.log(`⚡ Server corriendo en http://localhost:${PORT}`)
);



