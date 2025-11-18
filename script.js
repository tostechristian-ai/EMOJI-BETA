<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Emoji Survivor 3D (Assets Integrated)</title>
    <style>
        body { margin: 0; overflow: hidden; background-color: #000; color: white; font-family: 'Courier New', Courier, monospace; user-select: none; -webkit-user-select: none; }
        #ui-layer {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;
            display: flex; flex-direction: column; justify-content: space-between;
        }
        #info {
            padding: 10px; text-align: center; background: rgba(0,0,0,0.5);
            text-shadow: 1px 1px 0 #000;
        }
        #joystick-zone {
            position: absolute; bottom: 50px; left: 50px; width: 150px; height: 150px;
            background: rgba(255, 255, 255, 0.1); border-radius: 50%;
            pointer-events: auto; display: none;
            border: 2px solid rgba(255,255,255,0.3);
        }
        #joystick-knob {
            position: absolute; top: 50%; left: 50%; width: 60px; height: 60px;
            background: rgba(255, 255, 255, 0.5); border-radius: 50%;
            transform: translate(-50%, -50%);
        }
        #start-btn {
            pointer-events: auto; background: lime; border: none; padding: 10px 20px; 
            font-size: 16px; cursor: pointer; margin-top: 5px; border-radius: 5px;
        }
        @media (hover: none) and (pointer: coarse) {
            #joystick-zone { display: block; }
        }
        #score-board {
            position: absolute; top: 10px; right: 20px; text-align: right; font-size: 20px;
        }
        #loading {
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            font-size: 24px; color: yellow; display: block;
        }
    </style>
    <script async src="https://unpkg.com/es-module-shims@1.8.0/dist/es-module-shims.js"></script>
    <script type="importmap">
        {
            "imports": {
                "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
                "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
            }
        }
    </script>
</head>
<body>
    <div id="ui-layer">
        <div id="info">
            <h3>Emoji Survivor 3D</h3>
            <p>VR: Left Stick | Mobile: Touch Joystick</p>
            <button id="start-btn">Start Audio & Game</button>
        </div>
        <div id="score-board">
            <div id="score-text">Score: 0</div>
            <div id="hp-text">❤️❤️❤️</div>
        </div>
        <div id="joystick-zone"><div id="joystick-knob"></div></div>
        <div id="loading">Loading Assets...</div>
    </div>

    <script type="module">
        import * as THREE from 'three';
        import { VRButton } from 'three/addons/webxr/VRButton.js';
        import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

        // ==========================================================================
        // 1. ASSET CONFIGURATION
        // ==========================================================================
        
        const spritePaths = {
            gun: 'sprites/gun.png',
            bullet: 'sprites/bullet.png',
            circle: 'sprites/circle.png',
            pickupBox: 'sprites/pickupbox.png',
            slime: 'sprites/slime.png',
            playerUp: 'sprites/playerup.png',     // Stored for logic/future use
            playerDown: 'sprites/playerdown.png',
            playerLeft: 'sprites/playerleft.png',
            playerRight: 'sprites/playerright.png',
            levelUpBox: 'sprites/levelupbox.png',
            spinninglight: 'sprites/spinninglight.png',
            bloodPuddle: 'sprites/blood.png',
            crosshair: 'sprites/crosshair.png',
            bg: 'sprites/Background6.png' // Using Map 6 as default
        };

        const audioPaths = {
            playerShoot: 'audio/fire_shot.mp3',
            xpPickup: 'audio/pick_up_xp.mp3',
            enemyDeath: 'audio/enemy_death.mp3',
            gameOver: 'audio/gameover.mp3',
            bgm: 'audio/background_music.mp3' 
        };

        const textures = {};
        const sounds = {};
        let assetsLoaded = 0;
        const totalAssets = Object.keys(spritePaths).length + Object.keys(audioPaths).length;

        // ==========================================================================
        // 2. SETUP SCENE & LOADERS
        // ==========================================================================
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1025); 
        scene.fog = new THREE.Fog(0x1a1025, 0, 50);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        const listener = new THREE.AudioListener();
        camera.add(listener); // Ear is on head

        const userGroup = new THREE.Group();
        userGroup.add(camera);
        scene.add(userGroup);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.xr.enabled = true;
        document.body.appendChild(renderer.domElement);
        document.body.appendChild(VRButton.createButton(renderer));

        // -- Loaders --
        const textureLoader = new THREE.TextureLoader();
        const audioLoader = new THREE.AudioLoader();

        function checkLoad() {
            assetsLoaded++;
            if(assetsLoaded >= totalAssets) {
                document.getElementById('loading').style.display = 'none';
                initGameEnvironment();
            }
        }

        // Load Textures
        for(const [key, path] of Object.entries(spritePaths)) {
            textureLoader.load(
                path, 
                (tex) => { 
                    tex.magFilter = THREE.NearestFilter; // Pixel art look
                    textures[key] = tex; 
                    checkLoad(); 
                },
                undefined,
                (err) => { console.warn(`Missing texture: ${path}`); checkLoad(); } // Continue on error
            );
        }

        // Load Audio
        for(const [key, path] of Object.entries(audioPaths)) {
            audioLoader.load(
                path,
                (buffer) => { sounds[key] = buffer; checkLoad(); },
                undefined,
                (err) => { console.warn(`Missing audio: ${path}`); checkLoad(); }
            );
        }

        // ==========================================================================
        // 3. GAME ENVIRONMENT & LIGHTING
        // ==========================================================================
        
        function initGameEnvironment() {
            // Lighting
            const ambientLight = new THREE.AmbientLight(0x404040, 2);
            scene.add(ambientLight);
            const dirLight = new THREE.DirectionalLight(0xffffff, 1);
            dirLight.position.set(0, 10, 0);
            scene.add(dirLight);

            // Floor
            const floorGeo = new THREE.PlaneGeometry(200, 200);
            const floorMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
            const floor = new THREE.Mesh(floorGeo, floorMat);
            floor.rotation.x = -Math.PI / 2;
            scene.add(floor);
            const gridHelper = new THREE.GridHelper(200, 100, 0x444444, 0x111111);
            scene.add(gridHelper);

            // 3D Skybox Sphere (using Background sprite)
            if(textures.bg) {
                const skyGeo = new THREE.SphereGeometry(80, 32, 32);
                // Invert geometry to see texture inside
                skyGeo.scale(-1, 1, 1); 
                const skyMat = new THREE.MeshBasicMaterial({ map: textures.bg });
                const sky = new THREE.Mesh(skyGeo, skyMat);
                scene.add(sky);
            }

            // Setup Gun Sprite (Visual only)
            if(textures.gun) {
                const gunMat = new THREE.SpriteMaterial({ map: textures.gun });
                const gunSprite = new THREE.Sprite(gunMat);
                gunSprite.scale.set(0.5, 0.5, 1);
                // Attach to camera so it follows head/screen
                gunSprite.position.set(0.2, -0.2, -0.5); 
                camera.add(gunSprite);
            }
        }

        // ==========================================================================
        // 4. GAME OBJECTS (ARROWS, SPRITES)
        // ==========================================================================

        // Green Arrow
        const arrowShape = new THREE.Shape();
        arrowShape.moveTo(0, 0.5); arrowShape.lineTo(0.4, -0.5); arrowShape.lineTo(0.1, -0.4);
        arrowShape.lineTo(0.1, -1.2); arrowShape.lineTo(-0.1, -1.2); arrowShape.lineTo(-0.1, -0.4);
        arrowShape.lineTo(-0.4, -0.5); arrowShape.lineTo(0, 0.5);

        const aimArrow = new THREE.Mesh(
            new THREE.ShapeGeometry(arrowShape),
            new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide, transparent: true, opacity: 0.6, depthTest: false })
        );
        aimArrow.rotation.x = -Math.PI / 2;
        aimArrow.position.y = 1.0; aimArrow.position.z = -1.0; aimArrow.scale.set(0.5, 0.5, 0.5);
        userGroup.add(aimArrow);


        // Helper to create billboard sprites
        function createEmojiSprite(emoji, size=128, texture=null) {
            let mat;
            if(texture) {
                mat = new THREE.SpriteMaterial({ map: texture });
            } else {
                // Fallback to Canvas Emoji
                const canvas = document.createElement('canvas');
                canvas.width = size; canvas.height = size;
                const ctx = canvas.getContext('2d');
                ctx.font = `bold ${size * 0.9}px Arial`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                ctx.shadowColor = "black"; ctx.shadowBlur = 5; ctx.fillStyle = "white";
                ctx.fillText(emoji, size/2, size);
                const tex = new THREE.CanvasTexture(canvas);
                tex.magFilter = THREE.NearestFilter;
                mat = new THREE.SpriteMaterial({ map: tex });
            }
            
            const sprite = new THREE.Sprite(mat);
            // Anchor at bottom (0.0) for 2.5D feel
            sprite.center.set(0.5, 0.0); 
            return sprite;
        }

        // ==========================================================================
        // 5. INPUT & GAME STATE
        // ==========================================================================
        
        const inputState = { moveX: 0, moveY: 0, isVR: false };
        const enemies = [];
        const bullets = [];
        
        const gameState = { score: 0, hp: 3, lastFire: 0, fireRate: 400, lastSpawn: 0, spawnRate: 1500, active: false };

        // Audio Playback Helper
        const bgmSound = new THREE.Audio(listener);
        function playSound(key, volume=0.5) {
            if(sounds[key]) {
                // If BGM, handle differently
                if(key === 'bgm') {
                    if(bgmSound.isPlaying) return;
                    bgmSound.setBuffer(sounds[key]);
                    bgmSound.setLoop(true);
                    bgmSound.setVolume(0.3);
                    bgmSound.play();
                } else {
                    const audio = new THREE.Audio(listener);
                    audio.setBuffer(sounds[key]);
                    audio.setVolume(volume);
                    audio.play();
                }
            }
        }

        document.getElementById('start-btn').addEventListener('click', () => {
            playSound('bgm');
            gameState.active = true;
            document.getElementById('start-btn').style.display = 'none';
        });

        // --- VR Controllers ---
        const controller1 = renderer.xr.getController(0);
        const controller2 = renderer.xr.getController(1);
        userGroup.add(controller1); userGroup.add(controller2);

        const controllerModelFactory = new XRControllerModelFactory();
        const grip1 = renderer.xr.getControllerGrip(0);
        grip1.add(controllerModelFactory.createControllerModel(grip1));
        userGroup.add(grip1);
        const grip2 = renderer.xr.getControllerGrip(1);
        grip2.add(controllerModelFactory.createControllerModel(grip2));
        userGroup.add(grip2);

        renderer.xr.addEventListener('sessionstart', () => {
            inputState.isVR = true;
            playSound('bgm'); 
            gameState.active = true;
        });
        renderer.xr.addEventListener('sessionend', () => inputState.isVR = false);

        // --- Mobile Joystick ---
        const joystickZone = document.getElementById('joystick-zone');
        const joystickKnob = document.getElementById('joystick-knob');
        let touchId = null, joyStartX = 0, joyStartY = 0; const maxRadius = 75;

        joystickZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            touchId = touch.identifier;
            const rect = joystickZone.getBoundingClientRect();
            joyStartX = rect.left + rect.width / 2;
            joyStartY = rect.top + rect.height / 2;
            updateJoystick(touch.clientX, touch.clientY);
        }, {passive: false});

        joystickZone.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for(let i=0; i<e.changedTouches.length; i++) {
                if(e.changedTouches[i].identifier === touchId) updateJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
            }
        }, {passive: false});

        const endJoystick = (e) => {
            for(let i=0; i<e.changedTouches.length; i++) {
                if(e.changedTouches[i].identifier === touchId) {
                    touchId = null;
                    joystickKnob.style.transform = `translate(-50%, -50%)`;
                    inputState.moveX = 0; inputState.moveY = 0;
                }
            }
        };
        joystickZone.addEventListener('touchend', endJoystick);
        joystickZone.addEventListener('touchcancel', endJoystick);

        function updateJoystick(cx, cy) {
            let dx = cx - joyStartX; let dy = cy - joyStartY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if(dist > maxRadius) { const r = maxRadius/dist; dx*=r; dy*=r; }
            joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            inputState.moveX = dx / maxRadius; inputState.moveY = dy / maxRadius;
        }

        // ==========================================================================
        // 6. GAME LOGIC
        // ==========================================================================

        function spawnEnemy() {
            const angle = Math.random() * Math.PI * 2;
            const dist = 25 + Math.random() * 10;
            const x = userGroup.position.x + Math.cos(angle) * dist;
            const z = userGroup.position.z + Math.sin(angle) * dist;

            // Use Emoji canvas for enemies (authentic to original game style), 
            // but could use textures['slime'] if desired. Sticking to Emojis for variety.
            const types = ['🧟', '💀', '🦇', '👹', '🧛‍♀️'];
            const emoji = types[Math.floor(Math.random() * types.length)];
            
            const sprite = createEmojiSprite(emoji);
            sprite.position.set(x, 0, z); 
            const s = 1.5 + Math.random() * 0.5;
            sprite.scale.set(s, s, 1);

            scene.add(sprite);
            enemies.push({ mesh: sprite, speed: 0.02 + Math.random()*0.03, hp: 2 });
        }

        function fire(targetPos) {
            // Use the loaded bullet texture
            const bullet = createEmojiSprite(null, 64, textures.bullet); 
            bullet.scale.set(0.5, 0.5, 1);
            bullet.position.copy(userGroup.position);
            bullet.position.y = 1.0; 

            const dir = new THREE.Vector3().subVectors(targetPos, bullet.position).normalize();
            
            scene.add(bullet);
            bullets.push({ mesh: bullet, velocity: dir.multiplyScalar(0.4), life: 100 });
            
            playSound('playerShoot', 0.2);

            aimArrow.position.z = -0.8; 
            setTimeout(() => aimArrow.position.z = -1.0, 50);
        }

        function createExplosion(pos) {
            const p = createEmojiSprite('💥'); // Or use bloodPuddle texture for floor decal
            p.position.copy(pos);
            p.scale.set(2,2,1);
            scene.add(p);
            
            // Remove after short time
            setTimeout(() => scene.remove(p), 200);
            
            // Leave a blood puddle on floor
            if(textures.bloodPuddle) {
                const bloodGeo = new THREE.PlaneGeometry(2, 2);
                const bloodMat = new THREE.MeshBasicMaterial({ map: textures.bloodPuddle, transparent: true, depthWrite: false });
                const blood = new THREE.Mesh(bloodGeo, bloodMat);
                blood.rotation.x = -Math.PI/2;
                blood.position.set(pos.x, 0.02, pos.z); // Slightly above floor z-fight
                blood.rotation.z = Math.random() * Math.PI;
                scene.add(blood);
            }
        }

        renderer.setAnimationLoop(() => {
            if(!gameState.active) { renderer.render(scene, camera); return; }
            
            const now = performance.now();
            
            // 1. Input
            let dx = inputState.moveX; let dz = inputState.moveY;
            if (inputState.isVR) {
                const session = renderer.xr.getSession();
                if (session && session.inputSources) {
                    for(const source of session.inputSources) {
                        if(source.gamepad && source.gamepad.axes.length >= 4) {
                            if(Math.abs(source.gamepad.axes[2]) > 0.1 || Math.abs(source.gamepad.axes[3]) > 0.1) {
                                dx = source.gamepad.axes[2]; dz = source.gamepad.axes[3]; break;
                            }
                        }
                    }
                }
            }
            
            const speed = 0.15;
            if(Math.abs(dx) > 0.05 || Math.abs(dz) > 0.05) {
                const yaw = camera.rotation.y; 
                const fX = Math.sin(yaw); const fZ = Math.cos(yaw); 
                const rX = Math.cos(yaw); const rZ = -Math.sin(yaw); 
                
                if(inputState.isVR) {
                    userGroup.position.x += (dx * rX + dz * fX) * speed;
                    userGroup.position.z += (dx * rZ + dz * fZ) * speed;
                } else {
                    userGroup.position.x += dx * speed;
                    userGroup.position.z += dz * speed;
                }
            }

            // 2. Auto-Aim
            let closestEnemy = null; let closestDist = 25; 
            enemies.forEach(e => {
                const d = userGroup.position.distanceTo(e.mesh.position);
                if(d < closestDist) { closestDist = d; closestEnemy = e; }
            });

            if(closestEnemy) {
                aimArrow.lookAt(closestEnemy.mesh.position);
                aimArrow.rotation.x = -Math.PI/2; 
                const angle = Math.atan2(closestEnemy.mesh.position.x - userGroup.position.x, closestEnemy.mesh.position.z - userGroup.position.z);
                aimArrow.rotation.set(-Math.PI/2, 0, angle + Math.PI);

                if(now - gameState.lastFire > gameState.fireRate) {
                    fire(closestEnemy.mesh.position);
                    gameState.lastFire = now;
                }
            } else {
                aimArrow.rotation.z += 0.05;
            }

            // 3. Spawning
            if(now - gameState.lastSpawn > gameState.spawnRate) {
                spawnEnemy();
                gameState.lastSpawn = now;
            }

            // 4. Updates
            for(let i=bullets.length-1; i>=0; i--) {
                const b = bullets[i];
                b.mesh.position.add(b.velocity);
                b.life--;
                if(b.life <= 0) { scene.remove(b.mesh); bullets.splice(i,1); }
            }

            for(let i=enemies.length-1; i>=0; i--) {
                const e = enemies[i];
                const dir = new THREE.Vector3().subVectors(userGroup.position, e.mesh.position).normalize();
                dir.y = 0; 
                e.mesh.position.add(dir.multiplyScalar(e.speed));

                // Collision Player
                if(userGroup.position.distanceTo(e.mesh.position) < 1.0) {
                    gameState.hp--;
                    document.getElementById('hp-text').innerText = "❤️".repeat(Math.max(0, gameState.hp));
                    e.mesh.position.sub(dir.multiplyScalar(5));
                    
                    if(gameState.hp <= 0) {
                        playSound('gameOver');
                        gameState.hp = 3; gameState.score = 0;
                        document.getElementById('hp-text').innerText = "❤️❤️❤️";
                        document.getElementById('score-text').innerText = "Score: 0";
                        enemies.forEach(en => scene.remove(en.mesh));
                        enemies.length = 0;
                    }
                }

                // Collision Bullet
                let hit = false;
                for(let j=bullets.length-1; j>=0; j--) {
                    const b = bullets[j];
                    if(b.mesh.position.distanceTo(e.mesh.position) < 1.5) {
                        scene.remove(b.mesh); bullets.splice(j,1);
                        e.hp--; hit = true;
                        e.mesh.material.color.setHex(0xff0000);
                        setTimeout(() => { if(e.mesh) e.mesh.material.color.setHex(0xffffff); }, 100);

                        if(e.hp <= 0) {
                            createExplosion(e.mesh.position);
                            scene.remove(e.mesh); enemies.splice(i,1);
                            gameState.score += 10;
                            document.getElementById('score-text').innerText = "Score: " + gameState.score;
                            playSound('enemyDeath');
                        }
                        break; 
                    }
                }
            }

            renderer.render(scene, camera);
        });

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    </script>
</body>
</html>


