/* =====================================================================
   alojamientos.js — búsqueda + disponibilidad + precios en tarjetas
   ===================================================================== */
'use strict';

const API = 'https://disponibilidad-happy-host-patagonia.onrender.com';

// ── Datos de propiedades (houseId, roomId, capacidad máx) ─────────────
const PROPS = {
  calafate1:        { houseId: 601552, roomId: 668343, pax: 6 },
  calafate2:        { houseId: 601707, roomId: 668498, pax: 4 },
  calafate3:        { houseId: 601708, roomId: 668499, pax: 6 },
  calafate4:        { houseId: 601710, roomId: 668501, pax: 6 },
  calafate5:        { houseId: 601711, roomId: 668502, pax: 4 },
  calafate6:        { houseId: 601712, roomId: 668503, pax: 6 },
  calafate7:        { houseId: 601713, roomId: 668504, pax: 4 },
  cruzdelsur4:      { houseId: 601717, roomId: 668508, pax: 2 },
  cruzdelsur5:      { houseId: 601714, roomId: 668505, pax: 2 },
  nilidas:          { houseId: 601719, roomId: 668510, pax: 4 },
  gurisa:           { houseId: 648950, roomId: 715936,  pax: 7 },
  paisajismo:       { houseId: 601720, roomId: 668511, pax: 3 },
  mitiempo:         { houseId: 677286, roomId: 744262, pax: 3 },
  refugiopatagonico:{ houseId: 677289, roomId: 744265, pax: 8 },
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
  const ci = localStorage.getItem('checkin');
  const co = localStorage.getItem('checkout');
  const hu = localStorage.getItem('huespedes');
  const p  = new URLSearchParams();
  if (ci) p.append('checkin',   ci);
  if (co) p.append('checkout',  co);
  if (hu) p.append('huespedes', hu);
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

  const urlParams = new URLSearchParams(window.location.search);
  const checkin   = urlParams.get('checkin')  || '';
  const checkout  = urlParams.get('checkout') || '';
  const huespedes = parseInt(urlParams.get('huespedes') || '0', 10);

  // Persistir en localStorage para que la página de propiedad los use
  if (checkin)       localStorage.setItem('checkin',   checkin);
  if (checkout)      localStorage.setItem('checkout',  checkout);
  if (huespedes > 0) localStorage.setItem('huespedes', String(huespedes));

  const loading = document.getElementById('loading-disponibilidad');
  const banner  = document.getElementById('banner-busqueda');
  const cards   = Array.from(document.querySelectorAll('.card[data-nombre]'));

  // Mezclar tarjetas aleatoriamente (preserva el orden visual fresco en cada visita)
  const grid = document.querySelector('.grid-alojamientos');
  if (grid) cards.sort(() => Math.random() - 0.5).forEach(c => grid.appendChild(c));

  // ── SIN fechas: mostrar todo (filtrar por pax si se indicó) ──────
  if (!checkin || !checkout) {
    cards.forEach(card => {
      const p = PROPS[card.dataset.nombre];
      const capOk = !huespedes || (p && p.pax >= huespedes);
      card.classList.toggle('pax-hidden', !capOk);
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

  // Aplicar visibilidad por disponibilidad + capacidad (usando clase para evitar conflicto con CSS !important)
  let visibles = 0;
  cards.forEach(card => {
    const p      = PROPS[card.dataset.nombre];
    const capOk  = !huespedes || (p && p.pax >= huespedes);
    const dispOk = p && disponiblesIds.includes(p.houseId);
    const mostrar = capOk && dispOk;
    card.classList.toggle('pax-hidden', !mostrar);
    if (mostrar) visibles++;
  });

  // Mostrar banner de resultados
  if (banner) {
    const huTxt = huespedes > 0
      ? ` · ${huespedes} huésped${huespedes > 1 ? 'es' : ''}`
      : '';
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
      const url = `${API}/api/precios-diarios?start=${checkin}&end=${mañana}&houseId=${p.houseId}&roomId=${p.roomId}`;
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
