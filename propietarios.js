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

   document.getElementById('form-propietario').addEventListener('submit', async function (e) {
  e.preventDefault();

  const nombre   = this.nombre.value;
  const email    = this.email.value;
  const telefono = this.telefono.value;
  const dia      = this.dia.value;
  const hora     = this.hora.value;
  const plan     = this.plan.value || document.querySelector('input[name="plan"]:checked')?.value;
  const mensaje  = this.mensaje.value;

  const datos = { nombre, email, telefono, dia, hora, plan, mensaje };

  try {
    const res = await fetch('https://disponibilidad-happy-host-patagonia.onrender.com/enviar-formulario-propietario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });

    const resultado = await res.json();
    if (resultado.success) {
      alert('¡Mensaje enviado con éxito!');
      this.reset();
    } else {
      alert('Error al enviar el formulario.');
    }
  } catch (err) {
    console.error('❌ Error al enviar:', err);
    alert('Ocurrió un error. Intentá de nuevo más tarde.');
  }
});
