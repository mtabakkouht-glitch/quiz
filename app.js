/* === STATE === */
const state = {
    quizzes: [],
    currentQuiz: null,
    currentIndex: 0,
    answers: [],
    playQuestions: [],
    pickCount: 10,
    timerInterval: null,
    timeLeft: 0,
    editingId: null
};

/* === INIT === */
document.addEventListener('DOMContentLoaded', () => {
    loadQuizzes();
    renderHome();
    checkUrlForQuiz();
});

/* === NAVIGATION === */
function goTo(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById('view-' + viewId);
    if (el) el.classList.add('active');

    if (viewId === 'home') {
        renderHome();
        state.editingId = null;
    }
    if (viewId === 'creator') initCreator();
}

/* === LOCAL STORAGE === */
function loadQuizzes() {
    try {
        state.quizzes = JSON.parse(localStorage.getItem('quizapp_quizzes')) || [];
    } catch {
        state.quizzes = [];
    }
}

function saveQuizzesToStorage() {
    try {
        localStorage.setItem('quizapp_quizzes', JSON.stringify(state.quizzes));
    } catch { /* storage full or unavailable */ }
}

/* === HOME === */
function renderHome() {
    const list = document.getElementById('quiz-list');
    const empty = document.getElementById('no-quizzes');

    if (state.quizzes.length === 0) {
        list.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    list.innerHTML = state.quizzes.map((q, i) => `
        <div class="quiz-card">
            <div class="quiz-card-info">
                <h3>${esc(q.title)}</h3>
                <span>${q.questions.length} pregunta${q.questions.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="quiz-card-actions">
                <button class="btn-play" title="Jugar" onclick="playQuiz(${i})">▶</button>
                <button class="btn-share" title="Compartir" onclick="shareQuiz(${i})">🔗</button>
                <button class="btn-edit" title="Editar" onclick="editQuiz(${i})">✏️</button>
                <button class="btn-delete" title="Eliminar" onclick="deleteQuiz(${i})">🗑️</button>
            </div>
        </div>
    `).join('');
}

/* === CREATOR === */
let questionCount = 0;

function initCreator() {
    const container = document.getElementById('questions-container');
    const titleInput = document.getElementById('quiz-title');

    if (state.editingId !== null) {
        const quiz = state.quizzes[state.editingId];
        titleInput.value = quiz.title;
        container.innerHTML = '';
        questionCount = 0;
        quiz.questions.forEach(q => addQuestion(q));
    } else {
        titleInput.value = '';
        container.innerHTML = '';
        questionCount = 0;
        addQuestion();
    }
}

function addQuestion(data) {
    questionCount++;
    const idx = questionCount;
    const container = document.getElementById('questions-container');
    const div = document.createElement('div');
    div.className = 'question-card';
    div.id = 'q-card-' + idx;

    const correct = data ? data.correct : 0;

    div.innerHTML = `
        <div class="question-card-header">
            <h3>Pregunta ${idx}</h3>
            <button onclick="removeQuestion(${idx})" title="Eliminar">🗑️</button>
        </div>
        <textarea placeholder="Escribe la pregunta..." id="q-text-${idx}">${data ? esc(data.text) : ''}</textarea>
        <div class="options-creator">
            ${[0,1,2,3].map(o => `
                <div class="option-input-wrap ${o === correct ? 'correct' : ''}" id="opt-wrap-${idx}-${o}">
                    <input type="radio" name="correct-${idx}" class="option-radio"
                        value="${o}" ${o === correct ? 'checked' : ''}
                        onchange="markCorrect(${idx}, ${o})">
                    <input type="text" placeholder="Opción ${o + 1}"
                        id="opt-${idx}-${o}"
                        value="${data ? esc(data.options[o] || '') : ''}">
                </div>
            `).join('')}
        </div>
        <div class="timer-select">
            <label>⏱️ Tiempo:</label>
            <select id="q-time-${idx}">
                ${[10,15,20,30,45,60].map(t =>
                    `<option value="${t}" ${data && data.time === t ? 'selected' : (!data && t === 30 ? 'selected' : '')}>${t}s</option>`
                ).join('')}
            </select>
        </div>
    `;

    container.appendChild(div);
    div.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function removeQuestion(idx) {
    const card = document.getElementById('q-card-' + idx);
    if (card) {
        card.style.animation = 'fadeIn 0.2s ease reverse';
        setTimeout(() => card.remove(), 200);
    }
}

function markCorrect(qIdx, optIdx) {
    for (let i = 0; i < 4; i++) {
        const wrap = document.getElementById(`opt-wrap-${qIdx}-${i}`);
        if (wrap) wrap.classList.toggle('correct', i === optIdx);
    }
}

function saveQuiz() {
    const title = document.getElementById('quiz-title').value.trim();
    if (!title) {
        alert('Escribe un título para el quiz');
        return;
    }

    const cards = document.querySelectorAll('.question-card');
    if (cards.length === 0) {
        alert('Añade al menos una pregunta');
        return;
    }

    const questions = [];
    let valid = true;

    cards.forEach(card => {
        const id = card.id.replace('q-card-', '');
        const text = document.getElementById('q-text-' + id).value.trim();
        const options = [0,1,2,3].map(o =>
            document.getElementById(`opt-${id}-${o}`).value.trim()
        );
        const correctRadio = card.querySelector(`input[name="correct-${id}"]:checked`);
        const correct = correctRadio ? parseInt(correctRadio.value) : 0;
        const time = parseInt(document.getElementById('q-time-' + id).value);

        if (!text) { valid = false; alert('Hay preguntas sin texto'); return; }
        if (options.some(o => !o)) { valid = false; alert('Rellena todas las opciones de cada pregunta'); return; }

        questions.push({ text, options, correct, time });
    });

    if (!valid || questions.length === 0) return;

    const quiz = {
        id: state.editingId !== null ? state.quizzes[state.editingId].id : Date.now().toString(36),
        title,
        questions,
        created: state.editingId !== null ? state.quizzes[state.editingId].created : new Date().toISOString()
    };

    if (state.editingId !== null) {
        state.quizzes[state.editingId] = quiz;
    } else {
        state.quizzes.push(quiz);
    }

    saveQuizzesToStorage();
    state.editingId = null;

    const link = generateLink(quiz);
    showShareModal(link);
    goTo('home');
}

/* === SHARE === */
function generateLink(quiz) {
    const data = JSON.stringify({
        t: quiz.title,
        q: quiz.questions.map(q => ({
            x: q.text,
            o: q.options,
            c: q.correct,
            s: q.time
        }))
    });
    const encoded = btoa(unescape(encodeURIComponent(data)));
    return window.location.origin + window.location.pathname + '#q=' + encoded;
}

function shareQuiz(index) {
    const quiz = state.quizzes[index];
    const link = generateLink(quiz);
    showShareModal(link);
}

function showShareModal(link) {
    document.getElementById('share-link').value = link;
    document.getElementById('copy-feedback').classList.add('hidden');
    document.getElementById('modal-share').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal-share').classList.add('hidden');
}

function copyLink() {
    const input = document.getElementById('share-link');
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
        document.getElementById('copy-feedback').classList.remove('hidden');
        setTimeout(() => document.getElementById('copy-feedback').classList.add('hidden'), 3000);
    });
}

/* === EDIT / DELETE === */
function editQuiz(index) {
    state.editingId = index;
    goTo('creator');
}

function deleteQuiz(index) {
    if (!confirm('¿Eliminar este quiz?')) return;
    state.quizzes.splice(index, 1);
    saveQuizzesToStorage();
    renderHome();
}

/* === PLAY === */
function playQuiz(index) {
    state.currentQuiz = state.quizzes[index];
    showLobby();
}

function checkUrlForQuiz() {
    const hash = window.location.hash;
    if (!hash.startsWith('#q=')) return;

    try {
        const encoded = hash.slice(3);
        const json = decodeURIComponent(escape(atob(encoded)));
        const data = JSON.parse(json);

        state.currentQuiz = {
            title: data.t,
            questions: data.q.map(q => ({
                text: q.x,
                options: q.o,
                correct: q.c,
                time: q.s
            }))
        };

        showLobby();
    } catch {
        console.error('Enlace de quiz inválido');
    }
}

function showLobby() {
    const total = state.currentQuiz.questions.length;
    document.getElementById('lobby-title').textContent = state.currentQuiz.title;
    document.getElementById('lobby-info').textContent = `${total} preguntas en el banco`;

    const pickContainer = document.getElementById('lobby-pick');
    const pickOptions = document.getElementById('pick-options');

    if (total > 10) {
        pickContainer.classList.remove('hidden');
        const amounts = [5, 10, 15, 20, 25].filter(n => n <= total);
        if (!amounts.includes(total)) amounts.push(total);

        state.pickCount = Math.min(10, total);

        pickOptions.innerHTML = amounts.map(n => `
            <button class="pick-btn ${n === state.pickCount ? 'active' : ''}"
                onclick="setPick(${n})">${n === total ? 'Todas' : n}</button>
        `).join('');
    } else {
        pickContainer.classList.add('hidden');
        state.pickCount = total;
    }

    goTo('lobby');
}

function setPick(n) {
    state.pickCount = n;
    document.querySelectorAll('.pick-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.textContent) === n || (btn.textContent === 'Todas' && n === state.currentQuiz.questions.length));
    });
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function startPlaying() {
    state.currentIndex = 0;
    state.answers = [];

    const all = state.currentQuiz.questions;
    if (state.pickCount < all.length) {
        state.playQuestions = shuffle(all).slice(0, state.pickCount);
    } else {
        state.playQuestions = shuffle(all);
    }

    goTo('player');
    showQuestion();
}

function showQuestion() {
    const q = state.playQuestions[state.currentIndex];
    const total = state.playQuestions.length;

    document.getElementById('question-counter').textContent =
        `${state.currentIndex + 1} / ${total}`;

    document.getElementById('progress-fill').style.width =
        ((state.currentIndex / total) * 100) + '%';

    document.getElementById('question-text').textContent = q.text;

    const grid = document.getElementById('options-grid');
    grid.innerHTML = q.options.map((opt, i) => `
        <button class="option-btn" onclick="selectAnswer(${i})">${esc(opt)}</button>
    `).join('');

    startTimer(q.time);
}

function selectAnswer(selected) {
    clearInterval(state.timerInterval);

    const q = state.playQuestions[state.currentIndex];
    const elapsed = q.time - state.timeLeft;
    const isCorrect = selected === q.correct;

    state.answers.push({
        selected,
        correct: q.correct,
        isCorrect,
        time: elapsed
    });

    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach((btn, i) => {
        btn.classList.add('disabled');
        if (i === q.correct) btn.classList.add('correct');
        if (i === selected && !isCorrect) btn.classList.add('wrong');
    });

    setTimeout(() => {
        state.currentIndex++;
        if (state.currentIndex < state.playQuestions.length) {
            showQuestion();
        } else {
            showResults();
        }
    }, 1200);
}

/* === TIMER === */
function startTimer(seconds) {
    state.timeLeft = seconds;
    const totalTime = seconds;
    const circumference = 2 * Math.PI * 36;

    const ring = document.getElementById('timer-ring-progress');
    const text = document.getElementById('timer-text');

    ring.style.strokeDashoffset = '0';
    ring.classList.remove('urgent');
    text.classList.remove('urgent');
    text.textContent = seconds;

    clearInterval(state.timerInterval);

    state.timerInterval = setInterval(() => {
        state.timeLeft--;
        text.textContent = state.timeLeft;

        const progress = 1 - (state.timeLeft / totalTime);
        ring.style.strokeDashoffset = (circumference * progress).toString();

        if (state.timeLeft <= 5) {
            ring.classList.add('urgent');
            text.classList.add('urgent');
        }

        if (state.timeLeft <= 0) {
            clearInterval(state.timerInterval);
            selectAnswer(-1);
        }
    }, 1000);
}

/* === RESULTS === */
function showResults() {
    goTo('results');

    const total = state.answers.length;
    const correct = state.answers.filter(a => a.isCorrect).length;
    const pct = Math.round((correct / total) * 100);

    const circumference = 2 * Math.PI * 54;
    const ring = document.getElementById('score-ring');
    ring.style.strokeDashoffset = circumference.toString();

    document.getElementById('score-text').textContent = `${pct}%`;

    const label = pct === 100 ? '¡Perfecto! 🌟' :
                  pct >= 80 ? '¡Genial! 🎉' :
                  pct >= 60 ? '¡Bien hecho! 👏' :
                  pct >= 40 ? 'Puedes mejorar 💪' :
                  'Sigue practicando 📚';
    document.getElementById('score-label').textContent = `${correct}/${total} correctas — ${label}`;

    requestAnimationFrame(() => {
        ring.style.strokeDashoffset = (circumference * (1 - pct / 100)).toString();
    });

    const detail = document.getElementById('results-detail');
    detail.innerHTML = state.answers.map((a, i) => {
        const q = state.playQuestions[i];
        return `
            <div class="result-row ${a.isCorrect ? 'is-correct' : 'is-wrong'}">
                <span class="result-icon">${a.isCorrect ? '✅' : '❌'}</span>
                <span class="result-q" title="${esc(q.text)}">${esc(q.text)}</span>
                <span class="result-time">${a.time}s</span>
            </div>
        `;
    }).join('');

    if (pct >= 60) launchConfetti();
}

function retryQuiz() {
    showLobby();
}

/* === CONFETTI === */
function launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#6C63FF', '#FF6584', '#00C853', '#FFD600', '#1368CE', '#E21B3C'];
    const pieces = Array.from({ length: 100 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 10 + 5,
        h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        vy: Math.random() * 3 + 2,
        vx: (Math.random() - 0.5) * 2,
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 10
    }));

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let active = false;

        pieces.forEach(p => {
            if (p.y > canvas.height + 20) return;
            active = true;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05;
            p.rot += p.vr;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rot * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        });

        frame++;
        if (active && frame < 300) {
            requestAnimationFrame(draw);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    draw();
}

/* === IMPORT === */
function showImportModal() {
    document.getElementById('import-title').value = '';
    document.getElementById('import-text').value = '';
    document.getElementById('import-error').classList.add('hidden');
    document.getElementById('modal-import').classList.remove('hidden');
}

function closeImportModal() {
    document.getElementById('modal-import').classList.add('hidden');
}

function importQuestions() {
    const title = document.getElementById('import-title').value.trim();
    const raw = document.getElementById('import-text').value.trim();
    const time = parseInt(document.getElementById('import-time').value);
    const errorEl = document.getElementById('import-error');

    if (!title) {
        showImportError('Escribe un título para el quiz');
        return;
    }
    if (!raw) {
        showImportError('Pega las preguntas');
        return;
    }

    let questions;
    const trimmed = raw.trimStart();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        questions = parseJSON(trimmed, time);
    } else {
        questions = parseText(raw, time);
    }

    if (!questions) return;
    if (questions.length === 0) {
        showImportError('No se encontraron preguntas válidas');
        return;
    }

    const quiz = {
        id: Date.now().toString(36),
        title,
        questions,
        created: new Date().toISOString()
    };

    state.quizzes.push(quiz);
    saveQuizzesToStorage();
    closeImportModal();
    renderHome();

    const link = generateLink(quiz);
    showShareModal(link);
}

function parseText(raw, defaultTime) {
    const blocks = raw.split(/\n\s*\n/).filter(b => b.trim());
    const questions = [];

    for (const block of blocks) {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 3) continue;

        let answerFromFooter = -1;
        let filteredLines = lines.filter(line => {
            const m = line.match(/^(?:respuesta|answer|correcta|correct)\s*[:=]\s*(.+)/i);
            if (m) {
                const val = m[1].trim().replace(/^[*\s]+/, '');
                const letter = val.match(/^([a-dA-D])[\.\)\s]*$/);
                if (letter) {
                    answerFromFooter = letter[1].toLowerCase().charCodeAt(0) - 97;
                } else {
                    answerFromFooter = val;
                }
                return false;
            }
            return true;
        });

        if (filteredLines.length < 3) continue;

        const questionLine = filteredLines[0]
            .replace(/^\d+[\.\)\-:]\s*/, '')
            .replace(/^\*\*(.+?)\*\*\.?\s*$/, '$1')
            .replace(/^#+\s*/, '')
            .trim();

        const optionLines = filteredLines.slice(1);
        const options = [];
        let correct = 0;
        let foundCorrect = false;

        optionLines.forEach((line, i) => {
            let text = line
                .replace(/^[a-dA-D][\.\)\-:]\s*/, '')
                .replace(/^\d+[\.\)\-:]\s*/, '')
                .replace(/^[-–—•]\s*/, '');

            let isCorrect = false;

            if (text.startsWith('*')) {
                text = text.slice(1).trim();
                isCorrect = true;
            }

            text = text
                .replace(/\s*[✓✔✅☑]\s*$/, () => { isCorrect = true; return ''; })
                .replace(/\s*\((?:correcta|correct|verdadera|right|respuesta)\)\s*$/i, () => { isCorrect = true; return ''; })
                .replace(/\s*←?\s*(?:correcta|correct)\s*$/i, () => { isCorrect = true; return ''; })
                .replace(/\*\*(.+?)\*\*/, (_, inner) => { isCorrect = true; return inner; })
                .trim();

            if (isCorrect && !foundCorrect) {
                correct = i;
                foundCorrect = true;
            }

            if (text) options.push(text);
        });

        if (!foundCorrect && typeof answerFromFooter === 'number' && answerFromFooter >= 0) {
            correct = answerFromFooter;
        } else if (!foundCorrect && typeof answerFromFooter === 'string') {
            const idx = options.findIndex(o =>
                o.toLowerCase().trim() === answerFromFooter.toLowerCase().trim()
            );
            if (idx >= 0) correct = idx;
        }

        if (options.length >= 2) {
            while (options.length < 4) options.push('—');

            questions.push({
                text: questionLine,
                options: options.slice(0, 4),
                correct: Math.min(correct, 3),
                time: defaultTime
            });
        }
    }

    if (questions.length === 0) {
        showImportError('No se pudo interpretar el formato. Revisa que cada pregunta tenga opciones y una marcada con *');
    }

    return questions;
}

function parseJSON(raw, defaultTime) {
    try {
        let data = JSON.parse(raw);
        if (!Array.isArray(data)) {
            if (data.questions) data = data.questions;
            else if (data.preguntas) data = data.preguntas;
            else { showImportError('El JSON debe ser un array de preguntas'); return null; }
        }

        return data.map(q => {
            const text = q.text || q.pregunta || q.question || q.enunciado || '';
            const options = q.options || q.opciones || q.answers || q.respuestas || [];
            let correct = q.correct ?? q.correcta ?? q.answer ?? q.respuesta ?? 0;

            if (typeof correct === 'string') {
                const idx = options.findIndex(o =>
                    o.toLowerCase().trim() === correct.toLowerCase().trim()
                );
                correct = idx >= 0 ? idx : 0;
            }

            const time = q.time || q.tiempo || q.seconds || q.segundos || defaultTime;

            return { text, options: options.slice(0, 4), correct, time };
        }).filter(q => q.text && q.options.length >= 2);
    } catch {
        showImportError('El JSON no es válido. Revisa el formato.');
        return null;
    }
}

function copyPromptHint() {
    const el = document.getElementById('prompt-hint-text');
    navigator.clipboard.writeText(el.textContent.trim()).then(() => {
        const fb = document.getElementById('hint-copy-feedback');
        fb.classList.remove('hidden');
        setTimeout(() => fb.classList.add('hidden'), 2000);
    });
}

function showImportError(msg) {
    const el = document.getElementById('import-error');
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 5000);
}

/* === UTILS === */
function esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
