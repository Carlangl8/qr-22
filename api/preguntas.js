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
    if (req.method === "GET") {
      const { data: preguntas, error } = await supabase
        .from('Questions')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') {
           // Relation does not exist - Table probably not created yet
           return res.status(200).json({ ok: true, preguntas: [] });
        }
        throw error;
      }

      return res.status(200).json({
        ok: true,
        preguntas: preguntas || [],
      });
    }

    if (req.method === "POST") {
      let body = req.body;
      if (!body || typeof body !== "object") {
        const raw = await leerBody(req);
        try {
          body = raw ? JSON.parse(raw) : {};
        } catch {
          body = {};
        }
      }

      const { preguntas } = body;

      if (!Array.isArray(preguntas)) {
        return res.status(400).json({
          ok: false,
          mensaje: "Las preguntas deben ser un arreglo",
        });
      }

      // 1. Delete all existing questions
      const { error: deleteError } = await supabase
        .from('Questions')
        .delete()
        .neq('id', 0); // Delete all trick

      if (deleteError && deleteError.code !== '42P01' && deleteError.code !== 'PGRST205') throw deleteError;

      // 2. Insert new questions
      if (preguntas.length > 0) {
        // Map to format [{ text: "question 1" }, ...]
        const insertData = preguntas.map((q, index) => ({
           question_text: q,
        }));
        
        const { error: insertError } = await supabase
          .from('Questions')
          .insert(insertData);

        if (insertError) throw insertError;
      }

      return res.status(200).json({
        ok: true,
        mensaje: "Preguntas guardadas exitosamente",
      });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({
      ok: false,
      mensaje: "Método no permitido",
    });

  } catch (err) {
    console.error("Error en /api/preguntas:", err);
    const msj = err.message || err.details || JSON.stringify(err) || "Error interno";
    return res.status(500).json({
      ok: false,
      mensaje: msj,
      rawError: err
    });
  }
};
