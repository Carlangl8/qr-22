const fs = require("fs");
const path = require("path");

// Usamos la raíz del proyecto para compartir el mismo fichero que el servidor local
const DATA_FILE = path.join(process.cwd(), "invitados.json");

let invitados = [];

function cargarInvitados() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const contenido = fs.readFileSync(DATA_FILE, "utf8");
      invitados = contenido ? JSON.parse(contenido) : [];
    } else {
      invitados = [];
    }
  } catch (err) {
    console.error("Error leyendo invitados.json:", err);
    invitados = [];
  }
}

function guardarInvitados() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(invitados, null, 2), "utf8");
}

// Cargamos los invitados la primera vez que se importe la función
cargarInvitados();

module.exports = (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      mensaje: "Método no permitido",
    });
  }

  // Nuevo formato: enviamos `codigo` en el cuerpo.
  // Compatibilidad: si sólo viene `nombre`, seguimos intentando buscar por nombre.
  const codigoQR = (req.body && (req.body.codigo || req.body.nombre)) || null;

  if (!codigoQR) {
    return res.status(400).json({
      mensaje: "No se recibió código de invitado",
    });
  }

  const invitado =
    invitados.find((i) => i.codigo === codigoQR) ||
    invitados.find((i) => i.nombre === codigoQR);

  if (!invitado) {
    return res.status(200).json({
      mensaje: "❌ No está en la lista",
    });
  }

  if (invitado.llegado) {
    return res.status(200).json({
      mensaje: "⚠️ Ya había entrado",
    });
  }

  invitado.llegado = true;
  invitado.llegadoEn = new Date().toISOString();
  guardarInvitados();

  return res.status(200).json({
    mensaje: "✅ Bienvenido " + invitado.nombre,
    invitado,
  });
};

