// Turno de WhatsApp Maxi / Juan para Gurisa, Nueva Esperanza y Arauko Loft.
// El sistema dice a quién le toca; al tocar cualquier botón de WhatsApp de la
// página se cambia el número y se registra la consulta, así la próxima va al otro.
// Uso: <script src="wa-turno.js" data-casa="gurisa"></script>  (en unidad.html toma ?slug=)
(function () {
  const API = "https://propietarios-happy-host.onrender.com/api/whatsapp/turno";
  const NUMERO_WEB = "5492944700773";
  const CLAVE = "hh_wa_turno";

  const script = document.currentScript;
  const params = new URLSearchParams(location.search.replace(/\?/g, "&").replace(/^&/, "?"));
  const casa = ((script && script.dataset.casa) || params.get("slug") || "").toLowerCase().trim();
  if (!casa) return;

  // Si este huésped ya consultó por una de estas casas, sigue con la misma persona.
  let asignado = null;
  try { asignado = JSON.parse(localStorage.getItem(CLAVE) || "null"); } catch (e) {}
  let turno = null;

  fetch(API + "?casa=" + encodeURIComponent(casa))
    .then(r => r.json())
    .then(t => { if (t && t.enTurno && t.numero) turno = asignado || t; })
    .catch(() => {});

  document.addEventListener("click", function (ev) {
    const a = ev.target.closest && ev.target.closest('a[href*="wa.me/' + NUMERO_WEB + '"]');
    if (!a || !turno) return;

    a.href = a.href.replace(NUMERO_WEB, turno.numero);

    if (!asignado) {
      asignado = { destino: turno.destino, numero: turno.numero };
      try { localStorage.setItem(CLAVE, JSON.stringify(asignado)); } catch (e) {}
      const url = API + "/registrar?casa=" + encodeURIComponent(casa) + "&destino=" + turno.destino;
      if (!(navigator.sendBeacon && navigator.sendBeacon(url)))
        fetch(url, { method: "POST", keepalive: true }).catch(() => {});
    }
  }, true);
})();
