

// ==========================
// FLATPICKR Y SELECTOR DE HUÉSPEDES
// ==========================
document.addEventListener("DOMContentLoaded", function () {
  // Flatpickr
  const dateInput = document.getElementById("rango-fechas");
  if (dateInput) {
    const isMobile = window.innerWidth <= 768;
    flatpickr(dateInput, {
      mode: "range",
      dateFormat: "Y-m-d",
      locale: "es",
      minDate: "today",
      showMonths: isMobile ? 1 : 2,
      disableMobile: true
    });
  }

  // Huéspedes
  const cantidadSpan = document.getElementById("cantidad");
  const inputHuespedes = document.getElementById("huespedes");
  const btnMas = document.getElementById("mas");
  const btnMenos = document.getElementById("menos");

  if (btnMas && btnMenos && cantidadSpan && inputHuespedes) {
    btnMas.onclick = () => {
      let cant = parseInt(inputHuespedes.value) || 0;
      if (cant < 15) cant++;
      actualizarHuespedes(cant);
    };

    btnMenos.onclick = () => {
      let cant = parseInt(inputHuespedes.value) || 0;
      if (cant > 1) {
        cant--;
        actualizarHuespedes(cant);
      } else {
        actualizarHuespedes(0);
      }
    };

    // Inicial
    if (inputHuespedes.value === "0") {
      cantidadSpan.textContent = "Huéspedes";
      cantidadSpan.classList.add("placeholder");
    }
  }

  function actualizarHuespedes(cant) {
    inputHuespedes.value = cant;
    if (cant === 0) {
      cantidadSpan.textContent = "Huéspedes";
      cantidadSpan.classList.add("placeholder");
    } else {
      cantidadSpan.textContent = cant;
      cantidadSpan.classList.remove("placeholder");
    }
  }

  // ==========================
  // FORMULARIO BUSCADOR
  // ==========================
  const form = document.getElementById("form-busqueda");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const rango = (dateInput.value || "").split(" a ");
      const checkin = rango[0]?.trim();
      const checkout = rango[1]?.trim();
      const huespedes = inputHuespedes.value;

      // LOG PARA DEBUG
      console.log("🧪 Rango seleccionado:", dateInput.value);
      console.log("✅ Checkin:", checkin);
      console.log("✅ Checkout:", checkout);
      console.log("✅ Huéspedes:", huespedes);

      if (!checkin || !checkout) {
        alert("Por favor seleccioná un rango de fechas completo.");
        return;
      }

      localStorage.setItem("checkin", checkin);
      localStorage.setItem("checkout", checkout);
      localStorage.setItem("huespedes", huespedes);

      window.location.href = `alojamientos.html?checkin=${checkin}&checkout=${checkout}&huespedes=${huespedes}`;
    });
  }
});

// ==========================
// CARRUSEL DE COMENTARIOS
// ==========================
document.addEventListener("DOMContentLoaded", function () {
  const grupos = document.querySelectorAll(".grupo-comentarios");
  let actual = 0;

  function mostrarGrupo(index) {
    grupos.forEach((grupo, i) => {
      grupo.classList.remove("active");
      if (i === index) grupo.classList.add("active");
    });
  }

  function siguienteGrupo() {
    actual = (actual + 1) % grupos.length;
    mostrarGrupo(actual);
  }

  mostrarGrupo(actual);
  setInterval(siguienteGrupo, 7000); // cambia cada 7 segundos
});

// ==========================
// VIDEOS ACTIVIDADES
// ==========================
document.querySelectorAll('.video-actividad video').forEach(video => {
  video.pause(); // Aseguramos que no empiecen solos

  video.addEventListener('mouseenter', () => {
    video.play();
  });

  video.addEventListener('mouseleave', () => {
    video.pause();
    video.currentTime = 0; // Opcional: vuelve al inicio al salir el cursor
  });
});


