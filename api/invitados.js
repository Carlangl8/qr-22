const fs = require("fs");
const path = require("path");

// Usamos la raíz del proyecto como en `server.js`
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

function generarCodigoUnico() {
  const base = Date.now().toString(36);
  const rnd = Math.random().toString(36).substring(2, 8);
  return `${base}${rnd}`.toUpperCase();
}

// Cargamos los invitados la primera vez que se importe la función
cargarInvitados();

module.exports = (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      ok: false,
      mensaje: "Método no permitido",
    });
  }

  const { nombre } = req.body || {};

  if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
    return res.status(400).json({
      ok: false,
      mensaje: "El nombre es obligatorio",
    });
  }

  const codigo = generarCodigoUnico();

  const invitado = {
    id: invitados.length + 1,
    nombre: nombre.trim(),
    codigo,
    llegado: false,
    creadoEn: new Date().toISOString(),
  };

  invitados.push(invitado);
  guardarInvitados();

  return res.status(200).json({
    ok: true,
    invitado,
  });
};

