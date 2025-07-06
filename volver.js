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