document.addEventListener("DOMContentLoaded", () => {
    const loadingState = document.getElementById("loading-state");
    const votingSection = document.getElementById("voting-section");
    const resultsSection = document.getElementById("results-section");
    const questionsContainer = document.getElementById("questions-container");
    const rankingList = document.getElementById("ranking-list");
    
    const modalEditQuestions = document.getElementById("modal-edit-questions");
    const btnEditQuestions = document.getElementById("btn-edit-questions");
    const editQuestionsContainer = document.getElementById("edit-questions-container");
    
    let defaultQuestions = [
        "¿Quién es más probable que se pierda en la fiesta?",
        "¿Quién es el/la más dramático/a (a lo Cassie)?",
        "¿Quién tiene el mejor estilo (a lo Maddy)?",
        "¿Quién es más probable que acabe llorando hoy?",
        "¿Quién va a ser el alma de la fiesta?",
        "¿Quién va a beber más?",
        "¿Quién va a sacar las mejores fotos?",
        "¿Quién tiene más secretos ocultos?",
        "¿Quién va a llegar más tarde?",
        "¿El/la más misterioso/a de la noche?"
    ];

    let currentQuestions = [...defaultQuestions];
    let guests = [];

    async function init() {
        try {
            const [guestsRes, questionsRes] = await Promise.all([
                fetch('/api/invitados'),
                fetch('/api/preguntas')
            ]);
            
            const guestsData = await guestsRes.json();
            const questionsData = await questionsRes.json();

            if (guestsData.ok && guestsData.invitados) {
                // Filter out invalid names
                guests = guestsData.invitados.filter(g => g && g.nombre && g.nombre.trim() !== "");
            }

            if (questionsData.ok && questionsData.preguntas && questionsData.preguntas.length > 0) {
                currentQuestions = questionsData.preguntas.map(q => q.question_text);
            }

            renderVotingForm();
            loadingState.style.display = "none";
            votingSection.style.display = "flex";
        } catch (error) {
            console.error("Error cargando los datos:", error);
            loadingState.innerHTML = "Hubo un error al cargar. Por favor, recarga la página.";
        }
    }

    function renderVotingForm() {
        questionsContainer.innerHTML = "";
        
        currentQuestions.forEach((q, index) => {
            const wrap = document.createElement("div");
            wrap.className = "question-wrap";
            wrap.style.marginBottom = "16px";
            
            const label = document.createElement("label");
            label.className = "label";
            label.textContent = `${index + 1}. ${q}`;
            label.style.display = "block";
            label.style.marginBottom = "8px";
            label.style.color = "#fff";
            label.style.fontSize = "0.9rem";
            
            const select = document.createElement("select");
            select.className = "guest-select";
            select.dataset.questionIndex = index;
            select.required = true;
            
            const defaultOption = document.createElement("option");
            defaultOption.value = "";
            defaultOption.textContent = "Elige a alguien...";
            defaultOption.disabled = true;
            defaultOption.selected = true;
            select.appendChild(defaultOption);
            
            // Sort guests alphabetically
            const sortedGuests = [...guests].sort((a,b) => a.nombre.localeCompare(b.nombre));
            
            sortedGuests.forEach(g => {
                const opt = document.createElement("option");
                opt.value = g.id; // use ID to be unique
                opt.dataset.nombre = g.nombre;
                opt.textContent = g.nombre;
                select.appendChild(opt);
            });
            
            wrap.appendChild(label);
            wrap.appendChild(select);
            questionsContainer.appendChild(wrap);
        });
    }

    // Modal de edición
    btnEditQuestions.addEventListener("click", () => {
        editQuestionsContainer.innerHTML = "";
        currentQuestions.forEach((q, i) => {
            const input = document.createElement("input");
            input.type = "text";
            input.value = q;
            input.className = "edit-q-input";
            input.placeholder = `Pregunta ${i + 1}`;
            editQuestionsContainer.appendChild(input);
        });
        
        // If less than 10, add more empty inputs to reach 10
        for (let i = currentQuestions.length; i < 10; i++) {
             const input = document.createElement("input");
            input.type = "text";
            input.value = "";
            input.className = "edit-q-input";
            input.placeholder = `Pregunta ${i + 1}`;
            editQuestionsContainer.appendChild(input);
        }
        
        modalEditQuestions.style.display = "flex";
    });

    document.getElementById("btn-cancel-questions").addEventListener("click", () => {
        modalEditQuestions.style.display = "none";
    });

    document.getElementById("btn-save-questions").addEventListener("click", async () => {
        const inputs = document.querySelectorAll(".edit-q-input");
        const newQuestions = [];
        inputs.forEach(inp => {
            const val = inp.value.trim();
            if (val) newQuestions.push(val);
        });
        
        if (newQuestions.length === 0) {
            alert("Debes tener al menos 1 pregunta.");
            return;
        }

        const btn = document.getElementById("btn-save-questions");
        const prevText = btn.textContent;
        btn.textContent = "Guardando...";
        btn.disabled = true;

        try {
            const res = await fetch('/api/preguntas', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ preguntas: newQuestions })
            });
            
            const data = await res.json();
            if (data.ok) {
                currentQuestions = newQuestions;
                renderVotingForm();
                modalEditQuestions.style.display = "none";
            } else {
                alert("Error al guardar: " + data.mensaje);
            }
        } catch (e) {
            alert("Error de conexión");
        } finally {
            btn.textContent = prevText;
            btn.disabled = false;
        }
    });

    // Calcular Resultados
    document.getElementById("btn-submit-votes").addEventListener("click", () => {
        const selects = document.querySelectorAll(".guest-select");
        const voteCounts = {};
        
        let allAnswered = true;
        selects.forEach(sel => {
            if (!sel.value) {
                allAnswered = false;
            }
        });
        
        if (!allAnswered) {
            alert("Por favor, responde a todas las preguntas antes de calcular.");
            return;
        }
        
        // Tally votes
        selects.forEach(sel => {
            const guestId = sel.value;
            const guestOption = sel.options[sel.selectedIndex];
            const guestName = guestOption.dataset.nombre;
            
            if (voteCounts[guestId]) {
                voteCounts[guestId].votes += 1;
            } else {
                voteCounts[guestId] = {
                    name: guestName,
                    votes: 1
                };
            }
        });

        // Add 0 votes for people who didn't get any
        guests.forEach(g => {
             if (!voteCounts[g.id]) {
                 voteCounts[g.id] = { name: g.nombre, votes: 0 };
             }
        });
        
        const sortedRanking = Object.values(voteCounts).sort((a, b) => b.votes - a.votes);
        
        renderRanking(sortedRanking);
        
        votingSection.style.display = "none";
        resultsSection.style.display = "flex";
        
        // Confetti effect
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#c026d3', '#7c3aed', '#e879f9', '#ffffff']
            });
        }
    });

    function renderRanking(ranking) {
        rankingList.innerHTML = "";
        
        ranking.forEach((r, idx) => {
            const li = document.createElement("li");
            li.className = "ranking-item";
            
            let medal = "";
            if (idx === 0) medal = "🥇";
            else if (idx === 1) medal = "🥈";
            else if (idx === 2) medal = "🥉";
            else medal = `<span class="rank-pos">${idx + 1}</span>`;
            
            li.innerHTML = `
                <div class="rank-left">
                    ${medal} 
                    <span class="rank-name">${r.name}</span>
                </div>
                <div class="rank-right">
                    <span class="rank-votes">${r.votes} ${r.votes === 1 ? 'voto' : 'votos'}</span>
                </div>
            `;
            
            // Add a little glow to the top 3
            if (idx < 3) {
                 li.style.background = "rgba(192, 38, 211, 0.1)";
                 li.style.borderColor = "rgba(192, 38, 211, 0.6)";
            }
            
            rankingList.appendChild(li);
        });
    }

    document.getElementById("btn-restart").addEventListener("click", () => {
        // Reset dropdowns
        document.querySelectorAll(".guest-select").forEach(sel => sel.selectedIndex = 0);
        resultsSection.style.display = "none";
        votingSection.style.display = "flex";
        window.scrollTo(0,0);
    });

    init();
});
