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

// 🏷️ Motor de promociones (HappyHost.Propietarios)
// Configurar PROMO_API_BASE con la URL de la app en producción (ej. Render)
const PROMO_API_BASE = process.env.PROMO_API_BASE || 'https://propietarios-happy-host.onrender.com';
const PROMO_API_KEY  = process.env.PROMO_API_KEY  || 'dev-happyhost-promo-2026';

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
  cruz4: 601717,
  cruzdelsur4: 601717,
  cds5: 601714,
  cruz5: 601714,
  cruzdelsur5: 601714,
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

// 🏷️ Mapeo slug → datos para el motor de promociones
// propName: nombre exacto como está guardado en la app de propietarios
// family:   familia (PropertyFamily enum en la app .NET)
const promoMeta = {
  calafate1:       { propName: 'Calafate 1',      family: 'Calafate'        },
  calafate2:       { propName: 'Calafate 2',      family: 'Calafate'        },
  calafate3:       { propName: 'Calafate 3',      family: 'Calafate'        },
  calafate4:       { propName: 'Calafate 4',      family: 'Calafate'        },
  calafate5:       { propName: 'Calafate 5',      family: 'Calafate'        },
  calafate6:       { propName: 'Calafate 6',      family: 'Calafate'        },
  calafate7:       { propName: 'Calafate 7',      family: 'Calafate'        },
  cds4:            { propName: 'Cruz del Sur 4',  family: 'CruzDelSur'      },
  cruz4:           { propName: 'Cruz del Sur 4',  family: 'CruzDelSur'      },
  cruzdelsur4:     { propName: 'Cruz del Sur 4',  family: 'CruzDelSur'      },
  cds5:            { propName: 'Cruz del Sur 5',  family: 'CruzDelSur'      },
  cruz5:           { propName: 'Cruz del Sur 5',  family: 'CruzDelSur'      },
  cruzdelsur5:     { propName: 'Cruz del Sur 5',  family: 'CruzDelSur'      },
  nilidas:         { propName: 'Nilidas',         family: 'Nilidas'         },
  gurisa:          { propName: 'Gurisa',          family: 'Gurisa'          },
  paisajismo:      { propName: 'Paisajismo',      family: 'Paisajismo'      },
  koiquetrihue:      { propName: 'Koi Quetrihue',       family: 'KoiQuetrihue'      },
  mitiempo:          { propName: 'Mi Tiempo',           family: 'MiTiempo'          },
  refugiopatagonico: { propName: 'Refugio Patagónico',  family: 'RefugioPatagonico' },
  puertomargarita:   { propName: 'Puerto Margarita',    family: 'PuertoMargarita'   },
  casitamirador:     { propName: 'Casita Mirador',      family: 'CasitaMirador'     },
  picuen1:           { propName: 'Picuén 1',            family: 'Picuen'            },
  picuen2:           { propName: 'Picuén 2',            family: 'Picuen'            },
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

// 💱 REGLAS DE MONEDA — proxy al backend .NET con caché en memoria
// GET /api/config-moneda
// Si el panel admin está durmiendo (Render free tier), usa la última respuesta
// correcta cacheada en lugar de un fallback estático.
let _monedaCache    = null;
let _monedaCacheAt  = 0;
const MONEDA_TTL_MS = 15 * 60 * 1000; // 15 min en servidor

async function fetchMonedaRules() {
  const r = await axios.get(`${PROMO_API_BASE}/api/currency-rules`, {
    headers: { 'X-Api-Key': PROMO_API_KEY },
    timeout: 10000
  });
  _monedaCache   = r.data;
  _monedaCacheAt = Date.now();
  console.log(`💱 config-moneda: ${r.data.length} reglas cargadas desde el admin`);
  return r.data;
}

app.get('/api/config-moneda', async (_req, res) => {
  const age = Date.now() - _monedaCacheAt;

  // Caché del servidor fresca → responder sin llamar al admin
  if (_monedaCache && age < MONEDA_TTL_MS) {
    res.set('Cache-Control', 'public, max-age=1800');
    return res.json(_monedaCache);
  }

  try {
    const data = await fetchMonedaRules();
    res.set('Cache-Control', 'public, max-age=1800');
    res.json(data);
  } catch (e) {
    console.error('⛔ config-moneda:', e.response?.data || e.message);

    // Si hay caché antigua (aunque vencida), usarla — el admin estaba durmiendo
    if (_monedaCache) {
      console.warn('⚠️ config-moneda: admin no responde, usando caché anterior');
      res.set('Cache-Control', 'public, max-age=60'); // retry rápido
      return res.json(_monedaCache);
    }

    // Sin caché nunca: fallback hasta 2027 para no caer en USD inesperadamente
    res.json([
      { id: 0, from: '2025-01-01', to: '2027-12-31', currency: 'ARS', fxRate: 1600,
        propertySlugs: null, priority: 10, notes: 'Fallback por defecto' }
    ]);
  }
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

  // Ventana móvil: desde hoy y 18 meses hacia adelante (antes estaba fija en
  // 2026-10-31, por eso las reservas de noviembre en adelante no se bloqueaban).
  const hoy = new Date();
  const periodStart = hoy.toISOString().split('T')[0];
  const finVentana = new Date(hoy);
  finVentana.setMonth(finVentana.getMonth() + 18);
  const periodEnd = finVentana.toISOString().split('T')[0];

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

    // === Pushover: avisar nueva reserva — se envía SIEMPRE (con o sin bookingId)
    try {
      const propertyName = nombrePropiedades[b.property_id] || b.property_name || String(b.property_id);
      const totalGuests = (Array.isArray(b.rooms) ? b.rooms : [])
        .reduce((acc, r) => acc + Number(r?.adults || 0) + Number(r?.children || 0), 0);

      // Fix: el payload usa first_name/last_name (snake_case), no camelCase
      const guestName = b?.guest?.name
        || `${b?.guest?.first_name || ''} ${b?.guest?.last_name || ''}`.trim()
        || '—';

      const msg =
`🟢 Nueva reserva
🏡 ${propertyName}
📅 ${b.arrival} → ${b.departure}
👥 ${totalGuests || '—'} huéspedes
👤 ${guestName}
📧 ${b?.guest?.email || '—'}
📱 ${b?.guest?.phone || '—'}
💲 Total: ${b._total_ui || '—'}
💲 Seña: ${b._senia_ui || '—'}
🎟️ Cupón: ${b._cupon || 'Sin cupón'}
💬 ${b._comments || '—'}
🔑 ID Lodgify: ${bookingId || 'sin ID'}`;

      const urlToBooking = bookingId ? `https://app.lodgify.com/reservations/${bookingId}` : undefined;
      await enviarPushover(msg, '🟢 Nueva reserva', { url: urlToBooking, url_title: 'Abrir en Lodgify' });
    } catch (npErr) {
      console.log('⚠️ Pushover (post-reserva) no enviado:', npErr?.message || npErr);
    }

    // === Avisar al sistema HappyHost los datos que Lodgify no trae (total/seña/huéspedes)
    // para que complete la reserva y mande la confirmación automática.
    try {
      const HH_TOKEN = process.env.HH_TOKEN || '';
      if (bookingId && HH_TOKEN) {
        const parseMonto  = (s) => parseInt(String(s || '').replace(/[^\d]/g, '') || '0', 10);
        const parseMoneda = (s) => /usd/i.test(String(s || '')) ? 'USD' : 'ARS';
        const rooms2  = Array.isArray(b.rooms) ? b.rooms : [];
        const adultos = rooms2.reduce((a, r) => a + Number(r?.adults || 0), 0);
        const ninos   = rooms2.reduce((a, r) => a + Number(r?.children || 0), 0);

        await axios.post('https://propietarios-happy-host.onrender.com/api/web-reserva', {
          booking_id: Number(bookingId),
          total:  parseMonto(b._total_ui),
          sena:   parseMonto(b._senia_ui),
          moneda: parseMoneda(b._total_ui),
          adultos, ninos,
          token: HH_TOKEN
        }, { timeout: 15000 });
        console.log('✅ Datos enviados al sistema HappyHost');
      }
    } catch (hhErr) {
      console.log('⚠️ No se pudo avisar al sistema HappyHost:', hhErr?.response?.status || hhErr?.message || hhErr);
    }

    // Si no hay ID devolvemos igualmente OK (reserva ya creada en Lodgify)
    if (!bookingId) {
      return res.status(200).json({
        ok: true,
        warning: 'Reserva creada pero no se detectó ID; revisar headers Location/Content-Location',
        headers: {
          location: (createRes.headers?.location || createRes.headers?.['content-location']) ?? null
        },
        body: body ?? null
      });
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


// ════════════════════════════════════════════════════════════════════════════
// 🏷️  PROXY — Motor de Promociones (HappyHost.Propietarios)
//
//  GET  /api/promos-activas/:unidad  → lista promos activas para esa propiedad
//  POST /api/evaluar-promo           → evalúa descuento para una reserva concreta
//
//  En producción configurar en las env vars de Render:
//    PROMO_API_BASE = URL de la app .NET  (ej. https://propietarios-happy-host.onrender.com)
//    PROMO_API_KEY  = clave configurada en appsettings de la app .NET
// ════════════════════════════════════════════════════════════════════════════

// Cabecera común a todas las llamadas al motor de promos
const promoHeaders = {
  'X-Api-Key'   : PROMO_API_KEY,
  'Content-Type': 'application/json'
};

// Helper: retorna un resultado "sin descuento" cuando el motor no está disponible
const noPromo = (basePrice) => ({
  basePrice    : basePrice || 0,
  totalDiscount: 0,
  finalPrice   : basePrice || 0,
  applied      : [],
  rejected     : []
});

function todayArgentinaDate() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const byType = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function promoBookingDate() {
  return `${todayArgentinaDate()}T12:00:00.000Z`;
}

function onlyDate(value) {
  return value ? String(value).slice(0, 10) : null;
}

function isInsideBookingWindow(promo) {
  const today = todayArgentinaDate();
  const start = onlyDate(promo.bookingWindowStart);
  const end = onlyDate(promo.bookingWindowEnd);

  if (start && today < start) return false;
  if (end && today > end) return false;

  return true;
}

// 🟢 GET /api/promos-activas/:unidad
// Devuelve la lista de promos activas/programadas que aplican a esta propiedad.
// El cliente (promos.js en la web) la usa para poblar el popup de promo.
app.get('/api/promos-activas/:unidad', async (req, res) => {
  const meta = promoMeta[req.params.unidad];
  if (!meta) return res.json([]);           // unidad desconocida → sin promos

  try {
    const resp = await axios.get(`${PROMO_API_BASE}/api/promotions`, {
      headers: promoHeaders,
      timeout: 6000
    });

    const todas = resp.data || [];

    // Filtrar las que aplican a esta propiedad o son globales
    const filtradas = todas.filter(p => {
      if (!isInsideBookingWindow(p)) return false;

      if (p.scopeMode === 'all') return true;
      if (p.scopeMode === 'group') {
        // ScopeFamily viene como string del enum (ej. "1" o "Calafate")
        const famStr = (p.scopeFamily || '').toString().toLowerCase();
        return famStr === meta.family.toLowerCase() || famStr === String(familyInt(meta.family));
      }
      if (p.scopeMode === 'properties') {
        return (p.properties || []).some(
          n => n.toLowerCase() === meta.propName.toLowerCase()
        );
      }
      return false;
    });

    res.json(filtradas);
  } catch (e) {
    console.warn('⚠️  promos-activas: motor no disponible —', e.message);
    res.json([]);    // fallback silencioso: no hay promos
  }
});

// 🟢 POST /api/evaluar-promo
// Body: { unidad, familia?, checkin, checkout, guests, basePrice }
// Retorna el resultado de EvaluationResult del motor .NET.
app.post('/api/evaluar-promo', async (req, res) => {
  const { unidad, checkin, checkout, guests, basePrice } = req.body;

  const meta = promoMeta[unidad] || {
    propName: unidad || '',
    family  : req.body.familia || ''
  };

  try {
    const resp = await axios.post(`${PROMO_API_BASE}/api/promotions/evaluate`, {
      propertyName  : meta.propName,
      propertyFamily: meta.family,
      checkIn       : checkin,
      checkOut      : checkout,
      guests        : guests  || 2,
      basePrice     : basePrice || 0,
      bookingDate   : promoBookingDate()
    }, {
      headers: promoHeaders,
      timeout: 8000
    });

    res.json(resp.data);
  } catch (e) {
    console.warn('⚠️  evaluar-promo: motor no disponible —', e.message);
    res.json(noPromo(basePrice));  // fallback: precio sin descuento, no rompe la página
  }
});

// Convierte el nombre del enum PropertyFamily al int (para comparar con scopeFamily numérico)
function familyInt(name) {
  const map = {
    Calafate: 1, CruzDelSur: 2, Nilidas: 3, Gurisa: 4, Paisajismo: 5,
    KoiQuetrihue: 6, Oasis: 7, RefugioPatagonico: 8, MiTiempo: 9,
    PuertoMargarita: 10, CasitaMirador: 11, Picuen: 12
  };
  return map[name] || 0;
}

/* ===========================
   /p/:slug  — Página de share con og:image para WhatsApp/redes
   Sirve HTML con meta tags OG completos y redirige a unidad.html?slug=X
   =========================== */
app.get('/p/:slug', async (req, res) => {
  const slug = (req.params.slug || '').toLowerCase().trim();
  if (!slug) return res.redirect('https://www.happyhostpatagonia.com.ar');

  const SITE = 'https://www.happyhostpatagonia.com.ar';
  const destino = `${SITE}/unidad.html?slug=${slug}`;

  let nombre   = slug;
  let imagen   = `${SITE}/logos/logo1.png`;
  let desc     = 'Alojamiento en Villa La Angostura, Patagonia Argentina. Reservá con Happy Host.';

  // Intentar obtener datos reales de la API de propietarios
  try {
    const r = await axios.get(`${PROMO_API_BASE}/api/properties/${encodeURIComponent(slug)}`, {
      timeout: 6000
    });
    const p = r.data || {};

    if (p.name)   nombre = p.name;
    if (p.description) desc = p.description.slice(0, 200);

    const imgs = Array.isArray(p.images) ? p.images : [];
    if (imgs.length > 0) imagen = imgs[0];
  } catch (e) {
    console.warn(`/p/${slug}: no se pudo obtener datos de la propiedad:`, e.message);
  }

  const title    = `${nombre} · Villa La Angostura | Happy Host`;
  const ogDesc   = desc || `${nombre} en Villa La Angostura, Patagonia Argentina.`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="es-AR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<meta name="description" content="${ogDesc}">
<meta property="og:type"        content="website">
<meta property="og:locale"      content="es_AR">
<meta property="og:url"         content="${SITE}/unidad.html?slug=${slug}">
<meta property="og:title"       content="${title}">
<meta property="og:description" content="${ogDesc}">
<meta property="og:image"       content="${imagen}">
<meta property="og:image:width"  content="1200">
<meta property="og:image:height" content="800">
<meta property="og:image:alt"    content="${nombre}, alojamiento en Villa La Angostura">
<meta property="og:site_name"   content="Happy Host Patagonia">
<meta name="twitter:card"        content="summary_large_image">
<meta name="twitter:title"       content="${title}">
<meta name="twitter:description" content="${ogDesc}">
<meta name="twitter:image"       content="${imagen}">
<script>window.location.replace(${JSON.stringify(destino)});</script>
<noscript><meta http-equiv="refresh" content="0;url=${destino}"></noscript>
</head>
<body style="font-family:sans-serif;text-align:center;padding:40px">
<p>Redirigiendo a <strong>${nombre}</strong>…</p>
<p><a href="${destino}">Hacé clic aquí si no sos redirigido</a></p>
</body>
</html>`);
});

// Iniciar servidor
app.listen(PORT, () =>
  console.log(`⚡ Server corriendo en http://localhost:${PORT}`)
);



