const { supabase } = require('../lib/supabase');

function leerBody(req) {
  return new Promise((resolve, reject) => {
    let datos = "";
    req.on("data", (chunk) => datos += chunk);
    req.on("end", () => resolve(datos));
    req.on("error", reject);
  });
}

function generatePin() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for ( let i = 0; i < 4; i++ ) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

module.exports = async (req, res) => {
  try {
    if (req.method === "POST") {
        let body = req.body;
        if (!body || typeof body !== "object") {
            const raw = await leerBody(req);
            try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
        }

        const action = body.action;

        if (action === "create") {
            const pin = generatePin();
            const { error } = await supabase
                .from('GameSessions')
                .insert([{ pin, status: 'waiting', current_question_index: -1 }]);
            
            if (error) throw error;
            return res.json({ ok: true, pin });
        }

        if (action === "state") {
            const { pin, status, index } = body;
            const { error } = await supabase
                .from('GameSessions')
                .update({ status, current_question_index: index })
                .eq('pin', pin);
            
            if (error) throw error;
            return res.json({ ok: true });
        }

        if (action === "join") {
            const { pin, participant_name } = body;
            const { error } = await supabase
                .from('GameVotes')
                .insert([{ pin, participant_name, question_index: -1 }]);
            
            if (error && error.code !== '23505') throw error; // ignore unique violations if any
            return res.json({ ok: true });
        }

        if (action === "vote") {
            const { pin, participant_name, question_index, voted_guest_id } = body;
            const { error } = await supabase
                .from('GameVotes')
                .insert([{ pin, participant_name, question_index, voted_guest_id }]);
            
            if (error) throw error;
            return res.json({ ok: true });
        }
    }

    if (req.method === "GET") {
        const urlParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
        const action = urlParams.get('action');
        const pin = urlParams.get('pin');

        if (!pin) return res.status(400).json({ ok: false, mensaje: "PIN es requerido" });

        if (action === "poll_host") {
            // Get session
            const { data: sessionData, error: sErr } = await supabase
                .from('GameSessions')
                .select('*')
                .eq('pin', pin)
                .single();
            
            if (sErr || !sessionData) return res.json({ ok: false });

            let players = [];
            if (sessionData.status === 'waiting') {
                const { data: pData } = await supabase
                    .from('GameVotes')
                    .select('participant_name')
                    .eq('pin', pin)
                    .eq('question_index', -1);
                players = pData ? pData.map(p => p.participant_name) : [];
            }

            // Count votes for current question
            const { count, error: countErr } = await supabase
                .from('GameVotes')
                .select('*', { count: 'exact', head: true })
                .eq('pin', pin)
                .eq('question_index', sessionData.current_question_index);
            
            return res.json({ ok: true, session: sessionData, votesCount: count || 0, players });
        }

        if (action === "poll_player") {
            // Player just needs to know if state changed and what the current question text is
            const { data: sessionData, error: sErr } = await supabase
                .from('GameSessions')
                .select('*')
                .eq('pin', pin)
                .single();
            
            if (sErr || !sessionData) return res.json({ ok: false });

            let questionText = null;
            if (sessionData.status === 'playing') {
                // Fetch the specific question if needed (to have text)
                const { data: qData } = await supabase
                    .from('Questions')
                    .select('*')
                    .order('id', { ascending: true })
                    // limit to getting all questions to find by index
                
                if (qData && sessionData.current_question_index < qData.length) {
                    questionText = qData[sessionData.current_question_index].question_text;
                }
            }

            return res.json({ ok: true, session: sessionData, question: questionText });
        }

        if (action === "results") {
            // Aggregate all votes across all questions in the pin
            const { data: votesData, error } = await supabase
                .from('GameVotes')
                .select('*')
                .eq('pin', pin);
            
            if (error) throw error;

            // Fetch users mapping
            const { data: usersData } = await supabase
                .from('Users')
                .select('id, name');
            
            const usersMap = {};
            if (usersData) {
                usersData.forEach(u => usersMap[u.id] = u.name);
            }

            const tally = {};
            // Initialize all users with 0 votes to show everybody? 
            // Or just the ones that got votes, plus others? The user specified "ranking". Let's init all.
            if (usersData) {
                usersData.forEach(u => tally[u.id] = { name: u.name, votes: 0 });
            }

            (votesData || []).forEach(vote => {
                const gId = vote.voted_guest_id;
                if (tally[gId]) {
                    tally[gId].votes++;
                } else if (usersMap[gId]) {
                    // Fallback
                    tally[gId] = { name: usersMap[gId], votes: 1 };
                }
            });

            const sorted = Object.values(tally).sort((a, b) => b.votes - a.votes);
            
            return res.json({ ok: true, results: sorted });
        }
    }

    res.status(404).json({ ok: false, mensaje: "Not found" });
  } catch (err) {
    console.error("Error en /api/game:", err);
    return res.status(500).json({ ok: false, mensaje: "Error interno: " + err.message });
  }
};
