document.addEventListener("DOMContentLoaded", function () {
  const grupos = document.querySelectorAll(".grupo-comentarios");
  let actual = 0;

  function mostrarGrupo(index) {
    grupos.forEach((grupo, i) => {
      grupo.classList.remove("active");
      if (i === index) grupo.classList.add("active");
    });
  }

  function siguienteGrupo() {
    actual = (actual + 1) % grupos.length;
    mostrarGrupo(actual);
  }

  mostrarGrupo(actual);
  setInterval(siguienteGrupo, 7000); // cambia cada 7 segundos
});


const bg = document.querySelector('.bg-slider');

const fondos = [
  "linear-gradient(rgba(22,22,22,0.5), rgba(22,22,22,0.9)), url('unidades/casa1/casa1_img2.jpg')",
  "linear-gradient(rgba(22,22,22,0.5), rgba(22,22,22,0.9)), url('unidades/casa7/casa7_img1.jpg')",
  "linear-gradient(rgba(22,22,22,0.5), rgba(22,22,22,0.9)), url('unidades/nilidas/nilidas1.jpg')",
  "linear-gradient(rgba(22,22,22,0.5), rgba(22,22,22,0.9)), url('unidades/cds4/cds4_1.jpg')",
  "linear-gradient(rgba(22,22,22,0.5), rgba(22,22,22,0.9)), url('unidades/cds5/cds5_3.jpg')",
  "linear-gradient(rgba(22,22,22,0.5), rgba(22,22,22,0.9)), url('unidades/nilidas/nilidas2.jpg')",
  "linear-gradient(rgba(22,22,22,0.5), rgba(22,22,22,0.9)), url('unidades/casa2/casascalafate.jpg')",
  "linear-gradient(rgba(22,22,22,0.5), rgba(22,22,22,0.9)), url('unidades/cds5/cds5_1.jpg')",
  "linear-gradient(rgba(22,22,22,0.5), rgba(22,22,22,0.9)), url('unidades/nilidas/nilidas13.jpg')"
];

let i = 0;

bg.style.backgroundImage = fondos[i];

setInterval(() => {
  bg.style.opacity = 0;

  setTimeout(() => {
    i = (i + 1) % fondos.length;
    bg.style.backgroundImage = fondos[i];
    bg.style.opacity = 1;
  }, 1000);
}, 5000);


  document.getElementById('formPropietario').addEventListener('submit', function (e) {
    const fechaHora = document.getElementById('fechaLlamada').value;
    const hora = new Date(fechaHora).getHours();

    if (hora < 9 || hora >= 18) {
      e.preventDefault();
      alert('Por favor seleccioná un horario entre las 09:00 y las 18:00 hs.');
    }
  });

//envio formulario propietario
;


