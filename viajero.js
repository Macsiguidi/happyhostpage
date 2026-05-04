// 🔄 Limpiar filtros anteriores (por si vuelve desde alojamientos o toca "Inicio")
localStorage.removeItem("checkin");
localStorage.removeItem("checkout");
localStorage.removeItem("huespedes");
localStorage.removeItem("adultos");
localStorage.removeItem("ninos");
localStorage.removeItem("bebes");
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
  // HUÉSPEDES (dropdown Adultos / Niños / Bebés)
  // ==========================
  const inputHuespedes = document.getElementById("huespedes");
  let _adultos = 1, _ninos = 0, _bebes = 0;

  const huContainer = document.querySelector('.viajero-hu-container');
  if (huContainer && window.HH && window.HH.HuespedesSelector) {
    new window.HH.HuespedesSelector({
      container: huContainer,
      maxGuests: 15,
      adultos: 1, ninos: 0, bebes: 0,
      modal: true,
      onChange: function (v) {
        _adultos = v.adultos; _ninos = v.ninos; _bebes = v.bebes;
        if (inputHuespedes) inputHuespedes.value = v.total;
      }
    });
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
      const huespedes = _adultos + _ninos;  // total para capacidad (bebés no cuentan)

      if (!checkin || !checkout) {
        alert("Por favor seleccioná un rango de fechas completo.");
        return;
      }

      localStorage.setItem("checkin",   checkin);
      localStorage.setItem("checkout",  checkout);
      localStorage.setItem("huespedes", String(huespedes));
      localStorage.setItem("adultos",   String(_adultos));
      localStorage.setItem("ninos",     String(_ninos));
      localStorage.setItem("bebes",     String(_bebes));
      localStorage.setItem("busqueda_desde_buscador", "true");

      try {
        const response = await fetch(`https://disponibilidad-happy-host-patagonia.onrender.com/api/disponibles?checkin=${checkin}&checkout=${checkout}`);
        const data = await response.json();

        localStorage.setItem("disponibles",        JSON.stringify(data.disponibles));
        localStorage.setItem("disponibles_expira", Date.now() + 1000 * 60 * 3);

        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.warn("⚠️ No se pudo prefetch disponibilidad", error);
      }

      window.location.href = `alojamientos.html?checkin=${checkin}&checkout=${checkout}&huespedes=${huespedes}&adultos=${_adultos}&ninos=${_ninos}&bebes=${_bebes}`;
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
      localStorage.removeItem("adultos");
      localStorage.removeItem("ninos");
      localStorage.removeItem("bebes");
      localStorage.removeItem("disponibles");
      localStorage.removeItem("disponibles_expira");
    });
  }

  // ==========================
  // CARRUSEL DE COMENTARIOS
  // ==========================
  let actual = 0;

  function mostrarGrupo(index) {
    // Re-query cada vez para incluir grupos dinámicos cargados por resenas-viajero.js
    const grupos = document.querySelectorAll(".grupo-comentarios");
    grupos.forEach((grupo, i) => {
      grupo.classList.remove("active");
      if (i === index) grupo.classList.add("active");
    });
  }

  function siguienteGrupo() {
    const grupos = document.querySelectorAll(".grupo-comentarios");
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








