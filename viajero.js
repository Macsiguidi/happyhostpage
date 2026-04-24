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
  let rangoSeparator = " a "; // fallback seguro

  if (dateInput) {
    if (window.flatpickr) {
      const isMobile = window.innerWidth <= 768;

      const displayLlegada = document.getElementById("display-llegada");
      const displaySalida  = document.getElementById("display-salida");

      function formatFecha(d) {
        return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
      }

      const fp = flatpickr(dateInput, {
        mode: "range",
        dateFormat: "Y-m-d",
        locale: { rangeSeparator: " a " },
        minDate: "today",
        showMonths: isMobile ? 1 : 2,
        disableMobile: true,
        onChange: function(selectedDates) {
          if (!displayLlegada || !displaySalida) return;
          if (selectedDates.length >= 1) {
            displayLlegada.textContent = formatFecha(selectedDates[0]);
            displayLlegada.classList.add("tiene-valor");
          } else {
            displayLlegada.textContent = "Agregar fecha";
            displayLlegada.classList.remove("tiene-valor");
          }
          if (selectedDates.length >= 2) {
            displaySalida.textContent = formatFecha(selectedDates[1]);
            displaySalida.classList.add("tiene-valor");
          } else {
            displaySalida.textContent = "Agregar fecha";
            displaySalida.classList.remove("tiene-valor");
          }
        }
      });

      // Click en la sección de fechas → abrir flatpickr
      const fechasTrigger = document.getElementById("buscador-fechas-trigger");
      if (fechasTrigger && fp) {
        fechasTrigger.addEventListener("click", function() { fp.open(); });
      }

      // Tomamos el separador real que esté usando la instancia por si cambia
      try {
        rangoSeparator = (fp.config.locale && fp.config.locale.rangeSeparator) || " a ";
      } catch (e) { /* noop */ }

    } else {
      console.warn("⚠️ flatpickr no está cargado. Verificá el <script> del CDN antes de viajeros.js");
      // Opcional: bloquear edición si falta la lib
      // dateInput.setAttribute("readonly", "readonly");
    }
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
      cantidadSpan.textContent = "Agregar";
      cantidadSpan.classList.add("placeholder");
    }
  }

  function actualizarHuespedes(cant) {
    inputHuespedes.value = cant;
    if (cant === 0) {
      cantidadSpan.textContent = "Agregar";
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

      // Usamos el separador real (no hardcodeado)
      const rango = (dateInput?.value || "").split(rangoSeparator);
      const checkin = rango[0]?.trim();
      const checkout = rango[1]?.trim();
      const huespedes = inputHuespedes.value;

      console.log("🧪 Rango seleccionado:", dateInput?.value);
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
      localStorage.setItem("busqueda_desde_buscador", "true");

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

  // VIDEOS ACTIVIDADES — play on hover (desktop) / click-tap (mobile)
  (function initActividadVideos() {
    const cards = document.querySelectorAll('.video-actividad');
    if (!cards.length) return;

    cards.forEach(card => {
      const video = card.querySelector('video');
      if (!video) return;

      // Asegurar que NO arranquen solos aunque el HTML se olvide
      video.autoplay = false;
      video.loop = false;
      video.removeAttribute('autoplay');
      video.removeAttribute('loop');
      video.preload = 'metadata';
      try { video.pause(); video.currentTime = 0; } catch {}

      const play = () => { video.play().catch(() => {}); };
      const stop = () => { video.pause(); video.currentTime = 0; };

      // Desktop: hover en el contenedor (no en el video) por si el overlay está encima
      card.addEventListener('mouseenter', play);
      card.addEventListener('mouseleave', stop);

      // Soporte simple para touch/click
      card.addEventListener('click', () => {
        if (video.paused) play(); else stop();
      }, { passive: true });
    });
  })();
});








