function onScanSuccess(decodedText) {
  // El QR contiene el código único del invitado
  fetch("/api/scan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      codigo: decodedText,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      document.getElementById("resultado").innerText = data.mensaje || "Sin respuesta";
    })
    .catch((error) => {
      console.error("Error al enviar el código escaneado:", error);
      document.getElementById("resultado").innerText =
        "❌ Error al contactar con el servidor";
    });
}

const html5QrCode = new Html5Qrcode("reader");

html5QrCode.start(
  { facingMode: "environment" },
  {
    fps: 10,
    qrbox: 250,
  },
  onScanSuccess
);