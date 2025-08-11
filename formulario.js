let cuponInfo = ''; // 👉 Se guarda el cupón usado para enviarlo al backend

window.addEventListener('DOMContentLoaded', () => {
  // === CARGAR DATOS DESDE LA URL ===
  const params = new URLSearchParams(window.location.search);
  const propertyId     = params.get('propertyId');
  const roomTypeId     = params.get('roomTypeId');
  const checkInDate    = params.get('checkInDate');
  const checkOutDate   = params.get('checkOutDate');
  const numberOfGuests = params.get('numberOfGuests');
  const totalPrice     = params.get('totalPrice');

  // === CARGAR EN INPUTS OCULTOS ===
  document.getElementById('propertyId').value     = propertyId;
  document.getElementById('roomTypeId').value     = roomTypeId;
  document.getElementById('checkInDate').value    = checkInDate;
  document.getElementById('checkOutDate').value   = checkOutDate;
  document.getElementById('numberOfGuests').value = numberOfGuests;
  document.getElementById('totalPrice').value     = totalPrice;

  // === MOSTRAR RESUMEN DE FECHAS Y HUÉSPEDES ===
  document.getElementById('fechasReserva').textContent    = `${checkInDate} → ${checkOutDate}`;
  document.getElementById('huespedesReserva').textContent = numberOfGuests;

  // === MAPEO DE PROPIEDADES ===
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
  document.getElementById('nombrePropiedad').textContent = nombreProp;
  document.getElementById('imagenPropiedad').src = imagenMap[propertyId] || '';

  const headerTitulo = document.querySelector('.titulo-header');
  if (headerTitulo) headerTitulo.textContent = nombreProp;

  // === DATOS DE PRECIO Y SEÑA INICIAL ===
  const totalOriginal = parseFloat(totalPrice);
  const totalSpan     = document.getElementById('precioReserva');
  const descuentoSpan = document.getElementById('precioConDescuento');
  const seniaSpan     = document.getElementById('seniaReserva');

  totalSpan.textContent = `$${totalOriginal.toFixed(2)}`;

  const checkinDateObj  = new Date(checkInDate);
  const checkoutDateObj = new Date(checkOutDate);
  const diffTime = Math.abs(checkoutDateObj - checkinDateObj);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const resultadoSenia = calcularSeniaInteligente(totalOriginal, diffDays);
  const seniaFinal = resultadoSenia.seniaFinal;
  const seniaNoches = resultadoSenia.seniaNoches;
  const seniaOriginal = seniaFinal; // para usar como fallback

  seniaSpan.textContent = `$${seniaFinal}`;

  const cupones = {
    "HAPPYINVIERNO": {
      porcentaje: 15,
      alojamientos: ["calafate1","calafate2","calafate3","calafate4","calafate5","calafate6","calafate7","paisajismo"],
      desde: new Date("2025-06-01"),
      hasta: new Date("2025-09-30")
    },
    "PRIMAVERA2025": {
      porcentaje: 20,
      alojamientos: ["calafate1","calafate2","calafate3","calafate4","calafate5","calafate6","calafate7","paisajismo"],
      desde: new Date("2025-10-01"),
      hasta: new Date("2025-10-31")
    },
    "HAPPY10": { porcentaje: 10 },
    "HAPPY15": { porcentaje: 15 },
    "HAPPY20": { porcentaje: 20 }
  };

  const nombreClave   = nombreProp.toLowerCase().replace(/\s/g, '');
  const inputCupon    = document.getElementById('cuponDescuento');
  const botonCupon    = document.getElementById('aplicarCupon');
  const labelCupon    = document.getElementById('descuentoLabel');

  // === APLICAR CUPÓN ===
  botonCupon.addEventListener('click', () => {
    const codigo = inputCupon.value.trim().toUpperCase();
    let cupon = cupones[codigo];
    let valido = false;
    let porcentaje = 0;

    // === INICIO CUPÓN GANASTE ===
    if (codigo === "GANASTE") {
      const resultado = aplicarCuponGanaste(codigo, checkInDate);
      if (resultado.valido) {
        valido = true;
        porcentaje = resultado.porcentaje;
        labelCupon.textContent = resultado.mensaje;
        labelCupon.style.color = "green";
        cuponInfo = codigo;
      } else {
        valido = false;
      }
    }
    // === FIN CUPÓN GANASTE ===
    else if (cupon && cupon.desde && cupon.hasta) {
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

      totalSpan.classList.add('tachado');
      descuentoSpan.textContent = `$${totalConDescuento.toFixed(2)}`;
      seniaSpan.textContent = `$${seniaConDescuento.toFixed(2)} (${seniaNoches} noche${seniaNoches > 1 ? 's' : ''})`;

      labelCupon.textContent = `Cupón aplicado: ${codigo} (-${porcentaje}%)`;
      labelCupon.style.color = "green";

      cuponInfo = codigo;
    } else {
      labelCupon.textContent = "Cupón inválido o fuera de fecha.";
      labelCupon.style.color = "red";
      totalSpan.classList.remove('tachado');
      descuentoSpan.textContent = "";
      seniaSpan.textContent = `$${seniaOriginal.toFixed(2)} (${seniaNoches} noche${seniaNoches > 1 ? 's' : ''})`;
      cuponInfo = '';
    }
  });

  // === ENVÍO DEL FORMULARIO → CREA RESERVA CONFIRMADA EN LODGIFY ===
document.getElementById('formularioReserva').addEventListener('submit', async function (e) {
  e.preventDefault();

  const boton = document.getElementById('botonReservar');
  if (boton) { boton.disabled = true; boton.textContent = 'Confirmando...'; }

  try {
    const nombreCompleto = document.getElementById('nombre').value.trim();
    const email          = document.getElementById('email').value.trim();
    const telefono       = document.getElementById('telefono').value.trim();
    const comentarios    = document.getElementById('comentarios').value.trim();

    const propertyId     = document.getElementById('propertyId').value || '601719';
    const roomTypeId     = document.getElementById('roomTypeId').value || '668510';
    const numberOfGuests = document.getElementById('numberOfGuests').value || '2';

    // nombre → name + first/last
    const [first_name, ...rest] = nombreCompleto.split(' ').filter(Boolean);
    const last_name = rest.join(' ') || '-';

    // total mostrado al huésped (si hay descuento, usamos ese)
    const totalUI = (descuentoSpan.textContent || totalSpan.textContent || '').trim();

    // payload mínimo (confirmada)
    const payload = {
      source_text: 'Reserva web Happy Host',
      arrival:     checkInDate,
      departure:   checkOutDate,
      property_id: Number(propertyId) || 601719,
      status:      'booked',

      // 👉 obligatorio
      rooms: [{
        room_type_id: Number(roomTypeId) || 668510,
        units: 1,
        adults: Number(numberOfGuests) || 2,
        children: 0
      }],

      // 👉 obligatorio
      guest: {
        name: nombreCompleto,
        first_name,
        last_name,
        email,
        phone: telefono
      },

      // 👉 extra para que el server arme el texto de Notas/Mensajes
      _total_ui: totalUI,
      _senia_ui: seniaSpan.textContent,
      _cupon:    cuponInfo || '',
      _comments: comentarios
    };

    // ====== BACKEND ======
    // Usamos Render directamente. (Si querés testear local, cambiá esta línea por "http://localhost:3000")
    const API_BASE = 'https://disponibilidad-happy-host-patagonia.onrender.com';

    // Idempotencia para evitar duplicados por doble click
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

    // Éxito + redirección automática en 5 segundos
    await Swal.fire({
      icon: 'success',
      title: '✅ Reserva confirmada',
      html: `Tu reserva fue creada con éxito.<br><small>ID: ${bookingId || '—'}</small><br><br>Te redirijo en 5 segundos...`,
      timer: 5000,
      timerProgressBar: true,
      showConfirmButton: false
    });

    // Redirección
    window.location.href = 'viajero.html';

  } catch (err) {
    console.error('Error al enviar la reserva:', err);
    await Swal.fire({
      icon: 'error',
      title: '❌ Error',
      text: 'Hubo un problema al confirmar la reserva.'
    });
  } finally {
    if (boton) { boton.disabled = false; boton.textContent = 'Confirmar Reserva'; }
  }
});


// === utilidades ===
function calcularSeniaInteligente(total, diffDays) {
  let seniaMinNoches = 1;
  if (diffDays >= 5 && diffDays <= 9) seniaMinNoches = 2;
  else if (diffDays >= 10 && diffDays <= 15) seniaMinNoches = 4;

  const precioNoche = total / diffDays;
  const seniaMinima = precioNoche * seniaMinNoches;

  let saldoRedondo = Math.floor((total - seniaMinima) / 100) * 100;
  let seniaFinal = total - saldoRedondo;

  if (seniaFinal < seniaMinima) {
    saldoRedondo -= 100;
    seniaFinal = total - saldoRedondo;
  }

  return {
    seniaFinal: Math.round(seniaFinal),
    seniaNoches: seniaMinNoches,
    saldoRedondo: Math.round(saldoRedondo)
  };
}

// === INICIO CUPÓN GANASTE ===
function getUsosGanaste() {
  return parseInt(localStorage.getItem("ganaste_usos")) || 0;
}
function incrementarUsoGanaste() {
  const usos = getUsosGanaste() + 1;
  localStorage.setItem("ganaste_usos", usos);
}
function aplicarCuponGanaste(codigo, checkInDate) {
  const hoy = new Date();
  const checkin = new Date(checkInDate);
  const usos = getUsosGanaste();

  const fechaLimiteReserva = new Date("2025-08-15");
  const inicioValidez = new Date("2025-07-22");
  const finValidez = new Date("2025-12-31");

  if (codigo !== "GANASTE") return { valido: false };
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
// === FIN CUPÓN GANASTE ===
