let questionsData = [];
let userInfo = {};
let quizMode = '';
let currentQuestionIndex = 0;
let userAnswers = [];

document.addEventListener('DOMContentLoaded', () => {
    showSection('welcome-section');
    typeWriterAnimation();
});

document.addEventListener('click', (e) => {
    const targetId = e.target.id;
    const targetClass = e.target.className;

    switch (targetId) {
        case 'start-btn-welcome':
            showSection('mode-selection-section');
            break;
        case 'ai-mode-btn':
            handleModeSelection('ai');
            break;
        case 'fallback-mode-btn':
            handleModeSelection('fallback');
            break;
        case 'start-assessment-btn':
            handleFormSubmit(e);
            break;
        case 'submit-answers-btn':
            handleSubmitAnswers();
            break;
        case 'next-question-btn':
            handleNextQuestion();
            break;
        case 'get-certificate-btn':
            handleGetCertificate();
            break;
        case 'download-report-btn':
            handleDownloadReport();
            break;
        case 'download-certificate-btn':
            handleDownloadCertificate();
            break;
        case 'restart-btn':
        case 'restart-from-certificate-btn':
            restartQuiz();
            break;
        case 'about-back-btn':
            showSection('mode-selection-section');
            break;
    }

    if (targetClass === 'about-link') {
        e.preventDefault();
        showSection('about-section');
    }
});


function showSection(sectionId) {
    const sections = document.querySelectorAll('main > .container > div');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'block';
}

function typeWriterAnimation() {
    const titleElement = document.getElementById('welcome-title');
    const text = "AI Career Path";
    let i = 0;
    
    function type() {
        if (i < text.length) {
            titleElement.textContent += text.charAt(i);
            i++;
            setTimeout(type, 100);
        } else {
            document.getElementById('start-btn-welcome').style.display = 'block';
        }
    }
    type();
}

function handleModeSelection(mode) {
    quizMode = mode;
    showSection('homepage-section');
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const form = document.getElementById('assessment-form');
    userInfo.fullName = form.fullName.value;
    userInfo.email = form.email.value;
    userInfo.role = form.role.value;
    userInfo.difficulty = form.difficulty.value;

    const startBtn = document.getElementById('start-assessment-btn');
    startBtn.disabled = true;
    startBtn.textContent = 'Generating questions...';

    try {
        const response = await fetch('http://localhost:4000/generate-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                role: userInfo.role,
                difficulty: userInfo.difficulty,
                mode: quizMode
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        questionsData = data.questions;

        currentQuestionIndex = 0;
        userAnswers = Array(questionsData.length).fill(null);

        displayQuestions();
        showSection('quiz-questions-section');

    } catch (error) {
        console.error('Failed to generate questions:', error);
        alert('Failed to generate questions. Please try again.');
        showSection('homepage-section');
    } finally {
        startBtn.disabled = false;
        startBtn.textContent = 'Start Assessment';
    }
}

function displayQuestions() {
    const questionsList = document.getElementById('questions-list');
    questionsList.innerHTML = '';
    document.getElementById('quiz-role').textContent = userInfo.role;
    document.getElementById('quiz-difficulty').textContent = userInfo.difficulty;

    const q = questionsData[currentQuestionIndex];
    const questionItem = document.createElement('div');
    questionItem.className = 'question-item';
    questionItem.innerHTML = `
        <p><strong>${currentQuestionIndex + 1}.</strong> ${q.question}</p>
        <ul class="options-list">
            ${q.options.map(option => `
                <li><label><input type="radio" name="question-${currentQuestionIndex}" value="${option}"> ${option}</label></li>
            `).join('')}
        </ul>
    `;
    questionsList.appendChild(questionItem);

    const nextBtn = document.createElement('button');
    nextBtn.id = 'next-question-btn';
    nextBtn.textContent = 'Next Question';
    questionsList.appendChild(nextBtn);

    // Show/hide buttons based on the current question
    if (currentQuestionIndex === questionsData.length - 1) {
        nextBtn.style.display = 'none';
        document.getElementById('submit-answers-btn').style.display = 'block';
    } else {
        nextBtn.style.display = 'block';
        document.getElementById('submit-answers-btn').style.display = 'none';
    }
}

function handleNextQuestion() {
    const selectedOption = document.querySelector(`input[name="question-${currentQuestionIndex}"]:checked`);
    userAnswers[currentQuestionIndex] = selectedOption ? selectedOption.value : 'Not answered';

    currentQuestionIndex++;
    if (currentQuestionIndex < questionsData.length) {
        displayQuestions();
    }
}

function handleSubmitAnswers() {
    // Save the final answer
    const selectedOption = document.querySelector(`input[name="question-${currentQuestionIndex}"]:checked`);
    userAnswers[currentQuestionIndex] = selectedOption ? selectedOption.value : 'Not answered';
    
    let score = 0;
    const answersReviewList = document.getElementById('answers-review-list');
    answersReviewList.innerHTML = '';

    questionsData.forEach((q, index) => {
        const userAnswer = userAnswers[index];
        const isCorrect = userAnswer === q.answer;

        if (isCorrect) {
            score++;
        }

        const reviewItem = document.createElement('div');
        reviewItem.className = 'review-item';
        reviewItem.innerHTML = `
            <p><strong>${index + 1}.</strong> ${q.question}</p>
            <p class="your-answer">Your Answer: ${userAnswer}</p>
            <p class="correct-answer">Correct Answer: ${q.answer}</p>
        `;
        answersReviewList.appendChild(reviewItem);
    });

    document.getElementById('report-name').textContent = userInfo.fullName;
    document.getElementById('report-role').textContent = userInfo.role;
    document.getElementById('report-score').textContent = score;

    showSection('report-page-section');
}

async function handleDownloadReport() {
    const reportSection = document.getElementById('report-page-section');
    
    const canvas = await html2canvas(reportSection, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps= pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${userInfo.fullName}_Assessment_Report.pdf`);
    alert('Report downloaded!');
}

async function handleDownloadCertificate() {
    const pdfCertificate = document.getElementById('certificate-for-pdf');

    // Fill certificate data
    document.getElementById('certificate-name-pdf').textContent = userInfo.fullName;
    document.getElementById('certificate-role-pdf').textContent = userInfo.role;
    document.getElementById('certificate-date-pdf').textContent = new Date().toLocaleDateString();

    // for temporarily visible off-screen
    pdfCertificate.style.display = 'block';
    pdfCertificate.style.position = 'absolute';
    pdfCertificate.style.left = '-9999px';
    pdfCertificate.style.top = '0';

    try {
        // Capture the certificate  with html2canvas
        const canvas = await html2canvas(pdfCertificate, {
            scale: 2,
            useCORS: true,
            backgroundColor: null
        });
        const imgData = canvas.toDataURL('image/png');

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('l', 'mm', 'a4');

        //  captured image directly to the PDF
        pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
        pdf.save(`${userInfo.fullName}_Certificate.pdf`);
        alert('Certificate downloaded!');
    } catch (err) {
        console.error('Error generating certificate:', err);
        alert('Failed to download certificate. Make sure the background image exists.');
    } finally {
        // Hide the div again
        pdfCertificate.style.display = 'none';
        pdfCertificate.style.position = '';
        pdfCertificate.style.left = '';
        pdfCertificate.style.top = '';
    }
}


function handleGetCertificate() {
    document.getElementById('certificate-name').textContent = userInfo.fullName;
    document.getElementById('certificate-role').textContent = userInfo.role;
    document.getElementById('certificate-date').textContent = new Date().toLocaleDateString();

    showSection('certificate-page-section');
}

function restartQuiz() {
    questionsData = [];
    userInfo = {};
    currentQuestionIndex = 0;
    userAnswers = [];
    showSection('mode-selection-section');
    const form = document.getElementById('assessment-form');
    if (form) {
      form.reset();
    }
}