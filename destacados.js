// destacados.js
console.log("Destacados JS v1.1.1");

// Forzar refresco del set si cambiamos lógica
const DESTACADOS_VERSION = "1.1.1";

if (localStorage.getItem("destacados_ver") !== DESTACADOS_VERSION) {
  localStorage.removeItem("destacados_set");
  localStorage.removeItem("destacados_at");
  localStorage.setItem("destacados_ver", DESTACADOS_VERSION);
}

// Evitar errores si las funciones no existen en esta página
if (typeof window.iniciarSlideshow === "undefined") {
  window.iniciarSlideshow = function(){};
}

if (typeof window.detenerSlideshow === "undefined") {
  window.detenerSlideshow = function(){};
}

if (typeof window.redirigirConParametros === "undefined") {
  window.redirigirConParametros = function(href){
    window.location.href = href;
  };
}

// =======================
// LISTA DE PROPIEDADES
// =======================

const propiedades = [

  {
    slug:"calafate1",
    titulo:"Calafate 1",
    categoria:"Casas Calafate",
    precio:"110.000",
    href:"calafate1.html",
    imgs:[
      "unidades/casa1/casa1_img1.jpg",
      "unidades/casa1/casa1_img2.jpg",
      "unidades/casa1/casa1_img14.jpg"
    ],
    capacidad:"4/6",
    desc:"Casa con parrilla, cochera y jardín. Equipada para disfrutar en familia a pasos del centro."
  },

  {
    slug:"calafate2",
    titulo:"Calafate 2",
    categoria:"Casas Calafate",
    precio:"98.000",
    href:"calafate2.html",
    imgs:[
      "unidades/casa2/casa2_img3.jpg",
      "unidades/casa2/casa6_img2.jpg",
      "unidades/casa2/casascalafate.jpg"
    ],
    capacidad:"2/4",
    desc:"Cabaña acogedora para parejas y grupos pequeños. Todo el confort patagónico en un solo lugar."
  },

  {
    slug:"calafate3",
    titulo:"Calafate 3",
    categoria:"Casas Calafate",
    precio:"110.000",
    href:"calafate3.html",
    imgs:[
      "unidades/casa3/casa3_img1.jpg",
      "unidades/casa3/casa10_img2.jpg",
      "unidades/casa3/casa3_img11.jpg"
    ],
    capacidad:"4/6",
    desc:"Amplia casa con espacios verdes y parrilla. Cochera privada incluida. Perfecta para familias."
  },

  {
    slug:"calafate4",
    titulo:"Calafate 4",
    categoria:"Casas Calafate",
    precio:"110.000",
    href:"calafate4.html",
    imgs:[
      "unidades/casa4/casa4_img2.jpg",
      "unidades/casa4/casa4_img8.jpg",
      "unidades/casa4/casa4_img3.jpg"
    ],
    capacidad:"4/6",
    desc:"Casa equipada con parrilla y estacionamiento. Tranquilidad y comodidad para toda la familia."
  },

  {
    slug:"calafate5",
    titulo:"Calafate 5",
    categoria:"Casas Calafate",
    precio:"98.000",
    href:"calafate5.html",
    imgs:[
      "unidades/casa5/casa5_img4.jpg",
      "unidades/casa5/casa5_img9.jpg",
      "unidades/casa5/casa5_img3.jpg"
    ],
    capacidad:"2/4",
    desc:"Refugio íntimo en el corazón de Villa La Angostura. Calidez y diseño pensado para parejas."
  },

  {
    slug:"calafate6",
    titulo:"Calafate 6",
    categoria:"Casas Calafate",
    precio:"110.000",
    href:"calafate6.html",
    imgs:[
      "unidades/casa6/casa6_img10.jpg",
      "unidades/casa6/casa6_img2.jpg",
      "unidades/casa6/casa5_img3.jpg"
    ],
    capacidad:"4/6",
    desc:"Casa espaciosa en complejo tranquilo con cochera y parrilla. Lista para una estadía perfecta."
  },

  {
    slug:"calafate7",
    titulo:"Calafate 7",
    categoria:"Casas Calafate",
    precio:"98.000",
    href:"calafate7.html",
    imgs:[
      "unidades/casa7/casa7_img1.jpg",
      "unidades/casa7/casa7_img7.jpg",
      "unidades/casa7/casa7_img11.jpg"
    ],
    capacidad:"2/4",
    desc:"Cabaña íntima con rincones cálidos y mucho encanto. Ideal para escapadas románticas en la montaña."
  },

  {
    slug:"cruz4",
    titulo:"Cruz del Sur 4",
    categoria:"Cruz del Sur",
    precio:"120.000",
    href:"cruz4.html",
    imgs:[
      "unidades/cds4/cds4_1.jpg",
      "unidades/cds4/cds4_2.jpg",
      "unidades/cds4/cds4_9.jpg"
    ],
    capacidad:"2",
    desc:"Departamento premium con diseño elegante y vistas a los cerros. Perfecto para dos."
  },

  {
    slug:"cruz5",
    titulo:"Cruz del Sur 5",
    categoria:"Cruz del Sur",
    precio:"120.000",
    href:"cruz5.html",
    imgs:[
      "unidades/cds5/cds5_2.jpg",
      "unidades/cds5/cds5_3.jpg",
      "unidades/cds5/cds8_3.jpg"
    ],
    capacidad:"2",
    desc:"Studio moderno a metros del centro. Ambiente acogedor con acceso a la naturaleza patagónica."
  },

  {
    slug:"nilidas",
    titulo:"Las Nilidas",
    categoria:"Las Nilidas",
    precio:"150.000",
    href:"nilidas.html",
    imgs:[
      "unidades/nilidas/nilidas1.jpg",
      "unidades/nilidas/nilidas6.jpg",
      "unidades/nilidas/nilidas13.jpg"
    ],
    capacidad:"4",
    desc:"Casa luminosa con vistas a las montañas, jardín privado y acceso al lago. Un lugar soñado."
  },

  {
    slug:"gurisa",
    titulo:"La Gurisa",
    categoria:"La Gurisa",
    precio:"190.000",
    href:"gurisa.html",
    imgs:[
      "unidades/gurisa/gurisa1.jpg",
      "unidades/gurisa/gurisa7.jpg",
      "unidades/gurisa/gurisa2.jpg"
    ],
    capacidad:"7",
    desc:"Gran cabaña rodeada de jardín con chimenea, cocina gourmet y vista despejada a los cerros."
  },

  {
    slug:"paisajismo",
    titulo:"Paisajismo",
    categoria:"Paisajismo",
    precio:"95.000",
    href:"paisajismo.html",
    imgs:[
      "unidades/paisajismo/paisajismo1.jpg",
      "unidades/paisajismo/paisajismo3.jpg",
      "unidades/paisajismo/paisajismo5.jpg"
    ],
    capacidad:"2/3",
    desc:"Departamento moderno con estacionamiento, vista a los cerros y ubicación privilegiada al centro."
  },

  {
    slug:"refugio",
    titulo:"Refugio Patagónico",
    categoria:"Refugio Patagónico",
    precio:"160.000",
    href:"refugiopatagonico.html",
    imgs:[
      "unidades/refugio/refugio2.jpg",
      "unidades/refugio/refugio3.jpg",
      "unidades/refugio/refugio10.jpg"
    ],
    capacidad:"8",
    desc:"Auténtico refugio patagónico para grupos. Amplio, equipado y rodeado de naturaleza viva."
  },

  {
    slug:"puertomargarita",
    titulo:"Nueva Esperanza",
    categoria:"Nueva Esperanza",
    precio:"184.000",
    href:"nueva-esperanza.html",
    imgs:[
      "https://res.cloudinary.com/dpvanrrla/image/upload/q_auto/f_auto/v1777644943/margarita3_seznld.png",
      "https://res.cloudinary.com/dpvanrrla/image/upload/q_auto/f_auto/v1777645030/margarita2_caysol.png",
      "https://res.cloudinary.com/dpvanrrla/image/upload/v1777650709/margarita7_eny2km.png"
    ],
    capacidad:"5",
    desc:"Casa estilo nórdico con hogar, quincho, parrilla y parque. A pasos del puerto y del centro."
  }

];

// =======================
// DESCUENTO CALAFATE
// =======================

const destacadosConDescuento = new Set([]);

// Copa desactivada
const destacadosConCopa = new Set([]);

// =======================
// HELPERS
// =======================

const randomPick = (arr, n) => {
  return arr.slice().sort(() => 0.5 - Math.random()).slice(0, n);
};

// Mantener 1 y cambiar 3 cada 2 días

function getDestacados() {

  let saved = null;

  try {
    saved = JSON.parse(localStorage.getItem("destacados_set") || "null");
  } catch(e) {
    saved = null;
  }

  const savedAt = parseInt(localStorage.getItem("destacados_at") || "0", 10);
  const now = Date.now();
  const dosDias = 2 * 24 * 60 * 60 * 1000;

  if (!saved || now - savedAt > dosDias) {

    let nuevos;

    if (saved && saved.length) {

      const fijo = randomPick(saved, 1);

      const resto = propiedades.filter(
        p => !fijo.some(f => f.slug === p.slug)
      );

      nuevos = [...fijo, ...randomPick(resto, 2)];

    } else {

      nuevos = randomPick(propiedades, 3);

    }

    localStorage.setItem("destacados_set", JSON.stringify(nuevos));
    localStorage.setItem("destacados_at", now.toString());

    return nuevos;
  }

  return saved;
}

// =======================
// RENDER
// =======================

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

        <div class="overlay"></div>

        <!-- Badge del panel admin — badges.js lo muestra/oculta según la config -->
        <div class="badge-destacado" style="display:none">
          <img src="" alt="">
        </div>

        ${destacadosConDescuento.has(p.slug) ? `
          <div class="badge-descuento">
            <img src="iconos/descuento.png" alt="15% off">
          </div>
        ` : ""}

        ${p.imgs.map((src,i)=>`
          <img src="${src}" class="slide ${i===0?'active':''}" alt="${p.titulo}">
        `).join("")}

      </div>

      <div class="card-info">
        <span class="card-categoria">${p.categoria || ''}</span>
        <h3 class="card-titulo">${p.titulo}</h3>
        <p class="card-desc">${p.desc || ''}</p>
        <div class="card-footer">
          <div class="card-precio">
            <span class="precio-desde">desde ${p.moneda || 'ARS'} ${p.precio || '—'}</span>
            <span class="precio-label"> /noche</span>
          </div>
          <span class="card-capacidad">
            <img src="iconos/persona.png" alt="personas">
            hasta ${p.capacidad}
          </span>
        </div>
      </div>

    </a>

  `).join("");
}

window.addEventListener("DOMContentLoaded", renderDestacados);
