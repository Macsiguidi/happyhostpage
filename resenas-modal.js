/**
 * resenas-modal.js  v2
 * Carga las resenas aprobadas para la propiedad y:
 *  - Inserta una seccion "Experiencias" despues de .unidad-amenities
 *    (con separador, rating promedio, preview de 1 resena y boton)
 *  - Abre un drawer lateral con TODAS las resenas al hacer click
 */
(function () {
  var API  = 'https://propietarios-happy-host.onrender.com/api/reviews/approved';
  var slug = window.location.pathname.split('/').pop().replace('.html', '').toLowerCase();

  var validSlugs = [
    'calafate1','calafate2','calafate3','calafate4','calafate5','calafate6','calafate7',
    'cruz4','cruz5','nilidas','gurisa','paisajismo','refugiopatagonico','mitiempo','koi','oasis'
  ];
  if (!validSlugs.includes(slug)) return;

  /* ── Estilos ─────────────────────────────────────────────────────────── */
  var css = `

  /* ── Seccion Experiencias ──────────────────────────────── */
  .unidad-resenas {
    margin-bottom: 36px;
  }
  .unidad-resenas h2 {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 1.25rem;
    font-weight: 700;
    color: #2F3E2F;
    margin: 0 0 20px;
  }

  /* Fila resumen: rating pill + texto */
  .resenas-summary {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;
  }
  .resenas-rating-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #2F3E2F;
    color: #fff;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 1.05rem;
    font-weight: 700;
    padding: 8px 16px;
    border-radius: 50px;
    white-space: nowrap;
  }
  .resenas-rating-info {
    font-family: 'Inter', sans-serif;
    font-size: .85rem;
    color: #5a6a5a;
    line-height: 1.4;
  }
  .resenas-rating-info strong {
    display: block;
    font-size: .92rem;
    color: #2F3E2F;
    font-weight: 600;
  }

  /* Lista de previews (hasta 3 cards apiladas) */
  .resenas-preview-lista {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 20px;
  }

  /* Preview card */
  .resena-preview-card {
    background: #fff;
    border: 1px solid #e0dbd3;
    border-left: 3px solid #6B7D5C;
    border-radius: 12px;
    padding: 14px 18px;
  }
  .resena-preview-card .rpc-texto {
    font-family: 'Inter', sans-serif;
    font-size: .88rem;
    color: #2F3E2F;
    line-height: 1.6;
    font-style: italic;
    margin: 0 0 10px;
  }
  .resena-preview-card .rpc-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 6px;
  }
  .resena-preview-card .rpc-autor {
    font-family: 'Inter', sans-serif;
    font-size: .78rem;
    font-weight: 600;
    color: #4a5a4a;
  }
  .resena-preview-card .rpc-stars {
    font-size: .76rem;
    color: #f5a623;
    letter-spacing: 1px;
  }
  .resena-preview-card .rpc-mes {
    font-size: .72rem;
    color: #9aaa9a;
  }

  /* Boton "Ver todas" */
  .btn-ver-resenas {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 11px 22px;
    background: transparent;
    border: 1.5px solid #6B7D5C;
    border-radius: 50px;
    font-family: 'Inter', sans-serif;
    font-size: .88rem;
    font-weight: 600;
    color: #2F3E2F;
    cursor: pointer;
    transition: background .2s, color .2s, border-color .2s;
    text-decoration: none;
  }
  .btn-ver-resenas:hover {
    background: #6B7D5C;
    color: #fff;
    border-color: #6B7D5C;
  }

  /* ── Backdrop ──────────────────────────────────────────── */
  .resenas-backdrop {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.45);
    z-index: 1100;
    opacity: 0;
    transition: opacity .3s;
  }
  .resenas-backdrop.active { display: block; opacity: 1; }

  /* ── Drawer ────────────────────────────────────────────── */
  .resenas-drawer {
    position: fixed;
    top: 0; right: -100%;
    width: min(440px, 100vw);
    height: 100%;
    background: #F5F3EF;
    box-shadow: -4px 0 32px rgba(0,0,0,.15);
    z-index: 1101;
    display: flex;
    flex-direction: column;
    transition: right .35s cubic-bezier(.4,0,.2,1);
    border-radius: 16px 0 0 16px;
    overflow: hidden;
  }
  .resenas-drawer.active { right: 0; }

  .resenas-drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 22px 24px 18px;
    background: #2F3E2F;
    flex-shrink: 0;
  }
  .resenas-drawer-header h3 {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 1.1rem;
    font-weight: 700;
    color: #fff;
    margin: 0;
  }
  .resenas-close {
    width: 32px; height: 32px;
    border: none;
    background: rgba(255,255,255,.15);
    border-radius: 50%;
    font-size: 1.2rem;
    cursor: pointer;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background .2s;
  }
  .resenas-close:hover { background: rgba(255,255,255,.3); }

  .resenas-drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px 20px 28px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /* Cards dentro del drawer */
  .resenas-card {
    background: #fff;
    border-radius: 12px;
    padding: 16px 18px;
    box-shadow: 0 1px 4px rgba(0,0,0,.06);
  }
  .resenas-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .resenas-card-top strong {
    font-family: 'Inter', sans-serif;
    font-size: .92rem;
    font-weight: 600;
    color: #2F3E2F;
  }
  .resenas-via {
    font-size: .72rem;
    font-weight: 600;
    background: #eef3e9;
    color: #556349;
    padding: 3px 9px;
    border-radius: 20px;
  }
  .resenas-cats {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }
  .resenas-cat {
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: 'Inter', sans-serif;
    font-size: .78rem;
    color: #5a6a5a;
    background: #F5F3EF;
    padding: 3px 10px;
    border-radius: 20px;
  }
  .resenas-cat .star { color: #f5a623; }
  .resenas-promedio-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #2F3E2F;
    color: #fff;
    font-size: .78rem;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 20px;
    margin-left: auto;
  }
  .resenas-texto {
    font-family: 'Inter', sans-serif;
    font-size: .87rem;
    color: #2F3E2F;
    line-height: 1.6;
    font-style: italic;
    margin: 4px 0 8px;
    border-left: 2px solid #6B7D5C;
    padding-left: 10px;
  }
  .resenas-fecha {
    font-size: .72rem;
    color: #9aaa9a;
    font-family: 'Inter', sans-serif;
  }

  /* Boton dejar resena */
  .btn-dejar-resena {
    display: block;
    text-align: center;
    padding: 14px;
    background: #6B7D5C;
    color: #fff;
    border-radius: 12px;
    text-decoration: none;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: .9rem;
    font-weight: 700;
    transition: background .2s;
    margin-top: 4px;
  }
  .btn-dejar-resena:hover { background: #556349; }
  `;

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* ── Helpers ──────────────────────────────────────────────────────────── */
  function starsHtml(n) {
    var s = '';
    for (var i = 1; i <= 5; i++) {
      s += i <= n ? '<span class="star">★</span>' : '<span style="color:#ddd">☆</span>';
    }
    return s;
  }

  function starsText(n) {
    var s = '';
    for (var i = 1; i <= 5; i++) s += i <= n ? '★' : '☆';
    return s;
  }

  function formatMonth(m) {
    if (!m) return '';
    var p = m.split('-');
    var months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return months[parseInt(p[1], 10) - 1] + ' ' + p[0];
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function calcPromedio(r) {
    return ((r.comunicacionStars + r.limpiezaStars + r.lugarStars) / 3).toFixed(1);
  }

  /* ── Fetch ────────────────────────────────────────────────────────────── */
  fetch(API + '?slug=' + encodeURIComponent(slug))
    .then(function (r) { return r.json(); })
    .then(function (reviews) {
      if (!reviews || reviews.length === 0) return;
      init(reviews);
    })
    .catch(function () {});

  /* ── Init ─────────────────────────────────────────────────────────────── */
  function init(reviews) {

    // Promedio global
    var totalProm = reviews.reduce(function (acc, r) {
      return acc + parseFloat(calcPromedio(r));
    }, 0);
    var promedioGlobal = (totalProm / reviews.length).toFixed(1);
    var starsGlobal    = Math.round(parseFloat(promedioGlobal));

    var n     = reviews.length;
    var label = n === 1 ? '1 estadía' : n + ' estadías';

    // Inyectar AggregateRating en JSON-LD para SEO (Googlebot renderiza JS)
    try {
      document.querySelectorAll('script[type="application/ld+json"]').forEach(function (s) {
        var data = JSON.parse(s.textContent);
        if (data['@type'] === 'VacationRental') {
          data.aggregateRating = {
            '@type': 'AggregateRating',
            'ratingValue': promedioGlobal,
            'reviewCount': String(n),
            'bestRating': '5',
            'worstRating': '1'
          };
          s.textContent = JSON.stringify(data);
        }
      });
    } catch (e) {}

    // Hasta 3 mas recientes con texto (el API ya las devuelve ordenadas)
    var conTexto = reviews.filter(function (r) {
      return r.resenaPublica && r.resenaPublica.trim().length > 0;
    });
    var previews = conTexto.slice(0, 3);

    /* ── Cards inline ─────────────────────────────────────── */
    var cardsHtml = '';
    if (previews.length > 0) {
      var items = previews.map(function (r) {
        var texto = r.resenaPublica.trim();
        var cortado = texto.length > 200 ? texto.slice(0, 197) + '…' : texto;
        return (
          '<div class="resena-preview-card">' +
            '<p class="rpc-texto">"' + escHtml(cortado) + '"</p>' +
            '<div class="rpc-footer">' +
              '<span class="rpc-autor">— ' + escHtml(r.guestName) + '</span>' +
              '<span class="rpc-stars">' + starsText(Math.round(parseFloat(calcPromedio(r)))) + '</span>' +
              '<span class="rpc-mes">' + formatMonth(r.month) + '</span>' +
            '</div>' +
          '</div>'
        );
      }).join('');
      cardsHtml = '<div class="resenas-preview-lista">' + items + '</div>';
    }

    // Boton: solo si hay mas de 3 resenas (o siempre para coherencia)
    var btnHtml = '<button class="btn-ver-resenas">Ver todas las experiencias →</button>';

    /* ── Seccion ──────────────────────────────────────────── */
    var seccion = document.createElement('div');
    seccion.className = 'unidad-resenas';
    seccion.innerHTML =
      '<h2>Experiencias</h2>' +
      '<div class="resenas-summary">' +
        '<div class="resenas-rating-pill">⭐ ' + promedioGlobal + '</div>' +
        '<div class="resenas-rating-info">' +
          '<strong>' + starsText(starsGlobal) + '</strong>' +
          label +
        '</div>' +
      '</div>' +
      cardsHtml +
      btnHtml;

    // Insertar DESPUES del mapa (con hr separador)
    var mapa = document.querySelector('.unidad-mapa');
    if (mapa) {
      var hr = document.createElement('hr');
      hr.className = 'unidad-divider';
      mapa.after(hr);
      hr.after(seccion);
    } else {
      // Fallback: despues de amenities si no hay mapa
      var amenities = document.querySelector('.unidad-amenities');
      if (amenities) {
        var hr2 = document.createElement('hr');
        hr2.className = 'unidad-divider';
        amenities.after(hr2);
        hr2.after(seccion);
      }
    }

    /* ── Backdrop ─────────────────────────────────────────── */
    var backdrop = document.createElement('div');
    backdrop.className = 'resenas-backdrop';
    backdrop.addEventListener('click', closeDrawer);
    document.body.appendChild(backdrop);

    /* ── Drawer ───────────────────────────────────────────── */
    var drawer = document.createElement('div');
    drawer.className = 'resenas-drawer';

    var cardsHtml = reviews.map(function (r) {
      var prom = calcPromedio(r);
      var textoHtml = r.resenaPublica && r.resenaPublica.trim()
        ? '<p class="resenas-texto">"' + escHtml(r.resenaPublica.trim()) + '"</p>'
        : '';
      return (
        '<div class="resenas-card">' +
          '<div class="resenas-card-top">' +
            '<strong>' + escHtml(r.guestName) + '</strong>' +
            '<span class="resenas-via">' + escHtml(r.via || 'Directa') + '</span>' +
          '</div>' +
          '<div class="resenas-cats">' +
            '<span class="resenas-cat"><span class="star">★</span>Comunicación&nbsp;' + r.comunicacionStars + '</span>' +
            '<span class="resenas-cat"><span class="star">★</span>Limpieza&nbsp;' + r.limpiezaStars + '</span>' +
            '<span class="resenas-cat"><span class="star">★</span>Lugar&nbsp;' + r.lugarStars + '</span>' +
            '<span class="resenas-promedio-badge">⭐ ' + prom + '</span>' +
          '</div>' +
          textoHtml +
          '<small class="resenas-fecha">' + formatMonth(r.month) + '</small>' +
        '</div>'
      );
    }).join('');

    drawer.innerHTML =
      '<div class="resenas-drawer-header">' +
        '<h3>⭐ Experiencias (' + reviews.length + ')</h3>' +
        '<button class="resenas-close" aria-label="Cerrar">✕</button>' +
      '</div>' +
      '<div class="resenas-drawer-body">' +
        cardsHtml +
        '<a href="experiencia.html" class="btn-dejar-resena">✍️ Dejá tu experiencia</a>' +
      '</div>';

    drawer.querySelector('.resenas-close').addEventListener('click', closeDrawer);
    document.body.appendChild(drawer);

    /* ── Abrir / cerrar ───────────────────────────────────── */
    seccion.querySelector('.btn-ver-resenas').addEventListener('click', openDrawer);

    function openDrawer() {
      backdrop.classList.add('active');
      drawer.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    function closeDrawer() {
      backdrop.classList.remove('active');
      drawer.classList.remove('active');
      document.body.style.overflow = '';
    }

    // ESC para cerrar
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });
  }

})();
