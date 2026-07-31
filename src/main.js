import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d17);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);

const textureLoader = new THREE.TextureLoader();

const floorTexture = textureLoader.load('floor.jpg'); 

floorTexture.wrapS = THREE.RepeatWrapping; 
floorTexture.wrapT = THREE.RepeatWrapping; 

floorTexture.repeat.set(4, 4);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight); 
const dirLight = new THREE.DirectionalLight(0xffd700, 1.2);
dirLight.position.set(15, 25, 15); 
dirLight.castShadow = true;        
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight); 

const floorRadius = 14; 

const floorGeo = new THREE.CylinderGeometry(floorRadius, floorRadius, 0.5, 64);
const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.5 });
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

const playerGeo = new THREE.SphereGeometry(0.6, 24, 24);
const playerMat = new THREE.MeshStandardMaterial({ color: 0x00fff5, roughness: 0.1 });
const player = new THREE.Mesh(playerGeo, playerMat);
player.castShadow = true; 
scene.add(player);        

let playerAngle = 0;      
let playerRadius = 8;     
const minRadius = 4.0;             
const maxRadius = floorRadius - 1.2; 

let playerY = 0.6;       
let velocityY = 0;        
const gravity = -0.015;    
let isJumping = false; 

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

const maxGems = 8;      
let gemsCollected = 0;    
let activeGems = [];      
const activeObstacles = []; 

const gemGeo = new THREE.OctahedronGeometry(0.4);
const gemMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.5 });

const obstacleGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
const obstacleMat = new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.5 });

function spawnElements() {
    for (let i = 0; i < maxGems; i++) {
        const gem = new THREE.Mesh(gemGeo, gemMat);
        const angle = (i / maxGems) * Math.PI * 2; 
        const r = minRadius + 1.0 + (i % 3) * 2.0; 
        
        gem.position.set(Math.cos(angle) * r, 0.8, Math.sin(angle) * r);
        gem.castShadow = true;
        scene.add(gem);
        activeGems.push(gem);
    }

    for (let i = 0; i < 5; i++) {
        const obs = new THREE.Mesh(obstacleGeo, obstacleMat);
        const angle = (i / 5) * Math.PI * 2 + 0.4; 
        const r = minRadius + 1.5 + (i % 2) * 2.5;
        
        obs.position.set(Math.cos(angle) * r, 0.6, Math.sin(angle) * r);
        obs.castShadow = true;
        obs.receiveShadow = true;
        scene.add(obs);
      
        activeObstacles.push({ mesh: obs, hitCooldown: 0 });
    }
}
spawnElements(); 

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

const laserStart = new THREE.Vector3();
const laserEnd = new THREE.Vector3();
const playerPos = new THREE.Vector3();
const closestPointOnLaser = new THREE.Vector3();
const laserLine = new THREE.Line3();

function animate() {
    if (isGameOver) return; 
    requestAnimationFrame(animate); 

    const angularSpeed = 0.01; 
    const radialSpeed = 0.5;  

    if (Math.abs(knockbackAngleVelocity) < 0.01 && Math.abs(knockbackRadiusVelocity) < 0.05) {
        if (keys['arrowleft'] || keys['a']) playerAngle += angularSpeed; 
        if (keys['arrowright'] || keys['d']) playerAngle -= angularSpeed; 
        if (keys['arrowup'] || keys['w']) playerRadius = Math.max(minRadius, playerRadius - radialSpeed); 
        if (keys['arrowdown'] || keys['s']) playerRadius = Math.min(maxRadius, playerRadius + radialSpeed); 
    }

    playerAngle += knockbackAngleVelocity;
    playerRadius += knockbackRadiusVelocity;

    playerRadius = THREE.MathUtils.clamp(playerRadius, minRadius, maxRadius);

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

    const gemsToKeep = []; 
    for (let i = 0; i < activeGems.length; i++) {
        const gem = activeGems[i];
        gem.rotation.y += 0.03; 

        const distToGem = player.position.distanceTo(gem.position);

        if (distToGem < 0.85) { 
            scene.remove(gem); 
            gemsCollected++;   

            if (gemsCollected === maxGems) endGame('win');
        } else {
            gemsToKeep.push(gem);
        }
    }
    activeGems = gemsToKeep; 
    const now = Date.now();
    playerBox.setFromObject(player);
    for (let obsObj of activeObstacles) {
        tempBox.setFromObject(obsObj.mesh); 
        
        if (playerBox.intersectsBox(tempBox)) {
          
            if (now - obsObj.hitCooldown > 600) { 
                obsObj.hitCooldown = now; 
                
                timeLeft = Math.max(0, timeLeft - 3); 
                
                const obsPos = obsObj.mesh.position;
                const obsAngle = Math.atan2(obsPos.z, obsPos.x);
                const obsRadius = Math.sqrt(obsPos.x * obsPos.x + obsPos.z * obsPos.z);

                let angleDiff = playerAngle - obsAngle;
                angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

                const pushDirection = angleDiff >= 0 ? 1 : -1;
                knockbackAngleVelocity = pushDirection * 0.12; 

                if (playerRadius >= obsRadius) {
                    knockbackRadiusVelocity = 0.6; 
                } else {
                    knockbackRadiusVelocity = -0.6; 
                }
                if (timeLeft <= 0) {
                    endGame('timeout');
                }
            }
        }
    }

    laserStart.set(0, 0.6, 0);
    laserEnd.set(laserLength, 0.6, 0).applyMatrix4(laserGroup.matrixWorld);
    laserLine.set(laserStart, laserEnd);

    playerPos.copy(player.position);
    laserLine.closestPointToPoint(playerPos, true, closestPointOnLaser);

    const distanceToLaser = playerPos.distanceTo(closestPointOnLaser);

    if (distanceToLaser < 0.65 && playerY < 1.1 && (now - lastLaserHitTime > 1500)) {
        lastLaserHitTime = now;
        laserHits++; 
        
        knockbackRadiusVelocity = 0.8; 
        
        if (laserHits >= maxLaserHits) {
            endGame('laser'); 
        }
    }
    renderer.render(scene, camera);
}

alert(`🎯 Goal: Collect 8 gems in 40 seconds!\n⚠️ Obstacles (Red Cubes): Knocks you back & subtracts 3 seconds!\n⚠️ Laser: Hits 4 times = Game Over!\n- A/D or Arrows: Orbit around\n- W/S: Move closer/further\n- Space: Jump over the laser`);

animate();