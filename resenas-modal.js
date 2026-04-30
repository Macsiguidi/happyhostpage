/**
 * resenas-modal.js
 * Carga las reseñas aprobadas para la propiedad actual y:
 *  - Muestra el botón "Ver experiencias" debajo de .unidad-desc (solo si hay reseñas)
 *  - Abre un drawer lateral con las reseñas al hacer click
 */
(function () {
  var API  = 'https://propietarios-happy-host.onrender.com/api/reviews/approved';
  var slug = window.location.pathname.split('/').pop().replace('.html', '').toLowerCase();

  var validSlugs = [
    'calafate1','calafate2','calafate3','calafate4','calafate5','calafate6','calafate7',
    'cruz4','cruz5','nilidas','gurisa','paisajismo','refugiopatagonico','mitiempo','koi','oasis'
  ];
  if (!validSlugs.includes(slug)) return;

  // ── Estilos ────────────────────────────────────────────────────────────
  var css = `
    .btn-ver-resenas {
      display: inline-flex; align-items: center; gap: 8px;
      margin-top: 14px;
      padding: 11px 20px;
      background: #fff;
      border: 1.5px solid #6B7D5C;
      border-radius: 50px;
      font-family: 'Inter', sans-serif;
      font-size: .88rem; font-weight: 600;
      color: #2F3E2F;
      cursor: pointer;
      transition: background .2s, color .2s;
    }
    .btn-ver-resenas:hover { background: #6B7D5C; color: #fff; }

    .resenas-backdrop {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,.45); z-index: 1100;
      opacity: 0; transition: opacity .3s;
    }
    .resenas-backdrop.active { display: block; opacity: 1; }

    .resenas-drawer {
      position: fixed; top: 0; right: -100%; width: min(440px, 100vw);
      height: 100%; background: #fff;
      box-shadow: -4px 0 32px rgba(0,0,0,.15);
      z-index: 1101; display: flex; flex-direction: column;
      transition: right .35s cubic-bezier(.4,0,.2,1);
      border-radius: 16px 0 0 16px;
    }
    .resenas-drawer.active { right: 0; }

    .resenas-drawer-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px 16px;
      border-bottom: 1px solid #e8e4de;
      flex-shrink: 0;
    }
    .resenas-drawer-header h3 {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 1.1rem; font-weight: 700; color: #2F3E2F; margin: 0;
    }
    .resenas-close {
      width: 32px; height: 32px; border: none; background: #f0ede8;
      border-radius: 50%; font-size: 1.2rem; cursor: pointer; color: #2F3E2F;
      display: flex; align-items: center; justify-content: center;
      transition: background .2s;
    }
    .resenas-close:hover { background: #dedad3; }

    .resenas-drawer-body {
      flex: 1; overflow-y: auto; padding: 20px 24px 24px;
      display: flex; flex-direction: column; gap: 16px;
    }

    .resenas-card {
      background: #f9f7f4; border-radius: 12px; padding: 16px;
    }
    .resenas-card-top {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 8px;
    }
    .resenas-card-top strong { font-size: .95rem; color: #2F3E2F; }
    .resenas-via {
      font-size: .72rem; font-weight: 600; background: #eef3e9;
      color: #556349; padding: 2px 8px; border-radius: 20px;
    }
    .resenas-stars {
      display: flex; gap: 12px; flex-wrap: wrap;
      font-size: .8rem; color: #6a7a6a; margin-bottom: 8px;
    }
    .resenas-stars span { display: flex; align-items: center; gap: 3px; }
    .resenas-stars .star-filled { color: #f5a623; }
    .resenas-promedio { margin-left: auto; font-size: .88rem; color: #2F3E2F; font-weight: 700; }
    .resenas-texto {
      font-size: .88rem; color: #2F3E2F; line-height: 1.55;
      margin: 6px 0 4px; font-style: italic;
    }
    .resenas-fecha { font-size: .72rem; color: #9aaa9a; }

    .btn-dejar-resena {
      display: block; text-align: center;
      margin-top: 8px; padding: 13px;
      background: #6B7D5C; color: #fff;
      border-radius: 12px; text-decoration: none;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: .9rem; font-weight: 700;
      transition: background .2s;
    }
    .btn-dejar-resena:hover { background: #556349; }
  `;
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ── Helpers ────────────────────────────────────────────────────────────
  function starsHtml(n) {
    var s = '';
    for (var i = 1; i <= 5; i++) {
      s += i <= n
        ? '<span class="star-filled">★</span>'
        : '<span style="color:#ddd">☆</span>';
    }
    return s;
  }

  function formatMonth(m) {
    if (!m) return '';
    var parts = m.split('-');
    var months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return months[parseInt(parts[1],10)-1] + ' ' + parts[0];
  }

  // ── Fetch reseñas ──────────────────────────────────────────────────────
  fetch(API + '?slug=' + encodeURIComponent(slug))
    .then(function (r) { return r.json(); })
    .then(function (reviews) {
      if (!reviews || reviews.length === 0) return;
      init(reviews);
    })
    .catch(function () {});

  function init(reviews) {
    // ── Botón ──────────────────────────────────────────────────────
    var btn = document.createElement('button');
    btn.className = 'btn-ver-resenas';
    btn.innerHTML = '⭐ Ver experiencias (' + reviews.length + ')';
    btn.addEventListener('click', openDrawer);

    var desc = document.querySelector('.unidad-desc');
    if (desc) desc.after(btn);

    // ── Backdrop ───────────────────────────────────────────────────
    var backdrop = document.createElement('div');
    backdrop.className = 'resenas-backdrop';
    backdrop.addEventListener('click', closeDrawer);
    document.body.appendChild(backdrop);

    // ── Drawer ─────────────────────────────────────────────────────
    var drawer = document.createElement('div');
    drawer.className = 'resenas-drawer';

    var cardsHtml = reviews.map(function (r) {
      return (
        '<div class="resenas-card">' +
          '<div class="resenas-card-top">' +
            '<strong>' + escHtml(r.guestName) + '</strong>' +
            '<span class="resenas-via">' + escHtml(r.via) + '</span>' +
          '</div>' +
          '<div class="resenas-stars">' +
            '<span>💬 ' + starsHtml(r.comunicacionStars) + '</span>' +
            '<span>🧹 ' + starsHtml(r.limpiezaStars) + '</span>' +
            '<span>📍 ' + starsHtml(r.lugarStars) + '</span>' +
            '<span class="resenas-promedio">⭐ ' + r.promedio + '</span>' +
          '</div>' +
          (r.resenaPublica
            ? '<p class="resenas-texto">"' + escHtml(r.resenaPublica) + '"</p>'
            : '') +
          '<small class="resenas-fecha">' + formatMonth(r.month) + '</small>' +
        '</div>'
      );
    }).join('');

    drawer.innerHTML =
      '<div class="resenas-drawer-header">' +
        '<h3>⭐ Experiencias (' + reviews.length + ')</h3>' +
        '<button class="resenas-close" aria-label="Cerrar">×</button>' +
      '</div>' +
      '<div class="resenas-drawer-body">' +
        cardsHtml +
        '<a href="experiencia.html" class="btn-dejar-resena">✍️ Dejar mi experiencia</a>' +
      '</div>';

    drawer.querySelector('.resenas-close').addEventListener('click', closeDrawer);
    document.body.appendChild(drawer);

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
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
})();
