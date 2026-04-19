/**
 * moneda.js — Motor de moneda configurable para Happy Host
 *
 * Expone: window.hhMoneda
 *   .detectar(checkinStr, propSlug?)  → { moneda: 'ARS'|'USD', factorARS: number }
 *   .ready                            → Promise que resuelve cuando las reglas están cargadas
 *
 * Las reglas se obtienen desde /api/config-moneda (Node server) y se cachean
 * en localStorage 30 minutos para no hacer una petición por cada interacción.
 */
(function () {
  'use strict';

  const API_URL   = 'https://disponibilidad-happy-host-patagonia.onrender.com/api/config-moneda';
  const CACHE_KEY = 'hhMonedaRules';
  const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

  // ── Helpers de fecha ──────────────────────────────────────────────
  function parseDate(s) {
    if (!s) return null;
    const [y, m, d] = s.split('-').map(Number);
    return isNaN(y) ? null : new Date(y, m - 1, d);
  }

  // ── Cargar reglas (con caché) ─────────────────────────────────────
  async function loadRules() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { expira, rules } = JSON.parse(cached);
        if (expira > Date.now() && Array.isArray(rules) && rules.length > 0) {
          return rules;
        }
      }
    } catch {}

    try {
      const r     = await fetch(API_URL);
      const rules = await r.json();
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        expira: Date.now() + CACHE_TTL,
        rules
      }));
      return rules;
    } catch (e) {
      console.warn('hhMoneda: no se pudo cargar config-moneda, usando fallback', e.message);
      return null; // fallback en detectar()
    }
  }

  // ── Detectar moneda desde un array de reglas ──────────────────────
  function detectarConReglas(rules, checkinStr, propSlug) {
    const fecha = parseDate(checkinStr);
    if (!fecha) return { moneda: 'USD', factorARS: 1 };

    // Filtrar reglas aplicables
    const aplicables = (rules || []).filter(r => {
      const from = parseDate(r.from);
      const to   = parseDate(r.to);
      if (!from || !to) return false;
      const enRango = fecha >= from && fecha <= to;
      const enProp  = !r.propertySlugs || !r.propertySlugs.trim() ||
                      r.propertySlugs.split(',').map(s => s.trim().toLowerCase())
                                     .includes((propSlug || '').toLowerCase());
      return enRango && enProp;
    });

    if (!aplicables.length) {
      // Sin regla: fallback inteligente (ARS hasta mayo 2026, USD después)
      const limite = new Date(2026, 4, 31);
      if (fecha <= limite) return { moneda: 'ARS', factorARS: 1600 };
      return { moneda: 'USD', factorARS: 1 };
    }

    // Tomar la de mayor prioridad (ya viene ordenada por el servidor, pero re-ordenamos por seguridad)
    aplicables.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    const winner = aplicables[0];

    return {
      moneda:    winner.currency === 'ARS' ? 'ARS' : 'USD',
      factorARS: winner.currency === 'ARS' ? (winner.fxRate || 1600) : 1
    };
  }

  // ── Promesa de inicialización ─────────────────────────────────────
  let _rules = null;
  const _ready = loadRules().then(r => { _rules = r; });

  // ── API pública ───────────────────────────────────────────────────
  window.hhMoneda = {
    /**
     * Espera a que las reglas estén listas y devuelve la moneda para ese check-in.
     * @param {string} checkinStr  - "YYYY-MM-DD"
     * @param {string} [propSlug]  - ej. "calafate1"
     * @returns {Promise<{moneda: string, factorARS: number}>}
     */
    detectar: async function (checkinStr, propSlug) {
      await _ready;
      return detectarConReglas(_rules, checkinStr, propSlug);
    },

    /**
     * Versión síncrona (solo después de que ready haya resuelto).
     * Útil dentro de cálculos que ya están dentro de un await hhMoneda.ready.
     */
    detectarSync: function (checkinStr, propSlug) {
      return detectarConReglas(_rules, checkinStr, propSlug);
    },

    /** Promise que resuelve cuando las reglas están listas. */
    ready: _ready,

    /** Forzar recarga (invalida caché) */
    recargar: function () {
      localStorage.removeItem(CACHE_KEY);
      return loadRules().then(r => { _rules = r; });
    }
  };
})();
