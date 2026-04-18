/**
 * promos.js — Motor de promociones dinámico para happyhostpatagonia.com.ar
 *
 * Uso en cada página de propiedad:
 *   1. Definir PROP_KEY y PROP_FAMILY antes de este script
 *   2. Reemplazar el bloque hardcoded de descuentos por:
 *        const { descuentoUSD, label: discountLabel } =
 *          await hhPromos.evaluar(PROP_KEY, PROP_FAMILY, startValue, endValue, guests, totalUSD);
 *   3. En DOMContentLoaded:
 *        hhPromos.initPopup(PROP_KEY, PROP_FAMILY);
 */
(function () {
  'use strict';

  const DISP_API       = 'https://disponibilidad-happy-host-patagonia.onrender.com';
  const POPUP_KEY_PFX  = 'hh_promo_v2_';      // prefijo localStorage para controlar "ya visto"

  /* ─── Evaluar descuento para una reserva concreta ───────────────────────
   * Llama a /api/evaluar-promo (proxy en el servidor de disponibilidad)
   * Retorna { descuentoUSD, label }
   * En caso de error retorna { descuentoUSD: 0, label: 'Descuento' } — no rompe la página
   */
  async function evaluar(propKey, propFamily, checkin, checkout, guests, baseUSD) {
    try {
      const resp = await fetch(`${DISP_API}/api/evaluar-promo`, {
        method  : 'POST',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify({
          unidad   : propKey,
          familia  : propFamily,
          checkin,
          checkout,
          guests,
          basePrice: baseUSD
        })
      });
      if (!resp.ok) return _noDiscount();
      const data  = await resp.json();
      const label = (data.applied && data.applied.length)
        ? data.applied.map(function (a) { return a.name; }).join(' + ')
        : 'Descuento';
      return { descuentoUSD: data.totalDiscount || 0, label: label };
    } catch (_) {
      return _noDiscount();
    }
  }

  function _noDiscount() {
    return { descuentoUSD: 0, label: 'Descuento' };
  }

  /* ─── Inicializar popup de promos ────────────────────────────────────────
   * Fetches GET /api/promos-activas/:propKey
   * Si hay promos activas: rellena el popup y lo muestra (una sola vez por promo).
   * Si no hay promos: oculta el popup.
   */
  async function initPopup(propKey, propFamily) {
    var overlay = document.getElementById('promoPopup');
    if (!overlay) return;

    try {
      var resp = await fetch(`${DISP_API}/api/promos-activas/${encodeURIComponent(propKey)}`);
      if (!resp.ok) { _hidePopup(overlay); return; }
      var promos = await resp.json();
      if (!promos || !promos.length) { _hidePopup(overlay); return; }

      // Tomar la promo de mayor prioridad
      var promo   = promos[0];
      var seenKey = POPUP_KEY_PFX + propKey + '_' + promo.id;

      // Rellenar contenido del popup
      var badge = overlay.querySelector('.promo-badge');
      var title = overlay.querySelector('h2');
      var text  = overlay.querySelector('.promo-text');

      if (badge) badge.textContent = _formatBadge(promo);
      if (title) title.textContent = promo.name;
      if (text)  text.innerHTML    = _buildDescription(promo);

      // Reemplazar sección de código de promo (ya no se usan códigos: descuento automático)
      var codeBox  = overlay.querySelector('.promo-code-box');
      if (codeBox) {
        var parent = codeBox.parentElement;
        if (parent) {
          var autoNote = document.createElement('p');
          autoNote.className   = 'promo-note';
          autoNote.textContent = 'El descuento se aplica automáticamente al calcular tu estadía.';
          parent.replaceWith(autoNote);
        }
      }

      // Eliminar notas redundantes que mencionan "Ingresá" o "código"
      overlay.querySelectorAll('.promo-note').forEach(function (n) {
        if (/Ingres|código|alojamientos selec/i.test(n.textContent)) n.remove();
      });

      // Mostrar popup (solo si aún no fue visto para ESTA promo)
      if (!localStorage.getItem(seenKey)) {
        setTimeout(function () {
          overlay.classList.add('active');
          overlay.setAttribute('aria-hidden', 'false');
        }, 900);
      }

      // Botón cerrar
      var closeBtn = document.getElementById('closePromoPopup');
      function doClose() {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        localStorage.setItem(seenKey, '1');
      }
      if (closeBtn) closeBtn.addEventListener('click', doClose);
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) doClose();
      });

    } catch (_) {
      _hidePopup(overlay);
    }
  }

  function _hidePopup(overlay) {
    if (overlay) overlay.style.display = 'none';
  }

  /* ─── Helpers de formato ─────────────────────────────────────────────── */
  function _formatBadge(p) {
    if (p.type === 'percentage')       return p.value + '% OFF';
    if (p.type === 'fixedamount')      return 'USD ' + p.value + ' OFF';
    if (p.type === 'fixednight')       return 'USD ' + p.value + '/noche';
    if (p.type === 'fixedtotal')       return 'Total fijo';
    if (p.type === 'longstay_simple')  return p.longStayValue + '% estadía larga';
    if (p.type === 'free_nights')      return p.stayX + 'x' + p.payY;
    return 'PROMO';
  }

  function _buildDescription(p) {
    var parts = [];

    if (p.type === 'percentage')
      parts.push('Aprovechá un <strong>' + p.value + '% de descuento</strong>');
    else if (p.type === 'fixedamount')
      parts.push('Aprovechá <strong>USD ' + p.value + ' de descuento</strong>');
    else if (p.type === 'fixednight')
      parts.push('Precio especial de <strong>USD ' + p.value + ' por noche</strong>');
    else if (p.type === 'longstay_simple')
      parts.push('<strong>' + p.longStayValue + '% de descuento</strong> en estadías de ' +
                 p.longStayMinNights + '+ noches');
    else if (p.type === 'free_nights')
      parts.push('Quedate ' + p.stayX + ' noches, <strong>pagá solo ' + p.payY + '</strong>');

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

    return parts.join('') + '.';
  }

  /* ─── Exports ────────────────────────────────────────────────────────── */
  window.hhPromos = { evaluar: evaluar, initPopup: initPopup };

})();
