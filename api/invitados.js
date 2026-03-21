const fs = require("fs");
const path = require("path");
const os = require("os");

const isVercel = !!process.env.VERCEL;

// En Vercel el sistema de archivos del proyecto suele ser read-only.
// Usamos `/tmp` para que `guardarInvitados()` funcione.
const DATA_FILE = isVercel
  ? path.join(os.tmpdir(), "invitados.json")
  : path.join(process.cwd(), "invitados.json");

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

function leerBody(req) {
  return new Promise((resolve, reject) => {
    let datos = "";
    req.on("data", (chunk) => {
      datos += chunk;
    });
    req.on("end", () => resolve(datos));
    req.on("error", reject);
  });
}

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      return res.status(200).json({
        ok: true,
        invitados,
      });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({
        ok: false,
        mensaje: "Método no permitido",
      });
    }

    let body = req.body;
    // En Vercel algunas configuraciones pueden no parsear `req.body`.
    if (!body || typeof body !== "object") {
      const raw = await leerBody(req);
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = {};
      }
    }

    const { nombre } = body || {};

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
  } catch (err) {
    console.error("Error en /api/invitados:", err);
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno al crear la invitación",
    });
  }
};

