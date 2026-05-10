(function () {
  const popup = document.getElementById('hotsalePopup');
  if (!popup) return;

  const storageKey = 'hh_hotsale_2026_dismissed';
  const now = new Date();
  const start = new Date(2026, 4, 11, 0, 0, 0, 0);
  const end = new Date(2026, 4, 13, 23, 59, 59, 999);
  const isActive = now >= start && now <= end;

  if (!isActive || localStorage.getItem(storageKey) === '1') return;

  const showPopup = () => {
    popup.classList.add('is-visible');
    popup.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closePopup = () => {
    localStorage.setItem(storageKey, '1');
    popup.classList.remove('is-visible');
    popup.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  popup.querySelectorAll('[data-hotsale-close]').forEach((button) => {
    button.addEventListener('click', closePopup);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && popup.classList.contains('is-visible')) {
      closePopup();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showPopup, { once: true });
  } else {
    showPopup();
  }
})();
