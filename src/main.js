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
// 2. إنشاء خامة الأرضية (Grid Texture)
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
// 3. الإضاءة والظلال
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
// 4. بناء المجسمات الأساسية
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

// حاوية شعاع الليزر
const laserGroup = new THREE.Group();
laserGroup.position.set(0, 0.6, 0); 
scene.add(laserGroup);

const laserLength = floorRadius - 1;
const laserArmGeo = new THREE.CylinderGeometry(0.12, 0.12, laserLength);
const laserArmMat = new THREE.MeshBasicMaterial({ color: 0xff0055 }); 
const laserArm = new THREE.Mesh(laserArmGeo, laserArmMat);

laserArm.rotation.z = Math.PI / 2;
laserArm.position.x = laserLength / 2; 
laserGroup.add(laserArm);

// مجسم اللاعب
const playerGeo = new THREE.SphereGeometry(0.6, 24, 24);
const playerMat = new THREE.MeshStandardMaterial({ color: 0x00fff5, roughness: 0.1 });
const player = new THREE.Mesh(playerGeo, playerMat);
player.castShadow = true; 
scene.add(player);

// =========================================================================
// 5. الحركة والتحكم
// =========================================================================

let playerAngle = 0;      
let playerRadius = 8;     
const minRadius = 3.5;               
const maxRadius = floorRadius - 1.2; 

let playerY = 0.6;         
let velocityY = 0;         
const gravity = -0.015;    
let isJumping = false;     

// متغيرات الشلف والارتداد الفيزيائي عند الاصطدام
let knockbackAngleVelocity = 0;
let knockbackRadiusVelocity = 0;

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
// 6. توليد العناصر
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
        activeObstacles.push({ mesh: obs, hitCooldown: 0 });
    }
}
spawnElements();

// =========================================================================
// 7. إدارة الوقت والنهاية
// =========================================================================

let timeLeft = 40;       
let laserHits = 0;       
const maxLaserHits = 4;  
let isGameOver = false;

const timerInterval = setInterval(() => {
    if (isGameOver) return;
    timeLeft--;
    if (timeLeft <= 0) {
        timeLeft = 0;
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

let lastLaserHitTime = 0; 

// متجهات حساب تصادم الليزر
const laserStart = new THREE.Vector3();
const laserEnd = new THREE.Vector3();
const playerPos = new THREE.Vector3();
const closestPointOnLaser = new THREE.Vector3();
const laserLine = new THREE.Line3();

// =========================================================================
// 8. حلقة الأنيميشن والتصادمات المتقدمة
// =========================================================================

function animate() {
    if (isGameOver) return;
    requestAnimationFrame(animate); 

    const angularSpeed = 0.03; 
    const radialSpeed = 0.15;  

    // تطبيق حركة اللاعب بواسطة المفاتيح فقط إذا لم يكن تحت تأثير قوة الشلف القوية
    if (Math.abs(knockbackAngleVelocity) < 0.01 && Math.abs(knockbackRadiusVelocity) < 0.05) {
        if (keys['arrowleft'] || keys['a']) playerAngle += angularSpeed; 
        if (keys['arrowright'] || keys['d']) playerAngle -= angularSpeed; 
        if (keys['arrowup'] || keys['w']) playerRadius = Math.max(minRadius, playerRadius - radialSpeed); 
        if (keys['arrowdown'] || keys['s']) playerRadius = Math.min(maxRadius, playerRadius + radialSpeed); 
    }

    // 💥 تطبيق الفيزياء وقوة الارتداد (الشلف)
    playerAngle += knockbackAngleVelocity;
    playerRadius += knockbackRadiusVelocity;

    // حصر نصف القطر ضمن حدود الحلبة
    playerRadius = THREE.MathUtils.clamp(playerRadius, minRadius, maxRadius);

    // خمود قوة الارتداد تدريجياً لتعود السيطرة للاعب
    knockbackAngleVelocity *= 0.85;
    knockbackRadiusVelocity *= 0.85;

    playerY += velocityY;
    velocityY += gravity; 
    if (playerY <= 0.6) { 
        playerY = 0.6;
        isJumping = false;
        velocityY = 0;
    }

    player.position.set(
        Math.cos(playerAngle) * playerRadius,
        playerY,
        Math.sin(playerAngle) * playerRadius
    );

    const camDistance = 5;
    const camHeight = 3;
    const targetCamX = Math.cos(playerAngle) * (playerRadius + camDistance);
    const targetCamZ = Math.sin(playerAngle) * (playerRadius + camDistance);
    
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, 0.08);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, 0.08);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, playerY + camHeight, 0.08);
    camera.lookAt(player.position); 

    laserGroup.rotation.y -= 0.02; 

    playerBox.setFromObject(player); 

    // 1️⃣ التقاط الجواهر
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

    // 2️⃣ الاصطدام بالمربعات الحمراء (حساب المتجه للشلف الفيزيائي القوي)
    const now = Date.now();
    for (let obsObj of activeObstacles) {
        tempBox.setFromObject(obsObj.mesh);
        if (playerBox.intersectsBox(tempBox)) {
            if (now - obsObj.hitCooldown > 600) { 
                obsObj.hitCooldown = now;
                
                // خصم 3 ثوانٍ من الوقت
                timeLeft = Math.max(0, timeLeft - 3); 
                
                // حساب اتجاه الشلف بعيداً عن موقع المكعب بالظبط
                const obsPos = obsObj.mesh.position;
                const obsAngle = Math.atan2(obsPos.z, obsPos.x);
                const obsRadius = Math.sqrt(obsPos.x * obsPos.x + obsPos.z * obsPos.z);

                // دفع الزاوية بعيداً عن مركز المكعب
                let angleDiff = playerAngle - obsAngle;
                // ضبط الزاوية بين -PI و PI
                angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

                const pushDirection = angleDiff >= 0 ? 1 : -1;
                knockbackAngleVelocity = pushDirection * 0.12; // سرعة دوران عالية للشلف

                // دفع نصف القطر للخارج أو للداخل حسب موقع الكرة بالنسبة للمكعب
                if (playerRadius >= obsRadius) {
                    knockbackRadiusVelocity = 0.6; // دفع للخارج
                } else {
                    knockbackRadiusVelocity = -0.6; // دفع للداخل
                }
                
                if (timeLeft <= 0) {
                    endGame('timeout');
                }
            }
        }
    }

    // 3️⃣ حساب تصادم الليزر
    laserStart.set(0, 0.6, 0);
    laserEnd.set(laserLength, 0.6, 0).applyMatrix4(laserGroup.matrixWorld);
    laserLine.set(laserStart, laserEnd);

    playerPos.copy(player.position);
    laserLine.closestPointToPoint(playerPos, true, closestPointOnLaser);

    const distanceToLaser = playerPos.distanceTo(closestPointOnLaser);

    if (distanceToLaser < 0.65 && playerY < 1.1 && (now - lastLaserHitTime > 1500)) {
        lastLaserHitTime = now;
        laserHits++;
        
        knockbackRadiusVelocity = 0.8; // دفع للخارج عند ضرب الليزر

        if (laserHits >= maxLaserHits) {
            endGame('laser'); 
        }
    }

    renderer.render(scene, camera);
}

alert(`🎯 Goal: Collect 8 gems in 40 seconds!\n⚠️ Obstacles (Red Cubes): Knocks you back & subtracts 3 seconds!\n⚠️ Laser: Hits 4 times = Game Over!\n- A/D or Arrows: Orbit around\n- W/S: Move closer/further\n- Space: Jump over the laser`);

animate();