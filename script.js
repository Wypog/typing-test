const words = ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'I', 
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 
    'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she'];

let startTime;
let targetText = '';
let timer;
let gameInterval;
const highScores = JSON.parse(localStorage.getItem('highScores') || '[]');

// Element references
const targetTextElement = document.getElementById('target-text');
const userInput = document.getElementById('user-input');
const wpmElement = document.getElementById('wpm');
const accuracyElement = document.getElementById('accuracy');
const startTestBtn = document.getElementById('start-test-btn');
const difficultySelect = document.getElementById('difficulty-select');
const timerElement = document.getElementById('timer');
const gameOverElement = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const highScoresList = document.getElementById('high-scores-list');
const clearScoresBtn = document.getElementById('clear-scores-btn');
const wordCountSelect = document.getElementById('word-count-select');
const pauseBtn = document.getElementById('pause-btn');
const unpauseBtn = document.getElementById('unpause-btn');

// Add variable to track pause state
let isPaused = false;

// Add variable to track total paused time
let totalPausedTime = 0;
let pauseStartTime = 0;

function generateText() {
    const wordCount = parseInt(wordCountSelect.value);
    const randomWords = [];
    for (let i = 0; i < wordCount; i++) {
        const randomIndex = Math.floor(Math.random() * words.length);
        randomWords.push(words[randomIndex]);
    }
    return randomWords.join(' ');
}

function renderText() {
    const chars = targetText.split('');
    const html = chars.map((char, index) => 
        `<span class="untyped-char" data-index="${index}">${char}</span>`
    ).join('');
    targetTextElement.innerHTML = html;
}

function handleTyping(e) {
    if (isPaused) {  // Prevent typing while paused
        e.preventDefault();
        return;
    }
    
    if (!startTime && timer > 0) {
        startTime = Date.now();
    }

    // Handle backspace
    if (e.key === 'Backspace') {
        e.preventDefault();
        const typedChars = document.querySelectorAll('.correct-char, .incorrect-char');
        if (typedChars.length > 0) {
            // Remove the last typed character's styling
            const lastTypedChar = typedChars[typedChars.length - 1];
            lastTypedChar.className = 'untyped-char';
            
            // Update cursor position
            document.querySelectorAll('.current-char').forEach(el => el.classList.remove('current-char'));
            lastTypedChar.classList.add('current-char');
        }
        updateStats();
        return;
    }

    const typedChar = e.key;
    if (typedChar.length !== 1 && typedChar !== ' ') return;
    e.preventDefault();

    const currentIndex = document.querySelectorAll('.correct-char, .incorrect-char').length;
    if (currentIndex >= targetText.length) return;

    const currentChar = targetText[currentIndex];
    const charElement = targetTextElement.querySelector(`[data-index="${currentIndex}"]`);
    
    if (typedChar === currentChar) {
        charElement.className = 'correct-char';
    } else {
        charElement.className = 'incorrect-char';
    }

    // Add cursor to next character
    const nextChar = targetTextElement.querySelector(`[data-index="${currentIndex + 1}"]`);
    if (nextChar) {
        document.querySelectorAll('.current-char').forEach(el => el.classList.remove('current-char'));
        nextChar.classList.add('current-char');
    }

    updateStats();
}

function updateStats() {
    if (!startTime) return;
    
    // Calculate time elapsed, excluding paused time
    const timeElapsed = ((Date.now() - startTime) - totalPausedTime) / 1000 / 60; // in minutes
    
    // Count typed characters (including spaces)
    const typedChars = document.querySelectorAll('.correct-char, .incorrect-char').length;
    const correctChars = document.querySelectorAll('.correct-char').length;
    
    // Calculate WPM: (characters / 5) / minutes
    // Using 5 as average word length including space
    const wpm = Math.round((typedChars / 5) / timeElapsed);
    
    // Calculate accuracy
    const accuracy = Math.round((correctChars / typedChars) * 100) || 0;

    wpmElement.textContent = wpm;
    accuracyElement.textContent = `${accuracy}%`;
    
    // Check completion after updating stats
    checkCompletion();
}

function checkCompletion() {
    const typedChars = document.querySelectorAll('.correct-char, .incorrect-char');
    
    // End game when user has typed all characters, regardless of accuracy
    if (typedChars.length === targetText.length) {
        endGame();
    }
}

function updateHighScores(wpm) {
    highScores.push(wpm);
    highScores.sort((a, b) => b - a);
    highScores.splice(5); // Keep only top 5
    localStorage.setItem('highScores', JSON.stringify(highScores));
    displayHighScores();
}

function displayHighScores() {
    highScoresList.innerHTML = highScores
        .map((score, index) => `<li>${index + 1}. ${score} WPM</li>`)
        .join('');
}

function startTimer() {
    const difficulty = difficultySelect.value;
    timer = difficulty === 'easy' ? 120 : difficulty === 'medium' ? 60 : 30;
    timerElement.textContent = timer;
    
    if (gameInterval) {
        clearInterval(gameInterval);
    }
    
    gameInterval = setInterval(() => {
        if (!isPaused) {
            timer--;
            timerElement.textContent = timer;
            
            if (timer <= 0) {
                endGame();
            }
        }
    }, 1000);
}

function endGame() {
    clearInterval(gameInterval);
    pauseBtn.style.display = 'none';
    unpauseBtn.style.display = 'none';
    const finalWpm = parseInt(wpmElement.textContent);
    const finalAccuracy = parseInt(accuracyElement.textContent);
    finalScoreElement.textContent = finalWpm;
    
    // Check if all characters have been typed
    const typedChars = document.querySelectorAll('.correct-char, .incorrect-char');
    const isComplete = typedChars.length === targetText.length;
    
    // User wins if they completed the text with required speed and accuracy
    const isWin = isComplete && finalWpm >= 60 && finalAccuracy >= 85;
    
    const resultMessage = isWin ? 
        `🎉 Congratulations! You won! 🎉
        Your speed (${finalWpm} WPM) and accuracy (${finalAccuracy}%) were excellent!` :
        `Try again! 
        You need 60+ WPM and 85%+ accuracy to win.
        ${!isComplete ? "Make sure to type all characters before time runs out!\n" : ""}
        You got: ${finalWpm} WPM and ${finalAccuracy}% accuracy.`;
    
    // Update game over screen with result message
    const messageElement = document.createElement('p');
    messageElement.innerHTML = resultMessage.replace(/\n/g, '<br>');
    messageElement.style.marginTop = '10px';
    messageElement.style.color = isWin ? '#44aa44' : '#ff4444';
    messageElement.style.fontWeight = 'bold';
    
    // Clear any existing message before adding new one
    const existingMessage = gameOverElement.querySelector('.result-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    messageElement.className = 'result-message';
    gameOverElement.insertBefore(messageElement, restartBtn);
    
    gameOverElement.style.display = 'block';
    userInput.disabled = true;
    
    // Only update high scores if the user won
    if (isWin) {
        updateHighScores(finalWpm);
    }
}

function startNew() {
    if (gameInterval) {
        clearInterval(gameInterval);
    }
    
    targetText = generateText();
    renderText();
    startTime = null;
    totalPausedTime = 0; // Reset paused time
    pauseStartTime = 0;
    wpmElement.textContent = '0';
    accuracyElement.textContent = '0%';
    gameOverElement.style.display = 'none';
    isPaused = false;
    
    pauseBtn.style.display = 'inline';
    unpauseBtn.style.display = 'none';
    
    const firstChar = targetTextElement.querySelector('[data-index="0"]');
    if (firstChar) {
        firstChar.classList.add('current-char');
    }
    
    targetTextElement.focus();
    startTimer();
}

function clearHighScores() {
    // Clear the array and localStorage
    highScores.length = 0;
    localStorage.removeItem('highScores');
    displayHighScores();
}

// Update event listeners
targetTextElement.addEventListener('keydown', handleTyping);
startTestBtn.addEventListener('click', startNew);
restartBtn.addEventListener('click', startNew);
clearScoresBtn.addEventListener('click', clearHighScores);

// Make sure the target text area is focusable
targetTextElement.setAttribute('tabindex', '0');

// Add event listeners for pause/unpause
pauseBtn.addEventListener('click', pauseTest);
unpauseBtn.addEventListener('click', unpauseTest);

// Initialize empty state
function initializeGame() {
    targetTextElement.textContent = 'Click "Start New Test" to begin...';
    wpmElement.textContent = '0';
    accuracyElement.textContent = '0%';
    pauseBtn.style.display = 'none';
    unpauseBtn.style.display = 'none';
}

// Initialize empty state
initializeGame();
displayHighScores();

function pauseTest() {
    isPaused = true;
    pauseStartTime = Date.now(); // Record when we paused
    pauseBtn.style.display = 'none';
    unpauseBtn.style.display = 'inline';
    targetTextElement.blur();
}

function unpauseTest() {
    isPaused = false;
    totalPausedTime += Date.now() - pauseStartTime; // Add the pause duration to total
    pauseBtn.style.display = 'inline';
    unpauseBtn.style.display = 'none';
    targetTextElement.focus();
}
