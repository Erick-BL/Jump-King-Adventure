// ===== SISTEMA DE TIMER =====
class GameTimer {
    constructor() {
        this.startTime = 0;
        this.elapsedTime = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.pauseStartTime = 0;
        this.totalPausedTime = 0;
    }

    start() {
        if (!this.isRunning) {
            this.startTime = Date.now() - this.elapsedTime;
            this.isRunning = true;
            if (!this.totalPausedTime) this.totalPausedTime = 0;
        }
    }

    pause() {
        if (this.isRunning && !this.isPaused) {
            this.isPaused = true;
            this.pauseStartTime = Date.now();
        }
    }

    resume() {
        if (this.isPaused) {
            this.totalPausedTime += Date.now() - this.pauseStartTime;
            this.isPaused = false;
        }
    }

    stop() {
        if (this.isRunning || this.isPaused) {
            const currentTime = this.isPaused ? this.pauseStartTime : Date.now();
            this.elapsedTime = currentTime - this.startTime - this.totalPausedTime;
        }
        this.isRunning = false;
        this.isPaused = false;
        return this.elapsedTime;
    }

    reset() {
        this.startTime = 0;
        this.elapsedTime = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.pauseStartTime = 0;
        this.totalPausedTime = 0;
    }

    getElapsedTime() {
        if (!this.isRunning) {
            return this.elapsedTime;
        }

        const currentTime = this.isPaused ? this.pauseStartTime : Date.now();
        return currentTime - this.startTime - this.totalPausedTime;
    }

    getFormattedTime() {
        const elapsed = this.getElapsedTime();
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        const milliseconds = Math.floor((elapsed % 1000) / 10);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    }
}

const gameTimer = new GameTimer();

// ===== SISTEMA DE "BACKEND" (Storage Persistente) =====
class GameBackend {
    constructor() {
        this.storagePrefix = 'superadventure_';
    }

    async saveScore(name, score, coins, level, time) {
        try {
            const scoreData = {
                name: name,
                score: score,
                coins: coins,
                level: level,
                time: time,
                timestamp: new Date().toISOString(),
                date: new Date().toLocaleDateString('pt-BR')
            };

            const scores = await this.getHighScores();
            scores.push(scoreData);
            scores.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return a.time - b.time;
            });
            const topScores = scores.slice(0, 10);

            if (window.storage && typeof window.storage.set === 'function') {
                await window.storage.set(this.storagePrefix + 'highscores', JSON.stringify(topScores));
            } else {
                localStorage.setItem(this.storagePrefix + 'highscores', JSON.stringify(topScores));
            }
            return topScores;
        } catch (error) {
            console.log('Salvando score localmente (fallback):', error);
            const scores = JSON.parse(localStorage.getItem(this.storagePrefix + 'highscores') || '[]');
            scores.push({name, score, coins, level, time, date: new Date().toLocaleDateString('pt-BR')});
            scores.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return a.time - b.time;
            });
            localStorage.setItem(this.storagePrefix + 'highscores', JSON.stringify(scores.slice(0, 10)));
            return scores.slice(0, 10);
        }
    }

    formatTime(ms) {
        const msec = Number(ms) || 0;
        const minutes = Math.floor(msec / 60000);
        const seconds = Math.floor((msec % 60000) / 1000);
        const milliseconds = Math.floor((msec % 1000) / 10);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    }

    async getHighScores() {
        try {
            if (window.storage && typeof window.storage.get === 'function') {
                const result = await window.storage.get(this.storagePrefix + 'highscores');
                if (!result) return [];
                const raw = (typeof result === 'object' && result.value !== undefined) ? result.value : result;
                return raw ? JSON.parse(raw) : [];
            } else {
                return JSON.parse(localStorage.getItem(this.storagePrefix + 'highscores') || '[]');
            }
        } catch (error) {
            return JSON.parse(localStorage.getItem(this.storagePrefix + 'highscores') || '[]');
        }
    }

    async updateStats(won = false) {
        try {
            const stats = await this.getStats();
            stats.gamesPlayed++;
            if (won) stats.gamesWon++;
            stats.lastPlayed = new Date().toISOString();

            if (window.storage && typeof window.storage.set === 'function') {
                await window.storage.set(this.storagePrefix + 'stats', JSON.stringify(stats));
            } else {
                localStorage.setItem(this.storagePrefix + 'stats', JSON.stringify(stats));
            }
            return stats;
        } catch (error) {
            console.log('Atualizando stats localmente (fallback):', error);
            const stats = JSON.parse(localStorage.getItem(this.storagePrefix + 'stats') || '{"gamesPlayed":0,"gamesWon":0}');
            stats.gamesPlayed++;
            if (won) stats.gamesWon++;
            localStorage.setItem(this.storagePrefix + 'stats', JSON.stringify(stats));
            return stats;
        }
    }

    async getStats() {
        try {
            if (window.storage && typeof window.storage.get === 'function') {
                const result = await window.storage.get(this.storagePrefix + 'stats');
                if (!result) return { gamesPlayed: 0, gamesWon: 0, lastPlayed: null };
                const raw = (typeof result === 'object' && result.value !== undefined) ? result.value : result;
                return raw ? JSON.parse(raw) : { gamesPlayed: 0, gamesWon: 0, lastPlayed: null };
            } else {
                return JSON.parse(localStorage.getItem(this.storagePrefix + 'stats') || '{"gamesPlayed":0,"gamesWon":0}');
            }
        } catch (error) {
            return JSON.parse(localStorage.getItem(this.storagePrefix + 'stats') || '{"gamesPlayed":0,"gamesWon":0}');
        }
    }

    async getHighScore() {
        const scores = await this.getHighScores();
        return scores.length > 0 ? scores[0].score : 0;
    }
}

const backend = new GameBackend();

// ===== CÓDIGO DO JOGO =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() { 
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight; 
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let gameState = 'menu';
let isPaused = false;
let hasPlayerMoved = false;
let lives = 3;
let score = 0;
let coins = 0;
let currentLevel = 1;
let camera = { x: 0, y: 0 };
let animationFrameId = null;

let clouds = [];
let sun = { x: 150, y: 80, radius: 50, glowPhase: 0 };

function getInitialPlayerY() { 
    return canvas.height - 200; 
}

const player = { 
    x: 80, 
    y: getInitialPlayerY(), 
    width: 35, 
    height: 35, 
    velX: 0, 
    velY: 0, 
    speed: 6, 
    jumpPower: 16, 
    onGround: false, 
    color: '#FF4444' 
};

let platforms = [];
let enemiesList = [];
let coinsList = [];
let particles = [];

const keys = {};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (gameState === 'playing') togglePause();
        e.preventDefault();
        return;
    }
    keys[e.key] = true;
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
});
document.addEventListener('keyup', (e) => { 
    keys[e.key] = false; 
});

function togglePause() {
    if (gameState !== 'playing') return;
    isPaused = !isPaused;
    const pauseIcon = document.getElementById('pauseIcon');
    if (isPaused) {
        gameTimer.pause();
        document.getElementById('pauseOverlay').style.display = 'block';
        pauseIcon.innerHTML = '<polygon points="8,5 19,12 8,19"/>';
    } else {
        gameTimer.resume();
        document.getElementById('pauseOverlay').style.display = 'none';
        pauseIcon.innerHTML = '<rect x="5" y="5" width="5" height="14" rx="1"/><rect x="14" y="5" width="5" height="14" rx="1"/>';
        gameLoop();
    }
}

function initClouds() {
    clouds = [];
    for (let i = 0; i < 8; i++) {
        clouds.push({
            x: Math.random() * canvas.width * 2,
            y: Math.random() * (canvas.height * 0.4),
            width: 60 + Math.random() * 80,
            height: 30 + Math.random() * 30,
            speed: 0.3 + Math.random() * 0.5,
            opacity: 0.6 + Math.random() * 0.4
        });
    }
}

function resetPlayerPosition() {
    player.x = 80;
    player.y = getInitialPlayerY();
    player.velX = 0;
    player.velY = 0;
    camera.x = 0;
}

function playerDie() {
    lives--;
    createParticles(player.x + player.width/2, player.y + player.height/2, '#FF0000', 15);
    if (lives <= 0) {
        gameOver();
    } else {
        resetPlayerPosition();
        const levelData = getLevelData();
        const level = levelData[currentLevel - 1];
        enemiesList = level.enemies.map(e => ({ 
            x: e.x, 
            y: e.y, 
            width: 28, 
            height: 28, 
            velX: e.speed, 
            direction: 1, 
            alive: true, 
            color: currentLevel === 1 ? '#8A2BE2' : currentLevel === 2 ? '#DC143C' : '#FF6347' 
        }));
    }
}

function nextLevel() {
    currentLevel++;
    score += 500;
    resetPlayerPosition();
    generateLevel(currentLevel - 1);
}

async function gameOver() {
    gameState = 'gameOver';
    const finalTime = gameTimer.stop();
    document.getElementById('pauseBtn').style.display = 'none';

    await backend.updateStats(false);
    await updateHighScoresDisplay();
    await loadStatsBar();

    document.getElementById('gameOverTitle').textContent = '💀 GAME OVER 💀';
    document.getElementById('gameOverText').innerHTML =
        `<p style="color: #FF4444; font-size: 24px; margin: 10px 0;">Suas vidas acabaram!</p>
        <p>Pontuação Final: ${score}</p>
        <p>Moedas Coletadas: ${coins}</p>
        <p>Chegou até a Fase: ${currentLevel}</p>
        <p>⏱️ Tempo: ${gameTimer.getFormattedTime()}</p>
        <p style="color: #FFD700; margin-top: 15px;">Complete todas as fases para entrar no Top 5!</p>`;

    document.getElementById('nameInput').style.display = 'none';
    document.getElementById('playAgainBtn').style.display = 'inline-block';
    document.getElementById('menuBtn').style.display = 'inline-block';
    document.getElementById('gameOver').style.display = 'block';
}

let pendingScoreData = null;

async function gameWin() {
    gameState = 'gameOver';
    const finalTime = gameTimer.stop();
    document.getElementById('pauseBtn').style.display = 'none';

    pendingScoreData = {
        score: score,
        coins: coins,
        level: currentLevel,
        time: finalTime
    };

    await backend.updateStats(true);
    await loadStatsBar();

    document.getElementById('gameOverTitle').textContent = '🏆 PARABÉNS! 🏆';
    document.getElementById('gameOverText').innerHTML =
        `<p style="color: #FFD700; font-size: 24px; margin: 10px 0;">Você completou todas as fases!</p>
        <p>Pontuação Final: ${score}</p>
        <p>Moedas Coletadas: ${coins}</p>
        <p>⏱️ Tempo Total: ${gameTimer.getFormattedTime()}</p>`;

    document.getElementById('nameInput').style.display = 'block';
    document.getElementById('playerName').value = '';
    document.getElementById('nameError').style.display = 'none';
    document.getElementById('playAgainBtn').style.display = 'none';
    document.getElementById('menuBtn').style.display = 'none';
    document.getElementById('gameOverHighscores').style.display = 'none';
    document.getElementById('gameOver').style.display = 'block';

    setTimeout(() => document.getElementById('playerName').focus(), 100);
}

async function submitScore() {
    const nameInput = document.getElementById('playerName');
    const name = nameInput.value.trim().toUpperCase();
    const nameError = document.getElementById('nameError');

    if (name.length !== 5) {
        nameError.style.display = 'block';
        nameInput.focus();
        return;
    }

    if (pendingScoreData) {
        await backend.saveScore(
            name,
            pendingScoreData.score,
            pendingScoreData.coins,
            pendingScoreData.level,
            pendingScoreData.time
        );
        pendingScoreData = null;
    }

    await updateHighScoresDisplay();

    document.getElementById('nameInput').style.display = 'none';
    document.getElementById('gameOverHighscores').style.display = 'block';
    document.getElementById('playAgainBtn').style.display = 'inline-block';
    document.getElementById('menuBtn').style.display = 'inline-block';
}

function skipSave() {
    pendingScoreData = null;
    document.getElementById('nameInput').style.display = 'none';
    updateHighScoresDisplay();
    document.getElementById('gameOverHighscores').style.display = 'block';
    document.getElementById('playAgainBtn').style.display = 'inline-block';
    document.getElementById('menuBtn').style.display = 'inline-block';
}

async function updateHighScoresDisplay() {
    const scores = await backend.getHighScores();
    const top5 = scores.slice(0, 5);

    const html = top5.map((s, i) => `
        <div class="highscore-entry">
            <span class="highscore-rank">#${i + 1}</span>
            <span class="highscore-name">${s.name}</span>
            <span class="highscore-time">${backend.formatTime(s.time)}</span>
            <span class="highscore-score">${s.score} pts</span>
        </div>
    `).join('');

    const emptyMessage = '<p style="color: #FFD700;">Complete todas as fases para aparecer aqui!</p>';

    document.getElementById('highscoresList').innerHTML = html || emptyMessage;
    document.getElementById('menuHighscoresList').innerHTML = html || emptyMessage;
}

async function loadStatsBar() {
    const highScore = await backend.getHighScore();
    const stats = await backend.getStats();

    document.getElementById('highscore').textContent = highScore;
    document.getElementById('gamesPlayed').textContent = stats.gamesPlayed;
}

function updateUI() {
    document.getElementById('lives').textContent = lives;
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = currentLevel;
    document.getElementById('coins').textContent = coins;
    document.getElementById('timer').textContent = gameTimer.getFormattedTime();
}

async function startGame() {
    gameState = 'playing';
    isPaused = false;
    hasPlayerMoved = false;
    lives = 3;
    score = 0;
    coins = 0;
    currentLevel = 1;

    gameTimer.reset();

    document.getElementById('instructions').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('pauseOverlay').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'block';

    const pauseIcon = document.getElementById('pauseIcon');
    pauseIcon.innerHTML = '<rect x="5" y="5" width="5" height="14" rx="1"/><rect x="14" y="5" width="5" height="14" rx="1"/>';

    initClouds();
    generateLevel(0);
    resetPlayerPosition();
    updateUI();

    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    gameLoop();
}

async function restartGame() { 
    await startGame(); 
}

async function backToMenu() {
    gameState = 'menu';
    isPaused = false;
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('pauseOverlay').style.display = 'none';
    document.getElementById('instructions').style.display = 'block';
    document.getElementById('pauseBtn').style.display = 'none';

    const pauseIcon = document.getElementById('pauseIcon');
    pauseIcon.innerHTML = '<rect x="5" y="5" width="5" height="14" rx="1"/><rect x="14" y="5" width="5" height="14" rx="1"/>';

    if (animationFrameId) { 
        cancelAnimationFrame(animationFrameId); 
        animationFrameId = null; 
    }

    await updateHighScoresDisplay();
    await loadStatsBar();
    document.getElementById('menuHighscores').style.display = 'block';
}

async function viewStats() {
    const stats = await backend.getStats();
    const scores = await backend.getHighScores();

    let bestTime = 'N/A';
    let bestName = 'N/A';
    if (scores.length > 0) {
        bestTime = backend.formatTime(scores[0].time);
        bestName = scores[0].name;
    }

    alert(`📊 SUAS ESTATÍSTICAS 📊\n\n` +
        `🎮 Partidas Jogadas: ${stats.gamesPlayed}\n` +
        `🏆 Partidas Vencidas: ${stats.gamesWon}\n` +
        `⭐ Recorde: ${scores.length > 0 ? scores[0].score : 0} pontos\n` +
        `👤 Jogador Top: ${bestName}\n` +
        `⏱️ Melhor tempo: ${bestTime}\n` +
        `💰 Maior coleta: ${scores.length > 0 ? Math.max(...scores.map(s => s.coins)) : 0} moedas`);
}

function getLevelData() {
    const groundY = canvas.height - 50;

    return [
        {
            name: "Planície Verde",
            platforms: [
                {x: 0, y: groundY, w: 250, h: 50},
                {x: 300, y: groundY - 70, w: 120, h: 20},
                {x: 470, y: groundY - 150, w: 100, h: 20},
                {x: 620, y: groundY - 230, w: 130, h: 20},
                {x: 800, y: groundY - 100, w: 150, h: 20},
                {x: 1000, y: groundY - 200, w: 120, h: 20},
                {x: 1170, y: groundY - 270, w: 100, h: 20},
                {x: 1320, y: groundY - 150, w: 180, h: 20},
                {x: 1550, y: groundY - 50, w: 150, h: 20},
                {x: 1750, y: groundY - 130, w: 120, h: 20},
                {x: 1920, y: groundY, w: 200, h: 50}
            ],
            coins: [
                {x: 330, y: groundY - 110}, {x: 490, y: groundY - 190}, {x: 640, y: groundY - 270},
                {x: 820, y: groundY - 140}, {x: 1020, y: groundY - 240}, {x: 1190, y: groundY - 310},
                {x: 1360, y: groundY - 190}, {x: 1580, y: groundY - 90}, {x: 1770, y: groundY - 170}
            ],
            enemies: [
                {x: 320, y: groundY - 90, speed: 2},
                {x: 640, y: groundY - 250, speed: 1.5},
                {x: 1030, y: groundY - 220, speed: 2.5},
                {x: 1370, y: groundY - 170, speed: 2},
                {x: 1770, y: groundY - 150, speed: 1.8}
            ],
            color: '#8B4513'
        },
        {
            name: "Montanha Rochosa",
            platforms: [
                {x: 0, y: groundY, w: 180, h: 50},
                {x: 230, y: groundY - 50, w: 100, h: 20},
                {x: 380, y: groundY - 130, w: 90, h: 20},
                {x: 520, y: groundY - 210, w: 110, h: 20},
                {x: 680, y: groundY - 290, w: 100, h: 20},
                {x: 830, y: groundY - 170, w: 140, h: 20},
                {x: 1020, y: groundY - 250, w: 100, h: 20},
                {x: 1170, y: groundY - 330, w: 110, h: 20},
                {x: 1330, y: groundY - 410, w: 120, h: 20},
                {x: 1500, y: groundY - 290, w: 130, h: 20},
                {x: 1680, y: groundY - 170, w: 150, h: 20},
                {x: 1880, y: groundY - 50, w: 140, h: 20},
                {x: 2070, y: groundY, w: 200, h: 50}
            ],
            coins: [
                {x: 250, y: groundY - 90}, {x: 400, y: groundY - 170}, {x: 540, y: groundY - 250},
                {x: 700, y: groundY - 330}, {x: 850, y: groundY - 210}, {x: 1040, y: groundY - 290},
                {x: 1190, y: groundY - 370}, {x: 1350, y: groundY - 450}, {x: 1520, y: groundY - 330},
                {x: 1700, y: groundY - 210}, {x: 1900, y: groundY - 90}
            ],
            enemies: [
                {x: 250, y: groundY - 70, speed: 2.2},
                {x: 540, y: groundY - 230, speed: 2.5},
                {x: 700, y: groundY - 310, speed: 2},
                {x: 1050, y: groundY - 270, speed: 2.8},
                {x: 1350, y: groundY - 430, speed: 2.3},
                {x: 1710, y: groundY - 190, speed: 2.6},
                {x: 1900, y: groundY - 70, speed: 2.4}
            ],
            color: '#654321'
        },
        {
            name: "Caverna Escura",
            platforms: [
                {x: 0, y: groundY, w: 150, h: 50},
                {x: 200, y: groundY - 70, w: 80, h: 20},
                {x: 330, y: groundY - 150, w: 90, h: 20},
                {x: 470, y: groundY - 230, w: 80, h: 20},
                {x: 600, y: groundY - 310, w: 100, h: 20},
                {x: 750, y: groundY - 210, w: 90, h: 20},
                {x: 890, y: groundY - 290, w: 100, h: 20},
                {x: 1040, y: groundY - 370, w: 90, h: 20},
                {x: 1180, y: groundY - 270, w: 110, h: 20},
                {x: 1340, y: groundY - 350, w: 100, h: 20},
                {x: 1490, y: groundY - 430, w: 110, h: 20},
                {x: 1650, y: groundY - 310, w: 120, h: 20},
                {x: 1820, y: groundY - 190, w: 130, h: 20},
                {x: 2000, y: groundY - 70, w: 150, h: 20},
                {x: 2200, y: groundY, w: 250, h: 50}
            ],
            coins: [
                {x: 220, y: groundY - 110}, {x: 350, y: groundY - 190}, {x: 490, y: groundY - 270},
                {x: 620, y: groundY - 350}, {x: 770, y: groundY - 250}, {x: 910, y: groundY - 330},
                {x: 1060, y: groundY - 410}, {x: 1200, y: groundY - 310}, {x: 1360, y: groundY - 390},
                {x: 1510, y: groundY - 470}, {x: 1670, y: groundY - 350}, {x: 1840, y: groundY - 230},
                {x: 2020, y: groundY - 110}
            ],
            enemies: [
                {x: 220, y: groundY - 90, speed: 2.5},
                {x: 490, y: groundY - 250, speed: 3},
                {x: 620, y: groundY - 330, speed: 2.7},
                {x: 920, y: groundY - 310, speed: 3.2},
                {x: 1200, y: groundY - 290, speed: 2.9},
                {x: 1370, y: groundY - 370, speed: 3.1},
                {x: 1680, y: groundY - 330, speed: 2.8},
                {x: 1850, y: groundY - 210, speed: 3},
                {x: 2030, y: groundY - 90, speed: 2.6}
            ],
            color: '#4A4A4A'
        }
    ];
}

function generateLevel(levelIndex) {
    const levelData = getLevelData();

    if (levelIndex >= levelData.length) {
        gameWin();
        return;
    }

    const level = levelData[levelIndex];
    platforms = level.platforms.map(p => ({ 
        x: p.x, 
        y: p.y, 
        width: p.w, 
        height: p.h, 
        color: level.color 
    }));

    coinsList = level.coins.map(c => ({ 
        x: c.x, 
        y: c.y, 
        width: 20, 
        height: 20, 
        collected: false, 
        rotation: 0, 
        pulse: 0 
    }));

    enemiesList = level.enemies.map(e => ({ 
        x: e.x, 
        y: e.y, 
        width: 28, 
        height: 28, 
        velX: e.speed, 
        direction: 1, 
        alive: true, 
        color: levelIndex === 0 ? '#8A2BE2' : levelIndex === 1 ? '#DC143C' : '#FF6347' 
    }));

    particles = [];
}

function checkCollision(a, b) {
    return a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y;
}

function createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x, 
            y: y,
            velX: (Math.random() - 0.5) * 12,
            velY: Math.random() * -10 - 3,
            life: 40, 
            maxLife: 40,
            color: color, 
            size: Math.random() * 5 + 2
        });
    }
}

function update() {
    if (gameState !== 'playing' || isPaused) return;

    const isMoving = keys['ArrowLeft'] || keys['d'] || keys['D'] || keys['ArrowRight'] ||
        keys['a'] || keys['A'] || keys['ArrowUp'];

    if (isMoving && !hasPlayerMoved) {
        hasPlayerMoved = true;
        gameTimer.start();
    }

    player.velX = 0;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) player.velX = -player.speed;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) player.velX = player.speed;
    if ((keys['w'] || keys['W'] || keys['ArrowUp']) && player.onGround) { 
        player.velY = -player.jumpPower; 
        player.onGround = false; 
    }

    if ((keys['s'] || keys['S'] || keys['ArrowDown']) && !player.onGround && player.velY > 0) 
        player.velY += 1.2;

    player.velY += 0.85;
    player.x += player.velX;
    player.y += player.velY;

    player.onGround = false;
    for (let platform of platforms) {
        if (checkCollision(player, platform)) {
            if (player.velY > 0 && player.y + player.height - player.velY <= platform.y + 5) {
                player.y = platform.y - player.height;
                player.velY = 0;
                player.onGround = true;
            } else if (player.velY < 0 && player.y - player.velY >= platform.y + platform.height - 5) {
                player.y = platform.y + platform.height;
                player.velY = 0;
            } else if (player.velX !== 0) {
                if (player.velX > 0) player.x = platform.x - player.width;
                else player.x = platform.x + platform.width;
                player.velX = 0;
            }
        }
    }

    if (player.y > canvas.height + 100) playerDie();

    enemiesList.forEach(enemy => {
        if (!enemy.alive) return;

        enemy.x += enemy.velX * enemy.direction;

        let currentPlatform = null;
        for (let platform of platforms) {
            if (checkCollision({ 
                x: enemy.x, 
                y: enemy.y + enemy.height, 
                width: enemy.width, 
                height: 5 
            }, platform)) {
                currentPlatform = platform;
                break;
            }
        }

        if (currentPlatform) {
            if (enemy.x <= currentPlatform.x || 
                enemy.x + enemy.width >= currentPlatform.x + currentPlatform.width) {
                enemy.direction *= -1;
                enemy.x = Math.max(currentPlatform.x, 
                    Math.min(enemy.x, currentPlatform.x + currentPlatform.width - enemy.width));
            }
        }

        if (checkCollision(player, enemy)) {
            if (player.velY > 0 && player.y + player.height/2 < enemy.y + 5) {
                enemy.alive = false;
                player.velY = -10;
                score += 150;
                createParticles(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color, 10);
            } else {
                playerDie();
            }
        }
    });

    coinsList.forEach(coin => {
        if (!coin.collected) {
            coin.rotation += 0.08;
            coin.pulse += 0.15;

            if (checkCollision(player, coin)) {
                coin.collected = true;
                coins++;
                score += 100;
                createParticles(coin.x + coin.width/2, coin.y + coin.height/2, '#FFD700', 12);
            }
        }
    });

    particles = particles.filter(p => {
        p.x += p.velX;
        p.y += p.velY;
        p.velY += 0.4;
        p.life--;
        return p.life > 0;
    });

    clouds.forEach(cloud => {
        cloud.x += cloud.speed;
        if (cloud.x > canvas.width + cloud.width) { 
            cloud.x = -cloud.width; 
            cloud.y = Math.random() * (canvas.height * 0.4); 
        }
    });

    sun.glowPhase += 0.02;

    camera.x = Math.max(0, Math.min(player.x - canvas.width/2 + player.width/2, getMaxCameraX()));

    if (player.x > getLevelWidth() - 100) nextLevel();

    updateUI();
}

function getLevelWidth() { 
    return Math.max(...platforms.map(p => p.x + p.width)); 
}

function getMaxCameraX() { 
    return getLevelWidth() - canvas.width; 
}

function draw() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.7, '#87CEEB');
    gradient.addColorStop(1, '#98FB98');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const sunGlow = 1 + Math.sin(sun.glowPhase) * 0.15;
    ctx.save();

    const glowGradient = ctx.createRadialGradient(
        sun.x, sun.y, sun.radius * 0.5, 
        sun.x, sun.y, sun.radius * sunGlow * 2
    );
    glowGradient.addColorStop(0, 'rgba(255, 255, 100, 0.4)');
    glowGradient.addColorStop(0.5, 'rgba(255, 200, 50, 0.2)');
    glowGradient.addColorStop(1, 'rgba(255, 200, 50, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, sun.radius * sunGlow * 2, 0, Math.PI * 2);
    ctx.fill();

    const sunGradient = ctx.createRadialGradient(
        sun.x - 15, sun.y - 15, 0, 
        sun.x, sun.y, sun.radius
    );
    sunGradient.addColorStop(0, '#FFF9E3');
    sunGradient.addColorStop(0.4, '#FFE55C');
    sunGradient.addColorStop(1, '#FFD700');
    ctx.fillStyle = sunGradient;
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, sun.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 223, 0, 0.6)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI * 2) / 12 + sun.glowPhase;
        const rayLength = sun.radius * 1.5;
        const startX = sun.x + Math.cos(angle) * (sun.radius + 5);
        const startY = sun.y + Math.sin(angle) * (sun.radius + 5);
        const endX = sun.x + Math.cos(angle) * (sun.radius + rayLength);
        const endY = sun.y + Math.sin(angle) * (sun.radius + rayLength);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }

    ctx.restore();

    clouds.forEach(cloud => {
        ctx.save();
        ctx.globalAlpha = cloud.opacity;
        ctx.fillStyle = '#FFFFFF';

        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.height * 0.5, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.width * 0.25, cloud.y - cloud.height * 0.2, 
            cloud.height * 0.6, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.width * 0.5, cloud.y, cloud.height * 0.55, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.width * 0.75, cloud.y - cloud.height * 0.15, 
            cloud.height * 0.5, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.width, cloud.y, cloud.height * 0.45, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
        ctx.beginPath();
        ctx.ellipse(cloud.x + cloud.width * 0.5, cloud.y + cloud.height * 0.3, 
            cloud.width * 0.4, cloud.height * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    });

    ctx.save();
    ctx.translate(-camera.x, 0);

    platforms.forEach(platform => {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(platform.x, platform.y, platform.width, 4);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
    });

    coinsList.forEach(coin => {
        if (!coin.collected) {
            ctx.save();
            ctx.translate(coin.x + coin.width/2, coin.y + coin.height/2);
            ctx.rotate(coin.rotation);
            const scale = 1 + Math.sin(coin.pulse) * 0.1;
            ctx.scale(scale, scale);

            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#FFA500';
            ctx.beginPath();
            ctx.arc(0, 0, 7, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#FFFF00';
            ctx.beginPath();
            ctx.arc(-2, -2, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    });

    enemiesList.forEach(enemy => {
        if (enemy.alive) {
            ctx.fillStyle = enemy.color;
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height);

            ctx.fillStyle = 'white';
            ctx.fillRect(enemy.x + 5, enemy.y + 6, 7, 7);
            ctx.fillRect(enemy.x + 16, enemy.y + 6, 7, 7);
            ctx.fillStyle = 'black';
            ctx.fillRect(enemy.x + 7, enemy.y + 8, 3, 3);
            ctx.fillRect(enemy.x + 18, enemy.y + 8, 3, 3);

            ctx.fillStyle = 'black';
            ctx.fillRect(enemy.x + 8, enemy.y + 18, 12, 3);
        }
    });

    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.strokeStyle = '#CC0000';
    ctx.lineWidth = 3;
    ctx.strokeRect(player.x, player.y, player.width, player.height);

    ctx.fillStyle = 'white';
    ctx.fillRect(player.x + 7, player.y + 8, 8, 8);
    ctx.fillRect(player.x + 20, player.y + 8, 8, 8);
    ctx.fillStyle = 'black';
    ctx.fillRect(player.x + 9, player.y + 10, 4, 4);
    ctx.fillRect(player.x + 22, player.y + 10, 4, 4);

    ctx.fillStyle = '#8B4513';
    ctx.fillRect(player.x + 13, player.y + 22, 9, 4);

    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.restore();
    });

    ctx.restore();
}

function gameLoop() {
    update();
    draw();

    if (gameState === 'playing' && !isPaused) 
        animationFrameId = requestAnimationFrame(gameLoop);
    else 
        animationFrameId = null;
}

const nameInput = document.getElementById('playerName');
if (nameInput) {
    nameInput.addEventListener('keypress', (e) => { 
        if (e.key === 'Enter') submitScore(); 
    });
    nameInput.addEventListener('input', (e) => { 
        e.target.value = e.target.value.toUpperCase(); 
    });
}

window.addEventListener('load', async () => {
    initClouds();
    await loadStatsBar();
    await updateHighScoresDisplay();
    document.getElementById('menuHighscores').style.display = 'block';
});