/* =======================================================================
   booking-widget.js — Motor de reservas para unidad.html (propiedades dinámicas)
   - Si houseId > 0 → usa Lodgify (disponibilidad + precios)
   - Si houseId = 0 → usa el sistema de propietarios (disponibilidad + precios)
   Requiere: flatpickr (ya cargado en <head>), calendario.js, moneda.js (opcional)
   ======================================================================= */
(function () {
  'use strict';

  const card = document.querySelector('.booking-card');
  if (!card) return;

  const HOUSE_ID   = parseInt(card.dataset.houseId,  10) || 0;
  const ROOM_ID    = parseInt(card.dataset.roomId,   10) || 0;
  const MAX_GUESTS = parseInt(card.dataset.personas, 10) || 10;
  const SIN_NINOS  = card.dataset.sinNinos === 'true';   // propiedad que no admite niños (2-14)
  const USA_LODGIFY = HOUSE_ID > 0 && ROOM_ID > 0;

  // Slug desde URL (?slug=) o, en páginas estáticas, desde data-slug de la tarjeta
  const PROP_KEY = new URLSearchParams(window.location.search).get('slug') || card.dataset.slug || '';
  if (!PROP_KEY) return;

  // URLs según fuente de datos
  const API_SISTEMA = 'https://propietarios-happy-host.onrender.com';
  const API_DISP    = 'https://disponibilidad-happy-host-patagonia.onrender.com';

  // Fecha límite: 18 meses desde hoy
  const fechaLimite = new Date();
  fechaLimite.setMonth(fechaLimite.getMonth() + 18);

  const params     = new URLSearchParams(window.location.search);
  const checkin    = params.get('checkin');
  const checkout   = params.get('checkout');
  const huespedes  = params.get('huespedes');
  const hasDatesFromURL = !!(checkin && checkout);

  // ── helpers ──────────────────────────────────────────────────────────────
  function parseYMDLocal(s) {
    if (!s) return null;
    if (s.includes('-')) {
      const [y, m, d] = s.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m - 1, d);
    }
    if (s.includes('/')) {
      const [d, m, y] = s.split('/').map(Number);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m - 1, d);
    }
    const t = new Date(s);
    if (!isNaN(t.getTime())) return new Date(t.getFullYear(), t.getMonth(), t.getDate());
    return null;
  }
  function ymdLocal(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setHours(0, 0, 0, 0); return x;
  }
  function fmtLocal(d) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  }
  const fmt = n => Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

  // ── elementos del DOM ────────────────────────────────────────────────────
  const startInput  = document.getElementById('start');
  const endInput    = document.getElementById('end');
  const guestsInput = document.getElementById('guests');
  const currSelect  = document.getElementById('currency');
  const resDiv      = document.getElementById('resultado');
  const reservarBtn = document.getElementById('btnReservar');
  const precioBox   = card.querySelector('.booking-precio');
  const precioOriginalHTML = precioBox ? precioBox.innerHTML : '';

  if (!startInput || !endInput || !reservarBtn) return;

  function resetPrecioBox() {
    if (precioBox) { precioBox.innerHTML = precioOriginalHTML; precioBox.classList.add('precio-oculto'); }
  }

  // ── selector de huéspedes (adultos / niños / bebés) ───────────────────────
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

  // Leer valores iniciales desde URL.
  // Si viene adultos explícito lo usamos; si no hay desglose, arrancamos con 1 adulto
  // (NO usar el total de huespedes como adultos — evita que "2 adultos + 1 niño" = 3 adultos)
  const initAdultos = Math.min(parseInt(params.get('adultos')) || 1, MAX_GUESTS);
  const initNinos   = SIN_NINOS ? 0 : Math.min(parseInt(params.get('ninos')) || 0, Math.max(0, MAX_GUESTS - initAdultos));
  const initBebes   = parseInt(params.get('bebes')) || 0;

  // Pre-cargar fechas ANTES de montar el selector, para que el primer
  // onChange → calculate() ya las vea y calcule el precio de inmediato
  if (checkin)  startInput.value = checkin;
  if (checkout) endInput.value   = checkout;

  // Montar el selector en el contenedor del booking card
  const huContainer = card.querySelector('.booking-hu-container');
  let huSelector = null;
  let _adultos = initAdultos, _ninos = initNinos, _bebes = initBebes;

  if (guestsInput) guestsInput.value = _adultos + _ninos;

  if (huContainer && window.HH && window.HH.HuespedesSelector) {
    huSelector = new window.HH.HuespedesSelector({
      container: huContainer,
      maxGuests: MAX_GUESTS,
      sinNinos:  SIN_NINOS,
      adultos:   initAdultos,
      ninos:     initNinos,
      bebes:     initBebes,
      dark:      false,
      onChange: function (v) {
        _adultos = v.adultos; _ninos = v.ninos; _bebes = v.bebes;
        if (guestsInput) guestsInput.value = v.total;
        calculate();
      }
    });
  }

  // ── capacidad dinámica: el sistema es la fuente de verdad ────────────────
  // Pedimos la ficha de la propiedad y, si la capacidad cargada en el sistema
  // difiere del data-personas de la página, actualizamos el máximo del selector.
  // No bloquea el render (el data-personas sirve de respaldo instantáneo); si la
  // API está dormida o falla, queda el valor de la página.
  fetch(`${API_SISTEMA}/api/properties/${PROP_KEY}`)
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (p) {
      if (!p) return;
      var cap = parseInt(p.personas, 10);
      if (cap && cap > 0 && cap !== MAX_GUESTS && huSelector && huSelector.setMax) {
        huSelector.setMax(cap);
      }
    })
    .catch(function () { /* sin conexión → queda el data-personas */ });

  // ── flatpickr ────────────────────────────────────────────────────────────
  const startPicker = flatpickr(startInput, {
    altInput: true, altFormat: 'd/m/Y', dateFormat: 'Y-m-d',
    defaultDate: checkin || null, minDate: hoy, maxDate: fechaLimite,
    disableMobile: true,
    onChange: (selectedDates) => {
      if (selectedDates[0]) {
        if (!hasDatesFromURL && !endInput.value) {
          endPicker.setDate(null);
          endPicker.jumpToDate(selectedDates[0]);
          endPicker.open();
        }
        const y = selectedDates[0].getFullYear();
        const m = String(selectedDates[0].getMonth() + 1).padStart(2, '0');
        const d = String(selectedDates[0].getDate()).padStart(2, '0');
        setCurrencyAndCalculate(`${y}-${m}-${d}`);
      }
    }
  });
  const endPicker = flatpickr(endInput, {
    altInput: true, altFormat: 'd/m/Y', dateFormat: 'Y-m-d',
    defaultDate: checkout || null, minDate: hoy, maxDate: fechaLimite,
    disableMobile: true, onChange: calculate
  });

  // ── disponibilidad ────────────────────────────────────────────────────────
  let fechasOcupadas = [];
  let dispCargada    = false;   // true cuando ya cargó la disponibilidad (evita reservar en el "race" de carga)
  async function loadDisabledDates(picker) {
    try {
      const url = USA_LODGIFY
        ? `${API_DISP}/api/ocupados/${PROP_KEY}`
        : `${API_SISTEMA}/api/properties/${PROP_KEY}/ocupados`;

      const resp = await fetch(url);
      if (!resp.ok) return;
      const rangos = await resp.json();
      fechasOcupadas = rangos;
      dispCargada = true;
      calculate();   // re-evaluar por si el huésped ya había elegido fechas mientras cargaba
      picker.set('disable', [
        ...rangos.map(r => {
          const from = parseYMDLocal(r.from);
          const to   = parseYMDLocal(r.to);
          if (from) from.setDate(from.getDate() + 1);
          return { from, to };
        }),
        date => date < hoy || date > fechaLimite
      ]);
      if (window.hhCalendario) window.hhCalendario.aplicarClases(picker, rangos);
    } catch (e) {
      console.warn('No se pudieron cargar fechas ocupadas:', e.message);
    }
  }
  [startPicker, endPicker].forEach(picker => {
    picker.config.onReady.push(() => loadDisabledDates(picker));
    picker.config.onMonthChange.push(() => loadDisabledDates(picker));
    picker.config.onOpen.push(() => loadDisabledDates(picker));
  });

  if (checkin) setCurrencyAndCalculate(checkin); else calculate();

  currSelect?.addEventListener('change', calculate);

  // ── moneda ────────────────────────────────────────────────────────────────
  async function setCurrencyAndCalculate(fechaCheckinStr) {
    if (window.hhMoneda) {
      const { moneda, factorARS } = await window.hhMoneda.detectar(fechaCheckinStr, PROP_KEY);
      if (currSelect) currSelect.value = moneda;
      window._factorARS = factorARS;
    }
    calculate();
  }

  // ── popup "fechas ya reservadas" ──────────────────────────────────────────
  function mostrarPopupOcupado() {
    let ov = document.getElementById('hh-ocupado-modal');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'hh-ocupado-modal';
      ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,30,40,.55);display:flex;align-items:center;justify-content:center;padding:20px';
      ov.innerHTML =
        '<div style="background:#fff;border-radius:16px;max-width:360px;width:100%;padding:26px 24px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.35);font-family:inherit">' +
          '<div style="font-size:2.4rem;margin-bottom:6px">📅</div>' +
          '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-weight:700;font-size:1.15rem;color:#1E3F4E;margin-bottom:8px">Esas fechas ya están reservadas</div>' +
          '<div style="font-size:.9rem;color:#555;line-height:1.5;margin-bottom:18px">Por favor elegí otras fechas disponibles en el calendario.</div>' +
          '<button type="button" style="background:#E25843;color:#fff;border:none;border-radius:10px;padding:11px 24px;font-weight:600;font-size:.95rem;cursor:pointer">Elegir otras fechas</button>' +
        '</div>';
      ov.addEventListener('click', e => { if (e.target === ov || e.target.tagName === 'BUTTON') ov.remove(); });
      document.body.appendChild(ov);
    } else { ov.style.display = 'flex'; }
  }

  // ── cruce con ocupadas ────────────────────────────────────────────────────
  function hayCruceConFechasOcupadas(ci, co) {
    const ci0 = ymdLocal(ci instanceof Date ? ci : parseYMDLocal(ci));
    const co0 = ymdLocal(co instanceof Date ? co : parseYMDLocal(co));
    if (!ci0 || !co0) return true;
    return fechasOcupadas.some(({ from, to }) => {
      const i0 = parseYMDLocal(from); const f0 = parseYMDLocal(to);
      if (!i0 || !f0) return false;
      return (ci0 > ymdLocal(i0) && ci0 < ymdLocal(f0)) ||
             (co0 > ymdLocal(i0) && co0 < ymdLocal(f0)) ||
             (ci0 <= ymdLocal(i0) && co0 >= ymdLocal(f0));
    });
  }

  // ── calcular precio ───────────────────────────────────────────────────────
  async function calculate() {
    resetPrecioBox();
    const startValue = startInput.value;
    const endValue   = endInput.value;
    const guests     = +(guestsInput?.value || 1);
    const moneda     = currSelect?.value || 'USD';

    if (!startValue || !endValue) { if (resDiv) resDiv.textContent = 'Seleccioná ambas fechas.'; reservarBtn.disabled = true; return; }

    const sd = parseYMDLocal(startValue);
    const ed = parseYMDLocal(endValue);
    if (!sd || !ed) { if (resDiv) resDiv.textContent = 'Fechas inválidas.'; reservarBtn.disabled = true; return; }
    if (ed <= sd)   { if (resDiv) resDiv.textContent = 'La fecha de salida debe ser posterior a la de llegada.'; reservarBtn.disabled = true; return; }
    if (!dispCargada) { if (resDiv) resDiv.textContent = 'Verificando disponibilidad…'; reservarBtn.disabled = true; setTimeout(calculate, 400); return; }
    if (hayCruceConFechasOcupadas(sd, ed)) { if (resDiv) resDiv.textContent = 'El rango incluye fechas ya ocupadas.'; reservarBtn.disabled = true; return; }

    const noches = Math.round((ed - sd) / (1000 * 60 * 60 * 24));
    if (resDiv) resDiv.textContent = 'Cargando…';
    reservarBtn.disabled = true;

    try {
      let dias = [], extras = [], huespedesIncluidos = 4;

      if (USA_LODGIFY) {
        const url  = `${API_DISP}/api/precios-diarios?start=${startValue}&end=${endValue}&houseId=${HOUSE_ID}&roomId=${ROOM_ID}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(await resp.text());
        ({ dias = [], extras = [] } = await resp.json());
      } else {
        const url  = `${API_SISTEMA}/api/properties/${PROP_KEY}/precio?checkin=${startValue}&checkout=${endValue}&huespedes=${guests}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(await resp.text());
        const data = await resp.json();
        dias               = data.dias   ?? [];
        extras             = data.extras ?? [];
        huespedesIncluidos = data.huespedesIncluidos ?? 4;
      }

      if (dias.length === 0) { if (resDiv) resDiv.textContent = 'No hay precios para estas fechas.'; return; }

      const minStay = dias
        .map(d => Math.min(...d.prices.map(p => p.min_stay)))
        .reduce((a, b) => Math.min(a, b), Infinity);
      if (noches < minStay) { if (resDiv) resDiv.textContent = `La estadía mínima es de ${minStay} noches.`; return; }

      const factorARS  = window._factorARS || 1400;
      const FREE_GUESTS = huespedesIncluidos;

      let baseUSD = 0;
      const breakdownNoches = [];
      const startLocal = ymdLocal(sd);

      for (let i = 0; i < noches; i++) {
        const d = dias[i];
        const tarifa = d.prices.find(x => noches >= x.min_stay && noches <= x.max_stay)
                     || d.prices.reduce((a, b) => (a.min_stay < b.min_stay ? a : b));
        const usd = tarifa.price_per_day;
        baseUSD += usd;
        const fechaNoche = new Date(startLocal);
        fechaNoche.setDate(startLocal.getDate() + i);
        const montoMoneda = moneda === 'USD' ? Math.round(usd) : Math.round(usd * factorARS);
        breakdownNoches.push({ fecha: new Date(fechaNoche), montoMoneda });
      }

      const extraUnit  = extras[0]?.price_per_day || 12;
      const extraQty   = Math.max(0, guests - FREE_GUESTS);
      const extraUSD   = extraQty * extraUnit * noches;
      const totalUSD   = baseUSD + extraUSD;
      const totalMoneda = moneda === 'USD' ? Math.round(totalUSD) : Math.round(totalUSD * factorARS);
      const extraMoneda = moneda === 'USD' ? Math.round(extraUSD) : Math.round(extraUSD * factorARS);

      // Promos (opcional)
      let descuento = 0, discountLabel = 'Descuento';
      if (window.hhPromos) {
        const { descuentoUSD, label } = await hhPromos.evaluar(PROP_KEY, '', startValue, endValue, guests, totalUSD);
        descuento = Math.round(descuentoUSD * (moneda === 'USD' ? 1 : factorARS));
        discountLabel = label;
      }
      const totalFinal = totalMoneda - descuento;

      // UI resultado
      const itemsNoches = breakdownNoches.map(it =>
        `<li><span>${fmtLocal(it.fecha)}</span><span>${fmt(it.montoMoneda)} ${moneda}</span></li>`
      ).join('');
      const extraHtml = extraQty > 0
        ? `<li class="bd-extra"><span>Extra huésped (${extraQty} × ${noches} noches)</span><span>+ ${fmt(extraMoneda)} ${moneda}</span></li>` : '';
      const descHtml = descuento > 0
        ? `<li class="bd-discount"><span>${discountLabel}</span><span>− ${fmt(descuento)} ${moneda}</span></li>` : '';
      const totalStack = descuento > 0
        ? `<div class="price-stack"><div class="old-price old-price--big">${fmt(totalMoneda)} ${moneda}</div><div class="new-price">${fmt(totalFinal)} ${moneda}</div></div>`
        : `<span class="price-current">${fmt(totalFinal)} ${moneda}</span>`;

      const resumenHuespedes = huSelector ? huSelector.resumen : (guests === 1 ? '1 huésped' : `${guests} huéspedes`);
      if (resDiv) resDiv.innerHTML = `
        <ul class="booking-summary">
          <li>Noches: ${noches}</li>
          <li>Huéspedes: ${resumenHuespedes}</li>
          <li class="total-line"><strong>Total estadía:</strong> ${totalStack}</li>
        </ul>
        <div class="price-breakdown">
          <button class="bd-toggle" type="button" aria-expanded="true" aria-controls="bd-list">Ocultar detalle</button>
          <ul id="bd-list" class="bd-list">${itemsNoches}${extraHtml}${descHtml}
            <li class="bd-subtotal"><span>Subtotal</span><span>${fmt(totalFinal)} ${moneda}</span></li>
          </ul>
        </div>`;

      const toggle = resDiv?.querySelector('.bd-toggle');
      const list   = resDiv?.querySelector('#bd-list');
      toggle?.addEventListener('click', () => {
        const exp = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!exp));
        if (exp) { list.hidden = true; toggle.textContent = 'Ver detalle de precios'; }
        else     { list.hidden = false; toggle.textContent = 'Ocultar detalle'; }
      });

      if (precioBox) {
        precioBox.innerHTML = `<span class="booking-monto">${moneda} ${fmt(totalFinal)}</span><span class="booking-noche"> total</span>`;
        precioBox.classList.remove('precio-oculto');
      }

      reservarBtn.disabled = false;
      reservarBtn.onclick = () => {
        // Guard final anti-overbooking: re-validar contra la disponibilidad ya cargada
        if (!dispCargada || hayCruceConFechasOcupadas(startValue, endValue)) { mostrarPopupOcupado(); return; }
        const nombreProp = card.dataset.nombre
          || document.querySelector('.unidad-h1')?.textContent?.trim()
          || '';
        let qs;
        if (USA_LODGIFY) {
          // Propiedad con Lodgify → flujo original (IDs Lodgify → crea en Lodgify)
          qs = new URLSearchParams({
            propertyId:     HOUSE_ID,
            roomTypeId:     ROOM_ID,
            checkInDate:    startValue,
            checkOutDate:   endValue,
            numberOfGuests: guests,
            adultos:        _adultos,
            ninos:          _ninos,
            bebes:          _bebes,
            totalPrice:     totalFinal,
            currency:       moneda,
          }).toString();
        } else {
          // Propiedad sin Lodgify → flujo nuevo (slug → crea en sistema propio)
          qs = new URLSearchParams({
            slug:           PROP_KEY,
            nombre:         nombreProp,
            checkInDate:    startValue,
            checkOutDate:   endValue,
            numberOfGuests: guests,
            adultos:        _adultos,
            ninos:          _ninos,
            bebes:          _bebes,
            totalPrice:     totalFinal,
            currency:       moneda,
          }).toString();
        }
        window.location.href = `formulario.html?${qs}`;
      };

    } catch (e) {
      console.error(e);
      if (resDiv) resDiv.textContent = 'Error al obtener datos: ' + e.message;
      reservarBtn.disabled = true;
    }
  }
})();
