 const btnVolver = document.getElementById('btnVolver');

  btnVolver.addEventListener('click', function(event) {
    event.preventDefault();  // Evita que el link "#" haga nada

    const checkin   = document.getElementById('start')?.value || '';
    const checkout  = document.getElementById('end')?.value || '';
    const huespedes = document.getElementById('guests')?.value || '';

    let url = 'alojamientos.html';
    const params = new URLSearchParams();

    if (checkin)   params.append('checkin', checkin);
    if (checkout)  params.append('checkout', checkout);
    if (huespedes) params.append('huespedes', huespedes);

    if (params.toString()) {
      url += '?' + params.toString();
    }

    window.location.href = url;
  });


  function marcarCheckInOutEnCalendario() {
  // Elimina clases viejas
  document.querySelectorAll('.flatpickr-day.checkin, .flatpickr-day.checkout').forEach(elem => {
    elem.classList.remove('checkin', 'checkout');
  });

  const checkin = startInput.value;
  const checkout = endInput.value;

  if (checkin) {
    const elemIn = document.querySelector(`.flatpickr-day[aria-label="${flatpickr.formatDate(new Date(checkin), "F j, Y")}"]`);
    if (elemIn) elemIn.classList.add('checkin');
  }

  if (checkout) {
    const elemOut = document.querySelector(`.flatpickr-day[aria-label="${flatpickr.formatDate(new Date(checkout), "F j, Y")}"]`);
    if (elemOut) elemOut.classList.add('checkout');
  }
}
