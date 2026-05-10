/* formulario.js */

let cuponInfo = ''; // se guarda el cupón usado para enviarlo al backend

window.addEventListener('DOMContentLoaded', () => {
  // ---------- helpers seguros ----------
  const $ = id => document.getElementById(id);
  const setVal  = (id, v) => { const el = $(id); if (el) el.value = v ?? ''; };
  const setText = (id, v) => { const el = $(id); if (el) el.textContent = v ?? ''; };

  // 🔤 normalizador a slug (minúsculas, sin acentos, sin espacios)
  const slugify = s =>
    (s || '').toString().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '');

  // ---------- leer params de la URL ----------
  const params = new URLSearchParams(window.location.search);
  let propertyId     = params.get('propertyId');
  let roomTypeId     = params.get('roomTypeId');
  let checkInDate    = params.get('checkInDate');
  let checkOutDate   = params.get('checkOutDate');
  let numberOfGuests = params.get('numberOfGuests');
  let totalPrice     = params.get('totalPrice');
  let currencyParam  = (params.get('currency') || '').toUpperCase(); // USD o ARS

  // Desglose de huéspedes (del selector dropdown)
  const adultos = parseInt(params.get('adultos') || numberOfGuests || '1', 10) || 1;
  const ninos   = parseInt(params.get('ninos')   || '0', 10) || 0;
  const bebes   = parseInt(params.get('bebes')   || '0', 10) || 0;

  // Map visual de moneda (usamos ARS, no "ARG")
  const displayCurrency = (currencyParam === 'USD') ? 'USD' : 'ARS';

  // Formateador “imagen 1”: 713.000 ARS (sin $ y sin decimales)
  const fmtMoney = (n) => {
    const x = Number(n);
    if (isNaN(x)) return '';
    return `${x.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ${displayCurrency}`;
  };

  // Slug para propiedades sin Lodgify (Puerto Margarita, etc.)
  const slug        = params.get('slug') || '';
  const nombreParam = params.get('nombre') || '';

  // Detectar flujo: Lodgify (propertyId presente) o sistema propio (slug presente)
  const USA_LODGIFY_FORM = !!propertyId && !slug;

  // Aviso si falta algo (no corto la ejecución)
  if (!USA_LODGIFY_FORM && !slug) {
    console.warn('Faltan parámetros en la URL', { propertyId, roomTypeId, slug, checkInDate, checkOutDate, numberOfGuests, totalPrice, currencyParam });
  }

  // ---------- inputs ocultos (sin romper si faltan) ----------
  setVal('propertyId', propertyId);
  setVal('roomTypeId', roomTypeId);
  setVal('checkInDate', checkInDate);
  setVal('checkOutDate', checkOutDate);
  setVal('numberOfGuests', numberOfGuests);
  setVal('totalPrice', totalPrice);
  setVal('currency', displayCurrency); // guardamos la moneda visible (ARS/USD)
  setVal('discountRate', '0');        // por defecto sin descuento

  // ---------- resumen (columna derecha) ----------
  setText('fechasReserva', (checkInDate && checkOutDate) ? `${checkInDate} → ${checkOutDate}` : '');
  // Mostrar desglose de huéspedes si hay datos, o el total genérico
  const resumenHuespedes = (() => {
    const parts = [];
    if (adultos) parts.push(adultos + (adultos > 1 ? ' adultos' : ' adulto'));
    if (ninos)   parts.push(ninos   + (ninos   > 1 ? ' niños'   : ' niño'));
    if (bebes)   parts.push(bebes   + (bebes   > 1 ? ' bebés'   : ' bebé'));
    return parts.length ? parts.join(', ') : (numberOfGuests || '');
  })();
  setText('huespedesReserva', resumenHuespedes);

  // ---------- mapeos ----------
  const nombreMap = {
    '601552': 'Calafate 1', '601707': 'Calafate 2', '601708': 'Calafate 3',
    '601710': 'Calafate 4', '601711': 'Calafate 5', '601712': 'Calafate 6',
    '601713': 'Calafate 7', '601717': 'Cruz del Sur 4', '601714': 'Cruz del Sur 5',
    '601719': 'Las Nilidas', '648950': 'Gurisa', '601720': 'Paisajismo',
    '677269': 'Koi Quetrihue', '677286': 'Mi Tiempo', '677289': 'Refugio Patagónico'
  };
  const imagenMap = {
    '601552': 'unidades/casa1/casa1_img1.jpg', '601707': 'unidades/casa2/casa2_img3.jpg',
    '601708': 'unidades/casa3/casa3_img1.jpg', '601710': 'unidades/casa4/casa4_img2.jpg',
    '601711': 'unidades/casa5/casa5_img3.jpg', '601712': 'unidades/casa6/casa6_img1.jpg',
    '601713': 'unidades/casa7/casa7_img1.jpg', '601717': 'unidades/cds4/cds4_1.jpg',
    '601714': 'unidades/cds5/cds5_2.jpg', '601719': 'unidades/nilidas/nilidas1.jpg',
    '648950': 'unidades/gurisa/gurisa2.jpg', '601720': 'unidades/paisajismo/paisajismo1.jpg', 
    '677269': 'unidades/koi/koi1.jpg', '677286': 'unidades/mitiempo/tiempo3.jpg',
    '677289': 'unidades/refugio/refugio2.jpg'
  };

  const nombreProp = nombreMap[propertyId] || nombreParam || 'Alojamiento';
  setText('nombrePropiedad', nombreProp);
  const img = $('imagenPropiedad');
  if (img) img.src = imagenMap[propertyId] || '';

  const headerTitulo = document.querySelector('.titulo-header');
  if (headerTitulo) headerTitulo.textContent = nombreProp;

  // ---------- referencias de UI: precios / seña ----------
  const totalSpan            = $('precioReserva');         // compat
  const descuentoSpan        = $('precioConDescuento');    // compat
  const seniaSpan            = $('seniaReserva');

  const stackBox             = $('priceStack');            // tachado + final
  const precioTachadoStack   = $('precioTachado');
  const precioFinalStack     = $('precioFinal');

  // Helpers para alternar entre modos (con/ sin descuento)
  function mostrarTotalSinDescuento(total) {
    if (stackBox) stackBox.style.display = 'none';
    if (totalSpan) { totalSpan.classList.remove('tachado'); totalSpan.textContent = fmtMoney(total); }
    if (descuentoSpan) descuentoSpan.textContent = '';
  }
  function mostrarTotalConDescuento(total, totalConDesc) {
    // Compatibilidad
    if (totalSpan) { totalSpan.classList.add('tachado'); totalSpan.textContent = fmtMoney(total); }
    if (descuentoSpan) descuentoSpan.textContent = fmtMoney(totalConDesc);
    // Price stack
    if (precioTachadoStack) precioTachadoStack.textContent = fmtMoney(total);
    if (precioFinalStack)   precioFinalStack.textContent   = fmtMoney(totalConDesc);
    if (stackBox) stackBox.style.display = 'grid';
  }

  // ---------- cálculo de noches / seña ----------
  const totalOriginal = parseFloat(totalPrice || '0');
  if (!isNaN(totalOriginal)) {
    mostrarTotalSinDescuento(totalOriginal);
  }

  const checkinDateObj  = new Date(checkInDate || '');
  const checkoutDateObj = new Date(checkOutDate || '');
  const diffTime = Math.abs(checkoutDateObj - checkinDateObj);
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24))); // evita 0/NaN

  const { seniaFinal } = calcularSeniaInteligente(isNaN(totalOriginal) ? 0 : totalOriginal, diffDays);
  const seniaOriginalNumber = seniaFinal; // para volver atrás si se quita cupón
  if (seniaSpan) seniaSpan.textContent = isNaN(seniaFinal) ? '' : fmtMoney(seniaFinal);

  // ---------- cupones ----------
  const cupones = {
    "OTOÑO2026": {
      porcentaje: 15,
      alojamientos: ["calafate1","calafate2","calafate3","calafate4","calafate5","calafate6","calafate7"],
      desde: new Date("2026-03-09"),
      hasta: new Date("2026-05-31")
    },
    "PRIMAVERA2025": {
      porcentaje: 20,
      alojamientos: [
        "calafate1","calafate2","calafate3","calafate4","calafate5","calafate6","calafate7",
        "paisajismo","gurisa","lasnilidas","cruzdelsur4","cruzdelsur5","koiquetrihue","mitiempo",
        "refugiopatagonico"
      ],
      desde: new Date("2025-09-04"),
      hasta: new Date("2025-12-20")
    },
    "HAPPY10": { porcentaje: 10 },
    "HAPPY15": { porcentaje: 15 },
    "HAPPY20": { porcentaje: 20 }
  };

  const nombreClave   = slugify(nombreProp);
  const inputCupon    = $('cuponDescuento');
  const botonCupon    = $('aplicarCupon');
  const labelCupon    = $('descuentoLabel');

  // helpers fechas cupón primavera
  const PRIMAVERA_CHECKIN_INICIO = new Date("2025-09-04");
  const PRIMAVERA_CHECKIN_FIN    = new Date("2025-12-15T23:59:59");

  const checkinParaCupon = new Date(checkInDate || '');

  if (botonCupon) {
    botonCupon.addEventListener('click', () => {
      const codigo = (inputCupon?.value || '').trim().toUpperCase();
      let cupon = cupones[codigo];
      let valido = false;
      let porcentaje = 0;

      if (codigo === "GANASTE") {
        const resultado = aplicarCuponGanaste(codigo, checkInDate);
        if (resultado.valido) {
          valido = true;
          porcentaje = resultado.porcentaje;
          if (labelCupon) { labelCupon.textContent = resultado.mensaje; labelCupon.style.color = "green"; }
          cuponInfo = codigo;
        }
      } else if (codigo === "PRIMAVERA2025" && cupon) {
        const alojOk = cupon.alojamientos.includes(nombreClave);
        const fechaOk = (checkinParaCupon instanceof Date) && !isNaN(checkinParaCupon)
            && checkinParaCupon >= PRIMAVERA_CHECKIN_INICIO
            && checkinParaCupon <= PRIMAVERA_CHECKIN_FIN;
        valido = alojOk && fechaOk;
        porcentaje = cupon.porcentaje;
      } else if (cupon && cupon.desde && cupon.hasta) {
        const hoy = new Date();
        valido = cupon.alojamientos?.includes?.(nombreClave) !== false
              && hoy >= cupon.desde && hoy <= cupon.hasta;
        porcentaje = cupon.porcentaje;
      } else if (cupon && cupon.porcentaje) {
        valido = true;
        porcentaje = cupon.porcentaje;
      }

      if (valido) {
        const descuento = (totalOriginal * porcentaje) / 100;
        const totalConDescuento = Math.round(totalOriginal - descuento);

        const seniaConDescuento = calcularSeniaInteligente(totalConDescuento, diffDays).seniaFinal;

        mostrarTotalConDescuento(totalOriginal, totalConDescuento);
        if (labelCupon) { labelCupon.textContent = `Cupón aplicado: ${codigo} (-${porcentaje}%)`; labelCupon.style.color = "green"; }
        if (seniaSpan)  seniaSpan.textContent = fmtMoney(seniaConDescuento);

        setVal('discountRate', (porcentaje/100).toString());
        cuponInfo = codigo;
      } else {
        if (labelCupon) { labelCupon.textContent = "Cupón inválido o fuera de fecha."; labelCupon.style.color = "red"; }
        mostrarTotalSinDescuento(totalOriginal);
        if (seniaSpan) seniaSpan.textContent = fmtMoney(seniaOriginalNumber);

        setVal('discountRate', '0');
        cuponInfo = '';
      }
    });
  }

  // ---------- submit: bifurcar entre Lodgify y sistema propio ----------
  const API_SISTEMA = 'https://propietarios-happy-host.onrender.com';
  const API_BASE    = 'https://disponibilidad-happy-host-patagonia.onrender.com';

  const form = $('formularioReserva');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const boton = $('botonReservar');
      if (boton) { boton.disabled = true; boton.textContent = 'Confirmando...'; }

      try {
        const nombreCompleto   = ($('nombre')?.value    || '').trim();
        const email            = ($('email')?.value     || '').trim();
        const telefono         = ($('telefono')?.value  || '').trim();
        const comentarios      = ($('comentarios')?.value || '').trim();
        const numberOfGuestsOk = $('numberOfGuests')?.value || numberOfGuests || '1';

        if (!nombreCompleto) {
          await Swal.fire({ icon: 'warning', title: 'Falta el nombre', text: 'Ingresá tu nombre completo.' });
          return;
        }

        // ── FLUJO LODGIFY ─────────────────────────────────────────────────
        if (USA_LODGIFY_FORM) {
          const propertyIdOk = $('propertyId')?.value || propertyId || '601719';
          const roomTypeIdOk = $('roomTypeId')?.value || roomTypeId || '668510';

          const [first_name, ...rest] = nombreCompleto.split(' ').filter(Boolean);
          const last_name = rest.join(' ') || '-';

          const totalUI = (descuentoSpan?.textContent?.trim()
                          || precioFinalStack?.textContent?.trim()
                          || totalSpan?.textContent?.trim()
                          || '');

          const resumenHuespedesLodgify = (() => {
            const p = [];
            if (adultos) p.push(adultos + (adultos > 1 ? ' adultos' : ' adulto'));
            if (ninos)   p.push(ninos   + (ninos   > 1 ? ' niños'   : ' niño'));
            if (bebes)   p.push(bebes   + (bebes   > 1 ? ' bebés'   : ' bebé'));
            return p.length ? p.join(', ') : (numberOfGuestsOk + ' huéspedes');
          })();
          const comentarioFinal = [
            resumenHuespedesLodgify,
            comentarios
          ].filter(Boolean).join(' | ');

          const payload = {
            source_text: 'Reserva web Happy Host',
            arrival:     checkInDate,
            departure:   checkOutDate,
            property_id: Number(propertyIdOk) || 601719,
            status:      'booked',
            rooms: [{
              room_type_id: Number(roomTypeIdOk) || 668510,
              units: 1,
              adults:   adultos,
              children: ninos
            }],
            guest: {
              name: nombreCompleto,
              first_name,
              last_name,
              email,
              phone: telefono
            },
            _total_ui: totalUI,
            _senia_ui: seniaSpan?.textContent || '',
            _cupon:    cuponInfo || '',
            _comments: comentarioFinal
          };

          const idKey = (window.crypto && crypto.randomUUID)
            ? crypto.randomUUID()
            : `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;

          const resp = await fetch(`${API_BASE}/api/crear-reserva`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': idKey },
            body: JSON.stringify(payload)
          });

          const data = await resp.json().catch(() => ({}));

          if (!resp.ok) {
            console.error('Error al crear reserva Lodgify:', data);
            await Swal.fire({
              icon: 'error',
              title: 'No se pudo confirmar',
              text: (data?.message || data?.error) || 'Intentá nuevamente.'
            });
            return;
          }

          const bookingId = data?.id || data?.booking_id || data?.bookingId || '';
          await Swal.fire({
            icon: 'success',
            title: '✅ Reserva confirmada',
            html: `Tu reserva fue creada con éxito.<br><small>ID: ${bookingId || '—'}</small><br><br>Te redirijo en 5 segundos...`,
            timer: 5000,
            timerProgressBar: true,
            showConfirmButton: false
          });
          window.location.href = 'viajero.html';

        // ── FLUJO SISTEMA PROPIO ──────────────────────────────────────────
        } else {
          if (!slug) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'No se identificó la propiedad.' });
            return;
          }

          const resp = await fetch(`${API_SISTEMA}/api/properties/${slug}/reservar`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nombre:    nombreCompleto,
              email:     email,
              telefono:  telefono,
              checkin:   checkInDate,
              checkout:  checkOutDate,
              huespedes: Number(numberOfGuestsOk) || 1,
              adultos:   adultos,
              ninos:     ninos,
              bebes:     bebes,
            })
          });

          const data = await resp.json().catch(() => ({}));

          if (!resp.ok) {
            console.error('Error al crear reserva sistema:', data);
            await Swal.fire({
              icon: 'error',
              title: 'No se pudo confirmar',
              text: (data?.error || data?.message) || 'Intentá nuevamente.'
            });
            return;
          }

          const confirmacion = data?.confirmacion || data?.id || '—';
          await Swal.fire({
            icon: 'success',
            title: '✅ Reserva confirmada',
            html: `Tu reserva fue enviada con éxito.<br><small>Código: <strong>${confirmacion}</strong></small><br><br>Nos pondremos en contacto para coordinar el pago.`,
            timer: 6000,
            timerProgressBar: true,
            showConfirmButton: true,
            confirmButtonText: 'Entendido'
          });
          window.location.href = 'viajero.html';
        }

      } catch (err) {
        console.error('Error al enviar la reserva:', err);
        await Swal.fire({
          icon: 'error',
          title: '❌ Error de conexión',
          text: 'Hubo un problema al confirmar la reserva. Intentá de nuevo o contactanos por WhatsApp.'
        });
      } finally {
        if (boton) { boton.disabled = false; boton.textContent = 'Confirmar Reserva'; }
      }
    });
  }

  // ---------- utilidades ----------
  function calcularSeniaInteligente(total, diffDays) {
    if (esPeriodoSeniaCincuenta()) {
      return {
        seniaFinal: Math.round((total || 0) * 0.5),
        seniaNoches: 0,
        saldoRedondo: Math.round((total || 0) * 0.5)
      };
    }

    let seniaMinNoches = 1;
    if (diffDays >= 5 && diffDays <= 9) seniaMinNoches = 2;
    else if (diffDays >= 10 && diffDays <= 15) seniaMinNoches = 4;

    const precioNoche = diffDays ? (total / diffDays) : 0;
    const seniaMinima = precioNoche * seniaMinNoches;
    const redondeoSaldo = displayCurrency === 'ARS' ? 50000 : 100;

    let saldoRedondo = Math.floor((total - seniaMinima) / redondeoSaldo) * redondeoSaldo;
    let seniaFinal = total - saldoRedondo;

    if (seniaFinal < seniaMinima) {
      saldoRedondo -= redondeoSaldo;
      seniaFinal = total - saldoRedondo;
    }

    return {
      seniaFinal: Math.round(seniaFinal || 0),
      seniaNoches: seniaMinNoches,
      saldoRedondo: Math.round(saldoRedondo || 0)
    };
  }

  function esPeriodoSeniaCincuenta() {
    const hoy = new Date();
    const inicio = new Date(2026, 4, 11, 0, 0, 0, 0);
    const fin = new Date(2026, 4, 13, 23, 59, 59, 999);
    return hoy >= inicio && hoy <= fin;
  }

  // ---------- CUPÓN GANASTE ----------
  function getUsosGanaste() {
    return parseInt(localStorage.getItem("ganaste_usos")) || 0;
  }
  function incrementarUsoGanaste() {
    const usos = getUsosGanaste() + 1;
    localStorage.setItem("ganaste_usos", usos);
  }
  function aplicarCuponGanaste(codigo, checkInDateStr) {
    const hoy = new Date();
    const checkin = new Date(checkInDateStr || '');
    const usos = getUsosGanaste();

    const fechaLimiteReserva = new Date("2025-08-15");
    const inicioValidez = new Date("2025-07-22");
    const finValidez = new Date("2025-12-31");

    if (codigo !== "GANASTE") return { valido: false };
    if (!(checkin instanceof Date) || isNaN(checkin)) return { valido: false };
    if (hoy > fechaLimiteReserva) return { valido: false };
    if (checkin < inicioValidez || checkin > finValidez) return { valido: false };
    if (usos >= 5) return { valido: false };

    incrementarUsoGanaste();

    return {
      valido: true,
      porcentaje: 15,
      mensaje: `🎉 ¡Cupón GANASTE aplicado! Tenés 15% de descuento`,
      usosRestantes: 5 - (usos + 1)
    };
  }
}); // ← cierre DOMContentLoaded


// ====== Modal Términos & Condiciones ======
(function () {
  const $ = (id) => document.getElementById(id);
  const link   = $('verTerminos');          // <a id="verTerminos">...
  const modal  = $('modal-terminos');       // <div id="modal-terminos" class="modal">...
  const closeX = modal ? modal.querySelector('.cerrar') : null;

  if (!link || !modal) return; // si no existen, no hacemos nada

  function openModal() {
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
    // Evita scroll de fondo
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }

  link.addEventListener('click', (e) => {
    e.preventDefault();
    openModal();
  });

  closeX && closeX.addEventListener('click', closeModal);

  // Cerrar al clickear overlay (fuera del contenido)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Cerrar con ESC
  document.addEventListener('keydown', (e) => {
    const visible = modal.style.display === 'block';
    if (e.key === 'Escape' && visible) closeModal();
  });
})();
