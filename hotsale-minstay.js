/* Regla temporal Hot Sale: minimo 4 noches en propiedades seleccionadas. */
(function () {
  'use strict';

  const HOTSALE_START = '2026-05-11';
  const HOTSALE_END = '2026-05-13';
  const HOTSALE_MIN_STAY = 4;
  const AFFECTED_PROPS = new Set(['nilidas', 'gurisa', 'refugiopatagonico']);

  function todayArgentinaDate() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());

    const byType = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${byType.year}-${byType.month}-${byType.day}`;
  }

  function isActive(dateStr) {
    const today = dateStr || todayArgentinaDate();
    return today >= HOTSALE_START && today <= HOTSALE_END;
  }

  function isAffected(slug) {
    return AFFECTED_PROPS.has(String(slug || '').toLowerCase());
  }

  function getMinStay(slug, defaultMinStay) {
    const baseMin = Number.isFinite(defaultMinStay) ? defaultMinStay : 0;
    if (!isActive() || !isAffected(slug)) return baseMin;
    return Math.max(baseMin, HOTSALE_MIN_STAY);
  }

  function blocksStay(slug, nights) {
    return isAffected(slug) && isActive() && Number(nights) < HOTSALE_MIN_STAY;
  }

  window.hhHotSaleMinStay = {
    isActive,
    isAffected,
    getMinStay,
    blocksStay,
    minStay: HOTSALE_MIN_STAY
  };
})();
