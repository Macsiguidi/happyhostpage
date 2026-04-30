/**
 * resenas-viajero.js
 * Carga todas las reseñas aprobadas desde la API y las agrega al carrusel
 * de comentarios de viajero.html (debajo de las reseñas estáticas existentes).
 */
(function () {
  var API = 'https://propietarios-happy-host.onrender.com/api/reviews/approved';

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function starsLabel(n) {
    return '★ ' + n.toFixed(1);
  }

  // Calcula promedio y devuelve la etiqueta de plataforma
  function buildPlataforma(r) {
    var promedio = ((r.comunicacionStars + r.limpiezaStars + r.lugarStars) / 3.0);
    var label = '★ ' + promedio.toFixed(1);
    if (r.via && r.via !== 'Directa') label += ' - ' + r.via;
    else label += ' - Directa';
    return label;
  }

  fetch(API)
    .then(function (res) { return res.json(); })
    .then(function (reviews) {
      if (!reviews || reviews.length === 0) return;

      var carrusel = document.querySelector('.carrusel-comentarios');
      if (!carrusel) return;

      // Solo mostrar reseñas que tengan texto público
      var conTexto = reviews.filter(function (r) {
        return r.resenaPublica && r.resenaPublica.trim().length > 0;
      });

      if (conTexto.length === 0) return;

      // Agrupar de a 3
      for (var i = 0; i < conTexto.length; i += 3) {
        var grupo = document.createElement('div');
        grupo.className = 'grupo-comentarios';

        var slice = conTexto.slice(i, i + 3);
        slice.forEach(function (r) {
          var div = document.createElement('div');
          div.className = 'comentario';

          var promedio = (r.comunicacionStars + r.limpiezaStars + r.lugarStars) / 3.0;
          var via = (r.via && r.via !== 'Directa') ? r.via : 'Directa';

          div.innerHTML =
            '<p>"' + escHtml(r.resenaPublica) + '"</p>' +
            '<div class="autor"><strong>' + escHtml(r.guestName) + '</strong> – ' + escHtml(r.propertyName) + '</div>' +
            '<span class="plataforma">★ ' + promedio.toFixed(1) + ' - ' + escHtml(via) + '</span>';

          grupo.appendChild(div);
        });

        carrusel.appendChild(grupo);
      }
    })
    .catch(function () {
      // Fallo silencioso — las reseñas estáticas siguen visibles
    });
})();
