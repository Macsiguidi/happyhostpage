/* formulario.js */

let cuponInfo = ''; // se guarda el cupón usado para enviarlo al backend

window.addEventListener('DOMContentLoaded', () => {
  // ---------- helpers seguros ----------
  const $ = id => document.getElementById(id);
  const setVal  = (id, v) => { const el = $(id); if (el) el.value = v ?? ''; };
  const setText = (id, v) => { const el = $(id); if (el) el.textContent = v ?? ''; };

  // ---------- leer params de la URL ----------
  const params = new URLSearchParams(window.location.search);
  let propertyId     = params.get('propertyId');
  let roomTypeId     = params.get('roomTypeId');
  let checkInDate    = params.get('checkInDate');
  let checkOutDate   = params.get('checkOutDate');
  let numberOfGuests = params.get('numberOfGuests');
  let totalPrice     = params.get('totalPrice');

  // Aviso si falta algo (no corto la ejecución)
  if (!propertyId || !roomTypeId || !checkInDate || !checkOutDate || !numberOfGuests || !totalPrice) {
    console.warn('Faltan parámetros en la URL', { propertyId, roomTypeId, checkInDate, checkOutDate, numberOfGuests, totalPrice });
  }

  // ---------- inputs ocultos (sin romper si faltan) ----------
  setVal('propertyId', propertyId);
  setVal('roomTypeId', roomTypeId);
  setVal('checkInDate', checkInDate);
  setVal('checkOutDate', checkOutDate);
  setVal('numberOfGuests', numberOfGuests);
  setVal('totalPrice', totalPrice);

  // ---------- resumen (columna derecha) ----------
  setText('fechasReserva', (checkInDate && checkOutDate) ? `${checkInDate} → ${checkOutDate}` : '');
  setText('huespedesReserva', numberOfGuests || '');

  // ---------- mapeos ----------
  const nombreMap = {
    '601552': 'Calafate 1', '601707': 'Calafate 2', '601708': 'Calafate 3',
    '601710': 'Calafate 4', '601711': 'Calafate 5', '601712': 'Calafate 6',
    '601713': 'Calafate 7', '601717': 'Cruz del Sur 4', '601714': 'Cruz del Sur 5',
    '601719': 'Las Nilidas', '648950': 'Gurisa', '601720': 'Paisajismo'
  };
  const imagenMap = {
    '601552': 'unidades/casa1/casa1_img1.jpg', '601707': 'unidades/casa2/casa2_img3.jpg',
    '601708': 'unidades/casa3/casa3_img1.jpg', '601710': 'unidades/casa4/casa4_img2.jpg',
    '601711': 'unidades/casa5/casa5_img3.jpg', '601712': 'unidades/casa6/casa6_img1.jpg',
    '601713': 'unidades/casa7/casa7_img1.jpg', '601717': 'unidades/cds4/cds4_1.jpg',
    '601714': 'unidades/cds5/cds5_2.jpg', '601719': 'unidades/nilidas/nilidas1.jpg',
    '648950': 'unidades/gurisa/gurisa2.jpg', '601720': 'unidades/paisajismo/paisajismo1.jpg'
  };

  const nombreProp = nombreMap[propertyId] || 'Alojamiento';
  setText('nombrePropiedad', nombreProp);
  const img = $('imagenPropiedad');
  if (img) img.src = imagenMap[propertyId] || '';

  const headerTitulo = document.querySelector('.titulo-header');
  if (headerTitulo) headerTitulo.textContent = nombreProp;

  // ---------- precios / seña ----------
  const totalSpan     = $('precioReserva');
  const descuentoSpan = $('precioConDescuento');
  const seniaSpan     = $('seniaReserva');

  const totalOriginal = parseFloat(totalPrice || '0');
  if (totalSpan) totalSpan.textContent = isNaN(totalOriginal) ? '' : `$${totalOriginal.toFixed(2)}`;

  const checkinDateObj  = new Date(checkInDate || '');
  const checkoutDateObj = new Date(checkOutDate || '');
  const diffTime = Math.abs(checkoutDateObj - checkinDateObj);
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24))); // evita 0/NaN

  const { seniaFinal, seniaNoches } = calcularSeniaInteligente(isNaN(totalOriginal) ? 0 : totalOriginal, diffDays);
  const seniaOriginalNumber = seniaFinal; // para volver atrás si se quita cupón
  if (seniaSpan) seniaSpan.textContent = isNaN(seniaFinal) ? '' : `$${seniaFinal}`;

  // ---------- cupones ----------
  const cupones = {
    "HAPPYINVIERNO": {
      porcentaje: 15,
      alojamientos: ["calafate1","calafate2","calafate3","calafate4","calafate5","calafate6","calafate7","paisajismo"],
      desde: new Date("2025-06-01"),
      hasta: new Date("2025-09-30")
    },
    "PRIMAVERA2025": {
      porcentaje: 20,
      alojamientos: ["calafate1","calafate2","calafate3","calafate4","calafate5","calafate6","calafate7","paisajismo","gurisa","nilidas","cruzdelsur4","cruzdelsur5"],
      desde: new Date("2025-09-04"),
      hasta: new Date("2025-12-20")
    },
    "HAPPY10": { porcentaje: 10 },
    "HAPPY15": { porcentaje: 15 },
    "HAPPY20": { porcentaje: 20 }
  };

  const nombreClave   = nombreProp.toLowerCase().replace(/\s/g, '');
  const inputCupon    = $('cuponDescuento');
  const botonCupon    = $('aplicarCupon');
  const labelCupon    = $('descuentoLabel');

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
      } else if (cupon && cupon.desde && cupon.hasta) {
        const hoy = new Date();
        valido = cupon.alojamientos.includes(nombreClave) && hoy >= cupon.desde && hoy <= cupon.hasta;
        porcentaje = cupon.porcentaje;
      } else if (cupon && cupon.porcentaje) {
        valido = true;
        porcentaje = cupon.porcentaje;
      }

      if (valido) {
        const descuento = (totalOriginal * porcentaje) / 100;
        const totalConDescuento = totalOriginal - descuento;
        const precioNocheDescuento = totalConDescuento / diffDays;
        const seniaConDescuento = precioNocheDescuento * seniaNoches;

        totalSpan?.classList.add('tachado');
        if (descuentoSpan) descuentoSpan.textContent = `$${totalConDescuento.toFixed(2)}`;
        if (seniaSpan) seniaSpan.textContent = `$${seniaConDescuento.toFixed(2)} (${seniaNoches} noche${seniaNoches > 1 ? 's' : ''})`;

        if (labelCupon) { labelCupon.textContent = `Cupón aplicado: ${codigo} (-${porcentaje}%)`; labelCupon.style.color = "green"; }
        cuponInfo = codigo;
      } else {
        if (labelCupon) { labelCupon.textContent = "Cupón inválido o fuera de fecha."; labelCupon.style.color = "red"; }
        totalSpan?.classList.remove('tachado');
        if (descuentoSpan) descuentoSpan.textContent = "";
        if (seniaSpan) seniaSpan.textContent = `$${seniaOriginalNumber.toFixed(2)} (${seniaNoches} noche${seniaNoches > 1 ? 's' : ''})`;
        cuponInfo = '';
      }
    });
  }

  // ---------- submit: crear reserva + redirigir a viajero.html ----------
  const form = $('formularioReserva');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const boton = $('botonReservar');
      if (boton) { boton.disabled = true; boton.textContent = 'Confirmando...'; }

      try {
        const nombreCompleto = ($('nombre')?.value || '').trim();
        const email          = ($('email')?.value || '').trim();
        const telefono       = ($('telefono')?.value || '').trim();
        const comentarios    = ($('comentarios')?.value || '').trim();

        const propertyIdOk     = $('propertyId')?.value || propertyId || '601719';
        const roomTypeIdOk     = $('roomTypeId')?.value || roomTypeId || '668510';
        const numberOfGuestsOk = $('numberOfGuests')?.value || numberOfGuests || '2';

        const [first_name, ...rest] = nombreCompleto.split(' ').filter(Boolean);
        const last_name = rest.join(' ') || '-';

        const totalUI = (descuentoSpan?.textContent || totalSpan?.textContent || '').trim();

        const payload = {
          source_text: 'Reserva web Happy Host',
          arrival:     checkInDate,
          departure:   checkOutDate,
          property_id: Number(propertyIdOk) || 601719,
          status:      'booked',
          rooms: [{
            room_type_id: Number(roomTypeIdOk) || 668510,
            units: 1,
            adults: Number(numberOfGuestsOk) || 2,
            children: 0
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
          _comments: comentarios
        };

        // Render (cambiar por localhost si probás local)
        const API_BASE = 'https://disponibilidad-happy-host-patagonia.onrender.com';

        const idKey = (window.crypto && crypto.randomUUID)
          ? crypto.randomUUID()
          : `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        const resp = await fetch(`${API_BASE}/api/crear-reserva`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Idempotency-Key': idKey
          },
          body: JSON.stringify(payload)
        });

        const data = await resp.json().catch(() => ({}));

        if (!resp.ok) {
          console.error('Error al crear reserva:', data);
          await Swal.fire({
            icon: 'error',
            title: 'No se pudo confirmar',
            text: (data && (data.message || data.error)) || 'Intentá nuevamente.'
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
      } catch (err) {
        console.error('Error al enviar la reserva:', err);
        await Swal.fire({
          icon: 'error',
          title: '❌ Error',
          text: 'Hubo un problema al confirmar la reserva.'
        });
      } finally {
        const boton = $('botonReservar');
        if (boton) { boton.disabled = false; boton.textContent = 'Confirmar Reserva'; }
      }
    });
  }

  // ---------- utilidades ----------
  function calcularSeniaInteligente(total, diffDays) {
    let seniaMinNoches = 1;
    if (diffDays >= 5 && diffDays <= 9) seniaMinNoches = 2;
    else if (diffDays >= 10 && diffDays <= 15) seniaMinNoches = 4;

    const precioNoche = diffDays ? (total / diffDays) : 0;
    const seniaMinima = precioNoche * seniaMinNoches;

    let saldoRedondo = Math.floor((total - seniaMinima) / 100) * 100;
    let seniaFinal = total - saldoRedondo;

    if (seniaFinal < seniaMinima) {
      saldoRedondo -= 100;
      seniaFinal = total - saldoRedondo;
    }

    return {
      seniaFinal: Math.round(seniaFinal || 0),
      seniaNoches: seniaMinNoches,
      saldoRedondo: Math.round(saldoRedondo || 0)
    };
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
