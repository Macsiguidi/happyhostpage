/**
 * nav-mobile.js — mejoras móviles para Happy Host Patagonia
 * 1. Hamburger menu en .header-aloj
 * 2. Carrusel de galería con flechas y swipe táctil
 */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════
     1. HAMBURGER MENU
  ══════════════════════════════════════════════════════ */
  function initHamburger() {
    const headerInner = document.querySelector('.header-inner');
    const menuOrig    = document.querySelector('.menu-aloj');
    if (!headerInner || !menuOrig || headerInner.querySelector('.hamburger-btn')) return;

    /* Botón ☰ */
    const btn = document.createElement('button');
    btn.className = 'hamburger-btn';
    btn.setAttribute('aria-label', 'Abrir menú');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span></span><span></span><span></span>';
    headerInner.appendChild(btn);

    /* Overlay lateral */
    const overlay = document.createElement('div');
    overlay.className = 'mob-menu-overlay';
    const nav = document.createElement('nav');
    nav.className = 'mob-menu-nav';
    nav.innerHTML = menuOrig.innerHTML;
    overlay.appendChild(nav);
    document.body.appendChild(overlay);

    function openMenu() {
      overlay.classList.add('open');
      btn.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
    function closeMenu() {
      overlay.classList.remove('open');
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    btn.addEventListener('click', function () {
      overlay.classList.contains('open') ? closeMenu() : openMenu();
    });

    /* Cerrar al hacer click fuera del panel */
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeMenu();
    });

    /* Cerrar al hacer click en un enlace del menú */
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });
  }

  /* ══════════════════════════════════════════════════════
     2. GALERÍA MÓVIL CON FLECHAS Y SWIPE
  ══════════════════════════════════════════════════════ */
  function initMobileGallery() {
    if (window.innerWidth > 768) return;

    const grid = document.querySelector('.galeria-grid');
    if (!grid) return;

    /* Recopilar todas las imágenes */
    const imgs = [];
    const mainEl  = grid.querySelector('.galeria-main');
    const mainImg = mainEl && mainEl.querySelector('img');
    if (!mainImg) return;

    imgs.push({ src: mainImg.src, alt: mainImg.alt });
    grid.querySelectorAll('.galeria-thumbs img, .galeria-ver-mas img').forEach(function (img) {
      imgs.push({ src: img.src, alt: img.alt });
    });

    if (imgs.length <= 1) return;

    let current = 0;

    /* Flechas */
    const prevBtn = document.createElement('button');
    prevBtn.className = 'gal-mob-btn gal-mob-prev';
    prevBtn.innerHTML = '&#10094;';
    prevBtn.setAttribute('aria-label', 'Foto anterior');

    const nextBtn = document.createElement('button');
    nextBtn.className = 'gal-mob-btn gal-mob-next';
    nextBtn.innerHTML = '&#10095;';
    nextBtn.setAttribute('aria-label', 'Foto siguiente');

    /* Contador */
    const counter = document.createElement('div');
    counter.className = 'gal-mob-counter';

    mainEl.appendChild(prevBtn);
    mainEl.appendChild(nextBtn);
    mainEl.appendChild(counter);

    function goTo(idx) {
      current = (idx + imgs.length) % imgs.length;
      mainImg.src = imgs[current].src;
      mainImg.alt = imgs[current].alt;
      counter.textContent = (current + 1) + ' / ' + imgs.length;
    }

    goTo(0);

    prevBtn.addEventListener('click', function (e) { e.stopPropagation(); goTo(current - 1); });
    nextBtn.addEventListener('click', function (e) { e.stopPropagation(); goTo(current + 1); });

    /* Swipe táctil */
    let startX = 0;
    mainEl.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
    }, { passive: true });
    mainEl.addEventListener('touchend', function (e) {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) {
        goTo(diff > 0 ? current + 1 : current - 1);
      }
    }, { passive: true });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initHamburger();
    initMobileGallery();
  });
})();
