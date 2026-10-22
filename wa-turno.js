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

  document.addEventListener("click", function (ev) {
    const a = ev.target.closest && ev.target.closest('a[href*="wa.me/' + NUMERO_WEB + '"]');
    if (!a || !turno) return;

    a.href = a.href.replace(NUMERO_WEB, turno.numero);

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
