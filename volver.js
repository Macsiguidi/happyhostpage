// volver.js (unidades)
// Mantiene filtros y evita el loop formulario <-> unidad

(function () {
  const btnVolver = document.getElementById('btnVolver');
  if (!btnVolver) return;

  // Helper: arma ?checkin=...&checkout=...&huespedes=...
  function buildQuery({ checkin, checkout, huespedes }) {
    const params = new URLSearchParams();
    if (checkin)   params.set('checkin', checkin);
    if (checkout)  params.set('checkout', checkout);
    if (huespedes) params.set('huespedes', huespedes);
    const qs = params.toString();
    return qs ? ('?' + qs) : '';
  }

  // Intenta leer parámetros desde los inputs de la unidad
  function getParamsFromInputs() {
    const checkin   = document.getElementById('start')?.value || '';
    const checkout  = document.getElementById('end')?.value || '';
    const huespedes = document.getElementById('guests')?.value || '';
    return { checkin, checkout, huespedes };
  }

  // Si venimos del listado, rescato sus params cuando los inputs están vacíos
  function getParamsFromReferrer() {
    try {
      if (!document.referrer) return {};
      const ref = new URL(document.referrer);
      const q = ref.searchParams;
      return {
        checkin:   q.get('checkin')   || '',
        checkout:  q.get('checkout')  || '',
        huespedes: q.get('huespedes') || ''
      };
    } catch (_) {
      return {};
    }
  }

  function cameFromForm() {
    try {
      if (!document.referrer) return false;
      const ref = new URL(document.referrer);
      return /formulario\.html$/i.test(ref.pathname);
    } catch (_) {
      return false;
    }
  }

  btnVolver.addEventListener('click', function (event) {
    event.preventDefault(); // el href="#" no hace nada

    // Base siempre al listado (evita history.back loop)
    const base = 'alojamientos.html';

    // 1) Primero inputs actuales
    let params = getParamsFromInputs();

    // 2) Si están vacíos, intento tomarlos del referrer (por si venías del listado con filtros)
    if (!params.checkin && !params.checkout && !params.huespedes) {
      const pRef = getParamsFromReferrer();
      params = { ...params, ...pRef };
    }

    // 3) Si venimos del FORMULARIO, también vamos al listado (con filtros si hay)
    //    Si NO venimos del formulario, igual vamos al listado, manteniendo filtros.
    const url = base + buildQuery(params);
    window.location.href = url;
  });

  // ==== Opcional: marcar check-in/out en el calendario (sin depender de variables globales) ====
  window.marcarCheckInOutEnCalendario = function () {
    // Limpia marcas anteriores
    document.querySelectorAll('.flatpickr-day.checkin, .flatpickr-day.checkout')
      .forEach(el => el.classList.remove('checkin', 'checkout'));

    const startInput = document.getElementById('start');
    const endInput   = document.getElementById('end');

    const checkin  = startInput?.value || '';
    const checkout = endInput?.value   || '';

    if (checkin && window.flatpickr) {
      const label = flatpickr.formatDate(new Date(checkin), 'F j, Y');
      const elIn = document.querySelector(`.flatpickr-day[aria-label="${label}"]`);
      if (elIn) elIn.classList.add('checkin');
    }

    if (checkout && window.flatpickr) {
      const label = flatpickr.formatDate(new Date(checkout), 'F j, Y');
      const elOut = document.querySelector(`.flatpickr-day[aria-label="${label}"]`);
      if (elOut) elOut.classList.add('checkout');
    }
  };
})();



