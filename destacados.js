// destacados.js
console.log("Destacados JS v1.0.5");

// Forzar refresco del set si cambiamos la lógica o los datos
const DESTACADOS_VERSION = "1.0.5";
if (localStorage.getItem("destacados_ver") !== DESTACADOS_VERSION) {
  localStorage.removeItem("destacados_set");
  localStorage.removeItem("destacados_at");
  localStorage.setItem("destacados_ver", DESTACADOS_VERSION);
}

// Evitar errores si funciones globales no están en esta página (sin sobrescribir)
if (typeof window.iniciarSlideshow === "undefined") {
  window.iniciarSlideshow = function(){};
}
if (typeof window.detenerSlideshow === "undefined") {
  window.detenerSlideshow = function(){};
}
if (typeof window.redirigirConParametros === "undefined") {
  window.redirigirConParametros = function(href){ window.location.href = href; };
}

// === LISTA DE PROPIEDADES ===
const propiedades = [
  { slug:"calafate1", titulo:"Calafate 1", href:"calafate1.html",
    imgs:["unidades/casa1/casa1_img1.jpg","unidades/casa1/casa1_img2.jpg","unidades/casa1/casa1_img3.jpg"], capacidad:"4/6" },
  { slug:"calafate2", titulo:"Calafate 2", href:"calafate2.html",
    imgs:["unidades/casa2/casa2_img3.jpg","unidades/casa2/casa6_img2.jpg","unidades/casa2/casascalafate.jpg"], capacidad:"2/4" },
  { slug:"calafate3", titulo:"Calafate 3", href:"calafate3.html",
    imgs:["unidades/casa3/casa3_img1.jpg","unidades/casa3/casa10_img2.jpg","unidades/casa3/casa3_img11.jpg"], capacidad:"4/6" },
  { slug:"calafate4", titulo:"Calafate 4", href:"calafate4.html",
    imgs:["unidades/casa4/casa4_img2.jpg","unidades/casa4/casa4_img8.jpg","unidades/casa4/casa4_img3.jpg"], capacidad:"4/6" },
  { slug:"calafate5", titulo:"Calafate 5", href:"calafate5.html",
    imgs:["unidades/casa5/casa5_img4.jpg","unidades/casa5/casa5_img9.jpg","unidades/casa5/casa5_img3.jpg"], capacidad:"2/4" },
  { slug:"calafate6", titulo:"Calafate 6", href:"calafate6.html",
    imgs:["unidades/casa6/casa6_img1.jpg","unidades/casa6/casa6_img2.jpg","unidades/casa6/casa5_img3.jpg"], capacidad:"4/6" },
  { slug:"calafate7", titulo:"Calafate 7", href:"calafate7.html",
    imgs:["unidades/casa7/casa7_img1.jpg","unidades/casa7/casa7_img7.jpg","unidades/casa7/casa7_img5.jpg"], capacidad:"2/4" },

  // Rutas ajustadas
  { slug:"cruz4", titulo:"Cruz del Sur 4", href:"cruz4.html",
    imgs:["unidades/cds4/cds4_1.jpg","unidades/cds4/cds4_2.jpg","unidades/cds4/cds4_9.jpg"], capacidad:"2" },
  { slug:"cruz5", titulo:"Cruz del Sur 5", href:"cruz5.html",
    imgs:["unidades/cds5/cds5_2.jpg","unidades/cds5/cds5_3.jpg","unidades/cds5/cds8_3.jpg"], capacidad:"2" },

  { slug:"nilidas", titulo:"Las Nilidas", href:"nilidas.html",
    imgs:["unidades/nilidas/nilidas1.jpg","unidades/nilidas/nilidas6.jpg","unidades/nilidas/nilidas13.jpg"], capacidad:"4" },
  { slug:"gurisa", titulo:"La Gurisa", href:"gurisa.html",
    imgs:["unidades/gurisa/gurisa1.jpg","unidades/gurisa/gurisa7.jpg","unidades/gurisa/gurisa2.jpg"], capacidad:"7" },
  { slug:"paisajismo", titulo:"Paisajismo", href:"paisajismo.html",
    imgs:["unidades/paisajismo/paisajismo1.jpg","unidades/paisajismo/paisajismo3.jpg","unidades/paisajismo/paisajismo5.jpg"], capacidad:"2/3" },
  { slug:"refugio", titulo:"Refugio Patagónico", href:"refugiopatagonico.html",
    imgs:["unidades/refugio/refugio2.jpg","unidades/refugio/refugio3.jpg","unidades/refugio/refugio10.jpg"], capacidad:"8" },
  { slug:"mitiempo", titulo:"Mi Tiempo", href:"mitiempo.html",
    imgs:["unidades/mitiempo/tiempo3.jpg","unidades/tiempo/mitiempo6.jpg","unidades/tiempo/mitiempo12.jpg"], capacidad:"3" }
];

// Unidades que deben mostrar la copa también en destacados
const destacadosConCopa = new Set([
  "nilidas",
  "calafate1",
  "calafate3",
  "calafate7",
  "cruz5",
  "paisajismo"
]);

// === HELPERS ===
const randomPick = (arr, n) => arr.slice().sort(() => 0.5 - Math.random()).slice(0, n);

// Mantener 1 y cambiar 3 cada 2 días
function getDestacados() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem("destacados_set") || "null"); } catch (e) { saved = null; }
  const savedAt = parseInt(localStorage.getItem("destacados_at") || "0", 10);
  const now = Date.now();
  const dosDias = 2 * 24 * 60 * 60 * 1000;

  if (!saved || now - savedAt > dosDias) {
    let nuevos;
    if (saved && saved.length) {
      const fijo = randomPick(saved, 1);
      const resto = propiedades.filter(p => !fijo.some(f => f.slug === p.slug));
      nuevos = [...fijo, ...randomPick(resto, 3)];
    } else {
      nuevos = randomPick(propiedades, 4);
    }
    localStorage.setItem("destacados_set", JSON.stringify(nuevos));
    localStorage.setItem("destacados_at", now.toString());
    return nuevos;
  }
  return saved;
}

// Render
function renderDestacados() {
  const cont = document.querySelector("#destacados .destacados-grid");
  if (!cont) return;
  const destacados = getDestacados();

  cont.innerHTML = destacados.map(p => `
    <a href="#" class="card" data-nombre="${p.slug}"
      onmouseover="iniciarSlideshow(this)"
      onmouseout="detenerSlideshow(this)"
      onclick="redirigirConParametros('${p.href}'); return false;">
      <div class="carousel">
        <div class="overlay"></div> <!-- usamos overlay unificado -->

        ${destacadosConCopa.has(p.slug) ? `
          <div class="badge-copa">
            <img src="iconos/copa.png" alt="Más elegido">
          </div>` : ""}

        ${p.imgs.map((src,i)=>`<img src="${src}" class="slide ${i===0?'active':''}" alt="${p.titulo}">`).join("")}

        <div class="nombre-alojamiento">
          ${p.titulo}
          <span class="capacidad"><img src="iconos/persona.png" alt="personas"> ${p.capacidad}</span>
        </div>
      </div>
    </a>
  `).join("");
}

window.addEventListener("DOMContentLoaded", renderDestacados);
