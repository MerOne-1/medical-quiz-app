let quizData = [];
let currentQuestionIndex = 0;
let score = 0;

function importQuiz() {
    const fileInput = document.getElementById('quiz-file');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a file first!');
        return;
    }

    // Check if it's a JSON file
    if (!file.name.toLowerCase().endsWith('.json')) {
        alert('Please select a JSON file');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const text = e.target.result;
            quizData = JSON.parse(text);
            
            if (Array.isArray(quizData) && quizData.length > 0) {
                // Validate the format of each question
                const isValid = quizData.every(item => 
                    item.question && 
                    Array.isArray(item.options) && 
                    Array.isArray(item.correctAnswers) &&
                    item.options.length > 0 &&
                    item.correctAnswers.every(index => index >= 0 && index < item.options.length)
                );
                
                if (!isValid) {
                    throw new Error('Invalid quiz format: Each question must have a question text, options array, and valid correctAnswers array');
                }
                
                document.getElementById('file-upload-section').style.display = 'none';
                document.getElementById('quiz-section').style.display = 'block';
                document.getElementById('total-questions').textContent = quizData.length;
                console.log('Successfully loaded', quizData.length, 'questions');
                startQuiz();
            } else {
                throw new Error('No valid quiz data found in the file!');
            }
        } catch (error) {
            console.error('Error parsing file:', error);
            alert('Error loading quiz file: ' + error.message);
        }
    };
    
    reader.onerror = function(e) {
        console.error('Error reading file:', e);
        alert('Error reading file: ' + e.target.error);
    };
    
    reader.readAsText(file);
}

function parseQuizData(text) {
    try {
        quizData = JSON.parse(text);
        
        if (Array.isArray(quizData) && quizData.length > 0) {
            // Validate the format
            const isValid = quizData.every(item => 
                item.question && 
                Array.isArray(item.options) && 
                Array.isArray(item.correctAnswers)
            );
            
            if (!isValid) {
                throw new Error('Invalid quiz format');
            }
            
            document.getElementById('file-upload-section').style.display = 'none';
            document.getElementById('quiz-section').style.display = 'block';
            document.getElementById('total-questions').textContent = quizData.length;
            startQuiz();
        } else {
            alert('No valid quiz data found in the file!');
        }
    } catch (error) {
        alert('Error parsing file. Please make sure it\'s a valid JSON file with the correct format.');
        console.error(error);
    }
}

function startQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    document.getElementById('score').textContent = score;
    showQuestion();
}

function showQuestion() {
    const question = quizData[currentQuestionIndex];
    document.getElementById('current-question').textContent = currentQuestionIndex + 1;
    document.getElementById('question').textContent = question.question;
    
    const optionsContainer = document.getElementById('options');
    optionsContainer.innerHTML = '';
    
    question.options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.innerHTML = `
            <input type="checkbox" id="option${index}" value="${index}">
            <label for="option${index}">${option}</label>
        `;
        optionsContainer.appendChild(optionDiv);
    });
    
    document.getElementById('check-answer').style.display = 'block';
    document.getElementById('next-question').style.display = 'none';
}

function checkAnswer() {
    const selectedOptions = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
        .map(checkbox => parseInt(checkbox.value));
    
    const question = quizData[currentQuestionIndex];
    const options = document.querySelectorAll('.option');
    
    // Mark correct and incorrect answers
    options.forEach((option, index) => {
        const isSelected = selectedOptions.includes(index);
        const isCorrect = question.correctAnswers.includes(index);
        
        if (isCorrect) {
            option.classList.add('correct');
        } else if (isSelected && !isCorrect) {
            option.classList.add('incorrect');
        }
    });
    
    // Check if arrays are equal (ignoring order)
    const isCorrect = selectedOptions.length === question.correctAnswers.length &&
        selectedOptions.every(value => question.correctAnswers.includes(value));
    
    if (isCorrect) {
        score++;
        document.getElementById('score').textContent = score;
    }
    
    // Disable all checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.disabled = true;
    });
    
    document.getElementById('check-answer').style.display = 'none';
    document.getElementById('next-question').style.display = 'block';
}

function nextQuestion() {
    currentQuestionIndex++;
    
    if (currentQuestionIndex < quizData.length) {
        showQuestion();
    } else {
        // Quiz completed
        const percentage = (score / quizData.length) * 100;
        alert(`Quiz completed!\nYour score: ${score}/${quizData.length} (${percentage.toFixed(1)}%)`);
        
        // Ask if they want to restart
        if (confirm('Would you like to try again?')) {
            startQuiz();
        } else {
            document.getElementById('file-upload-section').style.display = 'block';
            document.getElementById('quiz-section').style.display = 'none';
        }
    }
}

function restartQuiz() {
    if (confirm('Are you sure you want to restart the quiz?')) {
        startQuiz();
    }
}
