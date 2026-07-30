import * as THREE from 'three';

// =========================================================================
// 1. المشهد، الكاميرا، والمصيّر (Scene, Camera, and Renderer Setup)
// =========================================================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d17);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);

// =========================================================================
// 2. إنشاء الخامات المتقدمة (Texture Generation & Mapping)
// =========================================================================

function createGridTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#161b26';
    ctx.fillRect(0, 0, 512, 512);
    
    ctx.strokeStyle = '#00fff5';
    ctx.lineWidth = 4;
    for (let i = 0; i <= 512; i += 64) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
    }
    return new THREE.CanvasTexture(canvas);
}

const floorTexture = createGridTexture();
floorTexture.wrapS = THREE.RepeatWrapping; 
floorTexture.wrapT = THREE.RepeatWrapping; 
floorTexture.repeat.set(8, 8);             

// =========================================================================
// 3. الإضاءة والظلال (Lighting and Shadow Mapping)
// =========================================================================

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffd700, 1.2);
dirLight.position.set(15, 25, 15); 
dirLight.castShadow = true;        
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

// =========================================================================
// 4. عناصر المشهد الأساسية (Floor, Tower, Laser Arm, Player)
// =========================================================================

const floorRadius = 14; 

const floorGeo = new THREE.CylinderGeometry(floorRadius, floorRadius, 0.5, 64);
const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.4 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.position.y = -0.25; 
floor.receiveShadow = true; 
scene.add(floor);

const towerGeo = new THREE.CylinderGeometry(1.5, 2, 10, 32);
const towerMat = new THREE.MeshStandardMaterial({ color: 0x3a405a, roughness: 0.2, metalness: 0.8 });
const tower = new THREE.Mesh(towerGeo, towerMat);
tower.position.y = 5;
tower.castShadow = true;    
tower.receiveShadow = true; 
scene.add(tower);

// 🔴 حاوية شعاع الليزر (Laser Group): تبدأ من مركز البرج وتمتد للخارج فقط مثل عقرب الساعة
const laserGroup = new THREE.Group();
laserGroup.position.set(0, 0.6, 0);
scene.add(laserGroup);

const laserLength = floorRadius - 1;
const laserArmGeo = new THREE.CylinderGeometry(0.12, 0.12, laserLength);
const laserArmMat = new THREE.MeshBasicMaterial({ color: 0xff0055 }); 
const laserArm = new THREE.Mesh(laserArmGeo, laserArmMat);

// تدوير ذراع الليزر وضبط محورها لتبدأ من المركز وتتجه نحو الإمام
laserArm.rotation.z = Math.PI / 2;
laserArm.position.x = laserLength / 2; // إزاحة المركز لتنطلق من البرج للخارج فقط
laserGroup.add(laserArm);

// مجسم اللاعب
const playerGeo = new THREE.SphereGeometry(0.6, 24, 24);
const playerMat = new THREE.MeshStandardMaterial({ color: 0x00fff5, roughness: 0.1 });
const player = new THREE.Mesh(playerGeo, playerMat);
player.castShadow = true; 
scene.add(player);

// =========================================================================
// 5. نظام التحكم المداري وفيزياء القفز
// =========================================================================

let playerAngle = 0;      
let playerRadius = 8;     
const minRadius = 3.5;            
const maxRadius = floorRadius - 1.2; 

let playerY = 0.6;         
let velocityY = 0;         
const gravity = -0.015;    
let isJumping = false;     

const keys = {};
window.addEventListener('keydown', (e) => { 
    keys[e.key.toLowerCase()] = true; 
    keys[e.key] = true;

    if (e.code === 'Space' && !isJumping) {
        velocityY = 0.35; 
        isJumping = true;
    }
});
window.addEventListener('keyup', (e) => { 
    keys[e.key.toLowerCase()] = false; 
    keys[e.key] = false;
});

// =========================================================================
// 6. العوائق الأرضية والجواهر
// =========================================================================

const maxGems = 8;
let gemsCollected = 0;
const activeGems = [];
const activeObstacles = [];

const gemGeo = new THREE.OctahedronGeometry(0.4);
const gemMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.5 });

const obstacleGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
const obstacleMat = new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.5 });

function spawnElements() {
    for (let i = 0; i < maxGems; i++) {
        const gem = new THREE.Mesh(gemGeo, gemMat);
        const angle = (i / maxGems) * Math.PI * 2 + Math.random() * 0.5;
        const r = minRadius + Math.random() * (maxRadius - minRadius);
        
        gem.position.set(Math.cos(angle) * r, 0.8, Math.sin(angle) * r);
        gem.castShadow = true;
        scene.add(gem);
        activeGems.push(gem);
    }

    for (let i = 0; i < 5; i++) {
        const obs = new THREE.Mesh(obstacleGeo, obstacleMat);
        const angle = (i / 5) * Math.PI * 2 + 0.3;
        const r = minRadius + Math.random() * (maxRadius - minRadius);
        
        obs.position.set(Math.cos(angle) * r, 0.6, Math.sin(angle) * r);
        obs.castShadow = true;
        obs.receiveShadow = true;
        scene.add(obs);
        activeObstacles.push(obs);
    }
}
spawnElements();

// =========================================================================
// 7. إدارة الوقت والتصادم (Perfect Collision)
// =========================================================================

let timeLeft = 40;       
let laserHits = 0;       
const maxLaserHits = 4;  
let isGameOver = false;

const timerInterval = setInterval(() => {
    if (isGameOver) return;
    timeLeft--;
    if (timeLeft <= 0) {
        endGame('timeout'); 
    }
}, 1000);

function endGame(reason) {
    isGameOver = true;
    clearInterval(timerInterval);

    if (reason === 'win') {
        alert(`🎉 Congratulations! You won the race and collected all ${maxGems} gems!`);
    } else if (reason === 'laser') {
        alert(`💥 Game Over! You hit the laser 4 times! Try jumping with Space to avoid it.`);
    } else if (reason === 'timeout') {
        alert(`⏰ Time's Up! You collected ${gemsCollected} out of ${maxGems} gems.`);
    }
}

const playerBox = new THREE.Box3();
const tempBox = new THREE.Box3();
const laserBox = new THREE.Box3();

let lastHitTime = 0; 

function animate() {
    if (isGameOver) return;
    requestAnimationFrame(animate); 

    // أ) الحركة المدارية
    const angularSpeed = 0.03;
    const radialSpeed = 0.15;

    if (keys['arrowleft'] || keys['a']) playerAngle += angularSpeed;  
    if (keys['arrowright'] || keys['d']) playerAngle -= angularSpeed; 
    if (keys['arrowup'] || keys['w']) playerRadius = Math.max(minRadius, playerRadius - radialSpeed); 
    if (keys['arrowdown'] || keys['s']) playerRadius = Math.min(maxRadius, playerRadius + radialSpeed); 

    const targetX = Math.cos(playerAngle) * playerRadius;
    const targetZ = Math.sin(playerAngle) * playerRadius;

    // القفز والجاذبية
    playerY += velocityY;
    velocityY += gravity; 
    if (playerY <= 0.6) { 
        playerY = 0.6;
        isJumping = false;
        velocityY = 0;
    }

    player.position.set(targetX, playerY, targetZ);

    // ب) الكاميرا الناعمة
    const camDistance = 5;
    const camHeight = 3;
    const targetCamX = Math.cos(playerAngle) * (playerRadius + camDistance);
    const targetCamZ = Math.sin(playerAngle) * (playerRadius + camDistance);
    
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, 0.08);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, 0.08);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, playerY + camHeight, 0.08);
    camera.lookAt(player.position); 

    // ج) دوران الليزر
    laserGroup.rotation.y -= 0.02; // دوران شعاع الليزر

    // د) كشف الاصطدامات
    playerBox.setFromObject(player); 

    // 1. التقاط الجواهر
    for (let i = activeGems.length - 1; i >= 0; i--) {
        const gem = activeGems[i];
        gem.rotation.y += 0.03; 
        tempBox.setFromObject(gem);

        if (playerBox.intersectsBox(tempBox)) {
            scene.remove(gem);
            gem.geometry.dispose(); 
            activeGems.splice(i, 1);
            gemsCollected++;

            if (gemsCollected === maxGems) endGame('win');
        }
    }

    // 2. الاصطدام بالعوائق الأرضية
    for (let obs of activeObstacles) {
        tempBox.setFromObject(obs);
        if (playerBox.intersectsBox(tempBox)) {
            playerRadius = Math.min(maxRadius, playerRadius + 0.3);
        }
    }

    // 3. الاصطدام بليزر (AABB المباشر والمحدد على شعاع الليزر الأحمر فقط)
    laserBox.setFromObject(laserArm);
    const now = Date.now();

    // يضرب فقط إذا تقاطع مجسم الكرة مع مجسم الليزر وكانت الكرة متواجدة على الارتفاع المنخفض (playerY < 1.1)
    if (playerBox.intersectsBox(laserBox) && playerY < 1.1 && (now - lastHitTime > 1800)) {
        lastHitTime = now;
        laserHits++;
        
        playerRadius = Math.min(maxRadius, playerRadius + 1.5); // دفع اللاعب للبعيد عند ضربه

        if (laserHits >= maxLaserHits) {
            endGame('laser'); 
        } else {
            console.log(`⚠️ Warning: Laser hit! Lives remaining: ${maxLaserHits - laserHits}`);
        }
    }

    renderer.render(scene, camera);
}

alert(`🎯 Goal: Collect 8 gems in 40 seconds!\n⚠️ Warning: If the laser hits you 4 times, you lose!\n- A/D or Arrows: Orbit around\n- W/S: Move closer/further\n- Space: Jump over the laser`);
animate();