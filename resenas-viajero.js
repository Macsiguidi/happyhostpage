/**
 * resenas-viajero.js
 * Carga las resenas aprobadas desde la API y las integra al carrusel
 * de index.html, completando el ultimo grupo estatico incompleto antes
 * de crear nuevos grupos. Siempre grupos de 3.
 */
(function () {
  var API = 'https://propietarios-happy-host.onrender.com/api/reviews/approved';

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function buildComentarioDiv(r) {
    var div = document.createElement('div');
    div.className = 'comentario';
    var promedio = (r.comunicacionStars + r.limpiezaStars + r.lugarStars) / 3.0;
    var via = (r.via && r.via !== 'Directa') ? r.via : 'Directa';
    div.innerHTML =
      '<p>"' + escHtml(r.resenaPublica) + '"</p>' +
      '<div class="autor"><strong>' + escHtml(r.guestName) + '</strong> – ' + escHtml(r.propertyName) + '</div>' +
      '<span class="plataforma">★ ' + promedio.toFixed(1) + ' - ' + escHtml(via) + '</span>';
    return div;
  }

  fetch(API)
    .then(function (res) { return res.json(); })
    .then(function (reviews) {
      if (!reviews || reviews.length === 0) return;

      var carrusel = document.querySelector('.carrusel-comentarios');
      if (!carrusel) return;

      // Solo resenas con texto publico
      var conTexto = reviews.filter(function (r) {
        return r.resenaPublica && r.resenaPublica.trim().length > 0;
      });
      if (conTexto.length === 0) return;

      var idx = 0; // cursor en conTexto

      // ── Paso 1: completar el ultimo grupo estatico si tiene menos de 3 ──
      var grupos = carrusel.querySelectorAll('.grupo-comentarios');
      if (grupos.length > 0) {
        var ultimoGrupo = grupos[grupos.length - 1];
        var existentes = ultimoGrupo.querySelectorAll('.comentario').length;
        var faltan = 3 - existentes;

        while (faltan > 0 && idx < conTexto.length) {
          ultimoGrupo.appendChild(buildComentarioDiv(conTexto[idx]));
          idx++;
          faltan--;
        }
      }

      // ── Paso 2: nuevos grupos de a 3 con el resto ───────────────────────
      while (idx < conTexto.length) {
        var grupo = document.createElement('div');
        grupo.className = 'grupo-comentarios';

        var limite = Math.min(idx + 3, conTexto.length);
        for (var j = idx; j < limite; j++) {
          grupo.appendChild(buildComentarioDiv(conTexto[j]));
        }
        idx = limite;

        carrusel.appendChild(grupo);
      }
    })
    .catch(function () {
      // Fallo silencioso — las resenas estaticas siguen visibles
    });
})();
