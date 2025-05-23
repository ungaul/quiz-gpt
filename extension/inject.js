const OPENAI_API_KEY = window.__OPENAI_API_KEY__;

if (!OPENAI_API_KEY) {
    alert("API key not found.");
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

function findQuestionText(element) {
    const textSelectors = ['.qtext', '[class*="question-text"]', '[class*="prompt"]', 'h1, h2, h3, h4, h5, h6', 'p', 'div'];
    for (const selector of textSelectors) {
        const elements = element.querySelectorAll(selector);
        for (const el of elements) {
            const text = el.textContent.trim();
            if (text && text.length > 5 && text.length < 1000 && !el.querySelector('input')) {
                return text;
            }
        }
    }
    return null;
}

function findInputs(element) {
    const inputs = [];
    const answerBlocks = element.querySelectorAll('.ablock, fieldset, [class*="answer"]');
    answerBlocks.forEach(block => {
        const allInputs = block.querySelectorAll('input, textarea, [contenteditable="true"]');
        allInputs.forEach(input => {
            if (!isElementUsable(input)) return;

            if (input.type === 'text' || input.tagName === 'TEXTAREA' || input.getAttribute('contenteditable') === 'true') {
                inputs.push({ element: input, type: QUESTION_TYPES.TEXT });
            } else if (input.type === 'checkbox' || input.type === 'radio') {
                const label = findLabel(input);
                inputs.push({ element: input, type: input.type, label });
            }
        });
    });
    return inputs;
}

function findLabel(input) {
    const id = input.id;
    if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) return label.textContent.trim();
    }
    const parent = input.parentElement;
    if (parent) {
        const label = parent.querySelector('label');
        if (label) return label.textContent.trim();
        const text = Array.from(parent.childNodes).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent.trim()).join(' ').trim();
        if (text) return text;
    }
    const nextSibling = input.nextElementSibling;
    if (nextSibling && nextSibling.nodeType === Node.TEXT_NODE) {
        return nextSibling.textContent.trim();
    }
    return '';
}

function hasPreexistingAnswer(inputs) {
    return inputs.some(input => {
        if (input.type === QUESTION_TYPES.TEXT) {
            return input.element.value.trim().length > 0;
        } else if (input.type === 'checkbox' || input.type === 'radio') {
            return input.element.checked;
        }
        return false;
    });
}

function findQuestionBlocks() {
    const blocks = [];
    const questionSelectors = ['.que', '[id^="question-"]', '[class*="question"]', 'div[class*="quiz"]', 'form[class*="quiz"]'];
    for (const selector of questionSelectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            const questionText = findQuestionText(element);
            const inputs = findInputs(element);
            if (questionText && inputs.length > 0 && !hasPreexistingAnswer(inputs)) {
                blocks.push({ element, questionText, inputs });
            }
        });
    }
    console.log(`Found ${blocks.length} unanswered question blocks`);
    return blocks;
}

async function typeHumanLike(element, text) {
    const typingSpeed = Math.random() * 50 + 50;
    const mistakes = Math.random() < 0.1;
    if (mistakes) {
        const mistakeIndex = Math.floor(Math.random() * text.length);
        const mistakeChar = String.fromCharCode(text.charCodeAt(mistakeIndex) + 1);
        element.value = text.substring(0, mistakeIndex) + mistakeChar;
        await new Promise(resolve => setTimeout(resolve, typingSpeed * 2));
        element.value = text.substring(0, mistakeIndex);
        await new Promise(resolve => setTimeout(resolve, typingSpeed));
    }
    for (let i = 0; i < text.length; i++) {
        element.value = text.substring(0, i + 1);
        await new Promise(resolve => setTimeout(resolve, typingSpeed));
    }
}

function formatQuestionForOpenAI(question) {
    let content = `You are a student answering a quiz question. Do not use any formatting like bold, bullet points, or markdown. Write casually and naturally like a student would. Do not restate the question.\n\n`;
    content += `Question: ${question.text}\nType: ${question.type}\n`;
    if (question.type !== QUESTION_TYPES.TEXT) {
        content += 'Choices:\n';
        question.inputs.forEach((input, index) => {
            content += `${String.fromCharCode(65 + index)}: ${input.label}\n`;
        });
        content += '\nGive the letter(s) of the best choice(s), like "A" or "B, D". Keep it simple.';
    } else {
        content += 'Give a short natural answer in one or two sentences.';
    }
    return { role: "user", content };
}

async function getAnswerFromOpenAI(question) {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [formatQuestionForOpenAI(question)],
                temperature: 0.7,
                max_tokens: 300
            })
        });
        const data = await response.json();
        const result = data.choices[0].message.content;
        console.log(`Answer received: ${result}`);
        return result;
    } catch (error) {
        console.error('Error getting answer from OpenAI:', error);
        return null;
    }
}

async function fillAnswers(answers) {
    for (const answer of answers) {
        console.log(`Filling answer for question type ${answer.type}`);
        if (answer.type === QUESTION_TYPES.TEXT) {
            await typeHumanLike(answer.inputs[0].element, answer.value);
        } else {
            const selectedOptions = answer.value.split(',').map(letter => letter.trim().toUpperCase());
            answer.inputs.forEach((input, i) => {
                if (selectedOptions.includes(String.fromCharCode(65 + i))) {
                    input.element.checked = true;
                }
            });
        }
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    }
}

async function processQuiz() {
    const blocks = findQuestionBlocks();
    if (blocks.length === 0) {
        alert('No usable quiz questions found on this page.');
        return;
    }

    const answers = [];
    for (const block of blocks) {
        try {
            const question = {
                text: block.questionText,
                type: block.inputs[0].type,
                inputs: block.inputs
            };
            console.log(`Processing question: ${question.text}`);
            const answer = await getAnswerFromOpenAI(question);
            if (answer) {
                answers.push({
                    type: question.type,
                    value: answer,
                    inputs: question.inputs
                });
            }
        } catch (error) {
            console.error('Error processing question:', error);
            break;
        }
    }

    await fillAnswers(answers);
}

processQuiz();
