/**
 * promos.js — Motor de promociones Happy Host Patagonia
 *
 * Uso en páginas de propiedad:
 *   1. Definir PROP_KEY y PROP_FAMILY antes de este script
 *   2. En calculate():
 *        const { descuentoUSD, label } =
 *          await hhPromos.evaluar(PROP_KEY, PROP_FAMILY, checkin, checkout, guests, totalUSD);
 *   3. En DOMContentLoaded:
 *        hhPromos.initPopup(PROP_KEY, PROP_FAMILY);
 *
 * Uso en viajero.html:
 *   hhPromos.initViajeroPromos();   → muestra card de estadías largas
 */
(function () {
  'use strict';

  const DISP_API = 'https://disponibilidad-happy-host-patagonia.onrender.com';
  const KEY_PFX  = 'hh_promo_v3_';   // v3: fingerprint incluye contenido → editar promo resetea "ya visto"

  /* ── Umbral estadía larga (se actualiza si la API devuelve el dato) ────── */
  var _longStayMin = 20;

  /* ── Huella del contenido: cambia si se edita la promo ────────────────── */
  function _fp(p) {
    return [p.type, p.value || '', p.stayX || '', p.payY || '',
            p.longStayValue || '', p.longStayMinNights || ''].join('|');
  }

  /* ── Noches entre dos strings YYYY-MM-DD ─────────────────────────────── */
  function _nights(ci, co) {
    if (!ci || !co) return 0;
    return Math.round((new Date(co) - new Date(ci)) / 86400000);
  }

  /* ════════════════════════════════════════════════════════════════════════
     evaluar — calcula el descuento para una reserva concreta
  ════════════════════════════════════════════════════════════════════════ */
  async function evaluar(propKey, propFamily, checkin, checkout, guests, baseUSD) {
    try {
      const resp = await fetch(`${DISP_API}/api/evaluar-promo`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ unidad: propKey, familia: propFamily,
                                  checkin, checkout, guests, basePrice: baseUSD })
      });
      if (!resp.ok) return _noDiscount();
      const data = await resp.json();

      /* Porcentaje real = totalDiscount / baseUSD (evita usar campos desconocidos de la API) */
      const computedPct = (baseUSD > 0 && data.totalDiscount > 0)
        ? Math.round(data.totalDiscount / baseUSD * 100)
        : 0;

      /* Label descriptivo por tipo */
      const label = (data.applied && data.applied.length)
        ? data.applied.map(function (a) {
            var t = a.type || '';
            if (t === 'longstay_simple' || t === 'longstay') {
              var n = a.longStayMinNights || a.minNights || _longStayMin;
              _longStayMin = n;   // sincronizar umbral
              return computedPct
                ? ('Estadía larga -' + computedPct + '%')
                : 'Estadía larga';
            }
            return a.name || 'Descuento';
          }).join(' + ')
        : 'Descuento';

      return { descuentoUSD: data.totalDiscount || 0, label };
    } catch (_) { return _noDiscount(); }
  }
  function _noDiscount() { return { descuentoUSD: 0, label: 'Descuento' }; }

  /* ════════════════════════════════════════════════════════════════════════
     initPopup — popup en página de propiedad
     • No muestra promos longstay (esas van en viajero.html)
     • No muestra el popup si la estadía ya es de 20+ noches (URL o selección)
  ════════════════════════════════════════════════════════════════════════ */
  async function initPopup(propKey, propFamily) {
    var overlay = document.getElementById('promoPopup');
    if (!overlay) return;

    /* ── 1. Chequeo por URL: si vienen fechas con 20+ noches, salir ya ─── */
    var _p  = new URLSearchParams(window.location.search);
    var _ci = _p.get('checkin'), _co = _p.get('checkout');
    if (_nights(_ci, _co) >= _longStayMin) {
      overlay.style.display = 'none';
      return;
    }

    try {
      var resp = await fetch(`${DISP_API}/api/promos-activas/${encodeURIComponent(propKey)}`);
      if (!resp.ok) { overlay.style.display = 'none'; return; }
      var promos = await resp.json();

      /* Actualizar umbral con dato real si la API lo devuelve */
      var lsPromo = (promos || []).find(function (p) { return p.type === 'longstay_simple'; });
      if (lsPromo && lsPromo.longStayMinNights) _longStayMin = lsPromo.longStayMinNights;

      /* Excluir long-stay del popup de propiedad */
      promos = (promos || []).filter(function (p) { return p.type !== 'longstay_simple'; });
      if (!promos.length) { overlay.style.display = 'none'; return; }

      var promo   = promos[0];
      var seenKey = KEY_PFX + propKey + '_' + promo.id + '_' + _fp(promo);

      /* Construir popup dinámicamente según tipo */
      overlay.innerHTML = _buildPopupHTML(promo);

      /* ── Cerrar ─────────────────────────────────────────────────────── */
      var closeBtn = overlay.querySelector('.promo-close');
      function doClose() {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        localStorage.setItem(seenKey, '1');
      }
      if (closeBtn) closeBtn.addEventListener('click', doClose);
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) doClose();
      });

      /* ── 2. MutationObserver: cierra popup y muestra badge si 20+ n ── */
      var resDiv = document.getElementById('resultado');
      if (resDiv) {
        var _obs = new MutationObserver(function () {
          var m = resDiv.textContent.match(/Noches:\s*(\d+)/);
          if (!m) return;
          var n = parseInt(m[1]);
          if (n >= _longStayMin) {
            /* Cerrar popup si está abierto */
            doClose();
            /* Inyectar badge "Estadía larga" en el resumen si no existe ya */
            var summary = resDiv.querySelector('.booking-summary');
            if (summary && !summary.querySelector('.hh-ls-notice')) {
              var li = document.createElement('li');
              li.className = 'hh-ls-notice';
              li.innerHTML = '🌿 <strong>Estadía larga:</strong> descuento automático incluido';
              var nochesLi = Array.from(summary.querySelectorAll('li'))
                               .find(function (l) { return /Noches:/.test(l.textContent); });
              if (nochesLi) nochesLi.insertAdjacentElement('afterend', li);
              else summary.insertBefore(li, summary.firstChild);
            }
          } else {
            /* Estadía corta: quitar badge si existe */
            var badge = resDiv.querySelector('.hh-ls-notice');
            if (badge) badge.remove();
          }
        });
        _obs.observe(resDiv, { childList: true, subtree: true });
      }

      /* ── 3. Mostrar si no fue visto con este contenido exacto ────────── */
      if (!localStorage.getItem(seenKey)) {
        setTimeout(function () {
          /* Revalidar por si el usuario ya eligió fechas largas */
          var mCheck = document.getElementById('resultado');
          if (mCheck) {
            var mc = mCheck.textContent.match(/Noches:\s*(\d+)/);
            if (mc && parseInt(mc[1]) >= _longStayMin) return;
          }
          overlay.style.display = '';   // limpiar display:none inline
          overlay.classList.add('active');
          overlay.setAttribute('aria-hidden', 'false');
        }, 900);
      }

    } catch (_) { overlay.style.display = 'none'; }
  }

  /* ════════════════════════════════════════════════════════════════════════
     initViajeroPromos — card de estadía larga en viajero.html
  ════════════════════════════════════════════════════════════════════════ */
  async function initViajeroPromos() {
    var container = document.getElementById('hhLongStayCard');
    if (!container) return;

    try {
      /* Consulta con cualquier propiedad global para obtener promos 'all' */
      var resp = await fetch(`${DISP_API}/api/promos-activas/calafate1`);
      if (!resp.ok) return;
      var promos = await resp.json();

      var longStay = (promos || []).filter(function (p) { return p.type === 'longstay_simple'; });
      if (!longStay.length) return;

      var p       = longStay[0];
      var seenKey = KEY_PFX + 'viajero_ls_' + p.id + '_' + _fp(p);

      container.innerHTML = _buildLongStayCard(p);
      container.style.display = 'block';

      function cerrarCard() {
        container.style.transition = 'opacity .5s';
        container.style.opacity = '0';
        setTimeout(function () {
          container.style.display = 'none';
          container.style.opacity = '';
        }, 500);
      }

      var closeBtn = container.querySelector('.ls-card-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', cerrarCard);
      }
    } catch (_) { /* silencioso */ }
  }

  /* ════════════════════════════════════════════════════════════════════════
     Constructores de HTML
  ════════════════════════════════════════════════════════════════════════ */

  function _buildPopupHTML(p) {
    return '<div class="promo-popup promo-popup--' + (p.type || 'default') + '">' +
             '<button class="promo-close" id="closePromoPopup" aria-label="Cerrar">×</button>' +
             _buildHero(p) +
             '<div class="promo-body">' +
               '<h2 class="promo-title">' + (p.name || '') + '</h2>' +
               '<p class="promo-text">' + _buildDescription(p) + '</p>' +
               '<p class="promo-auto">✓ El descuento se aplica automáticamente al calcular tu estadía.</p>' +
             '</div>' +
           '</div>';
  }

  function _buildHero(p) {
    if (p.type === 'free_nights') {
      return '<div class="promo-hero promo-hero--fn">' +
               '<div class="promo-fn-display">' +
                 '<span class="promo-fn-n">' + p.stayX + '</span>' +
                 '<span class="promo-fn-eq">✕</span>' +
                 '<span class="promo-fn-p">' + p.payY + '</span>' +
               '</div>' +
               '<p class="promo-fn-sub">noches al precio de ' + p.payY + '</p>' +
             '</div>';
    }
    if (p.type === 'percentage') {
      return '<div class="promo-hero promo-hero--pct">' +
               '<div class="promo-pct-circle">' +
                 '<span class="promo-pct-val">' + p.value + '</span>' +
                 '<span class="promo-pct-sym">%</span>' +
                 '<span class="promo-pct-off">OFF</span>' +
               '</div>' +
             '</div>';
    }
    if (p.type === 'fixedamount') {
      return '<div class="promo-hero promo-hero--fixed">' +
               '<span class="promo-fixed-val">USD ' + p.value + '</span>' +
               '<span class="promo-fixed-off">de descuento</span>' +
             '</div>';
    }
    return '<div class="promo-hero promo-hero--default">' +
             '<span class="promo-default-badge">OFERTA</span>' +
           '</div>';
  }

  function _buildDescription(p) {
    var parts = [];
    if (p.type === 'percentage')
      parts.push('Aprovechá un <strong>' + p.value + '% de descuento</strong>');
    else if (p.type === 'fixedamount')
      parts.push('Aprovechá <strong>USD ' + p.value + ' de descuento</strong>');
    else if (p.type === 'fixednight')
      parts.push('Precio especial de <strong>USD ' + p.value + ' por noche</strong>');
    else if (p.type === 'free_nights')
      parts.push('Reservá <strong>' + p.stayX + ' noches</strong> y pagá solo <strong>' + p.payY + '</strong>');

    if (p.stayStart || p.stayEnd) {
      var fmt = function (s) {
        if (!s) return null;
        return new Date(s).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
      };
      var from = fmt(p.stayStart), to = fmt(p.stayEnd);
      if (from && to)  parts.push(' para estadías del ' + from + ' al ' + to);
      else if (from)   parts.push(' para estadías desde el ' + from);
      else if (to)     parts.push(' para estadías hasta el ' + to);
    }

    return parts.join('') + (parts.length ? '.' : '');
  }

  function _buildLongStayCard(p) {
    var nights = p.longStayMinNights || 20;
    var pct    = p.longStayValue     || 0;
    return '<div class="ls-card">' +
             '<button class="ls-card-close" aria-label="Cerrar">×</button>' +
             '<div class="ls-card-img-wrap">' +
               '<img src="iconos/oferta-especial.png" alt="Oferta especial" class="ls-card-oferta-img">' +
             '</div>' +
             '<div class="ls-card-content">' +
               '<p class="ls-card-title">Estadía larga · <strong>' + pct + '% de descuento</strong></p>' +
               '<p class="ls-card-text">Reservas de <strong>' + nights + ' noches o más</strong> ' +
                 'tienen un descuento automático del <strong>' + pct + '%</strong>. ' +
                 'Ideal para una temporada completa en la Patagonia.</p>' +
               '<a href="alojamientos.html" class="ls-card-cta">Ver alojamientos disponibles</a>' +
             '</div>' +
           '</div>';
  }

  /* ── Exports ─────────────────────────────────────────────────────────── */
  window.hhPromos = {
    evaluar          : evaluar,
    initPopup        : initPopup,
    initViajeroPromos: initViajeroPromos
  };

})();
