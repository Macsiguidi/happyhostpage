/* =====================================================================
   alojamientos.js — búsqueda + disponibilidad + precios en tarjetas
   ===================================================================== */
'use strict';

const API = 'https://disponibilidad-happy-host-patagonia.onrender.com';
// Panel de propietarios — fuente para propiedades SIN Lodgify (sistema: true)
const API_SISTEMA = 'https://propietarios-happy-host.onrender.com';

// ── Datos de propiedades (houseId, roomId, capacidad máx) ─────────────
// Propiedades con `sistema: true` no usan Lodgify: su disponibilidad y precio
// salen del panel (/api/properties/{slug}/ocupados y /precio). El slug es data-nombre.
const PROPS = {
  calafate1:        { houseId: 601552, roomId: 668343, pax: 6 },
  calafate2:        { houseId: 601707, roomId: 668498, pax: 4 },
  calafate3:        { houseId: 601708, roomId: 668499, pax: 6 },
  calafate4:        { houseId: 601710, roomId: 668501, pax: 6 },
  calafate5:        { houseId: 601711, roomId: 668502, pax: 4 },
  calafate6:        { houseId: 601712, roomId: 668503, pax: 6 },
  calafate7:        { houseId: 601713, roomId: 668504, pax: 4 },
  cruz4:            { houseId: 601717, roomId: 668508, pax: 2 },
  cruz5:            { houseId: 601714, roomId: 668505, pax: 2 },
  nilidas:          { houseId: 601719, roomId: 668510, pax: 4 },
  gurisa:           { houseId: 648950, roomId: 715936,  pax: 7 },
  paisajismo:       { houseId: 601720, roomId: 668511, pax: 3 },
  refugiopatagonico:{ houseId: 677289, roomId: 744265, pax: 8 },
  puertomargarita:  { sistema: true,  pax: 5, sinNinos: true },   // Nueva Esperanza — sin Lodgify, no admite niños 2-14
};

// ── Helpers de fecha ──────────────────────────────────────────────────
function parseYMD(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return isNaN(y) ? null : new Date(y, m - 1, d);
}
function addDay(dateStr) {
  const d = parseYMD(dateStr);
  d.setDate(d.getDate() + 1);
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
}
function fmtFecha(s) {
  const d = parseYMD(s);
  if (!d) return s;
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}
function fmt(n) {
  return n.toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

// ── Moneda y factor ARS — usa moneda.js si está disponible ───────────
async function detectarMoneda(checkinStr) {
  if (window.hhMoneda) {
    try { return await window.hhMoneda.detectar(checkinStr, null); } catch {}
  }
  // Fallback local (por si moneda.js no cargó)
  const fecha = parseYMD(checkinStr);
  if (!fecha) return { moneda: 'USD', factorARS: 1 };
  const limite = new Date(2026, 4, 31);
  if (fecha > limite) return { moneda: 'USD', factorARS: 1 };
  let factorARS = 1600;
  if (fecha >= new Date(2025, 4, 1) && fecha <= new Date(2025, 5, 30)) factorARS = 1250;
  return { moneda: 'ARS', factorARS };
}

// ── Slideshow en hover ────────────────────────────────────────────────
const intervalos = new Map();

function iniciarSlideshow(card) {
  const slides = card.querySelectorAll('.slide');
  if (slides.length <= 1) return;
  let idx = 0;
  intervalos.set(card, setInterval(() => {
    slides[idx].classList.remove('active');
    idx = (idx + 1) % slides.length;
    slides[idx].classList.add('active');
  }, 2000));
}

function detenerSlideshow(card) {
  clearInterval(intervalos.get(card));
  intervalos.delete(card);
  card.querySelectorAll('.slide').forEach((s, i) => {
    s.classList.remove('active');
    if (i === 0) s.classList.add('active');
  });
}

// ── Redirección con parámetros (para click en tarjeta) ───────────────
function redirigirConParametros(pagina) {
  const ci  = localStorage.getItem('checkin');
  const co  = localStorage.getItem('checkout');
  const hu  = localStorage.getItem('huespedes');
  const a   = localStorage.getItem('adultos');
  const n   = localStorage.getItem('ninos');
  const b   = localStorage.getItem('bebes');
  const p   = new URLSearchParams();
  if (ci) p.append('checkin',   ci);
  if (co) p.append('checkout',  co);
  if (hu) p.append('huespedes', hu);
  if (a)  p.append('adultos',   a);
  if (n)  p.append('ninos',     n);
  if (b)  p.append('bebes',     b);
  // Indica a la propiedad que venimos del buscador → botón Volver reconstruye la búsqueda
  if (ci && co) localStorage.setItem('busqueda_desde_buscador', 'true');
  window.location.href = pagina + (p.toString() ? '?' + p.toString() : '');
}

// ── Limpiar búsqueda (botón en banner) ────────────────────────────────
function limpiarBusqueda() {
  ['checkin','checkout','huespedes','disponibles','disponibles_expira','busqueda_desde_buscador']
    .forEach(k => localStorage.removeItem(k));
  window.location.href = 'alojamientos.html';
}

// ── MAIN ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

  const urlParams  = new URLSearchParams(window.location.search);
  const checkin    = urlParams.get('checkin')  || '';
  const checkout   = urlParams.get('checkout') || '';
  // Bebés no cuentan para capacidad → usar adultos+niños
  const adultos    = parseInt(urlParams.get('adultos')   || '0', 10);
  const ninos      = parseInt(urlParams.get('ninos')     || '0', 10);
  const bebes      = parseInt(urlParams.get('bebes')     || '0', 10);
  // huespedes = adultos+ninos (retro-compat si viene sin desglose)
  const huespedesParam = parseInt(urlParams.get('huespedes') || '0', 10);
  const huespedes  = (adultos + ninos) || huespedesParam;  // total para capacidad

  // Persistir en localStorage para que la página de propiedad los use
  if (checkin)       localStorage.setItem('checkin',    checkin);
  if (checkout)      localStorage.setItem('checkout',   checkout);
  if (huespedes > 0) localStorage.setItem('huespedes',  String(huespedes));
  if (adultos > 0)   localStorage.setItem('adultos',    String(adultos));
  if (ninos   > 0)   localStorage.setItem('ninos',      String(ninos));
  if (bebes   > 0)   localStorage.setItem('bebes',      String(bebes));

  const loading = document.getElementById('loading-disponibilidad');
  const banner  = document.getElementById('banner-busqueda');
  const cards   = Array.from(document.querySelectorAll('.card[data-nombre]'));

  // ── Propiedades ocultadas desde el sistema ─────────────────────────
  // Panel → Alojamientos → interruptor "Visible en web". Aunque la tarjeta
  // esté fija en el HTML, si el panel la marcó como NO visible la escondemos
  // en TODOS los estados (listado sin fechas y búsqueda por fechas).
  let ocultasSlugs = new Set(), ocultasHouseIds = new Set();
  try {
    const ro = await fetch(`${API_SISTEMA}/api/properties/ocultas`);
    if (ro.ok) {
      const o = await ro.json();
      ocultasSlugs    = new Set((o.slugs || []).map(s => String(s).toLowerCase()));
      ocultasHouseIds = new Set(o.houseIds || []);
    }
  } catch { /* si el panel no responde, no ocultamos nada extra */ }

  const estaOculta = (card) => {
    const slug = card.dataset.nombre;
    const p    = PROPS[slug];
    return ocultasSlugs.has(slug) || (p && p.houseId && ocultasHouseIds.has(p.houseId));
  };

  // Mezclar tarjetas aleatoriamente (preserva el orden visual fresco en cada visita)
  const grid = document.querySelector('.grid-alojamientos');
  if (grid) cards.sort(() => Math.random() - 0.5).forEach(c => grid.appendChild(c));

  // ── SIN fechas: mostrar todo (filtrar por pax si se indicó) ──────
  if (!checkin || !checkout) {
    cards.forEach(card => {
      const p = PROPS[card.dataset.nombre];
      const capOk = !huespedes || (p && p.pax >= huespedes);
      const ninosOk = !(ninos > 0 && p && p.sinNinos);   // sin niños si la casa no los admite
      card.classList.toggle('pax-hidden', !(capOk && ninosOk) || estaOculta(card));
    });
    // Ordenar por capacidad ascendente cuando se indicaron huéspedes
    if (huespedes > 0 && grid) {
      cards
        .filter(c => !c.classList.contains('pax-hidden'))
        .sort((a, b) => {
          const pa = (PROPS[a.dataset.nombre]?.pax) ?? 99;
          const pb = (PROPS[b.dataset.nombre]?.pax) ?? 99;
          return pa - pb;
        })
        .forEach(c => grid.appendChild(c));
    }
    if (loading) loading.style.display = 'none';
    return;
  }

  // ── CON fechas: verificar disponibilidad ─────────────────────────
  if (loading) loading.style.display = 'flex';

  const { moneda, factorARS } = await detectarMoneda(checkin);
  const noches = Math.round((parseYMD(checkout) - parseYMD(checkin)) / 86400000);

  // Intentar caché (válido 3 min)
  let disponiblesIds = null;
  const expira = parseInt(localStorage.getItem('disponibles_expira') || '0', 10);
  if (expira > Date.now()) {
    try {
      const cached = localStorage.getItem('disponibles');
      if (cached) disponiblesIds = JSON.parse(cached).map(p => p.id);
    } catch {}
  }

  if (!disponiblesIds) {
    try {
      const r    = await fetch(`${API}/api/disponibles?checkin=${checkin}&checkout=${checkout}`);
      const data = await r.json();
      disponiblesIds = (data.disponibles || []).map(p => p.id);
      localStorage.setItem('disponibles',         JSON.stringify(data.disponibles || []));
      localStorage.setItem('disponibles_expira',  String(Date.now() + 3 * 60 * 1000));
    } catch (e) {
      console.warn('⚠️ disponibilidad no disponible:', e.message);
      disponiblesIds = [];
    }
  }

  // ── Disponibilidad de propiedades del sistema propio (sin Lodgify) ──
  // Lodgify responde por houseId; estas se consultan una a una contra el panel.
  const sistemaSlugs = Object.keys(PROPS).filter(s =>
    PROPS[s].sistema && document.querySelector(`.card[data-nombre="${s}"]`));
  const sistemaDispo = new Set();
  await Promise.allSettled(sistemaSlugs.map(async slug => {
    try {
      const r = await fetch(`${API_SISTEMA}/api/properties/${slug}/ocupados`);
      if (!r.ok) return;
      const rangos = await r.json();
      const ci = parseYMD(checkin), co = parseYMD(checkout);
      // En /ocupados, "to" es la ÚLTIMA NOCHE (checkout - 1).
      // La estadía [checkin, checkout) cruza si ci <= to && checkout > from.
      const cruza = (rangos || []).some(({ from, to }) => {
        const f = parseYMD(from), t = parseYMD(to);
        if (!f || !t) return false;
        return ci <= t && co > f;
      });
      if (!cruza) sistemaDispo.add(slug);
    } catch {}
  }));

  // Aplicar visibilidad por disponibilidad + capacidad (usando clase para evitar conflicto con CSS !important)
  let visibles = 0;
  cards.forEach(card => {
    const p      = PROPS[card.dataset.nombre];
    const capOk  = !huespedes || (p && p.pax >= huespedes);
    const ninosOk = !(ninos > 0 && p && p.sinNinos);   // sin niños si la casa no los admite
    const dispOk = p && (p.sistema
      ? sistemaDispo.has(card.dataset.nombre)
      : disponiblesIds.includes(p.houseId));
    const minStayOk = !(window.hhHotSaleMinStay?.blocksStay(card.dataset.nombre, noches));
    const mostrar = capOk && dispOk && minStayOk && ninosOk && !estaOculta(card);
    card.classList.toggle('pax-hidden', !mostrar);
    if (mostrar) visibles++;
  });

  // Mostrar banner de resultados
  if (banner) {
    // Armar texto de huéspedes con desglose completo
    function resumenPax(a, n, b) {
      const parts = [];
      if (a > 0) parts.push(`${a} adulto${a > 1 ? 's' : ''}`);
      if (n > 0) parts.push(`${n} niño${n > 1 ? 's' : ''}`);
      if (b > 0) parts.push(`${b} bebé${b > 1 ? 's' : ''}`);
      return parts.join(', ');
    }
    const paxStr  = resumenPax(adultos, ninos, bebes) || (huespedes > 0 ? `${huespedes} huésped${huespedes > 1 ? 'es' : ''}` : '');
    const huTxt   = paxStr ? ` · ${paxStr}` : '';
    banner.innerHTML = `
      <span class="banner-texto">
        <strong>${visibles}</strong> propiedad${visibles !== 1 ? 'es' : ''} disponible${visibles !== 1 ? 's' : ''}
        · <strong>${noches} noche${noches !== 1 ? 's' : ''}</strong>
        · <strong>${fmtFecha(checkin)}</strong> → <strong>${fmtFecha(checkout)}</strong>${huTxt}
      </span>
      <button class="banner-limpiar" onclick="limpiarBusqueda()">✕ Nueva búsqueda</button>`;
    banner.style.display = 'flex';
  }

  if (loading) loading.style.display = 'none';

  // Ordenar las tarjetas visibles por capacidad ascendente cuando se indicaron huéspedes
  if (huespedes > 0 && grid) {
    cards
      .filter(c => !c.classList.contains('pax-hidden'))
      .sort((a, b) => {
        const pa = (PROPS[a.dataset.nombre]?.pax) ?? 99;
        const pb = (PROPS[b.dataset.nombre]?.pax) ?? 99;
        return pa - pb;
      })
      .forEach(c => grid.appendChild(c));
  }

  // ── Precios reales desde Lodgify (en paralelo, solo para disponibles) ──
  const mañana = addDay(checkin);
  const disponiblesCards = cards.filter(c => !c.classList.contains('pax-hidden'));

  await Promise.allSettled(disponiblesCards.map(async card => {
    const slug = card.dataset.nombre;
    const p    = PROPS[slug];
    if (!p) return;

    try {
      const url = p.sistema
        ? `${API_SISTEMA}/api/properties/${slug}/precio?checkin=${checkin}&checkout=${mañana}&huespedes=1`
        : `${API}/api/precios-diarios?start=${checkin}&end=${mañana}&houseId=${p.houseId}&roomId=${p.roomId}`;
      const r   = await fetch(url);
      if (!r.ok) return;
      const { dias = [] } = await r.json();
      if (!dias.length || !dias[0].prices?.length) return;

      const tarifa = dias[0].prices[0].price_per_day;
      if (!tarifa) return;

      const precioFmt = moneda === 'USD'
        ? `USD ${fmt(Math.round(tarifa))}`
        : `ARS ${fmt(Math.round(tarifa * factorARS))}`;

      // Actualizar el elemento de precio en la card-info
      const precioEl = card.querySelector('.card-precio-label');
      if (precioEl) {
        precioEl.innerHTML = `desde ${precioFmt} <span class="card-noche">/noche</span>`;
      }
    } catch { /* silently skip */ }
  }));
});

// ── Propiedades dinámicas desde la API ───────────────────────────────────────
// Carga las propiedades creadas en el panel de admin (VisibleEnWeb + LodgifyHouseId > 0)
// y las suma al grid sin tocar las propiedades hardcodeadas existentes.
(async function loadApiProperties() {
  try {
    const res = await fetch('https://propietarios-happy-host.onrender.com/api/properties');
    if (!res.ok) return;
    const props = await res.json();
    if (!props || !props.length) return;

    const grid = document.querySelector('.grid-alojamientos');
    if (!grid) return;

    // Map de amenidades → icono para las tarjetas
    const amenIconos = {
      wifi:             'iconos/wifi.png',
      estacionamiento:  'iconos/estacionamiento.png',
      parrilla:         'iconos/parrilla.png',
      calefaccion:      'iconos/calefaccion.png',
      cocina:           'iconos/cocina.png',
      blancos:          'iconos/blancos.png',
      hogar:            'iconos/hogar.png',
      lavarropas:       'iconos/lavarropas.png',
      lavavajillas:     'iconos/lavavajilla.png',
      salamandra:       'iconos/salamandra.png',
    };

    for (const p of props) {
      // Saltar si ya existe un card hardcodeado con ese slug
      if (document.querySelector(`.card[data-nombre="${p.slug}"]`)) continue;

      // Agregar al objeto PROPS para disponibilidad y precio
      PROPS[p.slug] = { houseId: p.lodgifyHouseId, roomId: p.lodgifyRoomId, pax: p.personas };

      // Armar imágenes del carrusel
      let imagenes = [];
      try { imagenes = JSON.parse(p.imagenesJson || '[]'); } catch {}
      if (!imagenes.length) imagenes = ['logos/happyhost.png'];

      const slidesHtml = imagenes
        .map((url, i) => `<img src="${url}" class="slide${i === 0 ? ' active' : ''}" alt="${p.nombre}" loading="${i === 0 ? 'eager' : 'lazy'}">`)
        .join('');

      // Amenidades (máximo 4 iconos en la tarjeta)
      const amenHtml = (p.amenidades || [])
        .slice(0, 4)
        .map(k => {
          const ico = amenIconos[k] || null;
          return ico ? `<img src="${ico}" alt="${k}" title="${k}">` : '';
        })
        .join('');

      const card = document.createElement('a');
      card.href = '#';
      card.className = 'card';
      card.dataset.nombre = p.slug;
      card.dataset.cat = 'otros';
      card.setAttribute('onmouseover', 'iniciarSlideshow(this)');
      card.setAttribute('onmouseout', 'detenerSlideshow(this)');
      card.setAttribute('onclick', `redirigirConParametros('unidad.html?slug=${p.slug}'); return false;`);

      card.innerHTML = `
        <div class="carousel">
          <div class="overlay"></div>
          ${slidesHtml}
          <span class="card-cat-badge">${p.nombre}</span>
          <div class="nombre-alojamiento" style="display:none">${p.nombre}</div>
        </div>
        <div class="card-info">
          <div class="card-top">
            <h3 class="card-titulo">${p.nombre}</h3>
            <span class="card-pax"><img src="iconos/persona.png" alt="">hasta ${p.personas}</span>
          </div>
          <p class="card-desc">${p.descripcionCorta || ''}</p>
          <div class="card-amenity-icons">${amenHtml}</div>
          <div class="card-footer-row">
            <span class="card-precio-label">Consultá disponibilidad</span>
            <span class="card-ver">Ver →</span>
          </div>
        </div>`;

      grid.appendChild(card);
    }
  } catch { /* fallo silencioso */ }
})();
