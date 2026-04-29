'use strict';

/* ── Nav mobile hamburger ── */
(function(){
  const btn    = document.getElementById('navHamburger');
  const drawer = document.getElementById('navDrawer');
  if (!btn || !drawer) return;

  btn.addEventListener('click', () => {
    const open = drawer.classList.toggle('open');
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open);
    drawer.setAttribute('aria-hidden', !open);
    document.body.style.overflow = open ? 'hidden' : '';
  });

  document.querySelectorAll('[data-close]').forEach(el => {
    el.addEventListener('click', () => {
      drawer.classList.remove('open');
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', false);
      drawer.setAttribute('aria-hidden', true);
      document.body.style.overflow = '';
    });
  });
})();

/* ── Active nav link en scroll ── */
(function(){
  const sections = document.querySelectorAll('section[id], div[id]');
  const links    = document.querySelectorAll('.nav-links a');
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        const active = [...links].find(l => l.getAttribute('href') === '#' + e.target.id);
        if (active) active.classList.add('active');
      }
    });
  }, { rootMargin: '-30% 0px -65% 0px' });
  sections.forEach(s => io.observe(s));
})();

/* ── WhatsApp float: aparece al scrollear ── */
(function(){
  const wa = document.getElementById('waFloat');
  if (!wa) return;
  let shown = false;
  document.addEventListener('scroll', () => {
    const y = window.scrollY || document.documentElement.scrollTop;
    if (y > 300 && !shown) { wa.style.opacity = '1'; shown = true; }
  }, { passive: true });
  wa.style.opacity = '0';
  wa.style.transition = 'opacity .4s';
})();

/* ── FAQ accordion ── */
(function(){
  document.querySelectorAll('.faq-item').forEach(item => {
    const btn = item.querySelector('.faq-q');
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.faq-q').setAttribute('aria-expanded', false);
      });
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', true);
      }
    });
  });
})();

/* ── Plan selector ── */
(function(){
  const labels = document.querySelectorAll('.opcion-plan');
  labels.forEach(l => {
    l.addEventListener('click', () => {
      const input = document.getElementById(l.getAttribute('for'));
      if (input) input.checked = true;
      labels.forEach(x => x.classList.remove('selected'));
      l.classList.add('selected');
    });
  });
})();

/* ── Datepicker + Timepicker ── */
(function(){
  const inpDia  = document.getElementById('campo-dia');
  const dp      = document.getElementById('dp-dia');
  const hintDia = document.getElementById('hint-dia');
  const inpHora = document.getElementById('campo-hora');
  const tp      = document.getElementById('tp-hora');
  const hintHora= document.getElementById('hint-hora');
  if (!inpDia || !dp || !inpHora || !tp) return;

  const fmt       = d => d.toISOString().slice(0,10);
  const isWeekend = d => [0,6].includes(d.getDay());
  const today     = new Date(); today.setHours(0,0,0,0);
  let view = new Date(); view.setDate(1);

  function renderDP(){
    dp.innerHTML='';
    const head=document.createElement('div'); head.className='dp-header';
    const month=view.toLocaleDateString('es-AR',{month:'long',year:'numeric'});
    head.innerHTML=`<strong style="text-transform:capitalize">${month}</strong>
      <div class="dp-nav">
        <button type="button" class="dp-btn" data-nav="-1">&#8249;</button>
        <button type="button" class="dp-btn" data-nav="1">&#8250;</button>
      </div>`;
    dp.appendChild(head);
    const grid=document.createElement('div'); grid.className='dp-grid';
    ['LU','MA','MI','JU','VI','SA','DO'].forEach(w=>{ const c=document.createElement('div'); c.className='dp-cell dp-wd'; c.textContent=w; grid.appendChild(c); });
    const fd=(view.getDay()+6)%7;
    const dim=new Date(view.getFullYear(),view.getMonth()+1,0).getDate();
    for(let i=0;i<fd;i++){const e=document.createElement('div');e.className='dp-cell';grid.appendChild(e);}
    for(let d=1;d<=dim;d++){
      const date=new Date(view.getFullYear(),view.getMonth(),d);
      const cell=document.createElement('button'); cell.type='button'; cell.className='dp-cell dp-day'; cell.textContent=String(d);
      if(isWeekend(date)||date<today) cell.classList.add('is-disabled');
      if(fmt(date)===fmt(today)) cell.classList.add('is-today');
      cell.addEventListener('click',()=>{
        if(cell.classList.contains('is-disabled')) return;
        inpDia.value=date.toLocaleDateString('es-AR'); inpDia.classList.add('input-ok');
        hintDia.textContent=''; closeAll();
      });
      grid.appendChild(cell);
    }
    dp.appendChild(grid);
    dp.querySelectorAll('.dp-btn').forEach(b=>b.addEventListener('click',()=>{ view.setMonth(view.getMonth()+Number(b.dataset.nav)); renderDP(); }));
  }

  function renderTP(){
    tp.innerHTML='';
    for(let h=9;h<=19;h++){
      const label=(h<10?'0':'')+h+':00';
      const item=document.createElement('button'); item.type='button'; item.className='tp-item'; item.textContent=label;
      item.addEventListener('click',()=>{ inpHora.value=label; inpHora.classList.add('input-ok'); hintHora.textContent=''; closeAll(); });
      tp.appendChild(item);
    }
  }

  const openDate=()=>{ renderDP(); dp.hidden=false; tp.hidden=true; };
  const openTime=()=>{ renderTP(); tp.hidden=false; dp.hidden=true; };
  const closeAll=()=>{ dp.hidden=true; tp.hidden=true; };

  inpDia.addEventListener('click', openDate);
  inpHora.addEventListener('click', openTime);
  document.addEventListener('click', e=>{ if(!e.target.closest('.picker')&&!e.target.closest('.datepicker')&&!e.target.closest('.timepicker')) closeAll(); });
  if(!inpHora.value) inpHora.value='09:00';
})();

/* ── Envío formulario ── */
const form = document.getElementById('form-propietario');
if (form) {
  form.addEventListener('submit', async e => {
    e.preventDefault();

    const nombre  = form.nombre.value.trim();
    const email   = form.email.value.trim();
    const telefono= form.telefono.value.trim();
    const dia     = form.dia.value;
    const hora    = form.hora.value;
    let valid = true;

    if (!nombre) {
      document.getElementById('f-nombre').classList.add('input-err');
      document.getElementById('msg-nombre').classList.add('visible');
      valid = false;
    } else {
      document.getElementById('f-nombre').classList.remove('input-err');
      document.getElementById('msg-nombre').classList.remove('visible');
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      document.getElementById('f-email').classList.add('input-err');
      document.getElementById('msg-email').classList.add('visible');
      valid = false;
    } else {
      document.getElementById('f-email').classList.remove('input-err');
      document.getElementById('msg-email').classList.remove('visible');
    }

    if (!valid) return;

    const m = dia.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) { alert('Elegí un día hábil (lun–vie).'); return; }
    const iso = `${m[3]}-${m[2]}-${m[1]}`;
    const d = new Date(iso+'T00:00:00');
    if ([0,6].includes(d.getDay()) || d < new Date().setHours(0,0,0,0)) {
      alert('Elegí un día hábil (lun–vie).'); return;
    }

    const btn = document.getElementById('btn-submit');
    btn.textContent = 'Enviando…'; btn.disabled = true;

    const datos = {
      nombre, email, telefono, dia: iso, hora,
      plan: document.querySelector('input[name="plan"]:checked')?.value || '',
      mensaje: form.mensaje.value
    };

    try {
      const res  = await fetch('https://disponibilidad-happy-host-patagonia.onrender.com/enviar-formulario-propietario', {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(datos)
      });
      const json = await res.json();
      if (json.status === 'Notificación enviada') {
        flash('✅ Gracias por escribirnos, nos vamos a comunicar con vos muy pronto 🙌');
        form.reset();
        document.querySelectorAll('.opcion-plan').forEach(l => l.classList.remove('selected'));
        document.querySelectorAll('[class*="input-ok"],[class*="input-err"]').forEach(el => el.classList.remove('input-ok','input-err'));
      } else {
        alert('Error al enviar. Intentá por WhatsApp.'); console.error(json);
      }
    } catch(err) {
      console.error(err); alert('Ocurrió un error, intentá por WhatsApp.');
    } finally {
      btn.textContent = 'Enviar consulta'; btn.disabled = false;
    }
  });
}

function flash(texto) {
  const box = document.getElementById('mensaje-flotante');
  const p   = document.getElementById('texto-mensaje');
  p.textContent = texto; box.classList.add('mostrar');
  setTimeout(() => box.classList.remove('mostrar'), 3400);
}

/* ── Fade-in al hacer scroll ── */
(function(){
  const els = [...document.querySelectorAll(
    '.feat-card,.plan-card,.val-item,.hh-steps li,.trust-item,.faq-item'
  )];
  els.forEach(el => { el.style.opacity = '0.01'; el.style.transform = 'translateY(14px)'; });
  const io = new IntersectionObserver(entries => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => {
          e.target.style.transition = 'opacity .5s ease, transform .5s ease';
          e.target.style.opacity = '1';
          e.target.style.transform = 'none';
        }, i * 60);
        io.unobserve(e.target);
      }
    });
  }, { threshold: .1 });
  els.forEach(el => io.observe(el));
})();
