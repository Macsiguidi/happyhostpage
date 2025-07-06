// ========================================
// INICIALIZACIÓN DE CARRUSEL POR TARJETA
// ========================================
document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll('.card');

  cards.forEach(card => {
    const slides = card.querySelectorAll('.carousel .slide');
    const prevBtn = card.querySelector('.prev');
    const nextBtn = card.querySelector('.next');

    if (!slides.length || !prevBtn || !nextBtn) return;

    card.dataset.currentIndex = "0";

    const showSlide = (index) => {
      slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
      });
    };

    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      let current = parseInt(card.dataset.currentIndex);
      current = (current - 1 + slides.length) % slides.length;
      card.dataset.currentIndex = current.toString();
      showSlide(current);
    });

    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      let current = parseInt(card.dataset.currentIndex);
      current = (current + 1) % slides.length;
      card.dataset.currentIndex = current.toString();
      showSlide(current);
    });

    showSlide(0);
  });
});

// ========================================
// GUARDAR PARÁMETROS EN LOCALSTORAGE AL CARGAR
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const checkin = params.get('checkin');
  const checkout = params.get('checkout');
  const huespedes = params.get('huespedes');

  if (checkin) localStorage.setItem('checkin', checkin);
  if (checkout) localStorage.setItem('checkout', checkout);
  if (huespedes) localStorage.setItem('huespedes', huespedes);
});

// ========================================
// FILTRADO DE ALOJAMIENTOS SEGÚN DISPONIBILIDAD Y HUÉSPEDES
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
  const checkin = localStorage.getItem('checkin');
  const checkout = localStorage.getItem('checkout');
  const huespedes = parseInt(localStorage.getItem('huespedes') || '1', 10);

  const capacities = {
    calafate1: 6,
    calafate2: 4,
    calafate3: 6,
    calafate4: 6,
    calafate5: 4,
    calafate6: 6,
    calafate7: 4,
    cruzdelsur4: 2,
    cruzdelsur5: 2,
    nilidas: 4,
    gurisa: 7,
    paisajismo: 3
  };

  const loading = document.getElementById('loading-disponibilidad');
  const contenedor = document.getElementById('contenedor-alojamientos');
  const cards = document.querySelectorAll('.card[data-nombre]');

  if (!checkin || !checkout) {
    cards.forEach(card => {
      const nombre = card.dataset.nombre;
      card.style.display = (huespedes <= capacities[nombre]) ? 'block' : 'none';
    });
    loading.style.display = 'none';
    contenedor.style.display = 'flex';
    return;
  }

  try {
    const res = await fetch(
      `https://disponibilidad-happy-host-patagonia.onrender.com/api/disponibles?checkin=${checkin}&checkout=${checkout}`
    );
    const data = await res.json();
    const disponibles = data.disponibles || [];

    cards.forEach(card => {
      const nombre = card.dataset.nombre;
      const libre = disponibles.includes(nombre);
      const admite = huespedes <= capacities[nombre];
      card.style.display = (libre && admite) ? 'block' : 'none';
    });
  } catch (err) {
    console.error('❌ Error al consultar disponibilidad:', err);
  } finally {
    loading.style.display = 'none';
    contenedor.style.display = 'flex';
  }
});

// ========================================
// FUNCIÓN PARA REDIRIGIR A ALOJAMIENTO CON PARÁMETROS
// ========================================
function redirigirConParametros(pagina) {
  const checkin = localStorage.getItem('checkin');
  const checkout = localStorage.getItem('checkout');
  const huespedes = localStorage.getItem('huespedes');

  let url = pagina;
  const params = new URLSearchParams();

  if (checkin) params.append('checkin', checkin);
  if (checkout) params.append('checkout', checkout);
  if (huespedes) params.append('huespedes', huespedes);

  if ([...params].length > 0) {
    url += '?' + params.toString();
  }

  window.location.href = url;
}
