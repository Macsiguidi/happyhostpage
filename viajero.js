// 🔄 Limpiar filtros anteriores (por si vuelve desde alojamientos o toca "Inicio")
localStorage.removeItem("checkin");
localStorage.removeItem("checkout");
localStorage.removeItem("huespedes");
localStorage.removeItem("disponibles");
localStorage.removeItem("disponibles_expira");

document.addEventListener("DOMContentLoaded", async function () {
  // 🚀 WAKE-UP CALL PARA RENDER
  fetch("https://disponibilidad-happy-host-patagonia.onrender.com/api/disponibles?checkin=2025-01-01&checkout=2025-01-02")
    .then(() => console.log("✅ Render activado"))
    .catch(() => console.warn("⚠️ Wake-up fallido"));

  // ==========================
  // FLATPICKR
  // ==========================
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

  // ==========================
  // HUÉSPEDES
  // ==========================
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
    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      const rango = (dateInput.value || "").split(" a ");
      const checkin = rango[0]?.trim();
      const checkout = rango[1]?.trim();
      const huespedes = inputHuespedes.value;

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

      try {
        const response = await fetch(`https://disponibilidad-happy-host-patagonia.onrender.com/api/disponibles?checkin=${checkin}&checkout=${checkout}`);
        const data = await response.json();
        console.log("📦 Disponibles prefetch:", data.disponibles);

        localStorage.setItem("disponibles", JSON.stringify(data.disponibles));
        localStorage.setItem("disponibles_expira", Date.now() + 1000 * 60 * 3);

        // 🔒 Espera breve para garantizar que se guarde bien antes de redirigir
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.warn("⚠️ No se pudo prefetch disponibilidad", error);
      }

      window.location.href = `alojamientos.html?checkin=${checkin}&checkout=${checkout}&huespedes=${huespedes}`;
    });
  }

  // ==========================
  // BOTÓN INICIO
  // ==========================
  const btnInicio = document.getElementById("inicio");
  if (btnInicio) {
    btnInicio.addEventListener("click", () => {
      localStorage.removeItem("checkin");
      localStorage.removeItem("checkout");
      localStorage.removeItem("huespedes");
      localStorage.removeItem("disponibles");
      localStorage.removeItem("disponibles_expira");
    });
  }

  // ==========================
  // CARRUSEL DE COMENTARIOS
  // ==========================
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
  setInterval(siguienteGrupo, 7000);

  // ==========================
  // VIDEOS ACTIVIDADES
  // ==========================
  document.querySelectorAll('.video-actividad video').forEach(video => {
    video.pause();

    video.addEventListener('mouseenter', () => {
      video.play();
    });

    video.addEventListener('mouseleave', () => {
      video.pause();
      video.currentTime = 0;
    });
  });
});






