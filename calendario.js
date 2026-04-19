/* =======================================================================
   calendario.js — visualización de disponibilidad en flatpickr
   - Verde sólido:        días completamente ocupados
   - Mitad izq. verde:    día de check-out  (huéspedes salen → izq. ocupada)
   - Mitad der. verde:    día de check-in   (huéspedes llegan → der. ocupada)
   - Leyenda:             se inserta automáticamente
   ======================================================================= */
(function () {
  'use strict';

  /* ── helper: formatea Date → "YYYY-MM-DD" ── */
  function ymd(d) {
    return (
      d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0')
    );
  }

  /* ── clasifica cada día según los rangos ── */
  function buildSets(rangos) {
    const checkin  = new Set(); // r.from → mitad derecha verde
    const checkout = new Set(); // r.to   → mitad izquierda verde
    const occupied = new Set(); // días interiores → verde sólido

    for (const r of rangos) {
      if (!r.from || !r.to) continue;
      const [fy, fm, fd] = r.from.split('-').map(Number);
      const [ty, tm, td] = r.to.split('-').map(Number);
      const dFrom = new Date(fy, fm - 1, fd);
      const dTo   = new Date(ty, tm - 1, td);

      // r.from = día de check-in (huéspedes llegan)
      // r.to   = ÚLTIMA NOCHE ocupada (Lodgify devuelve última noche, NO el día de salida)
      // checkout real = r.to + 1 (el día que los huéspedes salen / nuevos pueden entrar)
      checkin.add(r.from);

      const dCheckout = new Date(dTo);
      dCheckout.setDate(dCheckout.getDate() + 1);
      checkout.add(ymd(dCheckout)); // r.to + 1

      // días ocupados: r.from+1 hasta r.to inclusive
      const cur = new Date(dFrom);
      cur.setDate(cur.getDate() + 1);
      while (cur <= dTo) {
        occupied.add(ymd(cur));
        cur.setDate(cur.getDate() + 1);
      }
    }

    return { checkin, checkout, occupied };
  }

  /* ── aplica clases a los elementos del calendario ── */
  function aplicarClasesEnDOM(cal, checkin, checkout, occupied) {
    cal.querySelectorAll('.flatpickr-day').forEach(el => {
      el.classList.remove('hhcal-ocupado', 'hhcal-checkin', 'hhcal-checkout');
      const d = el.dateObj;
      if (!d) return;
      const k = ymd(d);
      if (checkin.has(k) && checkout.has(k)) {
        // Mismo día es check-out de una reserva y check-in de otra
        el.classList.add('hhcal-ocupado');
      } else if (checkout.has(k)) {
        el.classList.add('hhcal-checkout'); // mitad izq. verde
      } else if (checkin.has(k)) {
        el.classList.add('hhcal-checkin');  // mitad der. verde
      } else if (occupied.has(k)) {
        el.classList.add('hhcal-ocupado');
      }
    });
  }

  /* ── inserta la leyenda (una sola vez por calendario) ── */
  function insertarLeyenda(cal) {
    if (cal.querySelector('.hhcal-leyenda')) return;
    const ley = document.createElement('div');
    ley.className = 'hhcal-leyenda';
    ley.innerHTML =
      '<span class="hhcal-ley-item"><span class="hhcal-ley-dot ocupado"></span>Ocupado</span>' +
      '<span class="hhcal-ley-item"><span class="hhcal-ley-dot checkinout"></span>Check in / Check out</span>' +
      '<span class="hhcal-ley-item"><span class="hhcal-ley-dot disponible"></span>Disponible</span>';
    cal.appendChild(ley);
  }

  /* ── API pública ── */
  window.hhCalendario = {
    aplicarClases: function (picker, rangos) {
      const cal = picker.calendarContainer;
      if (!cal) return;
      const { checkin, checkout, occupied } = buildSets(rangos);
      aplicarClasesEnDOM(cal, checkin, checkout, occupied);
      insertarLeyenda(cal);
    }
  };
})();
