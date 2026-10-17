/* =======================================================================
   pago-info.js — Seña + "¿Cómo se paga?" del motor de reservas de cada unidad
   Lo usan booking-widget.js (unidad.html / nueva-esperanza.html) y las páginas
   hechas a mano (calafateN, cruzN, gurisa, nilidas, paisajismo, refugio...).

   Expone window.hhPago:
     .calcularSenia(total, noches, moneda) → { senia, saldo }
     .chip(total, noches, moneda)          → HTML de la etiqueta "Seña X" (al lado del total)
     .montar(resDiv, total, noches, moneda) → botón bajo "Reservar ahora" que abre un modal

   El dólar blue venta (Ámbito Financiero; si falla, dolarapi.com) se vuelve a
   pedir cada 5 minutos y al volver a la pestaña, y los montos en pesos se
   actualizan solos.
   ======================================================================= */
(function () {
  'use strict';

  const fmt    = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
  const fmtARS = n => '$' + fmt(n);
  const REFRESCO_MS = 5 * 60 * 1000;

  // Seña: MISMA regla que formulario.js (calcularSeniaInteligente) y Presupuestos del SISTEMA.
  // La seña queda entre el 30% y el 40% del total, y lo que se paga al ingresar es el
  // número MÁS REDONDO posible dentro de ese rango (miles → 500 → 100 → 50…); si hay
  // varios igual de redondos, la seña más baja. Ej: 385 → 135/250 · 2.400 → 900/1.500.
  function calcularSenia(total, noches, moneda) {
    if (!total || total <= 0) return { senia: 0, saldo: 0 };
    const pasos = moneda === 'ARS'
      ? [1000000, 500000, 100000, 50000, 10000, 5000, 1000]
      : [1000, 500, 100, 50, 10, 5, 1];
    const saldoMin = total * 0.60, saldoMax = total * 0.70;
    for (const paso of pasos) {
      const saldo = Math.floor(saldoMax / paso) * paso;
      if (saldo > 0 && saldo >= saldoMin) return { senia: Math.round(total - saldo), saldo };
    }
    const saldo = Math.round(total * 0.65);
    return { senia: Math.round(total - saldo), saldo };
  }

  // ── Dólar blue venta ────────────────────────────────────────────────────
  let blueActual = null;
  async function traerBlue() {
    try {
      const r = await fetch('https://mercados.ambito.com/dolar/informal/variacion', { cache: 'no-store' });
      const j = await r.json();
      const v = parseFloat(String(j.venta).replace(/\./g, '').replace(',', '.'));
      if (v > 0) return v;
    } catch {}
    try {
      const r = await fetch('https://dolarapi.com/v1/dolares/blue', { cache: 'no-store' });
      const j = await r.json();
      if (j.venta > 0) return j.venta;
    } catch {}
    return null;
  }

  function pintarCotiz(box) {
    const senia = +box.dataset.senia, saldo = +box.dataset.saldo;
    if (!blueActual) {
      box.textContent = 'No pudimos traer la cotización ahora; te la confirmamos al reservar.';
      return;
    }
    box.innerHTML = `
      <div class="pago-paso">
        <div class="pago-paso-tit"><span>Seña · al reservar</span><strong>≈ ${fmtARS(Math.round(senia * blueActual))}</strong></div>
        <p class="pago-txt pago-chico">USD ${fmt(senia)} al dólar blue venta de hoy (${fmtARS(blueActual)}). Se ajusta al dólar del día en que transferís.</p>
      </div>
      <div class="pago-paso">
        <div class="pago-paso-tit"><span>Saldo · al ingresar</span><strong>USD ${fmt(saldo)}</strong></div>
        <p class="pago-txt pago-chico">Se pasa a pesos con el dólar blue venta <b>del día de tu ingreso</b>. Como referencia, al dólar de hoy serían ≈ ${fmtARS(Math.round(saldo * blueActual))}.</p>
      </div>`;
  }

  async function actualizarCotizaciones() {
    const v = await traerBlue();
    if (v) blueActual = v;
    document.querySelectorAll('[data-cotiz]').forEach(pintarCotiz);
  }
  let _primera = null;
  function asegurarCotizacion() {
    if (!_primera) {
      _primera = actualizarCotizaciones();
      setInterval(actualizarCotizaciones, REFRESCO_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') actualizarCotizaciones();
      });
    }
    return _primera;
  }

  // ── HTML ────────────────────────────────────────────────────────────────
  function chip(total, noches, moneda) {
    const { senia } = calcularSenia(total, noches, moneda);
    return `<span class="booking-sena">Seña ${moneda} ${fmt(senia)}</span>`;
  }

  // ── Modal (uno solo por página; el contenido se actualiza en cada cálculo) ──
  let modal = null;
  function asegurarModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'pago-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="pago-modal-caja" role="dialog" aria-modal="true" aria-labelledby="pago-modal-tit">
        <button class="pago-modal-cerrar" type="button" aria-label="Cerrar">×</button>
        <h3 id="pago-modal-tit">¿Cómo se paga?</h3>
        <div class="pago-modal-cuerpo"></div>
      </div>`;
    document.body.appendChild(modal);
    const cerrar = () => { modal.hidden = true; document.body.classList.remove('pago-modal-abierto'); };
    modal.querySelector('.pago-modal-cerrar').addEventListener('click', cerrar);
    modal.addEventListener('click', e => { if (e.target === modal) cerrar(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) cerrar(); });
    return modal;
  }

  function contenido(senia, saldo, moneda) {
    return `
      <ul class="pago-lista">
        <li><span>Seña para confirmar</span><strong>${moneda} ${fmt(senia)}</strong></li>
        <li><span>Saldo al ingresar</span><strong>${moneda} ${fmt(saldo)}</strong></li>
      </ul>
      <p class="pago-txt">La <b>seña</b> se abona por <b>transferencia</b> para confirmar la reserva. El <b>saldo</b> se abona <b>al ingresar</b>.</p>
      ${moneda === 'USD' ? `
      <div class="pago-pesos">
        <p class="pago-sub">¿Pagás en pesos?</p>
        <p class="pago-txt">Se usa el <b>dólar blue venta</b> de <b>Ámbito Financiero</b>.</p>
        <div class="pago-cotiz" data-cotiz data-senia="${senia}" data-saldo="${saldo}">Buscando la cotización de hoy…</div>
      </div>
      <p class="pago-txt pago-chico">Si pagás en dólares, los billetes tienen que estar en perfecto estado (sin roturas, manchas ni marcas).</p>` : ''}`;
  }

  // Pone el botón "¿Cómo se paga?" justo debajo de "Reservar ahora" y lo conecta al modal.
  // Se oculta solo cuando el resultado deja de mostrar un precio (fechas inválidas, cargando…).
  function montar(resDiv, total, noches, moneda) {
    if (!resDiv) return;
    const { senia, saldo } = calcularSenia(total, noches, moneda);
    const reservar = document.getElementById('btnReservar') || resDiv;

    let btn = document.querySelector('.pago-toggle');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pago-toggle';
      btn.textContent = '¿Cómo se paga?';
      btn.setAttribute('aria-haspopup', 'dialog');
      reservar.insertAdjacentElement('afterend', btn);
      btn.addEventListener('click', () => {
        const m = asegurarModal();
        m.hidden = false;
        document.body.classList.add('pago-modal-abierto');
        m.querySelector('.pago-modal-cerrar').focus();
      });
      new MutationObserver(() => {
        btn.hidden = !resDiv.querySelector('.booking-summary');
      }).observe(resDiv, { childList: true, characterData: true, subtree: true });
    }
    btn.hidden = false;

    const cuerpo = asegurarModal().querySelector('.pago-modal-cuerpo');
    cuerpo.innerHTML = contenido(senia, saldo, moneda);
    const box = cuerpo.querySelector('[data-cotiz]');
    if (box) {
      if (blueActual) pintarCotiz(box);
      asegurarCotizacion();
    }
  }

  window.hhPago = { calcularSenia, chip, montar };
})();
