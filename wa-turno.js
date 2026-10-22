// Reparto de las consultas de WhatsApp entre Maxi y Juan. El sistema decide a quién
// le toca según la casa o página (Gurisa/Nueva Esperanza/Arauko 50/50, Refugio y Koi
// siempre Juan, el resto 70% Maxi / 30% Juan). Al tocar cualquier botón de WhatsApp
// se cambia el número y se registra la consulta.
// Uso: <script src="wa-turno.js"></script>  — la casa sale de data-casa, de ?slug=
// (unidad.html) o del nombre del archivo (gurisa.html → "gurisa", portada → "index").
(function () {
  const API = "https://propietarios-happy-host.onrender.com/api/whatsapp/turno";
  const NUMERO_WEB = "5492944700773";
  const CLAVE = "hh_wa_turno";

  const script = document.currentScript;
  const params = new URLSearchParams(location.search.replace(/\?/g, "&").replace(/^&/, "?"));
  const pagina = location.pathname.replace(/\/$/, "/index").split("/").pop().replace(/\.html$/, "") || "index";
  const casa = ((script && script.dataset.casa) || params.get("slug") || pagina).toLowerCase().trim();

  // Si este huésped ya consultó, sigue con la misma persona (salvo en las casas de Juan).
  let asignado = null;
  try { asignado = JSON.parse(localStorage.getItem(CLAVE) || "null"); } catch (e) {}
  let turno = null;
  let registrado = false;

  fetch(API + "?casa=" + encodeURIComponent(casa))
    .then(r => r.json())
    .then(t => {
      if (!t || !t.grupo || !t.numero) return;
      turno = (t.grupo === "juan" || !asignado) ? t : asignado;
    })
    .catch(() => {});

  // Mensaje armado para que se note que la consulta viene de la web (y de qué casa).
  let casaNombreCache = "";
  function nombreCasa() {
    if (casaNombreCache) return casaNombreCache;
    for (const l of document.querySelectorAll('a[href*="wa.me/"][href*="text="]')) {
      const m = decodeURIComponent(l.href.split("text=")[1] || "").match(/Me interesa (.+?)\. ¿/);
      if (m) return (casaNombreCache = m[1]);
    }
    return "";
  }
  function mensajeWeb(original, destino) {
    const casaNombre = nombreCasa();
    if (casaNombre) return "Hola! Vi *" + casaNombre + "* en la web de Happy Host. ¿Tienen disponibilidad?";
    if (original.indexOf("(vi la web") !== -1) return original;
    if (/^Hola Maxi/.test(original)) // botones de la página de propietarios
      return original.replace(/^Hola Maxi/, destino === "juan" ? "Hola Juan" : "Hola Maxi") + " (vi la web de Happy Host)";
    if (location.pathname.indexOf("/actividades") !== -1)
      return "Hola! Vi la web de Happy Host y quiero consultar por actividades en Villa La Angostura.";
    return "Hola! Vi la web de Happy Host y quiero consultar por un alojamiento.";
  }

  document.addEventListener("click", function (ev) {
    const a = ev.target.closest && ev.target.closest('a[href*="wa.me/' + NUMERO_WEB + '"]');
    if (!a) return;

    const original = decodeURIComponent((a.href.split("text=")[1] || "").replace(/\+/g, " "));
    const numero = turno ? turno.numero : NUMERO_WEB;
    a.href = "https://wa.me/" + numero + "?text=" + encodeURIComponent(mensajeWeb(original, turno ? turno.destino : "maxi"));
    if (!turno) return;

    if (registrado || turno === asignado) return; // ya se registró su consulta
    registrado = true;
    if (turno.grupo !== "juan") {
      asignado = { destino: turno.destino, numero: turno.numero };
      try { localStorage.setItem(CLAVE, JSON.stringify(asignado)); } catch (e) {}
    }
    const url = API + "/registrar?casa=" + encodeURIComponent(casa) + "&destino=" + turno.destino;
    if (!(navigator.sendBeacon && navigator.sendBeacon(url)))
      fetch(url, { method: "POST", keepalive: true }).catch(() => {});
  }, true);
})();
