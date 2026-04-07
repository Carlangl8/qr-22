document.addEventListener("DOMContentLoaded", () => {
    const screenJoin = document.getElementById("screen-join");
    const screenLobby = document.getElementById("screen-lobby");
    const screenQuestion = document.getElementById("screen-question");
    const screenWaitingNext = document.getElementById("screen-waiting-next");
    const screenFinished = document.getElementById("screen-finished");

    const inputPin = document.getElementById("input-pin");
    const inputName = document.getElementById("input-name");
    const btnJoin = document.getElementById("btn-join");
    
    const displayName = document.getElementById("display-name");
    const questionBadge = document.getElementById("question-badge");
    const questionText = document.getElementById("question-text");
    const guestsGrid = document.getElementById("guests-grid");

    let currentPin = "";
    let playerName = "";
    let guests = [];
    let pollInterval = null;
    let expectedQuestionIndex = 0; // The question we are currently answering/waiting for
    let hasVotedCurrent = false;

    // Colores tipo Kahoot (versión Euphoria)
    const buttonColors = [
        "linear-gradient(45deg, #FF6B6B, #EE5253)", // rojo/coral
        "linear-gradient(45deg, #48DBFB, #0ABDE3)", // cyan
        "linear-gradient(45deg, #1DD1A1, #10AC84)", // verde menta
        "linear-gradient(45deg, #FECA57, #FF9F43)", // amarillo/naranja
        "linear-gradient(45deg, #FF9FF3, #F368E0)", // rosa
        "linear-gradient(45deg, #5F27CD, #341F97)"  // morado oscuro
    ];

    // Auto-fill PIN form URL param
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('pin')) {
        inputPin.value = urlParams.get('pin').toUpperCase();
    }

    async function submitVote(guestId, buttonEl) {
        if (hasVotedCurrent) return;
        
        buttonEl.style.transform = "scale(0.9)";
        buttonEl.textContent = "✔ Enviando...";

        try {
            const res = await fetch('/api/game', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    action: "vote", 
                    pin: currentPin, 
                    participant_name: playerName, 
                    question_index: expectedQuestionIndex,
                    voted_guest_id: guestId
                })
            });
            const data = await res.json();
            
            if (data.ok) {
                hasVotedCurrent = true;
                showWaitingNext();
            } else {
                alert("Hubo un error: " + data.mensaje);
                buttonEl.style.transform = "none";
                buttonEl.textContent = "Intentar de nuevo";
            }
        } catch (e) {
            alert("Error de red");
            buttonEl.style.transform = "none";
        }
    }

    async function loadGuests() {
        try {
            const res = await fetch('/api/invitados');
            const data = await res.json();
            if (data.ok && data.invitados) {
                guests = data.invitados.filter(g => g && g.nombre && g.nombre.trim() !== "");
                
                const sortedGuests = [...guests].sort((a,b) => a.nombre.localeCompare(b.nombre));
                sortedGuests.forEach((g, index) => {
                    const btn = document.createElement("button");
                    btn.className = "btn";
                    btn.textContent = g.nombre;
                    btn.dataset.name = g.nombre;
                    btn.style.width = "100%";
                    btn.style.height = "100px";
                    btn.style.fontSize = "1.1rem";
                    btn.style.fontWeight = "bold";
                    btn.style.color = "#fff";
                    btn.style.border = "2px solid rgba(255,255,255,0.2)";
                    btn.style.borderRadius = "12px";
                    btn.style.boxShadow = "0 8px 15px rgba(0,0,0,0.3)";
                    
                    // Asignar color secuencial
                    btn.style.background = buttonColors[index % buttonColors.length];
                    
                    btn.addEventListener("click", () => submitVote(g.id, btn));
                    
                    guestsGrid.appendChild(btn);
                });
            }
        } catch (e) {}
    }
    loadGuests();

    btnJoin.addEventListener("click", async () => {
        const pin = inputPin.value.trim().toUpperCase();
        const name = inputName.value.trim();
        
        if (!pin || !name) {
            alert("Por favor, ingresa el PIN y tu nombre.");
            return;
        }

        currentPin = pin;
        playerName = name;

        // Optionally, check if PIN is valid immediately
        btnJoin.disabled = true;
        btnJoin.textContent = "Conectando...";
        
        try {
            const res = await fetch('/api/game', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "join", pin: currentPin, participant_name: playerName })
            });
            const data = await res.json();
            
            if (data.ok) {
                screenJoin.style.display = "none";
                screenLobby.style.display = "block";
                displayName.textContent = playerName;
                startPolling();
            } else {
                alert("Error al intentar unirse: " + (data.mensaje || "PIN inválido"));
            }
        } catch(e) {
            alert("Error de conexión");
        } finally {
            btnJoin.disabled = false;
            btnJoin.textContent = "Entrar al Juego";
        }
    });

    function showQuestion(qText) {
        screenLobby.style.display = "none";
        screenWaitingNext.style.display = "none";
        screenQuestion.style.display = "block";
        
        questionBadge.textContent = "Pregunta " + (expectedQuestionIndex + 1);
        questionText.textContent = qText;
        
        // Restaurar estado de los botones
        const buttons = document.querySelectorAll("#guests-grid .btn");
        buttons.forEach(btn => {
            btn.style.transform = "none";
            if (btn.dataset.name) {
                btn.textContent = btn.dataset.name;
            }
        });
    }

    function showWaitingNext() {
        screenQuestion.style.display = "none";
        screenWaitingNext.style.display = "block";
    }

    function startPolling() {
        pollInterval = setInterval(async () => {
            try {
                const res = await fetch(`/api/game?action=poll_player&pin=${currentPin}`);
                const data = await res.json();
                
                if (data.ok && data.session) {
                    const status = data.session.status;
                    const idx = data.session.current_question_index;
                    
                    if (status === 'finished') {
                        clearInterval(pollInterval);
                        screenLobby.style.display = "none";
                        screenQuestion.style.display = "none";
                        screenWaitingNext.style.display = "none";
                        screenFinished.style.display = "block";
                        return;
                    }

                    if (status === 'playing') {
                        // Detect if host advanced to next question
                        if (idx > expectedQuestionIndex) {
                            expectedQuestionIndex = idx;
                            hasVotedCurrent = false;
                        }

                        // If we are playing, and haven't voted for THIS question, show it
                        if (!hasVotedCurrent) {
                            showQuestion(data.question || "Pregunta...");
                        } else {
                            // If voted, remain on waiting screen (which is already set)
                        }
                    }
                }
            } catch (e) {}
        }, 2000);
    }
});
