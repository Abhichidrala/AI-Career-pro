let questionsData = [];
let userInfo = {};
let quizMode = '';

document.addEventListener('DOMContentLoaded', () => {
    showSection('mode-selection-section');
});

document.addEventListener('click', (e) => {
    const targetId = e.target.id;
    const targetClass = e.target.className;

    switch (targetId) {
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

    questionsData.forEach((q, index) => {
        const questionItem = document.createElement('div');
        questionItem.className = 'question-item';
        questionItem.innerHTML = `
            <p><strong>${index + 1}.</strong> ${q.question}</p>
            <ul class="options-list">
                ${q.options.map(option => `
                    <li><label><input type="radio" name="question-${index}" value="${option}"> ${option}</label></li>
                `).join('')}
            </ul>
        `;
        questionsList.appendChild(questionItem);
    });
}

function handleSubmitAnswers() {
    let score = 0;
    const answersReviewList = document.getElementById('answers-review-list');
    answersReviewList.innerHTML = '';

    questionsData.forEach((q, index) => {
        const selectedOption = document.querySelector(`input[name="question-${index}"]:checked`);
        const userAnswer = selectedOption ? selectedOption.value : 'Not answered';
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
    
    reportSection.style.display = 'block';
    const canvas = await html2canvas(reportSection, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    reportSection.style.display = 'none';

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
    // Fill certificate data
    document.getElementById('certificate-name-pdf').textContent = userInfo.fullName;
    document.getElementById('certificate-role-pdf').textContent = userInfo.role;
    document.getElementById('certificate-date-pdf').textContent = new Date().toLocaleDateString();

    const pdfCertificate = document.getElementById('certificate-for-pdf');
    pdfCertificate.style.display = 'block';

    const canvas = await html2canvas(pdfCertificate, {
        scale: 2,
        backgroundColor: "#ffffff"
    });

    pdfCertificate.style.display = 'none';

    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${userInfo.fullName}_Certificate.pdf`);
    alert('Certificate downloaded!');
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
    showSection('mode-selection-section');
    const form = document.getElementById('assessment-form');
    if (form) {
      form.reset();
    }
}
