const { supabase } = require('../lib/supabase');

function generarCodigoUnico() {
  const base = Date.now().toString(36);
  const rnd = Math.random().toString(36).substring(2, 8);
  return `${base}${rnd}`.toUpperCase();
}

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
      const { data: invitados, error } = await supabase
        .from('Users')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mappedInvitados = (invitados || []).map(i => ({
        id: i.id,
        nombre: i.name,
        codigo: i.Code,
        llegado: i.arrived,
        creadoEn: i.created_at,
        llegadoEn: i.created_at // Compatibilidad
      }));

      return res.status(200).json({
        ok: true,
        invitados: mappedInvitados,
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

    const { data: inserted, error: insertError } = await supabase
      .from('Users')
      .insert([
        { name: nombre.trim(), Code: codigo, arrived: false }
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    const invitadoFront = {
      id: inserted.id,
      nombre: inserted.name,
      codigo: inserted.Code,
      llegado: inserted.arrived,
      creadoEn: inserted.created_at,
    };

    return res.status(200).json({
      ok: true,
      invitado: invitadoFront,
    });
  } catch (err) {
    console.error("Error en /api/invitados:", err);
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno al procesar la invitación",
    });
  }
};

