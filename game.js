// MINI BATTLE ROYALE - JavaScript Version

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Canvas setup
canvas.width = 1280;
canvas.height = 720;

// Constants
const MAP_WIDTH = 5000;
const MAP_HEIGHT = 5000;

// UI
const ui = {
    w: canvas.width,
    h: canvas.height,
    targetW: canvas.width,
    targetH: canvas.height
};

// Player
const player = {
    x: MAP_WIDTH / 2,
    y: MAP_HEIGHT / 2,
    speed: 250,
    radius: 15,
    life: 100,
    maxLife: 100,
    materials: 100,
    maxMaterials: 999,
    medkits: 3,
    buildCooldown: 0,
    buildRotation: 0,
    mode: "gun",
    damageFlash: 0,
    kills: 0
};

// Camera
const camera = {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height
};

// Game arrays
let walls = [];
let bullets = [];
let enemyBullets = [];
let enemies = [];
let particles = [];

// Game state
let gameState = "playing";
let gameTimer = 0;

// Weapons
const weapons = [
    { name: "Pistol", cooldown: 0.4, speed: 900, damage: 14, spread: 0, pellets: 1, color: [1, 1, 0], recoil: 0 },
    { name: "Rifle", cooldown: 0.15, speed: 1500, damage: 30, spread: 0.05, pellets: 1, color: [0, 1, 1], recoil: 5 },
    { name: "Shotgun", cooldown: 0.8, speed: 1200, damage: 4, spread: 0.5, pellets: 25, color: [1, 0.5, 0], recoil: 15 },
    { name: "Sniper", cooldown: 1.2, speed: 1800, damage: 100, spread: 0, pellets: 1, color: [0, 1, 0], recoil: 20, pierce: true }
];
let currentWeapon = 0;
let shootTimer = 0;

// Safe Zone
const safeZone = {
    x: MAP_WIDTH / 2,
    y: MAP_HEIGHT / 2,
    radius: MAP_WIDTH / 2,
    targetRadius: 300,
    shrinkSpeed: 8,
    damage: 15
};

// Input
const keys = {};
let mouseX = 0;
let mouseY = 0;
let mouseDown = false;

// Event listeners
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    handleKeyPress(e.key.toLowerCase());
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('mousedown', () => {
    mouseDown = true;
});

canvas.addEventListener('mouseup', () => {
    mouseDown = false;
});

// Utility functions
function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
}

function circleRect(cx, cy, r, rect) {
    const x = clamp(cx, rect.x, rect.x + rect.w);
    const y = clamp(cy, rect.y, rect.y + rect.h);
    return (cx - x) ** 2 + (cy - y) ** 2 < r * r;
}

function rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x2 < x1 + w1 && y1 < y2 + h2 && y2 < y1 + h1;
}

function lineRectIntersect(x1, y1, x2, y2, rect) {
    const left = rect.x;
    const right = rect.x + rect.w;
    const top = rect.y;
    const bottom = rect.y + rect.h;
    
    if ((x1 >= left && x1 <= right && y1 >= top && y1 <= bottom) ||
        (x2 >= left && x2 <= right && y2 >= top && y2 <= bottom)) {
        return true;
    }
    
    return false;
}

// Initialize game
function init() {
    for (let i = 0; i < 40; i++) {
        spawnBot();
    }
}

// Spawn bot
function spawnBot() {
    let attempts = 0;
    let bx, by;
    
    do {
        bx = Math.random() * (MAP_WIDTH - 200) + 100;
        by = Math.random() * (MAP_HEIGHT - 200) + 100;
        attempts++;
    } while (attempts <= 20 && distance(bx, by, player.x, player.y) <= 200);
    
    enemies.push({
        x: bx,
        y: by,
        size: 20,
        speed: 100,
        life: 100,
        maxLife: 100,
        shootTimer: Math.random() * 1 + 0.5,
        buildTimer: Math.random() * 2 + 2,
        moveTimer: 0,
        strafeDir: Math.random() > 0.5 ? 1 : -1
    });
}

// Update bot
function updateBot(e, dt) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const ox = e.x;
    const oy = e.y;
    
    if (d > 0 && d < 500) {
        let moveX = dx / d;
        let moveY = dy / d;
        
        e.moveTimer += dt;
        if (e.moveTimer > 2) {
            e.strafeDir = -e.strafeDir;
            e.moveTimer = 0;
        }
        
        if (d < 200) {
            moveX = -moveX + moveY * e.strafeDir * 0.5;
            moveY = -moveY - dx / d * e.strafeDir * 0.5;
        } else if (d > 350) {
            moveX = moveX;
            moveY = moveY;
        } else {
            moveX = moveY * e.strafeDir;
            moveY = -dx / d * e.strafeDir;
        }
        
        const len = Math.sqrt(moveX * moveX + moveY * moveY);
        if (len > 0) {
            e.x += (moveX / len) * e.speed * dt;
            e.y += (moveY / len) * e.speed * dt;
        }
        
        for (const w of walls) {
            if (circleRect(e.x, e.y, e.size / 2, w)) {
                e.x = ox;
                e.y = oy;
                break;
            }
        }
        
        e.x = clamp(e.x, e.size, MAP_WIDTH - e.size);
        e.y = clamp(e.y, e.size, MAP_HEIGHT - e.size);
    }
    
    e.buildTimer -= dt;
    if (e.buildTimer <= 0 && d < 250 && hasLineOfSight(e.x, e.y, player.x, player.y)) {
        const angle = Math.atan2(dy, dx);
        const bx = e.x + Math.cos(angle) * 30 - 10;
        const by = e.y + Math.sin(angle) * 30 - 30;
        if (canBuild(bx, by, 20, 60)) {
            buildWall(bx, by, 20, 60);
        }
        e.buildTimer = Math.random() * 2 + 3;
    }
    
    e.shootTimer -= dt;
    if (e.shootTimer <= 0 && d < 400) {
        const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.2;
        enemyBullets.push({
            x: e.x,
            y: e.y,
            dx: Math.cos(a) * 450,
            dy: Math.sin(a) * 450,
            damage: 12
        });
        e.shootTimer = Math.random() * 0.6 + 1.2;
    }
}

function hasLineOfSight(x1, y1, x2, y2) {
    for (const w of walls) {
        if (lineRectIntersect(x1, y1, x2, y2, w)) {
            return false;
        }
    }
    return true;
}

// Build functions
function getBuildPreview() {
    const wx = mouseX + camera.x;
    const wy = mouseY + camera.y;
    const a = Math.atan2(wy - player.y, wx - player.x);
    
    let w = 20, h = 80;
    if (player.buildRotation === 1) {
        w = 80;
        h = 20;
    }
    
    const bx = player.x + Math.cos(a) * 60 - w / 2;
    const by = player.y + Math.sin(a) * 60 - h / 2;
    
    return { x: bx, y: by, w: w, h: h };
}

function canBuild(bx, by, bw, bh) {
    for (const w of walls) {
        if (rectsOverlap(bx, by, bw, bh, w.x, w.y, w.w, w.h)) {
            return false;
        }
    }
    return true;
}

function buildWall(x, y, w, h) {
    walls.push({
        x: x,
        y: y,
        w: w,
        h: h,
        life: 150,
        maxLife: 150
    });
}

// Shoot
function shoot() {
    const w = weapons[currentWeapon];
    shootTimer = w.cooldown;
    
    const wx = mouseX + camera.x;
    const wy = mouseY + camera.y;
    const a = Math.atan2(wy - player.y, wx - player.x);
    
    if (w.recoil) {
        player.x -= Math.cos(a) * w.recoil;
        player.y -= Math.sin(a) * w.recoil;
    }
    
    for (let i = 0; i < w.pellets; i++) {
        const ang = a + (Math.random() - 0.5) * w.spread;
        bullets.push({
            x: player.x,
            y: player.y,
            dx: Math.cos(ang) * w.speed,
            dy: Math.sin(ang) * w.speed,
            damage: w.damage,
            color: w.color,
            pierce: w.pierce || false
        });
    }
    
    createParticles(player.x + Math.cos(a) * 20, player.y + Math.sin(a) * 20, 5, w.color);
}

// Update bullets
function updateBullets(list, dt, targets, isPlayer) {
    for (let i = list.length - 1; i >= 0; i--) {
        const b = list[i];
        b.x += b.dx * dt;
        b.y += b.dy * dt;
        
        if (b.x < 0 || b.x > MAP_WIDTH || b.y < 0 || b.y > MAP_HEIGHT) {
            list.splice(i, 1);
            continue;
        }
        
        // Wall collision
        let hitWall = false;
        for (let j = walls.length - 1; j >= 0; j--) {
            const w = walls[j];
            if (b.x > w.x && b.x < w.x + w.w && b.y > w.y && b.y < w.y + w.h) {
                w.life -= b.damage;
                if (w.life <= 0) {
                    createParticles(w.x + w.w / 2, w.y + w.h / 2, 8, [0.6, 0.4, 0.2]);
                    if (isPlayer && Math.random() > 0.5) {
                        player.materials = Math.min(player.maxMaterials, player.materials + 10);
                    }
                    walls.splice(j, 1);
                }
                createParticles(b.x, b.y, 3, [0.8, 0.8, 0.8]);
                list.splice(i, 1);
                hitWall = true;
                break;
            }
        }
        
        if (hitWall) continue;
        
        // Target collision
        for (let j = targets.length - 1; j >= 0; j--) {
            const t = targets[j];
            if (t.life > 0) {
                const r = t.radius || t.size / 2;
                if (distance(b.x, b.y, t.x, t.y) < r) {
                    t.life -= b.damage;
                    
                    if (!isPlayer) {
                        player.damageFlash = 1;
                    }
                    
                    createParticles(b.x, b.y, 8, [1, 0, 0]);
                    
                    if (!b.pierce) {
                        list.splice(i, 1);
                        break;
                    }
                }
            }
        }
    }
}

// Particles
function createParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 200,
            vy: (Math.random() - 0.5) * 200,
            life: 0.5,
            color: color
        });
    }
}

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 400 * dt;
        p.life -= dt;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// Update player
function updatePlayer(dt) {
    const ox = player.x;
    const oy = player.y;
    
    if (keys['w']) player.y -= player.speed * dt;
    if (keys['s']) player.y += player.speed * dt;
    if (keys['a']) player.x -= player.speed * dt;
    if (keys['d']) player.x += player.speed * dt;
    
    player.x = clamp(player.x, player.radius, MAP_WIDTH - player.radius);
    player.y = clamp(player.y, player.radius, MAP_HEIGHT - player.radius);
    
    for (const w of walls) {
        if (circleRect(player.x, player.y, player.radius, w)) {
            player.x = ox;
            player.y = oy;
            break;
        }
    }
    
    if (player.mode === "gun") {
        if (mouseDown && shootTimer <= 0) {
            shoot();
        }
    }
}

// Update storm
function updateStorm(dt) {
    safeZone.radius = Math.max(
        safeZone.targetRadius,
        safeZone.radius - safeZone.shrinkSpeed * dt
    );
    
    const d = distance(player.x, player.y, safeZone.x, safeZone.y);
    if (d > safeZone.radius) {
        player.life -= safeZone.damage * dt;
        player.damageFlash = 0.5;
    }
    
    for (const e of enemies) {
        const ed = distance(e.x, e.y, safeZone.x, safeZone.y);
        if (ed > safeZone.radius) {
            e.life -= safeZone.damage * dt;
        }
    }
    
    player.life = Math.max(0, player.life);
}

// Handle key press
function handleKeyPress(key) {
    if (gameState !== "playing") {
        if (key === 'r') resetGame();
        return;
    }
    
    if (key === 'tab') {
        player.mode = player.mode === "gun" ? "build" : "gun";
    }
    
    if (key === 'r') {
        player.buildRotation = 1 - player.buildRotation;
    }
    
    if (key === 'q' && player.mode === "build" && player.buildCooldown <= 0 && player.materials >= 10) {
        const p = getBuildPreview();
        if (canBuild(p.x, p.y, p.w, p.h)) {
            buildWall(p.x, p.y, p.w, p.h);
            player.materials -= 10;
            player.buildCooldown = 0.25;
        }
    }
    
    if (key === 'e' && player.medkits > 0) {
        player.life = Math.min(player.maxLife, player.life + 50);
        player.medkits--;
    }
    
    if (key === '1') currentWeapon = 0;
    if (key === '2') currentWeapon = 1;
    if (key === '3') currentWeapon = 2;
    if (key === '4') currentWeapon = 3;
}

// Reset game
function resetGame() {
    player.x = Math.random() * MAP_WIDTH;
    player.y = Math.random() * MAP_HEIGHT;
    player.life = player.maxLife;
    player.materials = 100;
    player.medkits = 3;
    player.kills = 0;
    
    walls = [];
    bullets = [];
    enemyBullets = [];
    enemies = [];
    particles = [];
    
    safeZone.radius = MAP_WIDTH / 2;
    gameState = "playing";
    gameTimer = 0;
    
    for (let i = 0; i < 40; i++) {
        spawnBot();
    }
}

// Update
function update(dt) {
    if (gameState !== "playing") return;
    
    gameTimer += dt;
    shootTimer = Math.max(0, shootTimer - dt);
    player.buildCooldown = Math.max(0, player.buildCooldown - dt);
    player.damageFlash = Math.max(0, player.damageFlash - dt * 3);
    
    updatePlayer(dt);
    updateStorm(dt);
    
    updateBullets(bullets, dt, enemies, true);
    updateBullets(enemyBullets, dt, [player], false);
    
    for (let i = enemies.length - 1; i >= 0; i--) {
        updateBot(enemies[i], dt);
        if (enemies[i].life <= 0) {
            createParticles(enemies[i].x, enemies[i].y, 15, [1, 0, 0]);
            player.kills++;
            enemies.splice(i, 1);
        }
    }
    
    updateParticles(dt);
    
    camera.x = clamp(player.x - ui.w / 2, 0, MAP_WIDTH - ui.w);
    camera.y = clamp(player.y - ui.h / 2, 0, MAP_HEIGHT - ui.h);
    
    if (player.life <= 0) {
        gameState = "lost";
    } else if (enemies.length === 0) {
        gameState = "won";
    }
}

// Draw
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    
    // Map background
    ctx.fillStyle = 'rgb(64, 153, 64)';
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    
    // Grid
    ctx.strokeStyle = 'rgba(51, 128, 51, 0.3)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= MAP_WIDTH; x += 100) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, MAP_HEIGHT);
        ctx.stroke();
    }
    for (let y = 0; y <= MAP_HEIGHT; y += 100) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(MAP_WIDTH, y);
        ctx.stroke();
    }
    
    // Safe zone
    ctx.fillStyle = 'rgba(0, 128, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(safeZone.x, safeZone.y, safeZone.radius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(0, 77, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(safeZone.x, safeZone.y, safeZone.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    
    // Build preview
    if (player.mode === "build" && player.materials >= 10) {
        const p = getBuildPreview();
        const canPlace = canBuild(p.x, p.y, p.w, p.h);
        ctx.fillStyle = canPlace ? 'rgba(128, 255, 128, 0.5)' : 'rgba(255, 128, 128, 0.5)';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.strokeRect(p.x, p.y, p.w, p.h);
    }
    
    // Walls
    for (const w of walls) {
        const health = w.life / w.maxLife;
        ctx.fillStyle = 'rgb(153, 102, 51)';
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = 'rgb(77, 51, 26)';
        ctx.strokeRect(w.x, w.y, w.w, w.h);
        
        if (health < 1) {
            ctx.fillStyle = 'rgb(255, 0, 0)';
            ctx.fillRect(w.x, w.y - 5, w.w * health, 3);
        }
    }
    
    // Player
    if (player.damageFlash > 0) {
        ctx.fillStyle = 'rgb(255, 77, 77)';
    } else {
        ctx.fillStyle = 'rgb(51, 128, 204)';
    }
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgb(26, 77, 128)';
    ctx.stroke();
    
    // Player direction
    const wx = mouseX + camera.x;
    const wy = mouseY + camera.y;
    const a = Math.atan2(wy - player.y, wx - player.x);
    ctx.strokeStyle = 'rgb(255, 255, 255)';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + Math.cos(a) * player.radius * 80, player.y + Math.sin(a) * player.radius * 80);
    ctx.stroke();
    
    // Enemies
    for (const e of enemies) {
        ctx.fillStyle = 'rgb(204, 51, 51)';
        ctx.fillRect(e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);
        ctx.strokeStyle = 'rgb(128, 26, 26)';
        ctx.strokeRect(e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);
        
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.fillRect(e.x - e.size / 2, e.y - e.size / 2 - 8, e.size, 4);
        ctx.fillStyle = 'rgb(0, 255, 0)';
        ctx.fillRect(e.x - e.size / 2, e.y - e.size / 2 - 8, e.size * (e.life / e.maxLife), 4);
    }
    
    // Bullets
    for (const b of bullets) {
        const col = b.color;
        ctx.fillStyle = `rgb(${col[0] * 255}, ${col[1] * 255}, ${col[2] * 255})`;
        ctx.beginPath();
        const size = b.pierce ? 5 : 3;
        ctx.arc(b.x, b.y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    for (const b of enemyBullets) {
        ctx.fillStyle = 'rgb(255, 77, 77)';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Particles
    for (const p of particles) {
        ctx.fillStyle = `rgba(${p.color[0] * 255}, ${p.color[1] * 255}, ${p.color[2] * 255}, ${p.life})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
    
    drawUI();
    
    if (gameState !== "playing") {
        drawGameOver();
    }
}

// Draw UI
function drawUI() {
    const lifePercent = Math.max(0, Math.min(1, player.life / player.maxLife));
    
    // Health bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(18, 18, 204, 24);
    ctx.fillStyle = 'rgb(77, 0, 0)';
    ctx.fillRect(20, 20, 200, 20);
    ctx.fillStyle = `rgb(${(1 - lifePercent) * 255}, ${lifePercent * 255}, 0)`;
    ctx.fillRect(20, 20, 200 * lifePercent, 20);
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.fillText(`HP: ${Math.floor(player.life)}/${player.maxLife}`, 25, 33);
    
    // Info
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(18, 48, 200, 100);
    ctx.fillStyle = 'white';
    ctx.fillText(`Mode: ${player.mode.toUpperCase()}`, 25, 65);
    ctx.fillText(`Materials: ${player.materials}`, 25, 85);
    ctx.fillText(`Medkits: ${player.medkits} (E)`, 25, 105);
    ctx.fillText(`Kills: ${player.kills}`, 25, 125);
    ctx.fillText(`Enemies: ${enemies.length}`, 25, 145);
    
    // Controls
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(ui.w - 218, 18, 200, 80);
    ctx.fillStyle = 'white';
    ctx.fillText('TAB: Trocar modo', ui.w - 213, 35);
    ctx.fillText('Q: Construir', ui.w - 213, 55);
    ctx.fillText('R: Rotacionar', ui.w - 213, 75);
    ctx.fillText('1,2,3,4: Armas', ui.w - 213, 95);
    
    // Weapons
    for (let i = 0; i < weapons.length; i++) {
        const w = weapons[i];
        const selected = i === currentWeapon;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(248 + i * 85, 548, 76, 46);
        
        if (selected) {
            ctx.strokeStyle = `rgb(${w.color[0] * 255}, ${w.color[1] * 255}, ${w.color[2] * 255})`;
        } else {
            ctx.strokeStyle = 'rgb(128, 128, 128)';
        }
        ctx.lineWidth = 2;
        ctx.strokeRect(250 + i * 85, 550, 72, 42);
        ctx.lineWidth = 1;
        
        ctx.fillStyle = 'white';
        ctx.fillText(w.name, 255 + i * 85, 570);
        ctx.fillText(String(i + 1), 255 + i * 85, 585);
    }
    
    // Safe zone bar
    const shrinkPercent = (safeZone.radius - safeZone.targetRadius) / (MAP_WIDTH / 2 - safeZone.targetRadius);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(ui.w / 2 - 102, ui.h - 42, 204, 24);
    ctx.fillStyle = 'rgb(128, 0, 128)';
    ctx.fillRect(ui.w / 2 - 100, ui.h - 40, 200, 20);
    ctx.fillStyle = 'rgb(204, 0, 204)';
    ctx.fillRect(ui.w / 2 - 100, ui.h - 40, 200 * shrinkPercent, 20);
    ctx.fillStyle = 'white';
    ctx.fillText('ZONA SEGURA', ui.w / 2 - 45, ui.h - 27);
}

// Draw game over
function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, ui.w, ui.h);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(gameState === "won" ? "VITÓRIA!" : "DERROTA!", ui.w / 2, ui.h / 2 - 60);
    
    ctx.font = '24px Arial';
    ctx.fillText(`Kills: ${player.kills}`, ui.w / 2, ui.h / 2);
    ctx.fillText(`Tempo: ${gameTimer.toFixed(1)}s`, ui.w / 2, ui.h / 2 + 30);
    
    ctx.font = '20px Arial';
    ctx.fillText('Pressione R para reiniciar', ui.w / 2, ui.h / 2 + 80);
    ctx.textAlign = 'left';
}

// Game loop
let lastTime = 0;
function gameLoop(currentTime) {
    const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;
    
    update(dt);
    draw();
    
    requestAnimationFrame(gameLoop);
}

// Start game
init();
requestAnimationFrame(gameLoop);
