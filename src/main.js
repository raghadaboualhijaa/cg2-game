// استيراد مكتبة Three.js الأساسية لتطوير الألعاب والمجسمات ثلاثية الأبعاد
import * as THREE from 'three';

// =========================================================================
// 1. المشهد، الكاميرا، والمصيّر (Scene, Camera, and Renderer Setup)
// =========================================================================

// إنشاء المشهد الرئيسي الذي ستوضع فيه كل المجسمات والإضاءة
const scene = new THREE.Scene();
// تحديد لون خلفية المشهد (كحلي غامق فضائي)
scene.background = new THREE.Color(0x0b0d17);

// إنشاء كاميرا المنظور (زاوية الرؤية: 60 درجة، نسبة العرض للارتفاع، القريب: 0.1، البعيد: 1000)
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

// إنشاء المحرك المسؤول عن رسم المشهد (WebGL Renderer) مع تفعيل تنعيم الحواف (antialias)
const renderer = new THREE.WebGLRenderer({ antialias: true });
// ضبط حجم شاشة اللعبة ليكون بحجم نافذة المتصفح بالكامل
renderer.setSize(window.innerWidth, window.innerHeight);
// تفعيل خريطة الظلال في اللعبة
renderer.shadowMap.enabled = true;
// اختيار نوع ظلال ناعمة ودقيقة
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// إضافة عنصر HTML الخريج من المحرك إلى صفحة الويب لتظهر اللعبة
document.body.appendChild(renderer.domElement);

 // =========================================================================
// 2. تحميل خامة الأرضية من الصورة الخارجية (floor.jpg)
// =========================================================================

// إنشاء أداة تحكم لتنزيل الصور داخل Three.js
const textureLoader = new THREE.TextureLoader();

// تحميل الصورة المسماة floor.jpg من نفس المجلد
const floorTexture = textureLoader.load('floor.jpg'); 

// ضبط التكرار لكي لا تتمدد الصورة وتظهر بجودة ممتازة
floorTexture.wrapS = THREE.RepeatWrapping; 
floorTexture.wrapT = THREE.RepeatWrapping; 

// تكرار الصورة 4 مرات طولاً وعرضاً (يمكنك تغيير الرقم 4 إلى 2 أو 6 لضبط حجم النقشة)
floorTexture.repeat.set(4, 4);

// =========================================================================
// 3. الإضاءة والظلال (Lighting & Shadows)
// =========================================================================

// ضوء محيطي شامل لإضاءة الأماكن المظلمة بشدة 40%
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight); // إضافة الضوء المحيطي للمشهد

// ضوء موجه (مثل الشمس) بلون ذهبي وبشدة 120%
const dirLight = new THREE.DirectionalLight(0xffd700, 1.2);
dirLight.position.set(15, 25, 15); // تحديد موقع الضوء في الفضاء
dirLight.castShadow = true;        // جعل هذا الضوء يلقي ظلالاً للمجسمات
// رفع دقة خريطة الظلال لتبدو الظلال واضحة وبلا تشويه
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight); // إضافة الضوء الموجه للمشهد

// =========================================================================
// 4. بناء المجسمات الأساسية (Environment & Player)
// =========================================================================

// نصف قطر الحلبة الدائرية
const floorRadius = 14; 

// هندسة الأرضية: أسطوانة بنصف قطر 14 وارتفاع 0.5 و 64 مقطعاً دافئاً لتبدو دائرية تماماً
const floorGeo = new THREE.CylinderGeometry(floorRadius, floorRadius, 0.5, 64);
// خامة الأرضية: ربطها بالشريحة وتحديد مدى لمعانها/خشونتها
const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.5 });
// دمج الهندسة مع الخامة لتشكيل مجسم الأرضية
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.position.y = -0.25;   // خفض موقع الأرضية قليلاً ليكون سطحها عند y = 0
floor.receiveShadow = true; // جعل الأرضية تستقبل ظلال اللاعب والمباني
scene.add(floor);           // إضافة الأرضية للمشهد

// هندسة البرج المركزي: أسطوانة مخروطية قليلاً بارتفاع 10 units
const towerGeo = new THREE.CylinderGeometry(1.5, 2, 10, 32);
// خامة معدنية رمادية داكنة
const towerMat = new THREE.MeshStandardMaterial({ color: 0x3a405a, roughness: 0.2, metalness: 0.8 });
const tower = new THREE.Mesh(towerGeo, towerMat);
tower.position.y = 5;     // رفع البرج ليجلس تماماً فوق الأرضية
tower.castShadow = true;    // البرج يلقي ظلاً
tower.receiveShadow = true; // البرج يستقبل ظلالاً
scene.add(tower);           // إضافة البرج للمشهد

// حاوية فارغة (Group) لدوران شعاع الليزر حول مركز البرج
const laserGroup = new THREE.Group();
laserGroup.position.set(0, 0.6, 0); // رفع نقطة دوران الليزر فوق مستوى الأرض بمقدار 0.6
scene.add(laserGroup);

// طول ذراع الليزر (أقل من نصف قطر الحلبة بـ 1)
const laserLength = floorRadius - 1;
// هندسة ذراع الليزر أسطوانية رفيعة
const laserArmGeo = new THREE.CylinderGeometry(0.12, 0.12, laserLength);
// خامة ليزر حمراء متوهجة لا تتأثر بالظلال (MeshBasicMaterial)
const laserArmMat = new THREE.MeshBasicMaterial({ color: 0xff0055 }); 
const laserArm = new THREE.Mesh(laserArmGeo, laserArmMat);

laserArm.rotation.z = Math.PI / 2; // تدوير الأسطوانة لتصبح أفقية
laserArm.position.x = laserLength / 2; // إزاحة محور الليزر لتكون نقطة الدوران من بدايته
laserGroup.add(laserArm); // إضافة الليزر داخل الحاوية الدوارة

// هندسة الكرة (اللاعب): كرة بنصف قطر 0.6 و 24 مقطعاً
const playerGeo = new THREE.SphereGeometry(0.6, 24, 24);
// خامة اللاعب: لون سماوي براق ولامع جداً
const playerMat = new THREE.MeshStandardMaterial({ color: 0x00fff5, roughness: 0.1 });
const player = new THREE.Mesh(playerGeo, playerMat);
player.castShadow = true; // اللاعب يلقي ظلاً على الأرضية
scene.add(player);        // إضافة اللاعب للمشهد

// =========================================================================
// 5. الحركة والتحكم (Controls & Variables)
// =========================================================================

let playerAngle = 0;      // زاوية موقع اللاعب بالنسبة لمركز المشهد (بالراديان)
let playerRadius = 8;     // بعد اللاعب الحالي عن المركز (نصف القطر)
const minRadius = 4.0;               // أقل مسافة يمكن للاعب الاقتراب بها من البرج
const maxRadius = floorRadius - 1.2; // أقصى مسافة يبتعد بها اللاعب قبل الوقوع من الحلبة

let playerY = 0.6;         // ارتفاع اللاعب الصادي (موقعه الرأسي)
let velocityY = 0;         // السرعة الرأسية الحالية للاعب (للقفز)
const gravity = -0.015;    // تسارع الجاذبية الأرضية للسحب لأسفل
let isJumping = false;     // حالة منطقية معرفة ما إذا كان اللاعب يقفز حالياً

// متغيرات السرعة الفيزيائية المؤقتة عند اصطدام اللاعب بمكعب أو ليزر (الشلف)
let knockbackAngleVelocity = 0;  // سرعة الدفع الزاوي (يمين/يسار)
let knockbackRadiusVelocity = 0; // سرعة الدفع القطري (للداخل/للخارج)

// كائن لحفظ حالة الأزرار المضغوطة في اللوحة
const keys = {};

// التسمع لضغط زر من الكيبورد
window.addEventListener('keydown', (e) => { 
    keys[e.key.toLowerCase()] = true; 
    keys[e.key] = true;

    // إذا تم ضغط زر المسافة (Space) وكان اللاعب على الأرض غير قافز
    if (e.code === 'Space' && !isJumping) {
        velocityY = 0.35; // إعطاء قوة دفع لأعلى
        isJumping = true;  // قفل إمكانية القفز حتى يلمس الأرض مجدداً
    }
});

// التسمع لإفلات الزر من الكيبورد
window.addEventListener('keyup', (e) => { 
    keys[e.key.toLowerCase()] = false; 
    keys[e.key] = false;
});

// =========================================================================
// 6. توليد العناصر (Spawning Gems & Obstacles)
// =========================================================================

const maxGems = 8;        // عدد الجواهر المطلوبة في اللعبة
let gemsCollected = 0;    // عدد الجواهر المجمعة حالياً
let activeGems = [];      // مصفوفة لتخزين مجسمات الجواهر الحالية
const activeObstacles = [];// مصفوفة لتخزين المكعبات الحمراء الضارة

// هندسة الجوهرة: مجسم ثماني الأوجه (Octahedron)
const gemGeo = new THREE.OctahedronGeometry(0.4);
// خامة ذهبية شبه معدنية للجواهر
const gemMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.5 });

// هندسة المكعبات الحمراء الضارة
const obstacleGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
const obstacleMat = new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.5 });

// دالة لنشر الجواهر والعوائق في أماكن متوازنة
function spawnElements() {
    // إنشاء 8 جواهر موزعة بشكل دائري منتظم
    for (let i = 0; i < maxGems; i++) {
        const gem = new THREE.Mesh(gemGeo, gemMat);
        // توزيع الزوايا بالتساوي حول الدائرة 360 درجة
        const angle = (i / maxGems) * Math.PI * 2; 
        // تنويع المسافات (أنصاف الأقطار) لكي لا تظهر على خط واحد
        const r = minRadius + 1.0 + (i % 3) * 2.0; 
        
        // حساب الإحداثيات الثلاثية بالاعتماد على الجيب والجتا (Cos & Sin)
        gem.position.set(Math.cos(angle) * r, 0.8, Math.sin(angle) * r);
        gem.castShadow = true;
        scene.add(gem);
        activeGems.push(gem); // حفظ الجوهرة في المصفوفة
    }

    // إنشاء 5 مكعبات حمراء ضارة
    for (let i = 0; i < 5; i++) {
        const obs = new THREE.Mesh(obstacleGeo, obstacleMat);
        const angle = (i / 5) * Math.PI * 2 + 0.4; // إزاحة زاوية العوائق عن الجواهر
        const r = minRadius + 1.5 + (i % 2) * 2.5;
        
        obs.position.set(Math.cos(angle) * r, 0.6, Math.sin(angle) * r);
        obs.castShadow = true;
        obs.receiveShadow = true;
        scene.add(obs);
        // حفظ المكعب في المصفوفة مع مؤقت زمن الاصطدام لمنع الخصم المتكرر بسرعة
        activeObstacles.push({ mesh: obs, hitCooldown: 0 });
    }
}
spawnElements(); // تشغيل توليد العناصر

// =========================================================================
// 7. إدارة الوقت والنهاية (Game Logic & Game Over)
// =========================================================================

let timeLeft = 40;       // مؤقت الوقت الكلي للعبة (40 ثانية)
let laserHits = 0;       // عدد المرات التي أصاب فيها الليزر اللاعب
const maxLaserHits = 4;  // الحد الأقصى لإصابات الليزر قبل الخسارة
let isGameOver = false;  // حالة انتهاء اللعبة

// مؤقت زمني ينقص ثانية واحدة كل 1000 ملي ثانية
const timerInterval = setInterval(() => {
    if (isGameOver) return;
    timeLeft--;
    if (timeLeft <= 0) {
        timeLeft = 0;
        endGame('timeout'); // إنهاء اللعبة عند انتهاء الوقت
    }
}, 1000);

// دالة إظهار ناتج اللعبة وإيقاف الحركة
function endGame(reason) {
    isGameOver = true;
    clearInterval(timerInterval); // إيقاف العداد الزمني

    // اختيار الرسالة المناسبة بحسب سبب النهاية
    if (reason === 'win') {
        alert(`🎉 Congratulations! You won the race and collected all ${maxGems} gems!`);
    } else if (reason === 'laser') {
        alert(`💥 Game Over! You hit the laser 4 times! Try jumping with Space to avoid it.`);
    } else if (reason === 'timeout') {
        alert(`⏰ Time's Up! You collected ${gemsCollected} out of ${maxGems} gems.`);
    }
}

// إنشاء مكعبات تصادم افتراضية لاستخدامها عند اصطدام اللاعب بالمكعبات
const playerBox = new THREE.Box3();
const tempBox = new THREE.Box3();

let lastLaserHitTime = 0; // تسجيل زمن آخر أصابة بليزر لتجنب الاحتساب المتعدد السريع

// كائنات هندسية لحساب دقيق جداً للمسافة بين اللاعب وخط الليزر
const laserStart = new THREE.Vector3();
const laserEnd = new THREE.Vector3();
const playerPos = new THREE.Vector3();
const closestPointOnLaser = new THREE.Vector3();
const laserLine = new THREE.Line3();

// =========================================================================
// 8. حلقة الأنيميشن والتصادمات (Main Game Loop)
// =========================================================================

function animate() {
    if (isGameOver) return; // توقف الحلقة فوراً إذا انتهت اللعبة
    requestAnimationFrame(animate); // طلب استدعاء الإطار التالي بـ 60 إطار في الثانية

    const angularSpeed = 0.03; // سرعة الدوران حول المركز
    const radialSpeed = 0.15;  // سرعة التقرّب والابتعاد عن البرج

    // إذا لم يكن اللاعب يتأثر بقوة ارتداد (شلف) قوية، اسمح له بالتحكم من الأسهم
    if (Math.abs(knockbackAngleVelocity) < 0.01 && Math.abs(knockbackRadiusVelocity) < 0.05) {
        if (keys['arrowleft'] || keys['a']) playerAngle += angularSpeed; 
        if (keys['arrowright'] || keys['d']) playerAngle -= angularSpeed; 
        if (keys['arrowup'] || keys['w']) playerRadius = Math.max(minRadius, playerRadius - radialSpeed); 
        if (keys['arrowdown'] || keys['s']) playerRadius = Math.min(maxRadius, playerRadius + radialSpeed); 
    }

    // إضافة طاقة الارتداد (الشلف) على موقع زاوية ونصف قطر اللاعب
    playerAngle += knockbackAngleVelocity;
    playerRadius += knockbackRadiusVelocity;

    // حصر نصف القطر ضمن حدود الحلبة المسوح بها لمنع الخروج عن الخريطة
    playerRadius = THREE.MathUtils.clamp(playerRadius, minRadius, maxRadius);

    // تخميد طاقة الشلف تدريجياً بنسبة 15% كل إطار لتتوقف الحركة بعد مسافة قصيرة
    knockbackAngleVelocity *= 0.85;
    knockbackRadiusVelocity *= 0.85;

    // تطبيق الجاذبية والقفز على الارتفاع الرأسي y
    playerY += velocityY;
    velocityY += gravity; // سحب اللاعب لأسفل دائماً
    if (playerY <= 0.6) { // إذا لمس اللاعب سطح الأرضية
        playerY = 0.6;
        isJumping = false;
        velocityY = 0;   // صفر سرعة السقوط
    }

    // تحديث موقع مجسم اللاعب الحقيقي في المشهد بناءً على الزاوية ونصف القطر
    player.position.set(
        Math.cos(playerAngle) * playerRadius,
        playerY,
        Math.sin(playerAngle) * playerRadius
    );

    // حساب موقع الكاميرا الذكية التي تتبع موقع اللاعب من الخلف
    const camDistance = 5;
    const camHeight = 3;
    const targetCamX = Math.cos(playerAngle) * (playerRadius + camDistance);
    const targetCamZ = Math.sin(playerAngle) * (playerRadius + camDistance);
    
    // تنعيم حركة الكاميرا (Lerp) لتبدو سلسة وغير حادة
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, 0.08);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, 0.08);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, playerY + camHeight, 0.08);
    camera.lookAt(player.position); // جعل الكاميرا تنظر دائماً باتجاه موقع اللاعب

    // تدوير شعاع الليزر حركياً حول البرج
    laserGroup.rotation.y -= 0.02; 

    // ---------------------------------------------------------------------
    // 1️⃣ التقاط الجواهر بنظام التصفية الآمنة (Safe Filter Process)
    // ---------------------------------------------------------------------
    const gemsToKeep = []; // مصفوفة مؤقتة للجواهر التي لم تُجمع بعد
    for (let i = 0; i < activeGems.length; i++) {
        const gem = activeGems[i];
        gem.rotation.y += 0.03; // جعل الجواهر تدور حول نفسها لإعطاء مظهراً جميلاً

        // حساب المسافة المباشرة ثلاثية الأبعاد بين مركز الكرة ومركز الجوهرة
        const distToGem = player.position.distanceTo(gem.position);

        // إذا اقترب اللاعب من الجوهرة لمسافة أقل من 0.85 وحدة (اصطدام)
        if (distToGem < 0.85) { 
            scene.remove(gem); // إزالة مجسم الجوهرة من المشهد
            gemsCollected++;   // زيادة عداد الجواهر الملتقطة

            // تحقق من شرط الفوز باللعبة
            if (gemsCollected === maxGems) endGame('win');
        } else {
            gemsToKeep.push(gem); // احتفظ بالجوهرة في المصفوفة المؤقتة إن لم تُسحب
        }
    }
    activeGems = gemsToKeep; // تحديث المصفوفة الأصلية بأمان دون التأثير على الحلقة

    // ---------------------------------------------------------------------
    // 2️⃣ الاصطدام بالمربعات الحمراء (Obstacles)
    // ---------------------------------------------------------------------
    const now = Date.now();
    playerBox.setFromObject(player); // تحديث صندوق تصادم اللاعب
    for (let obsObj of activeObstacles) {
        tempBox.setFromObject(obsObj.mesh); // تحديث صندوق تصادم المكعب الاحمر
        
        // إذا تقاطع صندوق اللاعب مع صندوق المكعب الأحمر
        if (playerBox.intersectsBox(tempBox)) {
            // للتأكد من انقضاء 600 ملي ثانية منذ آخر اصطدام بهذا المكعب بالتحديد
            if (now - obsObj.hitCooldown > 600) { 
                obsObj.hitCooldown = now; // تحديث وقت الاصطدام
                
                timeLeft = Math.max(0, timeLeft - 3); // خصم 3 ثواني من الوقت
                
                // حساب اتجاه الارتداد (الشلف): معرفة ما إذا كان اللاعب يميناً أم يساراً بالنسبة للمكعب
                const obsPos = obsObj.mesh.position;
                const obsAngle = Math.atan2(obsPos.z, obsPos.x);
                const obsRadius = Math.sqrt(obsPos.x * obsPos.x + obsPos.z * obsPos.z);

                let angleDiff = playerAngle - obsAngle;
                angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

                const pushDirection = angleDiff >= 0 ? 1 : -1;
                knockbackAngleVelocity = pushDirection * 0.12; // دفع جانبي زاوِيّ

                // الدفع للداخل أو الخارج بناءً على نصف قطر اللاعب مقارنة بالمكعب
                if (playerRadius >= obsRadius) {
                    knockbackRadiusVelocity = 0.6; // شلف للخارج
                } else {
                    knockbackRadiusVelocity = -0.6; // شلف للداخل
                }
                
                // إن انتهى الوقت بسبب الخصم انتهت اللعبة
                if (timeLeft <= 0) {
                    endGame('timeout');
                }
            }
        }
    }

    // ---------------------------------------------------------------------
    // 3️⃣ حساب تصادم الليزر (Laser Collision)
    // ---------------------------------------------------------------------
    // تحديث بداية ونهاية خط الليزر الحقيقي حسب دوران الحاوية
    laserStart.set(0, 0.6, 0);
    laserEnd.set(laserLength, 0.6, 0).applyMatrix4(laserGroup.matrixWorld);
    laserLine.set(laserStart, laserEnd);

    // إيجاد أقرب نقطة على سلك الليزر بالنسبة لموقع اللاعب
    playerPos.copy(player.position);
    laserLine.closestPointToPoint(playerPos, true, closestPointOnLaser);

    // قياس المسافة بين الكرة وأقرب نقطة على شعاع الليزر
    const distanceToLaser = playerPos.distanceTo(closestPointOnLaser);

    // إذا كانت المسافة أقل من 0.65، واللاعب على ارتفاع منخفض، ومرت 1.5 ثانية على آخر إصابة
    if (distanceToLaser < 0.65 && playerY < 1.1 && (now - lastLaserHitTime > 1500)) {
        lastLaserHitTime = now;
        laserHits++; // إضافة اصطدام ليزر جديد
        
        knockbackRadiusVelocity = 0.8; // شلف قوي جداً للاعب نحو الخارج!

        // إذا وصل عدد الإصابات للحد الأقصى (4) تنهى اللعبة بخسارة
        if (laserHits >= maxLaserHits) {
            endGame('laser'); 
        }
    }

    // رسم المشهد النهائي عبر المحرك والإضاءة والكاميرا
    renderer.render(scene, camera);
}

// إظهار تعليمات اللعبة وتنبيه البداية
alert(`🎯 Goal: Collect 8 gems in 40 seconds!\n⚠️ Obstacles (Red Cubes): Knocks you back & subtracts 3 seconds!\n⚠️ Laser: Hits 4 times = Game Over!\n- A/D or Arrows: Orbit around\n- W/S: Move closer/further\n- Space: Jump over the laser`);

// بدء الحلقة التكرارية للعبة
animate();