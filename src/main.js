import * as THREE from 'three';

// 1. المشهد والكاميرا
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 18, 18);
//توجيه العدسة لمركز العالم
camera.lookAt(0, 0, 0);
//تحويل ل3D  منع الحواف الحادة
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
// الظلال
renderer.shadowMap.enabled = true;
//اضافة HTML لكي يستطيع المستخدم رؤية اللعبة
document.body.appendChild(renderer.domElement);

// 2. الإضاءة والظلال
const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
scene.add(ambientLight);
//ضوء محيطي
const dirLight = new THREE.DirectionalLight(0xffaa00, 1.5);
//مصدر انبعاث الاشعة
dirLight.position.set(10, 15, 10);
//السماحية لاعطاء الظلال + خريطة الظل
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
scene.add(dirLight);

// 3. العناصر (الأرضية والبرج الشفاف واللاعب)
const floorRadius = 11;
//اسطوانة
const floorGeo = new THREE.CylinderGeometry(floorRadius, floorRadius, 0.5, 32);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x16213e });
const floor = new THREE.Mesh(floorGeo, floorMat);
//ليكون مستواها عند 0
floor.position.y = -0.25;
floor.receiveShadow = true;
scene.add(floor);

// البرج الشفاف هيكل متوازي اضلاع
const towerGeo = new THREE.BoxGeometry(2.5, 8, 2.5);
const towerMat = new THREE.MeshStandardMaterial({ 
    color: 0x4e54c8, 
    //الشفافية ونسبتها
    transparent: true, 
    opacity: 0.3,
    emissive: 0x000000 
});
const tower = new THREE.Mesh(towerGeo, towerMat);
tower.position.y = 4;
tower.castShadow = true;
tower.receiveShadow = true;
scene.add(tower);

// اللاعب
const playerGeo = new THREE.SphereGeometry(0.8, 16, 16); //هيكل كروي
const playerMat = new THREE.MeshStandardMaterial({ color: 0x00fff5 });
const player = new THREE.Mesh(playerGeo, playerMat);
player.position.set(0, 0.8, 7);
player.castShadow = true;
scene.add(player);

// 4. التحكم بالأزرار (4 اتجاهات)
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, s: false, a: false, d: false };
window.addEventListener('keydown', (e) => { keys[e.key] = true; });
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

// الجواهر
const maxTotalGems = 8;
let gemsCollected = 0;
const activeGems = [];//تخزين الجواهر الموجودة على الارض
//شكل الجوهرة
const gemGeo = new THREE.OctahedronGeometry(0.5);
const gemMat = new THREE.MeshStandardMaterial({ color: 0xffd700 });

function spawnGem() {
    //  إذا كان المجمع + الظاهر حالياً يساوي 8، لا تنتج أي جوهرة إضافي
    if (gemsCollected + activeGems.length >= maxTotalGems) return;

    const gem = new THREE.Mesh(gemGeo, gemMat);
    gem.castShadow = true;

    let r, angle, x, z;
    do {
        r = 3.5 + Math.random() * (floorRadius - 4.5);
        angle = Math.random() * Math.PI * 2;
        x = Math.cos(angle) * r;
        z = Math.sin(angle) * r;
    } while (Math.abs(x) < 2.5 && Math.abs(z) < 2.5);

    gem.position.set(x, 0.8, z);
    scene.add(gem);
    activeGems.push(gem);
}

// البداية توليد جوهرتين فقط 
spawnGem();
spawnGem();

//  العداد الزمني
let timeLeft = 30;
let isGameOver = false;
let timerInterval=null;
function startTimer(){
   timerInterval = setInterval(() => {
    if (isGameOver) return;
    timeLeft--;

    if (timeLeft <= 0 && gemsCollected < maxTotalGems) {
        isGameOver = true;
        clearInterval(timerInterval);
        alert(`❌  time is over ,you've collect ${gemsCollected} from ${maxTotalGems}`);
    }
}, 1000);
}

//  صناديق احاطة لحساب تصادم الاجسام
const playerBox = new THREE.Box3();
const gemBox = new THREE.Box3();
const speed = 0.2; //سرعة اللاعب

function animate() {
    if (isGameOver) return;
    requestAnimationFrame(animate);

    // أ) حركة اللاعب
    let moveX = 0;
    let moveZ = 0;

    if (keys.ArrowUp || keys.w) moveZ -= speed;
    if (keys.ArrowDown || keys.s) moveZ += speed;
    if (keys.ArrowLeft || keys.a) moveX -= speed;
    if (keys.ArrowRight || keys.d) moveX += speed;

    const newX = player.position.x + moveX;
    const newZ = player.position.z + moveZ;
//الاحداثيات القادمة المتوقعة
    const distanceFromCenter = Math.sqrt(newX * newX + newZ * newZ);
    const isInsideFloor = distanceFromCenter < (floorRadius - 0.8);
    const isHittingTower = Math.abs(newX) < 1.8 && Math.abs(newZ) < 1.8;

    if (isInsideFloor && !isHittingTower) {
        player.position.x = newX;
        player.position.z = newZ;
    }

    // دوران الضوء
    const time = Date.now() * 0.001;
    dirLight.position.x = Math.cos(time * 0.4) * 15;
    dirLight.position.z = Math.sin(time * 0.4) * 15;

    //تلون البرج بالاحمر
    const pulseCycle = time % 3;//التكرار
    if (pulseCycle > 2) {
        towerMat.color.setHex(0xff0000);
        towerMat.emissive.setHex(0xff0000);//التوهج
        towerMat.opacity = 0.9;

        if (distanceFromCenter < 3.8) {
            const pushAngle = Math.atan2(player.position.z, player.position.x);
            player.position.x = Math.cos(pushAngle) * 6;
            player.position.z = Math.sin(pushAngle) * 6;
            
            timeLeft = Math.max(0, timeLeft - 3);
        }
    } else {
        towerMat.color.setHex(0x4e54c8);
        towerMat.emissive.setHex(0x000000);
        towerMat.opacity = 0.3;
    }

    //كشف الاصطدام
    playerBox.setFromObject(player);

    for (let i = activeGems.length - 1; i >= 0; i--) {
        const currentGem = activeGems[i];
        currentGem.rotation.y += 0.04;//تدوير الجوهرة حول نفسها 
        gemBox.setFromObject(currentGem);

        if (playerBox.intersectsBox(gemBox)) {
            scene.remove(currentGem);
            activeGems.splice(i, 1);
            gemsCollected++;

            if (gemsCollected === maxTotalGems) {
                isGameOver = true;
                clearInterval(timerInterval);
                alert(`🎉 congrads! you won`);
                break;
            } else {
                spawnGem(); // استدعاء الجوهرة التالية بحد أقصى  
            }
        }
    }

    renderer.render(scene, camera);
}
alert(`Collect 8 gems in 30 sec and avoid the glowing tower,
    Press OK to start!`);
    startTimer();
animate();