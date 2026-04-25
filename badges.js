/**
 * badges.js — conecta el panel de propietarios con el website.
 * Reemplaza los badges hardcodeados por los configurados en el panel admin.
 *
 * Cubre:
 *  - alojamientos.html  → .card[data-nombre] .card-badge-logo
 *  - viajero.html       → .card[data-nombre] .badge-destacado img
 *  - páginas de unidad  → .unidad-award-badge  (o la inyecta antes de <h2>Sobre esta propiedad</h2>)
 */
(function () {
  'use strict';

  const API_URL    = 'https://propietarios-happy-host.onrender.com/api/badges';
  const ICONS_BASE = 'iconos/';

  // Slugs HTML → slug de la API (cuando difieren)
  const SLUG_MAP = {
    'cruzdelsur4': 'cruz4',
    'cruzdelsur5': 'cruz5',
    'refugio':     'refugiopatagonico',
  };

  function toApiSlug(nombre) {
    return SLUG_MAP[nombre] || nombre;
  }

  // Slug de la página actual (ej: "calafate1", "cruz4")
  function pageSlug() {
    const file = (location.pathname.split('/').pop() || '').replace('.html', '');
    return toApiSlug(file);
  }

  // ── 1. Cards de alojamientos.html ─────────────────────────────────────────
  function updateCards(badges) {
    document.querySelectorAll('.card[data-nombre]').forEach(function (card) {
      const slug = toApiSlug(card.dataset.nombre);
      const data = badges[slug];

      let img = card.querySelector('.card-badge-logo');

      if (data) {
        if (!img) {
          img = document.createElement('img');
          img.className = 'card-badge-logo';
          const carousel = card.querySelector('.carousel');
          if (carousel) carousel.appendChild(img);
        }
        img.src   = ICONS_BASE + data.file;
        img.alt   = data.alt;
        img.style.display = '';
      } else if (img) {
        // No hay badge en el panel → ocultar
        img.style.display = 'none';
      }
    });
  }

  // ── 2. Cards del destacados (viajero.html) ────────────────────────────────
  function updateDestacados(badges) {
    document.querySelectorAll('.card[data-nombre] .badge-destacado').forEach(function (div) {
      const card = div.closest('[data-nombre]');
      if (!card) return;
      const slug = toApiSlug(card.dataset.nombre);
      const data = badges[slug];
      const img  = div.querySelector('img');

      if (data && img) {
        img.src  = ICONS_BASE + data.file;
        img.alt  = data.alt;
        div.style.display = '';
      } else if (div) {
        div.style.display = 'none';
      }
    });
  }

  // ── 3. Página de unidad individual ────────────────────────────────────────
  function updateUnitPage(badges) {
    const slug = pageSlug();
    const data = badges[slug];

    let badgeImg = document.querySelector('.unidad-award-badge');

    if (data) {
      if (!badgeImg) {
        // Inyectar antes de <h2>Sobre esta propiedad</h2>
        const h2 = Array.from(document.querySelectorAll('h2'))
                        .find(el => el.textContent.trim().startsWith('Sobre esta'));
        if (h2) {
          badgeImg = document.createElement('img');
          badgeImg.className = 'unidad-award-badge';
          h2.parentNode.insertBefore(badgeImg, h2);
        }
      }
      if (badgeImg) {
        badgeImg.src   = ICONS_BASE + data.file;
        badgeImg.alt   = data.alt;
        badgeImg.style.display = '';
      }
    } else if (badgeImg) {
      badgeImg.style.display = 'none';
    }
  }

  // ── Main — con reintentos para Render free tier (cold start ~30s) ───────────
  async function fetchBadgesWithRetry(maxAttempts, delayMs) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const resp = await fetch(API_URL, { signal: AbortSignal.timeout(15000) });
        if (resp.ok) {
          const data = await resp.json();
          console.log('[badges.js] API OK →', JSON.stringify(data));
          return data;
        }
        console.warn('[badges.js] intento', i + 1, '→ HTTP', resp.status);
      } catch (err) {
        console.warn('[badges.js] intento', i + 1, '→ error:', err.message || err);
      }
      if (i < maxAttempts - 1) await new Promise(r => setTimeout(r, delayMs));
    }
    console.error('[badges.js] No se pudo obtener badges de la API después de', maxAttempts, 'intentos.');
    return null;
  }

  async function applyBadges() {
    const badges = await fetchBadgesWithRetry(3, 8000);
    if (!badges) return;
    updateCards(badges);
    updateDestacados(badges);
    updateUnitPage(badges);
  }

  // Esperar a que destacados.js haya renderizado (usa DOMContentLoaded → load es posterior)
  window.addEventListener('load', applyBadges);

  // Fallback: MutationObserver para cuando el grid de destacados se rellena después del load
  document.addEventListener('DOMContentLoaded', function () {
    const grid = document.querySelector('#destacados .destacados-grid');
    if (!grid) return;
    new MutationObserver(function () {
      applyBadges();
    }).observe(grid, { childList: true });
  });

})();
