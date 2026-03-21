const { supabase } = require('../lib/supabase');

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
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({
        mensaje: "Método no permitido",
      });
    }

    let body = req.body;
    if (!body || typeof body !== "object") {
      const raw = await leerBody(req);
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = {};
      }
    }

    const codigoQR = (body && (body.codigo || body.nombre)) || null;

    if (!codigoQR) {
      return res.status(400).json({
        mensaje: "No se recibió código de invitado",
      });
    }

    const { data: invitadoBusqueda, error: searchError } = await supabase
      .from('Users')
      .select('*')
      .or(`Code.eq.${codigoQR},name.eq.${codigoQR}`);

    if (searchError) throw searchError;

    if (!invitadoBusqueda || invitadoBusqueda.length === 0) {
      return res.status(200).json({
        mensaje: "❌ No está en la lista: " + (codigoQR || ""),
      });
    }

    const invitado = invitadoBusqueda[0];

    if (invitado.arrived) {
      return res.status(200).json({
        mensaje: "⚠️ Ya había entrado",
      });
    }

    const { error: updateError } = await supabase
      .from('Users')
      .update({ arrived: true })
      .eq('id', invitado.id);

    if (updateError) throw updateError;

    return res.status(200).json({
      mensaje: "✅ Bienvenido " + invitado.name,
      invitado: {
        id: invitado.id,
        nombre: invitado.name,
        codigo: invitado.Code,
        llegado: true,
        creadoEn: invitado.created_at,
      },
    });
  } catch (err) {
    console.error("Error en /api/scan:", err);
    return res.status(500).json({
      mensaje: "Error interno al procesar el escaneo",
    });
  }
};

