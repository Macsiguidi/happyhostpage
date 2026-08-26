/* =====================================================================
   fuera-de-servicio.js — cartel "Fuera de servicio" + desenfoque
   ---------------------------------------------------------------------
   Si la propiedad de esta página está marcada como NO visible en el panel
   (Panel → Alojamientos → interruptor "Visible en web"), la página se ve
   borrosa y muestra un cartel de "Fuera de servicio". Se controla 100%
   desde el sistema: al volver a marcarla visible, el cartel desaparece.

   Uso: en el <body> de la página poner  data-slug="paisajismo"  e incluir
   este script:  <script src="fuera-de-servicio.js"></script>
   ===================================================================== */
(async function () {
  'use strict';

  const API_SISTEMA = 'https://propietarios-happy-host.onrender.com';
  const slug = (document.body?.dataset?.slug || '').trim().toLowerCase();
  if (!slug) return;

  // Consultar al sistema qué propiedades están ocultas
  let ocultas = new Set();
  try {
    const r = await fetch(`${API_SISTEMA}/api/properties/ocultas`);
    if (r.ok) {
      const o = await r.json();
      ocultas = new Set((o.slugs || []).map(s => String(s).toLowerCase()));
    }
  } catch { return; }   // si el panel no responde, no tocamos la página

  if (!ocultas.has(slug)) return;   // visible → no hacemos nada

  // ── Está oculta: desenfocar la página y mostrar el cartel ──────────
  const style = document.createElement('style');
  style.textContent = `
    .hh-oos-blur { filter: blur(9px); pointer-events: none; user-select: none; }
    html.hh-oos-lock, html.hh-oos-lock body { overflow: hidden !important; }
    .hh-oos-overlay {
      position: fixed; inset: 0; z-index: 999999;
      display: flex; align-items: center; justify-content: center;
      background: rgba(20, 28, 24, 0.55);
      -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px);
      padding: 24px; text-align: center;
    }
    .hh-oos-card {
      background: #ffffff; color: #1f2a24;
      max-width: 420px; width: 100%;
      border-radius: 18px; padding: 34px 28px;
      box-shadow: 0 20px 60px rgba(0,0,0,.35);
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    }
    .hh-oos-emoji { font-size: 42px; line-height: 1; margin-bottom: 12px; }
    .hh-oos-card h2 { margin: 0 0 8px; font-size: 22px; font-weight: 700; }
    .hh-oos-card p  { margin: 0 0 20px; font-size: 15px; color: #55635b; line-height: 1.5; }
    .hh-oos-btn {
      display: inline-block; text-decoration: none;
      background: #2f6f4f; color: #fff;
      padding: 12px 22px; border-radius: 999px;
      font-size: 15px; font-weight: 600;
    }
  `;
  document.head.appendChild(style);

  // Desenfocar todo lo que ya está en el body (el overlay se agrega después,
  // así que no recibe la clase y queda nítido)
  Array.from(document.body.children).forEach(el => el.classList.add('hh-oos-blur'));
  document.documentElement.classList.add('hh-oos-lock');

  const overlay = document.createElement('div');
  overlay.className = 'hh-oos-overlay';
  overlay.innerHTML = `
    <div class="hh-oos-card" role="alert" aria-live="assertive">
      <div class="hh-oos-emoji">🛠️</div>
      <h2>Fuera de servicio</h2>
      <p>Esta unidad no está disponible por el momento. Escribinos y te ayudamos a encontrar otra opción.</p>
      <a class="hh-oos-btn" href="alojamientos.html">Ver otros alojamientos</a>
    </div>`;
  document.body.appendChild(overlay);
})();
