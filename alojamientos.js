const intervalos = new Map();

function iniciarSlideshow(card) {
  const slides = card.querySelectorAll('.slide');
  if (slides.length <= 1) return;

  let index = 0;
  intervalos.set(card, setInterval(() => {
    slides[index].classList.remove('active');
    index = (index + 1) % slides.length;
    slides[index].classList.add('active');
  }, 2000));
}

function detenerSlideshow(card) {
  clearInterval(intervalos.get(card));
  intervalos.delete(card);

  const slides = card.querySelectorAll('.slide');
  slides.forEach((slide, i) => {
    slide.classList.remove('active');
    if (i === 0) slide.classList.add('active');
  });
}

// Redirección con parámetros
function redirigirConParametros(pagina) {
  const checkin = localStorage.getItem('checkin');
  const checkout = localStorage.getItem('checkout');
  const huespedes = localStorage.getItem('huespedes');
  const params = new URLSearchParams();

  if (checkin) params.append('checkin', checkin);
  if (checkout) params.append('checkout', checkout);
  if (huespedes) params.append('huespedes', huespedes);

  window.location.href = pagina + (params.toString() ? '?' + params.toString() : '');
}

// Mezclar cards al cargar
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.querySelector('.grid-alojamientos');
  if (!grid) return;

  const cards = Array.from(grid.children);
  const cardsMezcladas = cards.sort(() => Math.random() - 0.5);
  cardsMezcladas.forEach(card => grid.appendChild(card));
});

// =======================
// PROCESAR Y FILTRAR
// =======================
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const checkin = params.get('checkin');
  const checkout = params.get('checkout');
  const huespedes = parseInt(params.get('huespedes') || '1', 10);

  if (checkin) localStorage.setItem('checkin', checkin);
  if (checkout) localStorage.setItem('checkout', checkout);
  if (huespedes) localStorage.setItem('huespedes', huespedes);

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

  const mapNombreAId = {
    calafate1: 601552,
    calafate2: 601707,
    calafate3: 601708,
    calafate4: 601710,
    calafate5: 601711,
    calafate6: 601712,
    calafate7: 601713,
    cruzdelsur4: 601717,
    cruzdelsur5: 601714,
    nilidas: 601719,
    gurisa: 648950,
    paisajismo: 601720
  };

  const loading = document.getElementById('loading-disponibilidad');
  const contenedor = document.getElementById('listado-alojamientos');
  const cards = document.querySelectorAll('.card[data-nombre]');

  if (loading) loading.style.display = 'flex';

  // 🕒 Esperar a que haya datos válidos en localStorage (máx 1.5s)
  let disponibles = null;
  let intentos = 0;
  while (!disponibles && intentos < 15) {
    const cache = localStorage.getItem("disponibles");
    if (cache) disponibles = JSON.parse(cache);
    else await new Promise(r => setTimeout(r, 100)); // espera 100ms
    intentos++;
  }

  // Obtenemos solo los IDs de propiedades disponibles
  const idsDisponibles = disponibles ? disponibles.map(p => p.id) : [];

  cards.forEach(card => {
    const nombre = card.dataset.nombre;
    const id = mapNombreAId[nombre];
    const capacidadOk = huespedes <= (capacities[nombre] || 0);
    const estaDisponible = idsDisponibles.includes(id);

    // Lógica final de visibilidad
    if ((!checkin || !checkout || !disponibles) && capacidadOk) {
      card.style.display = 'block';
    } else if (estaDisponible && capacidadOk) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });

  if (loading) loading.style.display = 'none';
  if (contenedor) contenedor.style.display = 'flex';
});

