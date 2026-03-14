// ============================================================
// merchant.js — Merchant spawning, shop display, purchasing
// ============================================================

let merchants             = [];
let lastMerchantSpawnTime = 0;

function spawnMerchant(x, y) {
    merchants.push({ x, y, size: 40 });
}

function closeMerchantShop() {
    merchantShop.style.display = 'none';
    gamePaused = false;
}

function showMerchantShop() {
    gamePaused = true;
    merchantOptionsContainer.innerHTML = '';
    playUISound('levelUp');

    const options = [];

    // Option 1: Trade 3 apples for XP
    const canAffordXp = player.appleCount >= 3;
    options.push({
        type: 'xp_for_apples',
        name: "Gain Experience",
        desc: "A hearty meal to fuel your journey.",
        icon: '📈',
        cost: 3,
        currency: 'apples',
        xpAmount: player.xpToNextLevel,
        enabled: canAffordXp
    });

    // Options 2 & 3: Buy random powerups with coins
    const availablePowerups = [];
    if (!magneticProjectileActive)                                          availablePowerups.push({id:'magnetic_projectile', name: 'Magnetic Shots',   icon: '🧲'});
    if (!explosiveBulletsActive)                                            availablePowerups.push({id:'explosive_bullets',   name: 'Explosive Bullets',icon: '💥'});
    if (!ricochetActive)                                                    availablePowerups.push({id:'ricochet',            name: 'Ricochet Shots',   icon: '🔄'});
    if (!player.swordActive)                                                availablePowerups.push({id:'sword',               name: 'Auto-Sword',       icon: '🗡️'});
    if (!dogCompanionActive   && playerData.unlockedPickups.dog_companion)  availablePowerups.push({id:'dog_companion',       name: 'Dog Companion',    icon: '🐶'});
    if (!nightOwlActive       && playerData.unlockedPickups.night_owl)      availablePowerups.push({id:'night_owl',           name: 'Night Owl',        icon: '🦉'});

    // Shuffle
    for (let i = availablePowerups.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availablePowerups[i], availablePowerups[j]] = [availablePowerups[j], availablePowerups[i]];
    }

    availablePowerups.slice(0, 2).forEach(powerup => {
        const coinCost = 50 + Math.floor(player.level * 5);
        options.push({
            type: 'buy_powerup',
            name: powerup.name,
            desc: `A powerful artifact.`,
            icon: powerup.icon,
            cost: coinCost,
            currency: 'coins',
            powerupId: powerup.id,
            enabled: player.coins >= coinCost
        });
    });

    // Build cards
    options.forEach(option => {
        const card = document.createElement('div');
        card.className = 'merchant-card';
        card.innerHTML = `
            <div class="merchant-icon">${option.icon}</div>
            <h3>${option.name}</h3>
            <p>${option.desc}</p>
            <div class="cost">${option.cost} ${option.currency === 'apples' ? '🍎' : '🪙'}</div>
        `;
        if (!option.enabled) {
            card.style.opacity = '0.5';
            card.style.cursor  = 'not-allowed';
        } else {
            card.onclick = () => purchaseFromMerchant(option);
            card.addEventListener('mouseover', () => playUISound('uiClick'));
        }
        merchantOptionsContainer.appendChild(card);
    });

    merchantShop.style.display = 'flex';
}

function purchaseFromMerchant(option) {
    playUISound('levelUpSelect');
    vibrate(20);

    if (option.type === 'xp_for_apples') {
        player.appleCount -= option.cost;
        player.xp         += option.xpAmount;
        floatingTexts.push({ text: `+${option.xpAmount} XP!`, x: player.x, y: player.y - player.size, startTime: Date.now(), duration: 1500, color: '#00c6ff' });
        if (player.xp >= player.xpToNextLevel) {
            setTimeout(() => levelUp(), 200);
        }
    } else if (option.type === 'buy_powerup') {
        player.coins -= option.cost;
        activatePowerup(option.powerupId);
        floatingTexts.push({ text: `${option.name}!`, x: player.x, y: player.y - player.size, startTime: Date.now(), duration: 1500 });
    }

    if (option.type !== 'xp_for_apples' || player.xp < player.xpToNextLevel) {
        closeMerchantShop();
    }
}
