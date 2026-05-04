/* =====================================================================
   huespedes.js — Selector de huéspedes con desglose Adultos/Niños/Bebés
   HH.HuespedesSelector(options)

   options:
     container  HTMLElement  donde montar el componente
     maxGuests  Number       máx adultos+niños (bebés no cuentan, default 10)
     adultos    Number       valor inicial (default 1)
     ninos      Number       valor inicial (default 0)
     bebes      Number       valor inicial (default 0)
     dark       Boolean      usar variante oscura (booking card)
     modal      Boolean      abrir como overlay centrado (buscador de página)
     onChange   Function     callback({ adultos, ninos, bebes, total, resumen })
                             total = adultos+niños  (para precio / capacidad)

   Bebés (0-2 años): no se cobran y no cuentan para capacidad máxima.
   ===================================================================== */
(function () {
  'use strict';

  function HuespedesSelector(opts) {
    this._max   = opts.maxGuests || 10;
    this._a     = Math.max(1, opts.adultos || 1);
    this._n     = opts.ninos  || 0;
    this._b     = opts.bebes  || 0;
    this._cb    = opts.onChange || function () {};
    this._dark  = !!opts.dark;
    this._modal = !!opts.modal;
    this._init(opts.container);
  }

  // ── getters ────────────────────────────────────────────────────────
  Object.defineProperties(HuespedesSelector.prototype, {
    adultos: { get: function () { return this._a; } },
    ninos:   { get: function () { return this._n; } },
    bebes:   { get: function () { return this._b; } },
    total:   { get: function () { return this._a + this._n; } },
    todos:   { get: function () { return this._a + this._n + this._b; } },
    resumen: { get: function () {
      var p = [];
      if (this._a) p.push(this._a + ' adulto' + (this._a > 1 ? 's' : ''));
      if (this._n) p.push(this._n + ' niño'   + (this._n > 1 ? 's' : ''));
      if (this._b) p.push(this._b + ' bebé'   + (this._b > 1 ? 's' : ''));
      return p.join(', ') || 'Agregar';
    }},
  });

  // ── render ─────────────────────────────────────────────────────────
  HuespedesSelector.prototype._init = function (container) {
    this._wrap = document.createElement('div');
    this._wrap.className = 'hh-hu' + (this._dark ? ' hh-hu--dark' : '');

    var panelHTML =
      '<div class="hh-hu__panel" role="listbox" hidden>' +
        (this._modal ? '<div class="hh-hu__modal-header"><span class="hh-hu__modal-title">Huéspedes</span></div>' : '') +
        this._rowHTML('adultos', 'Adultos',  '15 años en adelante') +
        this._rowHTML('ninos',   'Niños',    'De 2 a 15 años') +
        this._rowHTML('bebes',   'Bebés',    'Menores de 2 años · sin cargo') +
        '<div class="hh-hu__footer">' +
          '<button type="button" class="hh-hu__done">Listo ✓</button>' +
        '</div>' +
      '</div>';

    this._wrap.innerHTML =
      '<button type="button" class="hh-hu__trigger" aria-haspopup="listbox" aria-expanded="false">' +
        '<span class="hh-hu__val">Agregar</span>' +
        '<svg class="hh-hu__chev" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 10 13 16 7"/></svg>' +
      '</button>' +
      (!this._modal ? panelHTML : '');  // en modo dropdown, el panel va dentro del wrap

    container.innerHTML = '';
    container.appendChild(this._wrap);

    this._valEl  = this._wrap.querySelector('.hh-hu__val');
    this._trigEl = this._wrap.querySelector('.hh-hu__trigger');

    if (this._modal) {
      // Crear overlay a nivel de body
      this._overlay = document.createElement('div');
      this._overlay.className = 'hh-hu__overlay';
      this._overlay.setAttribute('hidden', '');

      // Insertar el panel dentro del overlay
      var tmp = document.createElement('div');
      tmp.innerHTML = panelHTML;
      this._panel = tmp.firstElementChild;
      this._panel.removeAttribute('hidden');  // visible dentro del overlay
      this._overlay.appendChild(this._panel);
      document.body.appendChild(this._overlay);
    } else {
      this._panel = this._wrap.querySelector('.hh-hu__panel');
    }

    this._bindEvents();
    this._refresh();
  };

  HuespedesSelector.prototype._rowHTML = function (cat, label, age) {
    return (
      '<div class="hh-hu__row">' +
        '<div class="hh-hu__info">' +
          '<span class="hh-hu__tipo">' + label + '</span>' +
          '<span class="hh-hu__edad">' + age   + '</span>' +
        '</div>' +
        '<div class="hh-hu__cnt">' +
          '<button type="button" class="hh-hu__btn hh-hu__btn--m" data-cat="' + cat + '" aria-label="Quitar">−</button>' +
          '<span class="hh-hu__num" data-cat="' + cat + '">0</span>' +
          '<button type="button" class="hh-hu__btn hh-hu__btn--p" data-cat="' + cat + '" aria-label="Agregar">+</button>' +
        '</div>' +
      '</div>'
    );
  };

  // ── state ──────────────────────────────────────────────────────────
  HuespedesSelector.prototype._refresh = function () {
    var self = this;
    var vals = { adultos: this._a, ninos: this._n, bebes: this._b };
    ['adultos', 'ninos', 'bebes'].forEach(function (cat) {
      var num  = self._panel.querySelector('.hh-hu__num[data-cat="' + cat + '"]');
      var btnM = self._panel.querySelector('.hh-hu__btn--m[data-cat="' + cat + '"]');
      var btnP = self._panel.querySelector('.hh-hu__btn--p[data-cat="' + cat + '"]');
      if (num)  num.textContent = vals[cat];
      if (btnM) btnM.disabled = (cat === 'adultos') ? self._a <= 1 : vals[cat] <= 0;
      if (btnP) btnP.disabled = (cat !== 'bebes') && (self.total >= self._max);
    });
    this._valEl.textContent = this.resumen;
    this._cb({ adultos: this._a, ninos: this._n, bebes: this._b, total: this.total, todos: this.todos, resumen: this.resumen });
  };

  // ── open / close ───────────────────────────────────────────────────
  HuespedesSelector.prototype.open = function () {
    if (this._modal) {
      this._overlay.removeAttribute('hidden');
      document.body.style.overflow = 'hidden';
    } else {
      this._panel.hidden = false;
    }
    this._trigEl.setAttribute('aria-expanded', 'true');
    this._trigEl.classList.add('hh-hu__trigger--open');
  };
  HuespedesSelector.prototype.close = function () {
    if (this._modal) {
      this._overlay.setAttribute('hidden', '');
      document.body.style.overflow = '';
    } else {
      this._panel.hidden = true;
    }
    this._trigEl.setAttribute('aria-expanded', 'false');
    this._trigEl.classList.remove('hh-hu__trigger--open');
  };

  // ── events ─────────────────────────────────────────────────────────
  HuespedesSelector.prototype._bindEvents = function () {
    var self = this;

    this._trigEl.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = self._modal
        ? !self._overlay.hasAttribute('hidden')
        : !self._panel.hidden;
      isOpen ? self.close() : self.open();
    });

    // Botón Listo
    this._panel.querySelector('.hh-hu__done').addEventListener('click', function () {
      self.close();
    });

    // Botones −
    this._panel.querySelectorAll('.hh-hu__btn--m').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var cat = btn.dataset.cat;
        if (cat === 'adultos' && self._a > 1) self._a--;
        else if (cat === 'ninos'  && self._n > 0) self._n--;
        else if (cat === 'bebes'  && self._b > 0) self._b--;
        self._refresh();
      });
    });

    // Botones +
    this._panel.querySelectorAll('.hh-hu__btn--p').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var cat = btn.dataset.cat;
        if (cat !== 'bebes' && self.total >= self._max) return;
        if (cat === 'adultos') self._a++;
        else if (cat === 'ninos') self._n++;
        else if (cat === 'bebes') self._b++;
        self._refresh();
      });
    });

    if (this._modal) {
      // Click en el backdrop (overlay) cierra el modal
      this._overlay.addEventListener('click', function (e) {
        if (e.target === self._overlay) self.close();
      });
    } else {
      // Cerrar al hacer click fuera (dropdown)
      document.addEventListener('click', function () { self.close(); });
    }

    // Cerrar con Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') self.close();
    });
  };

  // ── export ─────────────────────────────────────────────────────────
  window.HH = window.HH || {};
  window.HH.HuespedesSelector = HuespedesSelector;
})();
