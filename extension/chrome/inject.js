const OPENAI_API_KEY = window.__OPENAI_API_KEY__;
if (!OPENAI_API_KEY) {
    showNotification("API key not found.", "error");
    throw new Error("API key missing.");
}
const QUESTION_TYPES = {
    TEXT: 'text',
    CHECKBOX: 'checkbox',
    RADIO: 'radio'
};
function isElementUsable(el) {
    const style = window.getComputedStyle(el);
    return !el.disabled && !el.readOnly && el.offsetParent !== null && style.visibility !== 'hidden';
}
function findLabel(input) {
    if (input.id) {
        const l = document.querySelector(`label[for="${input.id}"]`);
        if (l) return l.textContent.trim();
    }
    const p = input.parentElement;
    if (p) {
        const l = p.querySelector('label');
        if (l) return l.textContent.trim();
        const txt = Array.from(p.childNodes)
            .filter(n => n.nodeType === Node.TEXT_NODE)
            .map(n => n.textContent.trim())
            .join(' ')
            .trim();
        if (txt) return txt;
    }
    const ns = input.nextSibling;
    if (ns && ns.nodeType === Node.TEXT_NODE) return ns.textContent.trim();
    return '';
}
function getQuizBlocks() {
    const candidates = Array.from(document.querySelectorAll('input, textarea, select'));
    const blocks = new Set();
    candidates.forEach(el => {
        let node = el;
        while (node && node !== document.body) {
            if (
                node.querySelectorAll('input, textarea, select').length > 0 &&
                node.textContent.trim().length > 20
            ) {
                blocks.add(node);
                break;
            }
            node = node.parentElement;
        }
    });
    return Array.from(blocks);
}
function extractBlockData(block) {
    const textEls = Array.from(block.querySelectorAll('p,h1,h2,h3,h4,h5,h6,legend,div'))
        .filter(el => el.textContent.trim().length > 10 && !el.querySelector('input, textarea, select'));
    const questionText = textEls.length ? textEls[0].textContent.trim() : '';
    const images = Array.from(block.querySelectorAll('img')).map(img => img.src);
    const inputs = Array.from(block.querySelectorAll('input:not([type=hidden]), textarea, select'))
        .filter(isElementUsable)
        .map(el => {
            const type = el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.type === 'text'
                ? QUESTION_TYPES.TEXT
                : el.type;
            const label = findLabel(el);
            return { element: el, type, label };
        });
    return { block, questionText, images, inputs };
}
function typeLike(el, text, start = 0) {
    let p = Promise.resolve();
    for (let j = start; j < text.length; j++) {
        const char = text[j];
        let delay;
        if (char === ' ') {
            delay = 100 + Math.random() * 150;
        } else if (/[.?!]/.test(char) && (j === text.length - 1 || /\s/.test(text[j + 1]))) {
            delay = 250 + Math.random() * 300;
        } else {
            delay = 30 + Math.random() * 50;
        }
        p = p.then(() => {
            el.value = text.slice(0, j + 1);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            return new Promise(r => setTimeout(r, delay));
        });
    }
    return p;
}
function typeHumanLike(el, text) {
    const makeMistake = Math.random() < 0.1;
    if (makeMistake && text.length > 3) {
        const i = Math.floor(Math.random() * (text.length - 2)) + 1;
        const wrongChar = String.fromCharCode(text.charCodeAt(i) + 1);
        el.value = text.slice(0, i) + wrongChar;
        return new Promise(r => setTimeout(r, 100 + Math.random() * 200)).then(() => {
            el.value = text.slice(0, i);
            return new Promise(r2 => setTimeout(r2, 100 + Math.random() * 150));
        }).then(() => typeLike(el, text, i));
    }
    return typeLike(el, text, 0);
}
function formatQuestionForOpenAI(q) {
    let c = `You are a student answering a quiz question. Write casually and naturally like a student would. Do not restate the question.\n\n`;
    if (q.images.length) c += `[Image provided]\n`;
    c += `Question: ${q.questionText}\nType: ${q.inputs[0]?.type}\n`;
    if (q.inputs[0]?.type !== QUESTION_TYPES.TEXT) {
        c += 'Choices:\n';
        q.inputs.forEach((i, idx) => {
            c += `${String.fromCharCode(65 + idx)}: ${i.label}\n`;
        });
        c += '\nGive the letter(s) of the best choice(s).';
    } else {
        c += 'Give a short natural answer in one or two sentences.';
    }
    return { role: 'user', content: c };
}
async function getAnswerFromOpenAI(q) {
    const msg = [formatQuestionForOpenAI(q)];
    const body = {
        model: 'gpt-4o',
        messages: msg,
        temperature: 0.7,
        max_tokens: 2000
    };
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify(body)
    });
    const js = await res.json();
    return js.choices?.[0]?.message?.content || '';
}
async function fillAnswers(answers) {
    for (const a of answers) {
        if (a.type === QUESTION_TYPES.TEXT) {
            await typeHumanLike(a.element, a.value);
        } else {
            const sels = a.value.split(',').map(x => x.trim().toUpperCase());
            a.inputs.forEach((inp, i) => {
                if (sels.includes(String.fromCharCode(65 + i))) inp.element.checked = true;
            });
        }
        await new Promise(r => setTimeout(r, Math.random() * 1000 + 500));
    }
}
function showNotification(message, type = "info") {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 4px;
        color: white;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 100000;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out;
    `;

    switch(type) {
        case "error":
            notification.style.backgroundColor = "#dc3545";
            break;
        default:
            notification.style.backgroundColor = "#17a2b8";
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    setTimeout(() => {
        notification.style.animation = "fadeOut 0.3s ease-out";
        setTimeout(() => notification.remove(), 300);
    }, 50000);
}
async function processQuiz() {
    const blocks = getQuizBlocks().map(extractBlockData);
    if (blocks.length === 0) {
        showNotification("No quiz questions found on this page.", "error");
        return;
    }

    const answers = [];
    for (const q of blocks) {
        if (!q.questionText || !q.inputs.length) {
            continue;
        }
        const ans = await getAnswerFromOpenAI(q);
        if (!ans) {
            showNotification("Failed to get answer from OpenAI.", "error");
            continue;
        }
        answers.push({ type: q.inputs[0].type, inputs: q.inputs, element: q.inputs[0].element, value: ans });
    }

    if (answers.length === 0) {
        showNotification("No answers could be generated.", "error");
        return;
    }

    await fillAnswers(answers);
}
processQuiz();
