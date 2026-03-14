// ============================================================
// renderer.js — draw() : all canvas rendering each frame
// ============================================================

function draw() {
    if (!gameActive) return;
    const now = Date.now();

    // Hit shake
    let currentHitShakeX = 0, currentHitShakeY = 0;
    if (isPlayerHitShaking) {
        const elapsed = now - playerHitShakeStartTime;
        if (elapsed < PLAYER_HIT_SHAKE_DURATION) {
            const intensity = MAX_PLAYER_HIT_SHAKE_OFFSET * (1 - elapsed / PLAYER_HIT_SHAKE_DURATION);
            currentHitShakeX = (Math.random() - 0.5) * 2 * intensity;
            currentHitShakeY = (Math.random() - 0.5) * 2 * intensity;
        } else { isPlayerHitShaking = false; }
    }

    const finalCameraOffsetX = cameraOffsetX - currentHitShakeX;
    const finalCameraOffsetY = cameraOffsetY - currentHitShakeY;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Zoom
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(cameraZoom, cameraZoom);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Background
    ctx.save();
    ctx.translate(-finalCameraOffsetX, -finalCameraOffsetY);
    if (backgroundImages[currentBackgroundIndex]) ctx.drawImage(backgroundImages[currentBackgroundIndex], 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT); }
    ctx.restore();

    // World-space layer
    ctx.save();
    ctx.translate(-finalCameraOffsetX, -finalCameraOffsetY);

    // Destructibles
    destructibles.forEach(obs => {
        if (obs.health !== Infinity) ctx.globalAlpha = 0.5 + (obs.health / obs.maxHealth) * 0.5;
        const pre = preRenderedEntities[obs.emoji];
        if (pre) ctx.drawImage(pre, obs.x - pre.width / 2, obs.y - pre.height / 2);
        ctx.globalAlpha = 1.0;
    });

    // Flame areas
    flameAreas.forEach(area => {
        const age = now - area.startTime;
        const lifeRatio = age / (area.endTime - area.startTime);
        const alpha = 1 - lifeRatio;
        ctx.save();
        ctx.globalAlpha = alpha * 0.4;
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath(); ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = alpha * 0.7;
        for (let i = 0; i < 2; i++) {
            const a = (i / 2) * Math.PI * 2 + (now / 500);
            const d = Math.random() * area.radius * 0.8;
            const fx = area.x + Math.cos(a) * d, fy = area.y + Math.sin(a) * d;
            ctx.font = `${10 + Math.random() * 5}px sans-serif`;
            ctx.fillText('🔥', fx, fy);
        }
        ctx.restore();
    });

    // Blood splatters
    bloodSplatters.forEach(p => {
        const age = now - p.spawnTime;
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - age / p.lifetime);
        ctx.fillStyle = 'red';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    });

    // Damaging circle
    if (damagingCircleActive) {
        damagingCircleAngle += DAMAGING_CIRCLE_SPIN_SPEED;
        const pulse = 1 + Math.sin(now / 300) * 0.1;
        const size  = DAMAGING_CIRCLE_RADIUS * 2 * pulse;
        ctx.save(); ctx.globalAlpha = 0.5;
        ctx.translate(player.x, player.y); ctx.rotate(damagingCircleAngle);
        ctx.drawImage(sprites.circle, -size / 2, -size / 2, size, size);
        ctx.restore();
    }

    // Player puddles
    for (const puddle of playerPuddles) {
        const opacity = 1 - (now - puddle.spawnTime) / puddle.lifetime;
        if (opacity > 0) { ctx.save(); ctx.globalAlpha = opacity * 0.7; ctx.drawImage(sprites.slime, puddle.x - puddle.size / 2, puddle.y - puddle.size / 2, puddle.size, puddle.size); ctx.restore(); }
    }
    // Mosquito puddles
    for (const puddle of mosquitoPuddles) {
        const opacity = 1 - (now - puddle.spawnTime) / puddle.lifetime;
        if (opacity > 0) { ctx.save(); ctx.globalAlpha = opacity * 0.5; ctx.fillStyle = 'rgba(255,0,0,1)'; ctx.beginPath(); ctx.arc(puddle.x, puddle.y, puddle.size / 2, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    }
    // Blood puddles
    bloodPuddles.forEach(puddle => {
        const age = now - puddle.spawnTime;
        if (age < puddle.lifetime) {
            const currentSize = puddle.initialSize * (1 - age / puddle.lifetime);
            ctx.save(); ctx.globalAlpha = 0.5; ctx.translate(puddle.x, puddle.y); ctx.rotate(puddle.rotation);
            ctx.drawImage(sprites.bloodPuddle, -currentSize / 2, -currentSize / 2, currentSize, currentSize);
            ctx.restore();
        }
    });

    // Anti-gravity pulses
    antiGravityPulses.forEach(pulse => {
        const lifeRatio = (now - pulse.spawnTime) / pulse.duration;
        ctx.save(); ctx.strokeStyle = `rgba(255,255,255,${1 - lifeRatio})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(pulse.x, pulse.y, ANTI_GRAVITY_RADIUS * lifeRatio, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    });

    // Black holes
    blackHoles.forEach(hole => {
        const age = now - hole.spawnTime;
        const lifeRatio = age / hole.lifetime;
        const alpha = 1 - lifeRatio;
        ctx.save();
        const timeIntoDelay = age;
        let coreRadius = 20 * (1 - lifeRatio);
        if (timeIntoDelay < BLACK_HOLE_DELAY) {
            const dp = timeIntoDelay / BLACK_HOLE_DELAY;
            const pulse = 1 + Math.sin(now / 100) * 0.2;
            coreRadius = 10 * pulse;
            ctx.beginPath(); ctx.arc(hole.x, hole.y, hole.radius * dp, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(150,0,200,${alpha * 0.1 * dp})`; ctx.fill();
            ctx.strokeStyle = `rgba(200,100,255,${alpha * 0.5 * dp})`; ctx.lineWidth = 2; ctx.stroke();
        } else {
            ctx.beginPath(); ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(50,0,100,${alpha * 0.2})`; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(hole.x, hole.y, coreRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,0,0,${alpha})`; ctx.fill();
        ctx.restore();
    });

    // Smoke particles
    smokeParticles.forEach(p => {
        ctx.save(); ctx.globalAlpha = p.alpha; ctx.font = `${p.size}px sans-serif`;
        ctx.fillText('💨', p.x, p.y); ctx.restore();
    });

    // Enemies
    enemies.forEach(enemy => {
        ctx.save();
        if (enemy.emoji === '👻') ctx.globalAlpha = enemy.isVisible ? 1.0 : 0.2;
        if (enemy.isFrozen)           ctx.filter = 'saturate(0.5) brightness(1.5) hue-rotate(180deg)';
        if (enemy.isSlowedByPuddle)   ctx.filter = 'saturate(2) brightness(0.8)';
        const emojiToDraw  = enemy.isBoss ? enemy.mimics : enemy.emoji;
        const preRendered  = preRenderedEntities[emojiToDraw];
        if (preRendered) ctx.drawImage(preRendered, enemy.x - preRendered.width / 2, enemy.y - preRendered.height / 2 + (enemy.bobOffset || 0));
        if (enemy.isIgnited) {
            if (Math.random() < 0.1) smokeParticles.push({ x: enemy.x + (Math.random() - 0.5) * enemy.size, y: enemy.y, dx: (Math.random() - 0.5) * 0.5, dy: -Math.random(), size: 10 + Math.random() * 5, alpha: 0.7 });
            ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.8);
            ctx.font = `${enemy.size * 0.8}px sans-serif`;
            ctx.fillText('🔥', enemy.x, enemy.y + (enemy.bobOffset || 0));
        }
        ctx.restore();
    });

    // Explosions
    explosions.forEach(explosion => {
        const age = now - explosion.startTime;
        if (age < explosion.duration) {
            const lr = age / explosion.duration;
            ctx.save();
            ctx.beginPath(); ctx.arc(explosion.x, explosion.y, explosion.radius * lr, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,165,0,${(1 - lr) * 0.7})`; ctx.fill();
            ctx.strokeStyle = `rgba(255,255,255,${1 - lr})`; ctx.lineWidth = 2; ctx.stroke();
            ctx.restore();
        }
    });

    // Vengeance novas
    vengeanceNovas.forEach(nova => {
        const age = now - nova.startTime;
        if (age < nova.duration) {
            const lr = age / nova.duration;
            ctx.save(); ctx.strokeStyle = `rgba(255,0,0,${1 - lr})`; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(nova.x, nova.y, nova.maxRadius * lr, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }
    });

    // Bullets
    for (const weapon of weaponPool) {
        if (!weapon.active) continue;
        ctx.save(); ctx.translate(weapon.x, weapon.y); ctx.rotate(weapon.angle);
        if      (flamingBulletsActive)                           ctx.filter = 'hue-rotate(30deg) saturate(5) brightness(1.5)';
        else if (magneticProjectileActive && iceProjectileActive) ctx.filter = 'hue-rotate(270deg) saturate(2)';
        else if (magneticProjectileActive)                       ctx.filter = 'hue-rotate(0deg) saturate(5) brightness(1.5)';
        else if (iceProjectileActive)                            ctx.filter = 'hue-rotate(180deg) saturate(2)';
        ctx.drawImage(sprites.bullet, -weapon.size / 2, -weapon.size / 2, weapon.size, weapon.size * 0.5);
        ctx.restore();
    }

    // Dog homing shots
    dogHomingShots.forEach(shot => {
        ctx.save(); ctx.translate(shot.x, shot.y); ctx.rotate(shot.angle);
        ctx.filter = 'hue-rotate(0deg) saturate(5) brightness(1.5)';
        ctx.drawImage(sprites.bullet, -shot.size / 2, -shot.size / 2, shot.size, shot.size * 0.5);
        ctx.restore();
    });

    // Lightning bolts
    lightningBolts.forEach(bolt => {
        const pre = preRenderedEntities[bolt.emoji];
        if (pre) { ctx.save(); ctx.translate(bolt.x, bolt.y); ctx.rotate(bolt.angle + Math.PI / 2); ctx.drawImage(pre, -pre.width / 2, -pre.height / 2); ctx.restore(); }
    });

    // Bombs
    bombs.forEach(bomb => {
        const pre = preRenderedEntities['💣'];
        if (pre) ctx.drawImage(pre, bomb.x - pre.width / 2, bomb.y - pre.height / 2);
    });

    // Pickups
    const drawGlimmer = (item) => {
        const glimmerDuration = 1000;
        const timeSinceStart  = (now - item.glimmerStartTime) % 2000;
        if (timeSinceStart < glimmerDuration) {
            const progress = timeSinceStart / glimmerDuration;
            const alpha    = Math.sin(progress * Math.PI);
            const size     = item.size * (1 + progress * 0.5);
            ctx.save(); ctx.globalAlpha = alpha * 0.5; ctx.fillStyle = 'white';
            ctx.beginPath(); ctx.arc(item.x, item.y, size / 2, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    };
    pickupItems.forEach(item => {
        drawGlimmer(item);
        if (item.type === 'box') {
            ctx.drawImage(sprites.pickupBox, item.x - item.size / 2, item.y - item.size / 2, item.size, item.size);
        } else {
            const pre = preRenderedEntities[item.type];
            if (pre) ctx.drawImage(pre, item.x - pre.width / 2, item.y - pre.height / 2);
        }
    });
    appleItems.forEach(item => {
        drawGlimmer(item);
        const pre = preRenderedEntities[APPLE_ITEM_EMOJI];
        if (pre) ctx.drawImage(pre, item.x - pre.width / 2, item.y - pre.height / 2);
    });
    eyeProjectiles.forEach(proj => {
        const pre = preRenderedEntities[proj.emoji];
        if (pre) ctx.drawImage(pre, proj.x - pre.width / 2, proj.y - pre.height / 2);
    });

    // Merchants
    merchants.forEach(m => {
        ctx.save(); ctx.font = `${m.size}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🧙‍♂️', m.x, m.y); ctx.restore();
    });

    // Player feet / bob
    const bobOffset  = player.isDashing ? 0 : Math.sin(player.stepPhase) * BOB_AMPLITUDE;
    const spinDuration = 500;
    const isSpinning = player.spinStartTime && now < player.spinStartTime + spinDuration;
    const FOOT_SIZE = 8, FOOT_OFFSET_X = 2, FOOT_OFFSET_Y = 2;
    const stepOffset = Math.sin(player.stepPhase) * 10;
    if (!player.isDashing && !isSpinning) {
        ctx.save(); ctx.translate(player.x, player.y + bobOffset); ctx.rotate(player.rotationAngle - Math.PI / 2);
        ctx.fillStyle = '#322110';
        ctx.beginPath(); ctx.arc(-FOOT_OFFSET_X, FOOT_OFFSET_Y + stepOffset, FOOT_SIZE, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc( FOOT_OFFSET_X, FOOT_OFFSET_Y - stepOffset, FOOT_SIZE, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    // Player sprite
    let playerSprite = sprites.playerDown;
    if      (player.facing === 'up')    playerSprite = sprites.playerUp;
    else if (player.facing === 'down')  playerSprite = sprites.playerDown;
    else if (player.facing === 'left')  playerSprite = sprites.playerLeft;
    else if (player.facing === 'right') playerSprite = sprites.playerRight;

    ctx.save(); ctx.translate(player.x, player.y + bobOffset);
    if (isSpinning) { const sp = (now - player.spinStartTime) / spinDuration; ctx.rotate(sp * 2.1 * Math.PI * player.spinDirection); }
    ctx.drawImage(playerSprite, -player.size / 2, -player.size / 2, player.size, player.size);
    ctx.restore();

    // Dash cooldown bar
    const dashCharge = Math.min(1, (now - player.lastDashTime) / player.dashCooldown);
    if (dashCharge < 1) {
        const bw = player.size * 0.8, bx = player.x - bw / 2, by = player.y + player.size / 2 + 4;
        ctx.fillStyle = '#444'; ctx.fillRect(bx, by, bw, 4);
        ctx.fillStyle = '#00FFFF'; ctx.fillRect(bx, by, bw * dashCharge, 4);
    }

    // Dash invincibility shield
    if (player.isInvincible) {
        ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#007BFF';
        ctx.beginPath(); ctx.arc(player.x, player.y, player.size / 2 + 5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    // Gun
    if (aimDx !== 0 || aimDy !== 0 || autoAimActive) {
        const aimAngle = player.rotationAngle;
        ctx.save(); ctx.translate(player.x, player.y + bobOffset); ctx.rotate(aimAngle);
        if (aimAngle > Math.PI / 2 || aimAngle < -Math.PI / 2) ctx.scale(1, -1);
        const gw = player.size * 0.8, gh = gw * (sprites.gun.height / sprites.gun.width);
        const gx = player.size / 4, gy = -gh / 2;
        ctx.drawImage(sprites.gun, gx, gy, gw, gh);
        if (dualGunActive) { ctx.save(); ctx.scale(-1, 1); ctx.drawImage(sprites.gun, -gx, gy, gw, gh); ctx.restore(); }
        if (laserPointerActive) {
            ctx.save(); ctx.beginPath();
            const startX = gx + gw * 0.9, startY = gy + gh / 2;
            ctx.moveTo(startX, startY);
            if (document.body.classList.contains('is-mobile')) { ctx.lineTo(1000, startY); }
            else {
                const wmx = mouseX / cameraZoom + finalCameraOffsetX, wmy = mouseY / cameraZoom + finalCameraOffsetY;
                const rmx = (wmx - player.x) * Math.cos(-aimAngle) - (wmy - (player.y + bobOffset)) * Math.sin(-aimAngle);
                ctx.lineTo(rmx, startY);
            }
            ctx.strokeStyle = 'rgba(255,0,0,0.4)'; ctx.lineWidth = 1; ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    }

    // Doppelganger
    if (doppelganger) {
        ctx.save(); ctx.globalAlpha = 0.6; ctx.filter = 'hue-rotate(180deg)';
        ctx.drawImage(playerSprite, doppelganger.x - doppelganger.size / 2, doppelganger.y - doppelganger.size / 2, doppelganger.size, doppelganger.size);
        const dgw = doppelganger.size * 0.8, dgh = dgw * (sprites.gun.height / sprites.gun.width);
        ctx.translate(doppelganger.x, doppelganger.y); ctx.rotate(doppelganger.rotationAngle);
        if (doppelganger.rotationAngle > Math.PI / 2 || doppelganger.rotationAngle < -Math.PI / 2) ctx.scale(1, -1);
        ctx.drawImage(sprites.gun, doppelganger.size / 4, -dgh / 2, dgw, dgh);
        ctx.restore();
    }

    // Orbiter
    if (orbitingPowerUpActive && sprites.spinninglight) {
        const ox = player.x + ORBIT_RADIUS * Math.cos(player.orbitAngle);
        const oy = player.y + ORBIT_RADIUS * Math.sin(player.orbitAngle);
        orbitingImageAngle -= 0.2;
        ctx.save(); ctx.translate(ox, oy); ctx.rotate(orbitingImageAngle);
        ctx.drawImage(sprites.spinninglight, -ORBIT_POWER_UP_SIZE / 2, -ORBIT_POWER_UP_SIZE / 2, ORBIT_POWER_UP_SIZE, ORBIT_POWER_UP_SIZE);
        ctx.restore();
    }

    // Sword
    if (player.swordActive && player.currentSwordSwing) {
        const sp = (now - player.currentSwordSwing.startTime) / SWORD_SWING_DURATION;
        const offset = player.size / 2 + (sp >= 0 && sp <= 1 ? SWORD_THRUST_DISTANCE * Math.sin(sp * Math.PI) : 0);
        ctx.save(); ctx.translate(player.currentSwordSwing.x, player.currentSwordSwing.y); ctx.rotate(player.currentSwordSwing.angle);
        ctx.fillStyle = '#c0c0c0'; ctx.fillRect(offset, -2, 20, 4);
        ctx.restore();
    }

    // Dog
    if (dogCompanionActive) { const pre = preRenderedEntities['🐶']; if (pre) ctx.drawImage(pre, dog.x - pre.width/2, dog.y - pre.height/2); }

    // Player 2
    if (player2 && player2.active) {
        ctx.fillStyle = 'rgba(255,255,0,0.5)';
        ctx.beginPath(); ctx.arc(player2.x, player2.y, player2.size / 2, 0, Math.PI * 2); ctx.fill();
        let p2Sprite = sprites.playerDown;
        if (player2.facing === 'up')   p2Sprite = sprites.playerUp;
        if (player2.facing === 'left') p2Sprite = sprites.playerLeft;
        if (player2.facing === 'right')p2Sprite = sprites.playerRight;
        const isP2Spinning = player2.spinStartTime && now < player2.spinStartTime + spinDuration;
        ctx.save(); ctx.translate(player2.x, player2.y);
        if (isP2Spinning) { const sp=(now-player2.spinStartTime)/spinDuration; ctx.rotate(sp*2*Math.PI*player2.spinDirection); }
        ctx.drawImage(p2Sprite, -player2.size/2, -player2.size/2, player2.size, player2.size);
        ctx.restore();
        ctx.save(); ctx.translate(player2.x, player2.y); ctx.rotate(player2.gunAngle);
        if (player2.gunAngle > Math.PI/2 || player2.gunAngle < -Math.PI/2) ctx.scale(1,-1);
        const pgw = player2.size*0.8, pgh = pgw*(sprites.gun.height/sprites.gun.width);
        ctx.drawImage(sprites.gun, player2.size/4, -pgh/2, pgw, pgh);
        ctx.restore();
        const p2dc = Math.min(1, (now-player2.lastDashTime)/player2.dashCooldown);
        if (p2dc < 1) { const bw=player2.size*0.8, bx=player2.x-bw/2, by=player2.y+player2.size/2+4; ctx.fillStyle='#444'; ctx.fillRect(bx,by,bw,4); ctx.fillStyle='#00FFFF'; ctx.fillRect(bx,by,bw*p2dc,4); }
    }

    // Flies
    flies.forEach(fly => { ctx.fillStyle = Math.floor(now/100)%2===0?'red':'black'; ctx.beginPath(); ctx.arc(fly.x, fly.y, FLY_SIZE/2, 0, Math.PI*2); ctx.fill(); });

    // Night Owl
    if (nightOwlActive && owl) {
        const pre = preRenderedEntities['🦉'];
        if (pre) ctx.drawImage(pre, owl.x - pre.width/2, owl.y - pre.height/2);
        owlProjectiles.forEach(proj => {
            ctx.save(); ctx.translate(proj.x, proj.y); ctx.rotate(proj.angle);
            ctx.fillStyle = '#FFFACD'; ctx.beginPath(); ctx.arc(0, 0, proj.size/2, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        });
    }

    // Whirlwind Axe
    if (whirlwindAxeActive) {
        const ax = player.x + WHIRLWIND_AXE_RADIUS*Math.cos(whirlwindAxeAngle);
        const ay = player.y + WHIRLWIND_AXE_RADIUS*Math.sin(whirlwindAxeAngle);
        const pre = preRenderedEntities['🪓'];
        ctx.save(); ctx.translate(ax, ay); ctx.rotate(whirlwindAxeAngle + Math.PI/2);
        if (pre) ctx.drawImage(pre, -pre.width/2, -pre.height/2);
        ctx.restore();
    }

    // Lightning strikes
    lightningStrikes.forEach(strike => {
        const age = now - strike.startTime;
        const alpha = Math.sin((age / strike.duration) * Math.PI);
        ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = 'yellow';
        ctx.fillRect(strike.x - 5, 0, 10, WORLD_HEIGHT);
        ctx.font = '40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('⚡', strike.x, strike.y);
        ctx.restore();
    });

    // Floating texts
    floatingTexts.forEach(ft => {
        const elapsed = now - ft.startTime;
        const alpha   = 1.0 - elapsed / ft.duration;
        const yOffset = (elapsed / ft.duration) * 20;
        ctx.save(); ctx.globalAlpha = Math.max(0, alpha);
        ctx.font = 'bold 14px "Press Start 2P"'; ctx.fillStyle = ft.color || '#FFFFFF';
        ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.textAlign = 'center';
        ctx.strokeText(ft.text, ft.x, ft.y - yOffset);
        ctx.fillText(ft.text,   ft.x, ft.y - yOffset);
        ctx.restore();
    });

    ctx.restore(); // world-space
    ctx.restore(); // zoom

    // Time-stop overlay
    if (isTimeStopped) {
        const timeLeft = timeStopEndTime - now;
        const dur = 2000;
        let alpha = timeLeft > dur - 250 ? 1 - (timeLeft - (dur - 250)) / 250 : timeLeft < 500 ? timeLeft / 500 : 1;
        alpha = Math.max(0, Math.min(alpha, 1));
        ctx.save(); ctx.fillStyle = `rgba(0,100,255,${alpha * 0.4})`; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore();
    }

    // Crosshair
    if (isMouseInCanvas && gameActive && sprites.crosshair) {
        const rs = 16;
        ctx.drawImage(sprites.crosshair, mouseX - rs / 2, mouseY - rs / 2, rs, rs);
    }
}
