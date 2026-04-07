document.addEventListener("DOMContentLoaded", () => {
    const btnCreate = document.getElementById("btn-create-game");
    const sectionCreate = document.getElementById("section-create");
    const sectionLobby = document.getElementById("section-lobby");
    const sectionPlaying = document.getElementById("section-playing");
    const sectionResults = document.getElementById("section-results");

    const lobbyPin = document.getElementById("lobby-pin");
    const qrCanvas = document.getElementById("qr-canvas");
    const btnStart = document.getElementById("btn-start-game");
    const btnNext = document.getElementById("btn-next-question");
    const btnFinish = document.getElementById("btn-finish-game");
    const btnNewGame = document.getElementById("btn-new-game");

    let currentPin = "";
    let qrInstance = null;
    let questions = [];
    let currentQuestionIndex = -1;
    let pollInterval = null;

    async function loadQuestions() {
        const res = await fetch('/api/preguntas');
        const data = await res.json();
        if (data.ok && data.preguntas) {
            questions = data.preguntas.map(q => q.question_text);
        }
    }
    loadQuestions();

    const btnEditQuestions = document.getElementById("btn-edit-questions");
    const modalEditQuestions = document.getElementById("modal-edit-questions");
    const editQuestionsContainer = document.getElementById("edit-questions-container");
    const btnSaveQuestions = document.getElementById("btn-save-questions");
    const btnCancelQuestions = document.getElementById("btn-cancel-questions");

    btnEditQuestions.addEventListener("click", () => {
        editQuestionsContainer.innerHTML = "";
        
        let questionsToIterate = questions.length > 0 ? questions : [
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

        questionsToIterate.forEach((q, i) => {
            const input = document.createElement("input");
            input.type = "text";
            input.value = q;
            input.className = "edit-q-input";
            input.placeholder = `Pregunta ${i + 1}`;
            editQuestionsContainer.appendChild(input);
        });
        
        for (let i = questionsToIterate.length; i < 10; i++) {
             const input = document.createElement("input");
            input.type = "text";
            input.value = "";
            input.className = "edit-q-input";
            input.placeholder = `Pregunta ${i + 1}`;
            editQuestionsContainer.appendChild(input);
        }
        
        modalEditQuestions.style.display = "flex";
    });

    btnCancelQuestions.addEventListener("click", () => {
        modalEditQuestions.style.display = "none";
    });

    btnSaveQuestions.addEventListener("click", async () => {
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

        btnSaveQuestions.textContent = "Guardando...";
        btnSaveQuestions.disabled = true;

        try {
            const res = await fetch('/api/preguntas', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ preguntas: newQuestions })
            });
            
            const data = await res.json();
            if (data.ok) {
                questions = newQuestions;
                modalEditQuestions.style.display = "none";
                alert("Preguntas guardadas con éxito. Ya puedes crear la partida.");
            } else {
                alert("Error al guardar: " + data.mensaje);
            }
        } catch (e) {
            alert("Error de conexión");
        } finally {
            btnSaveQuestions.textContent = "Guardar y Continuar";
            btnSaveQuestions.disabled = false;
        }
    });

    btnCreate.addEventListener("click", async () => {
        btnCreate.disabled = true;
        btnCreate.textContent = "Creando...";
        try {
            const res = await fetch('/api/game', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "create" })
            });
            const data = await res.json();
            if (data.ok) {
                currentPin = data.pin;
                showLobby();
            } else {
                alert("Error al crear partida");
                btnCreate.disabled = false;
                btnCreate.textContent = "🎲 Crear Nueva Partida";
            }
        } catch (e) {
            alert("Error de red");
        }
    });

    function showLobby() {
        sectionCreate.style.display = "none";
        sectionLobby.style.display = "block";
        lobbyPin.textContent = currentPin;

        const joinUrl = `${window.location.origin}/juego.html?pin=${currentPin}`;
        
        // El texto de la URL en pantalla
        const urlText = document.querySelector("#section-lobby h2");
        urlText.innerHTML = `Únete en <span style="color:#e879f9;">${window.location.host}/juego.html</span>`;

        if (!qrInstance) {
            qrInstance = new QRious({
                element: qrCanvas,
                size: 200,
                background: 'transparent',
                foreground: '#fff',
                level: 'M'
            });
        }
        qrInstance.value = joinUrl;
        
        startPolling();
    }

    btnStart.addEventListener("click", async () => {
        await updateState("playing", 0);
        showQuestion(0);
    });

    btnNext.addEventListener("click", async () => {
        if (currentQuestionIndex < questions.length - 1) {
            await updateState("playing", currentQuestionIndex + 1);
            showQuestion(currentQuestionIndex + 1);
        }
    });

    btnFinish.addEventListener("click", async () => {
        await updateState("finished", currentQuestionIndex);
        showResults();
    });

    btnNewGame.addEventListener("click", () => {
        clearInterval(pollInterval);
        location.reload();
    });

    async function updateState(status, index) {
        try {
            await fetch('/api/game', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "state", pin: currentPin, status, index })
            });
        } catch (e) {
            console.error("Error updating state", e);
        }
    }

    function showQuestion(index) {
        currentQuestionIndex = index;
        sectionLobby.style.display = "none";
        sectionPlaying.style.display = "block";
        
        document.getElementById("question-counter").textContent = `Pregunta ${index + 1} de ${questions.length}`;
        document.getElementById("current-question").textContent = questions[index] || "Pregunta...";

        if (index === questions.length - 1) {
            btnNext.style.display = "none";
            btnFinish.style.display = "inline-flex";
        }
    }

    async function showResults() {
        sectionPlaying.style.display = "none";
        sectionResults.style.display = "block";
        clearInterval(pollInterval);

        document.getElementById("status-subtitle").textContent = "Resultados Finales";

        try {
            const res = await fetch(`/api/game?action=results&pin=${currentPin}`);
            const data = await res.json();
            
            const rankingList = document.getElementById("ranking-list");
            rankingList.innerHTML = "";

            if (data.ok && data.results) {
                data.results.forEach((r, idx) => {
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
                    
                    if (idx < 3) {
                         li.style.background = "rgba(192, 38, 211, 0.1)";
                         li.style.borderColor = "rgba(192, 38, 211, 0.6)";
                    }
                    rankingList.appendChild(li);
                });
                
                if (typeof confetti === 'function') {
                    confetti({
                        particleCount: 200,
                        spread: 100,
                        origin: { y: 0.6 },
                        colors: ['#c026d3', '#7c3aed', '#e879f9', '#ffffff']
                    });
                }
            } else {
                rankingList.innerHTML = "<li>No hay resultados</li>";
            }
        } catch (e) {
            console.error(e);
        }
    }

    function startPolling() {
        pollInterval = setInterval(async () => {
            if (!currentPin) return;
            try {
                const res = await fetch(`/api/game?action=poll_host&pin=${currentPin}`);
                const data = await res.json();
                if (data.ok && data.session) {
                    // Actualizar UI del Admin (por ejemplo conteo de votos de la pregunta actual)
                    if (data.session.status === 'playing' && sectionPlaying.style.display === 'block') {
                         document.getElementById("votes-count").textContent = data.votesCount || 0;
                    }
                }
            } catch (e) {}
        }, 2000);
    }
});
