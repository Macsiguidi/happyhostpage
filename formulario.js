window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);

  const propertyId     = params.get('propertyId');
  const roomTypeId     = params.get('roomTypeId');
  const checkInDate    = params.get('checkInDate');
  const checkOutDate   = params.get('checkOutDate');
  const numberOfGuests = params.get('numberOfGuests');
  const totalPrice     = params.get('totalPrice');

  // Completar inputs ocultos
  document.getElementById('propertyId').value      = propertyId;
  document.getElementById('roomTypeId').value      = roomTypeId;
  document.getElementById('checkInDate').value     = checkInDate;
  document.getElementById('checkOutDate').value    = checkOutDate;
  document.getElementById('numberOfGuests').value  = numberOfGuests;
  document.getElementById('totalPrice').value      = totalPrice;

  // Mostrar resumen
  document.getElementById('fechasReserva').textContent    = `${checkInDate} → ${checkOutDate}`;
  document.getElementById('huespedesReserva').textContent = numberOfGuests;
  document.getElementById('precioReserva').textContent    = `$ ${totalPrice}`;

  // Mapas de nombres e imágenes
  const nombreMap = {
    '601552': 'Calafate 1',
    '601707': 'Calafate 2',
    '601708': 'Calafate 3',
    '601710': 'Calafate 4',
    '601711': 'Calafate 5',
    '601712': 'Calafate 6',
    '601713': 'Calafate 7',
    '601717': 'Cruz del Sur 4',
    '601714': 'Cruz del Sur 5',
    '601719': 'Las Nilidas',
    '648950': 'Gurisa',
    '601720': 'Paisajismo'
  };

  const imagenMap = {
    '601552': 'unidades/casa1/casa1_img1.jpg',
    '601707': 'unidades/casa2/casa2_img3.jpg',
    '601708': 'unidades/casa3/casa3_img1.jpg',
    '601710': 'unidades/casa4/casa4_img2.jpg',
    '601711': 'unidades/casa5/casa5_img3.jpg',
    '601712': 'unidades/casa6/casa6_img1.jpg',
    '601713': 'unidades/casa7/casa7_img1.jpg',
    '601717': 'unidades/cds4/cds4_1.jpg',
    '601714': 'unidades/cds5/cds5_2.jpg',
    '601719': 'unidades/nilidas/nilidas1.jpg',
    '648950': 'unidades/gurisa/gurisa2.jpg',
    '601720': 'unidades/paisajismo/paisajismo1.jpg'
  };

  const nombre = nombreMap[propertyId] || 'Alojamiento';
  document.getElementById('nombrePropiedad').textContent = nombre;
  document.getElementById('imagenPropiedad').src = imagenMap[propertyId] || '';

  const headerTitulo = document.querySelector('.titulo-header');
  if (headerTitulo) {
    headerTitulo.textContent = nombre;
  }

  // CALCULAR SEÑA
  const checkinDateObj = new Date(checkInDate);
  const checkoutDateObj = new Date(checkOutDate);
  const diffTime = Math.abs(checkoutDateObj - checkinDateObj);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let seniaNoches = (diffDays > 5) ? 2 : 1;

  const totalPriceNumber = parseFloat(totalPrice.replace(/[^0-9.-]+/g,""));
  let montoSenia = 0;
  if (!isNaN(totalPriceNumber) && diffDays > 0) {
    const precioNoche = totalPriceNumber / diffDays;
    montoSenia = precioNoche * seniaNoches;
    document.getElementById('seniaReserva').textContent = `$ ${montoSenia.toFixed(2)} (${seniaNoches} noche${seniaNoches > 1 ? 's' : ''})`;
  } else {
    document.getElementById('seniaReserva').textContent = `No disponible`;
  }

  // SUBMIT
  document.getElementById('formularioReserva').addEventListener('submit', function(e) {
    e.preventDefault();

    fetch('https://disponibilidad-happy-host-patagonia.onrender.com/notificar-reserva', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: document.getElementById('nombre').value,
        telefono: document.getElementById('telefono').value,
        email: document.getElementById('email').value,
        comentarios: document.getElementById('comentarios').value,
        checkin: checkInDate,
        checkout: checkOutDate,
        huespedes: numberOfGuests,
        propiedad: nombre,
        total: `$ ${totalPrice}`,
        senia: `$ ${montoSenia.toFixed(2)}`
      })
    })
    .then(res => res.json())
.then(data => {
  console.log('Respuesta del server:', data);
  Swal.fire({
    title: '✅ Reserva confirmada',
    html: 'La notificación fue enviada con éxito.<br>¡Gracias por elegir Happy Host!',
    imageUrl: 'logos/happy host.png',
    imageWidth: 100,
    imageAlt: 'Happy Host',
    confirmButtonText: '¡Gracias!',
    confirmButtonColor: '#25D366',
    timer: 10000, // 10 segundos
    timerProgressBar: true
  }).then(() => {
    window.location.href = 'viajero.html';
  });
})
.catch(err => {
  console.error('Error al enviar la notificación:', err);
  Swal.fire({
    title: '❌ Error',
    text: 'Hubo un error al enviar la notificación.',
    icon: 'error',
    confirmButtonText: 'OK'
  });
});

  });
});

// MODAL
const modal = document.getElementById("modal-terminos");
const abrirBtn = document.getElementById("verTerminos");
const cerrarBtn = document.querySelector(".cerrar");

abrirBtn.addEventListener("click", function(e) {
  e.preventDefault();
  modal.style.display = "block";
});

cerrarBtn.addEventListener("click", function() {
  modal.style.display = "none";
});

window.addEventListener("click", function(e) {
  if (e.target === modal) {
    modal.style.display = "none";
  }
});


// 🎯 CUPON DE DESCUENTO CON PRECIO TACHADO Y SEÑA ACTUALIZADA
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);

  const propertyId = params.get('propertyId');
  const roomTypeId = params.get('roomTypeId');
  const checkInDate = params.get('checkInDate');
  const checkOutDate = params.get('checkOutDate');
  const numberOfGuests = params.get('numberOfGuests');
  const totalPrice = params.get('totalPrice');

  // Mapas
  const nombreMap = {
    '601552': 'calafate1',
    '601707': 'calafate2',
    '601708': 'calafate3',
    '601710': 'calafate4',
    '601711': 'calafate5',
    '601712': 'calafate6',
    '601713': 'calafate7',
    '601720': 'paisajismo',
    '601717': 'cruzdelsur4',
    '601714': 'cruzdelsur5',
    '601719': 'nilidas',
    '648950': 'gurisa'
  };

  const alojamientoActual = nombreMap[propertyId];

  const totalSpan = document.getElementById('precioReserva');
  const descuentoSpan = document.getElementById('precioConDescuento');
  const seniaSpan = document.getElementById('seniaReserva');
  const labelCupon = document.getElementById('descuentoLabel');
  const inputCupon = document.getElementById('cuponDescuento');
  const botonCupon = document.getElementById('aplicarCupon');

  const totalOriginal = parseFloat(totalPrice);

  totalSpan.textContent = `$${totalOriginal.toFixed(2)}`;

  const checkinDateObj = new Date(checkInDate);
  const checkoutDateObj = new Date(checkOutDate);
  const diffTime = Math.abs(checkoutDateObj - checkinDateObj);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  let seniaNoches = (diffDays > 5) ? 2 : 1;
  let precioPorNoche = totalOriginal / diffDays;
  let seniaOriginal = precioPorNoche * seniaNoches;

  seniaSpan.textContent = `$${seniaOriginal.toFixed(2)} (${seniaNoches} noche${seniaNoches > 1 ? 's' : ''})`;

  const cupones = {
    "HAPPYINVIERNO": {
      porcentaje: 15,
      alojamientos: ["calafate1", "calafate2", "calafate3", "calafate4", "calafate5", "calafate6", "calafate7", "paisajismo"],
      desde: new Date("2025-06-01"),
      hasta: new Date("2025-08-31")
    },
    "PRIMAVERA2025": {
      porcentaje: 20,
      alojamientos: ["calafate1", "calafate2", "calafate3", "calafate4", "calafate5", "calafate6", "calafate7", "paisajismo"],
      desde: new Date("2025-09-01"),
      hasta: new Date("2025-10-30")
    }
  };

  botonCupon.addEventListener('click', () => {
    const codigo = inputCupon.value.trim().toUpperCase();
    const cupon = cupones[codigo];
    const hoy = new Date();

    if (
      cupon &&
      cupon.alojamientos.includes(alojamientoActual) &&
      hoy >= cupon.desde && hoy <= cupon.hasta
    ) {
      const descuento = (totalOriginal * cupon.porcentaje) / 100;
      const totalConDescuento = totalOriginal - descuento;

      totalSpan.classList.add('tachado');
      descuentoSpan.textContent = `$${totalConDescuento.toFixed(2)}`;

      const precioNocheDescuento = totalConDescuento / diffDays;
      const seniaConDescuento = precioNocheDescuento * seniaNoches;
      seniaSpan.textContent = `$${seniaConDescuento.toFixed(2)} (${seniaNoches} noche${seniaNoches > 1 ? 's' : ''})`;

      labelCupon.textContent = `Cupón aplicado: ${codigo} (-${cupon.porcentaje}%)`;
      labelCupon.style.color = "green";

    } else {
      labelCupon.textContent = "Cupón inválido o fuera de fecha.";
      labelCupon.style.color = "red";
      totalSpan.classList.remove('tachado');
      descuentoSpan.textContent = "";
      seniaSpan.textContent = `$${seniaOriginal.toFixed(2)} (${seniaNoches} noche${seniaNoches > 1 ? 's' : ''})`;
    }
  });
});
