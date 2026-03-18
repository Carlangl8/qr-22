document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("name-modal");
  const form = document.getElementById("guest-form");
  const nameInput = document.getElementById("guest-name");
  const invitationSection = document.getElementById("invitation-section");
  const invitedNameEl = document.getElementById("invited-name");
  const invitedCodeEl = document.getElementById("invited-code");
  const invitationLabelEl = document.getElementById("invitation-label");
  const downloadButton = document.getElementById("download-button");
  const newInviteButton = document.getElementById("new-invite-button");
  const invitationCard = document.getElementById("invitation-card");
  const qrCanvas = document.getElementById("qr-canvas");

  let invitadoActual = null;
  let qrInstance = null;

  function esNombreFemenino(nombre) {
    const nombreLimpio = nombre.trim().split(/\s+/)[0];
    if (!nombreLimpio) return false;
    const ultima = nombreLimpio.slice(-1).toLowerCase();
    if (ultima === "a") return true;
    if (ultima === "o") return false;
    const nombresChica = ["carmen", "isabel", "ines", "merche", "luz", "mar", "sol", "rocío", "rocio", "noelia", "andrea", "iris", "concepción", "concepcion", "soledad", "consuelo", "pilar", "dolores", "lourdes", "belén", "belen", "margarita", "esmeralda", "yolanda", "gema", "raquel", "noel"];
    return nombresChica.includes(nombreLimpio.toLowerCase());
  }

  function mostrarInvitacion(invitado) {
    invitadoActual = invitado;
    const esInvitada = esNombreFemenino(invitado.nombre);

    let nombreParaMostrar = invitado.nombre;
    if (invitado.nombre.trim().toLowerCase() === "romero") {
      nombreParaMostrar = invitado.nombre + " ❤️ 🐵";
    } else if (esInvitada) {
      nombreParaMostrar = invitado.nombre + " 🎀";
    } else {
      nombreParaMostrar = invitado.nombre + " 😎";
    }
    invitedNameEl.textContent = nombreParaMostrar;
    invitedCodeEl.textContent = invitado.codigo;
    invitationLabelEl.textContent = esInvitada ? "Invitada:" : "Invitado:";
    invitationSection.hidden = false;

    // Generar/actualizar QR con el código único
    if (!qrInstance) {
      qrInstance = new QRious({
        element: qrCanvas,
        value: invitado.codigo,
        size: 180,
        level: "H",
      });
    } else {
      qrInstance.value = invitado.codigo;
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nombre = nameInput.value.trim();
    if (!nombre) {
      return;
    }

    try {
      const respuesta = await fetch("/api/invitados", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nombre }),
      });

      const data = await respuesta.json();

      if (!respuesta.ok || !data.ok) {
        alert(data.mensaje || "No se pudo crear la invitación. Intenta de nuevo.");
        return;
      }

      modal.style.display = "none";
      mostrarInvitacion(data.invitado);
    } catch (error) {
      console.error("Error al crear invitación:", error);
      alert("Ocurrió un error al crear la invitación. Revisa el servidor e inténtalo otra vez.");
    }
  });

  downloadButton.addEventListener("click", async () => {
    if (!invitadoActual) return;

    try {
      // Aumenta la resolución del PNG para que no se vea pixelado al descargar
      const dpr = window.devicePixelRatio || 1;
      const exportScale = Math.max(3, Math.round(dpr * 3));
      const canvas = await html2canvas(invitationCard, {
        backgroundColor: "#000",
        scale: exportScale,
        useCORS: true,
      });

      const dataUrl = canvas.toDataURL("image/png");
      const enlace = document.createElement("a");
      enlace.href = dataUrl;
      enlace.download = `invitacion-${invitadoActual.codigo}.png`;
      enlace.click();
    } catch (error) {
      console.error("Error al descargar la invitación:", error);
      alert("No se pudo generar la imagen. Intenta de nuevo.");
    }
  });

  newInviteButton.addEventListener("click", () => {
    invitadoActual = null;
    invitationSection.hidden = true;
    nameInput.value = "";
    invitationLabelEl.textContent = "Invitado/a:";
    modal.style.display = "flex";
    nameInput.focus();
  });

  // Mostrar el modal al entrar en la página
  modal.style.display = "flex";
  nameInput.focus();
});

