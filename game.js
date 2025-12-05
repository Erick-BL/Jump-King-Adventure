// ===== SISTEMA DE ARMAZENAMENTO (BACKEND) =====
class GameBackend {
    constructor() {
        this.storagePrefix = 'superadventure_';
    }
    
    // Salva pontuação do jogador
    async saveScore(score, coins, level) {
        try {
            const scoreData = {
                score: score,
                coins: coins,
                level: level,
                timestamp: new Date().toISOString(),
                date: new Date().toLocaleDateString('pt-BR')
            };
            
            const scores = await this.getHighScores();
            scores.push(scoreData);
            scores.sort((a, b) => b.score - a.score);
            const topScores = scores.slice(0, 10);
            
            await window.storage.set(this.storagePrefix + 'highscores', JSON.stringify(topScores));
            return topScores;
        } catch (error) {
            console.log('Salvando score localmente:', error);
            const scores = JSON.parse(localStorage.getItem('sa_scores') || '[]');
            scores.push({score, coins, level, date: new Date().toLocaleDateString('pt-BR')});
            scores.sort((a, b) => b.score - a.score);
            localStorage.setItem('sa_scores', JSON.stringify(scores.slice(0, 10)));
            return scores.slice(0, 10);
        }
    }
    
    // Obtém lista de recordes
    async getHighScores() {
        try {
            const result = await window.storage.get(this.storagePrefix + 'highscores');
            return result ? JSON.parse(result.value) : [];
        } catch (error) {
            return JSON.parse(localStorage.getItem('sa_scores') || '[]');
        }
    }
    
    // Atualiza estatísticas do jogador
    async updateStats(won = false) {
        try {
            const stats = await this.getStats();
            stats.gamesPlayed++;
            if (won) stats.gamesWon++;
            stats.lastPlayed = new Date().toISOString();
            
            await window.storage.set(this.storagePrefix + 'stats', JSON.stringify(stats));
            return stats;
        } catch (error) {
            console.log('Atualizando stats localmente:', error);
            const stats = JSON.parse(localStorage.getItem('sa_stats') || '{"gamesPlayed":0,"gamesWon":0}');
            stats.gamesPlayed++;
            if (won) stats.gamesWon++;
            localStorage.setItem('sa_stats', JSON.stringify(stats));
            return stats;
        }
    }
    
    // Obtém estatísticas do jogador
    async getStats() {
        try {
            const result = await window.storage.get(this.storagePrefix + 'stats');
            return result ? JSON.parse(result.value) : {
                gamesPlayed: 0,
                gamesWon: 0,
                lastPlayed: null
            };
        } catch (error) {
            return JSON.parse(localStorage.getItem('sa_stats') || '{"gamesPlayed":0,"gamesWon":0}');
        }
    }
    
    // Obtém o recorde mais alto
    async getHighScore() {
        const scores = await this.getHighScores();
        return scores.length > 0 ? scores[0].score : 0;
    }
}

const backend = new GameBackend();

// ===== CONFIGURAÇÃO DO CANVAS =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Ajusta o canvas para o tamanho da tela
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ===== VARIÁVEIS DO JOGO =====
let gameState = 'menu'; // 'menu', 'playing', 'gameOver'
let lives = 3;
let score = 0;
let coins = 0;
let currentLevel = 1;
let camera = { x: 0, y: 0 };
let animationFrameId = null;

// Elementos visuais de fundo
let clouds = [];
let sun = {
    x: 150,
    y: 80,
    radius: 50,
    glowPhase: 0
};

// ===== JOGADOR =====
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

// ===== ELEMENTOS DO JOGO =====
let platforms = [];
let enemiesList = [];
let coinsList = [];
let particles = [];

// ===== CONTROLES =====
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// ===== INICIALIZAÇÃO DE NUVENS =====
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

// ===== FUNÇÕES DE POSIÇÃO =====
function resetPlayerPosition() {
    player.x = 80;
    player.y = getInitialPlayerY();
    player.velX = 0;
    player.velY = 0;
    camera.x = 0;
}

// ===== FUNÇÕES DE MORTE E VITÓRIA =====
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
            x: e.x, y: e.y, width: 28, height: 28,
            velX: e.speed, direction: 1, alive: true,
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
    await backend.saveScore(score, coins, currentLevel);
    await backend.updateStats(false);
    await updateHighScoresDisplay();
    await loadStatsBar();
    
    document.getElementById('gameOverTitle').textContent = '💀 GAME OVER 💀';
    document.getElementById('gameOverText').innerHTML = 
        `<p style="color: #FF4444; font-size: 24px; margin: 10px 0;">Suas vidas acabaram!</p>
        <p>Pontuação Final: ${score}</p>
        <p>Moedas Coletadas: ${coins}</p>
        <p>Chegou até a Fase: ${currentLevel}</p>`;
    document.getElementById('gameOver').style.display = 'block';
}

async function gameWin() {
    gameState = 'gameOver';
    await backend.saveScore(score, coins, currentLevel);
    await backend.updateStats(true);
    await updateHighScoresDisplay();
    await loadStatsBar();
    
    document.getElementById('gameOverTitle').textContent = '🏆 PARABÉNS! 🏆';
    document.getElementById('gameOverText').innerHTML = 
        `<p style="color: #FFD700; font-size: 24px; margin: 10px 0;">Você completou todas as fases!</p>
        <p>Pontuação Final: ${score}</p>
        <p>Moedas Coletadas: ${coins}</p>`;
    document.getElementById('gameOver').style.display = 'block';
}

// ===== FUNÇÕES DE INTERFACE =====
async function updateHighScoresDisplay() {
    const scores = await backend.getHighScores();
    const top5 = scores.slice(0, 5);
    
    const html = top5.map((s, i) => `
        <div class="highscore-entry">
            <span class="highscore-rank">#${i + 1}</span>
            <span>${s.date || 'Recente'}</span>
            <span class="highscore-score">${s.score} pts</span>
        </div>
    `).join('');
    
    document.getElementById('highscoresList').innerHTML = html || '<p>Nenhum recorde ainda!</p>';
    document.getElementById('menuHighscoresList').innerHTML = html || '<p>Nenhum recorde ainda!</p>';
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
}

// ===== FUNÇÕES DE CONTROLE DE JOGO =====
async function startGame() {
    gameState = 'playing';
    lives = 3;
    score = 0;
    coins = 0;
    currentLevel = 1;
    
    document.getElementById('instructions').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    
    initClouds();
    generateLevel(0);
    resetPlayerPosition();
    updateUI();
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    gameLoop();
}

async function restartGame() {
    await startGame();
}

async function backToMenu() {
    gameState = 'menu';
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('instructions').style.display = 'block';
    
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
    
    alert(`📊 SUAS ESTATÍSTICAS 📊\n\n` +
          `🎮 Partidas Jogadas: ${stats.gamesPlayed}\n` +
          `🏆 Partidas Vencidas: ${stats.gamesWon}\n` +
          `⭐ Recorde: ${scores.length > 0 ? scores[0].score : 0} pontos\n` +
          `💰 Maior coleta: ${scores.length > 0 ? Math.max(...scores.map(s => s.coins)) : 0} moedas`);
}

// ===== DADOS DAS FASES =====
function getLevelData() {
    const groundY = canvas.height - 50;
    
    return [
        // FASE 1: Planície Verde
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
        // FASE 2: Montanha Rochosa
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
        // FASE 3: Caverna Escura
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

// ===== GERAÇÃO DE FASES =====
function generateLevel(levelIndex) {
    const levelData = getLevelData();
    
    if (levelIndex >= levelData.length) {
        gameWin();
        return;
    }
    
    const level = levelData[levelIndex];
    
    // Gera plataformas
    platforms = level.platforms.map(p => ({
        x: p.x, y: p.y, width: p.w, height: p.h, color: level.color
    }));
    
    // Gera moedas
    coinsList = level.coins.map(c => ({
        x: c.x, y: c.y, width: 20, height: 20, 
        collected: false, rotation: 0, pulse: 0
    }));
    
    // Gera inimigos
    enemiesList = level.enemies.map(e => ({
        x: e.x, y: e.y, width: 28, height: 28,
        velX: e.speed, direction: 1, alive: true,
        color: levelIndex === 0 ? '#8A2BE2' : levelIndex === 1 ? '#DC143C' : '#FF6347'
    }));
    
    particles = [];
}

// ===== DETECÇÃO DE COLISÃO =====
function checkCollision(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

// ===== SISTEMA DE PARTÍCULAS =====
function createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x, y: y,
            velX: (Math.random() - 0.5) * 12,
            velY: Math.random() * -10 - 3,
            life: 40, maxLife: 40,
            color: color, size: Math.random() * 5 + 2
        });
    }
}

// ===== ATUALIZAÇÃO DO JOGO =====
function update() {
    if (gameState !== 'playing') return;
    
    // Movimento do jogador
    player.velX = 0;
    if (keys['ArrowLeft'] || keys['d'] || keys['D']) {
        player.velX = -player.speed;
    }
    if (keys['ArrowRight']) {
        player.velX = player.speed;
    }
    if ((keys['a'] || keys['A'] || keys['ArrowUp']) && player.onGround) {
        player.velY = -player.jumpPower;
        player.onGround = false;
    }
    
    // Descida rápida
    if ((keys['s'] || keys['S'] || keys['ArrowDown']) && !player.onGround && player.velY > 0) {
        player.velY += 1.2;
    }
    
    // Física
    player.velY += 0.85; // Gravidade
    player.x += player.velX;
    player.y += player.velY;
    
    // Colisão com plataformas
    player.onGround = false;
    for (let platform of platforms) {
        if (checkCollision(player, platform)) {
            if (player.velY > 0 && player.y + player.height - player.velY <= platform.y + 5) {
                player.y = platform.y - player.height;
                player.velY = 0;
                player.onGround = true;
            } 
            else if (player.velY < 0 && player.y - player.velY >= platform.y + platform.height - 5) {
                player.y = platform.y + platform.height;
                player.velY = 0;
            }
            else if (player.velX !== 0) {
                if (player.velX > 0) {
                    player.x = platform.x - player.width;
                } else {
                    player.x = platform.x + platform.width;
                }
                player.velX = 0;
            }
        }
    }
    
    // Verifica se caiu
    if (player.y > canvas.height + 100) {
        playerDie();
    }
    
    // Atualiza inimigos
    enemiesList.forEach(enemy => {
        if (!enemy.alive) return;
        
        enemy.x += enemy.velX * enemy.direction;
        
        // Verifica se o inimigo está em uma plataforma
        let currentPlatform = null;
        for (let platform of platforms) {
            if (checkCollision({x: enemy.x, y: enemy.y + enemy.height, width: enemy.width, height: 5}, platform)) {
                currentPlatform = platform;
                break;
            }
        }
        
        // Muda direção se chegou na borda da plataforma
        if (currentPlatform) {
            if (enemy.x <= currentPlatform.x || enemy.x + enemy.width >= currentPlatform.x + currentPlatform.width) {
                enemy.direction *= -1;
                enemy.x = Math.max(currentPlatform.x, Math.min(enemy.x, currentPlatform.x + currentPlatform.width - enemy.width));
            }
        }
        
        // Colisão com jogador
        if (checkCollision(player, enemy)) {
            if (player.velY > 0 && player.y + player.height/2 < enemy.y + 5) {
                // Jogador pula em cima do inimigo
                enemy.alive = false;
                player.velY = -10;
                score += 150;
                createParticles(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color, 10);
            } else {
                // Jogador morre
                playerDie();
            }
        }
    });
    
    // Atualiza moedas
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
    
    // Atualiza partículas
    particles = particles.filter(p => {
        p.x += p.velX;
        p.y += p.velY;
        p.velY += 0.4;
        p.life--;
        return p.life > 0;
    });
    
    // Atualiza nuvens
    clouds.forEach(cloud => {
        cloud.x += cloud.speed;
        if (cloud.x > canvas.width + cloud.width) {
            cloud.x = -cloud.width;
            cloud.y = Math.random() * (canvas.height * 0.4);
        }
    });
    
    // Atualiza sol
    sun.glowPhase += 0.02;
    
    // Atualiza câmera
    camera.x = Math.max(0, Math.min(player.x - canvas.width/2 + player.width/2, getMaxCameraX()));
    
    // Verifica se completou a fase
    if (player.x > getLevelWidth() - 100) {
        nextLevel();
    }
    
    updateUI();
}

// ===== FUNÇÕES AUXILIARES =====
function getLevelWidth() {
    return Math.max(...platforms.map(p => p.x + p.width));
}

function getMaxCameraX() {
    return getLevelWidth() - canvas.width;
}

// ===== DESENHO DO JOGO =====
function draw() {
    // Desenha céu com gradiente
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.7, '#87CEEB');
    gradient.addColorStop(1, '#98FB98');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Desenha sol com brilho
    const sunGlow = 1 + Math.sin(sun.glowPhase) * 0.15;
    ctx.save();
    
    const glowGradient = ctx.createRadialGradient(sun.x, sun.y, sun.radius * 0.5, sun.x, sun.y, sun.radius * sunGlow * 2);
    glowGradient.addColorStop(0, 'rgba(255, 255, 100, 0.4)');
    glowGradient.addColorStop(0.5, 'rgba(255, 200, 50, 0.2)');
    glowGradient.addColorStop(1, 'rgba(255, 200, 50, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, sun.radius * sunGlow * 2, 0, Math.PI * 2);
    ctx.fill();
    
    const sunGradient = ctx.createRadialGradient(sun.x - 15, sun.y - 15, 0, sun.x, sun.y, sun.radius);
    sunGradient.addColorStop(0, '#FFF9E3');
    sunGradient.addColorStop(0.4, '#FFE55C');
    sunGradient.addColorStop(1, '#FFD700');
    ctx.fillStyle = sunGradient;
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, sun.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Raios do sol
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
    
    // Desenha nuvens
    clouds.forEach(cloud => {
        ctx.save();
        ctx.globalAlpha = cloud.opacity;
        ctx.fillStyle = '#FFFFFF';
        
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.height * 0.5, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.width * 0.25, cloud.y - cloud.height * 0.2, cloud.height * 0.6, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.width * 0.5, cloud.y, cloud.height * 0.55, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.width * 0.75, cloud.y - cloud.height * 0.15, cloud.height * 0.5, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.width, cloud.y, cloud.height * 0.45, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
        ctx.beginPath();
        ctx.ellipse(cloud.x + cloud.width * 0.5, cloud.y + cloud.height * 0.3, cloud.width * 0.4, cloud.height * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    });
    
    // Aplica câmera (movimentação lateral)
    ctx.save();
    ctx.translate(-camera.x, 0);
    
    // Desenha plataformas
    platforms.forEach(platform => {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(platform.x, platform.y, platform.width, 4);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
    });
    
    // Desenha moedas
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
    
    // Desenha inimigos
    enemiesList.forEach(enemy => {
        if (enemy.alive) {
            ctx.fillStyle = enemy.color;
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height);
            
            // Olhos
            ctx.fillStyle = 'white';
            ctx.fillRect(enemy.x + 5, enemy.y + 6, 7, 7);
            ctx.fillRect(enemy.x + 16, enemy.y + 6, 7, 7);
            ctx.fillStyle = 'black';
            ctx.fillRect(enemy.x + 7, enemy.y + 8, 3, 3);
            ctx.fillRect(enemy.x + 18, enemy.y + 8, 3, 3);
            
            // Boca
            ctx.fillStyle = 'black';
            ctx.fillRect(enemy.x + 8, enemy.y + 18, 12, 3);
        }
    });
    
    // Desenha jogador
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.strokeStyle = '#CC0000';
    ctx.lineWidth = 3;
    ctx.strokeRect(player.x, player.y, player.width, player.height);
    
    // Olhos do jogador
    ctx.fillStyle = 'white';
    ctx.fillRect(player.x + 7, player.y + 8, 8, 8);
    ctx.fillRect(player.x + 20, player.y + 8, 8, 8);
    ctx.fillStyle = 'black';
    ctx.fillRect(player.x + 9, player.y + 10, 4, 4);
    ctx.fillRect(player.x + 22, player.y + 10, 4, 4);
    
    // Boca do jogador
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(player.x + 13, player.y + 22, 9, 4);
    
    // Desenha partículas
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.restore();
    });
    
    ctx.restore();
}

// ===== LOOP PRINCIPAL DO JOGO =====
function gameLoop() {
    update();
    draw();
    
    if (gameState === 'playing') {
        animationFrameId = requestAnimationFrame(gameLoop);
    } else {
        animationFrameId = null;
    }
}

// ===== INICIALIZAÇÃO AO CARREGAR =====
window.addEventListener('load', async () => {
    initClouds();
    await loadStatsBar();
    await updateHighScoresDisplay();
    document.getElementById('menuHighscores').style.display = 'block';
});