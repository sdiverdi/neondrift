const canvas = document.getElementById("game");
const context = canvas.getContext("2d");

const scoreNode = document.getElementById("score");
const comboNode = document.getElementById("combo");
const healthNode = document.getElementById("health");
const zoneNode = document.getElementById("zone");
const waveNode = document.getElementById("wave");
const objectivesNode = document.getElementById("objectives");
const powersNode = document.getElementById("powers");
const waveZoneNode = document.getElementById("wave-zone");
const messageNode = document.getElementById("message");
const restartButton = document.getElementById("restart");
const fullscreenButton = document.getElementById("fullscreen");
const gamePanel = document.querySelector(".game-panel");
const arena = document.querySelector(".arena");
const minimapCanvas = document.getElementById("minimap");
const minimapContext = minimapCanvas.getContext("2d");
const overlayNode = document.getElementById("run-overlay");
const overlayEyebrowNode = document.getElementById("overlay-eyebrow");
const overlayTitleNode = document.getElementById("overlay-title");
const overlayCopyNode = document.getElementById("overlay-copy");
const overlayActionNode = document.getElementById("overlay-action");
const summary1LabelNode = document.getElementById("summary-1-label");
const summary1ValueNode = document.getElementById("summary-1-value");
const summary2LabelNode = document.getElementById("summary-2-label");
const summary2ValueNode = document.getElementById("summary-2-value");
const summary3LabelNode = document.getElementById("summary-3-label");
const summary3ValueNode = document.getElementById("summary-3-value");
const summary4LabelNode = document.getElementById("summary-4-label");
const summary4ValueNode = document.getElementById("summary-4-value");

const aspectRatio = 16 / 10;
const mapScale = 3;

const world = {
  width: canvas.width,
  height: canvas.height,
  viewportWidth: canvas.width,
  viewportHeight: canvas.height,
  time: 0,
  spawnTimer: 0,
  difficultyTimer: 0,
  spawnRate: 1.15,
  score: 0,
  combo: 1,
  comboTimer: 0,
  currentZoneIndex: 0,
  wave: 0,
  waveZoneIndex: 0,
  waveBurstRemaining: 0,
  waveBurstTimer: 0,
  intermissionTimer: 2.2,
  powerupTimer: 8,
  objectivesCollected: 0,
  maxCombo: 1,
  runTime: 0,
  phase: "start",
  gameOver: false,
  flash: 0,
};

const camera = {
  x: 0,
  y: 0,
};

const input = new Set();
const gamepadState = {
  connected: false,
  index: null,
  buttons: {
    pulse: false,
    dash: false,
    beam: false,
    burst: false,
    action: false,
    fullscreen: false,
  },
  movement: { x: 0, y: 0 },
};

const player = {
  x: world.width / 2,
  y: world.height / 2,
  radius: 16,
  speed: 320,
  health: 5,
  angle: -Math.PI / 2,
  dashCooldown: 0,
  dashTime: 0,
  pulseCooldown: 0,
  beamCooldown: 0,
  burstCooldown: 0,
  hitTimer: 0,
  powers: {
    pulse: false,
    beam: false,
    burst: false,
    drones: false,
  },
  powerLevels: {
    pulse: 0,
    beam: 0,
    burst: 0,
    drones: 0,
  },
  powerBranches: {
    pulse: { surge: 0, static: 0 },
    beam: { focus: 0, lattice: 0 },
    burst: { seeker: 0, nova: 0 },
    drones: { orbit: 0, forge: 0 },
  },
};

const enemies = [];
const particles = [];
const landmarks = [];
const obstacles = [];
const powerups = [];
const projectiles = [];
const beamEffects = [];

const powerDefinitions = {
  pulse: {
    label: "Shock Pulse",
    shortLabel: "Pulse",
    color: "#74f5ff",
    branches: {
      surge: "Surge",
      static: "Static",
    },
  },
  beam: {
    label: "Prism Lance",
    shortLabel: "Lance",
    color: "#74f5ff",
    branches: {
      focus: "Focus",
      lattice: "Lattice",
    },
  },
  burst: {
    label: "Shard Bloom",
    shortLabel: "Bloom",
    color: "#ff6b93",
    branches: {
      seeker: "Seeker",
      nova: "Nova",
    },
  },
  drones: {
    label: "Orbit Halo",
    shortLabel: "Halo",
    color: "#ffd166",
    branches: {
      orbit: "Orbit",
      forge: "Forge",
    },
  },
};

const rarityDefinitions = {
  common: { label: "Common", color: "#9bb4c7", bonus: 1 },
  rare: { label: "Rare", color: "#74f5ff", bonus: 2 },
  epic: { label: "Epic", color: "#ffd166", bonus: 3 },
};

function setOverlayStat(labelNode, valueNode, label, value) {
  labelNode.textContent = label;
  valueNode.textContent = value;
}

function updateOverlay() {
  const hidden = world.phase === "playing";
  overlayNode.classList.toggle("hidden", hidden);

  if (hidden) {
    return;
  }

  if (world.phase === "gameover") {
    overlayEyebrowNode.textContent = "Run Summary";
    overlayTitleNode.textContent = "Run Over";
    overlayCopyNode.textContent = "Reset the sectors, collect more relay shards, and push deeper into the next breach cycle.";
    overlayActionNode.textContent = "Run Again";
    setOverlayStat(summary1LabelNode, summary1ValueNode, "Score", Math.floor(world.score).toString());
    setOverlayStat(summary2LabelNode, summary2ValueNode, "Wave", Math.max(world.wave, 1).toString());
    setOverlayStat(summary3LabelNode, summary3ValueNode, "Relays", `${world.objectivesCollected}/${landmarks.length}`);
    setOverlayStat(summary4LabelNode, summary4ValueNode, "Max Combo", `x${world.maxCombo}`);
    return;
  }

  overlayEyebrowNode.textContent = "Arcade Geometry";
  overlayTitleNode.textContent = "Neon Drift";
  overlayCopyNode.textContent = "Launch when ready. Capture the landmark relays, learn each sector's enemy pattern, and hold the map through expanding waves.";
  overlayActionNode.textContent = "Start Run";
  setOverlayStat(summary1LabelNode, summary1ValueNode, "Relays", "4");
  setOverlayStat(summary2LabelNode, summary2ValueNode, "Sectors", "4");
  setOverlayStat(summary3LabelNode, summary3ValueNode, "Arena", "3x");
  setOverlayStat(summary4LabelNode, summary4ValueNode, "Mode", "Arcade");
}

function startRun() {
  if (world.phase === "playing") {
    return;
  }

  world.phase = "playing";
  setMessage("Run live. Collect the relay shards and survive the breach.");
  updateOverlay();
}

function restartRun() {
  resetGame("playing");
}

function handlePrimaryAction() {
  if (world.phase === "gameover") {
    restartRun();
    return;
  }

  startRun();
}

function getPulseRadius() {
  return getPulseStats().radius;
}

function getUnlockedPowers() {
  return Object.entries(player.powerLevels)
    .filter(([, level]) => level > 0)
    .map(([key, level]) => `${powerDefinitions[key].shortLabel} ${level}`);
}

function getPowerSummary() {
  const unlocked = getUnlockedPowers();
  return unlocked.length === 0 ? "Base" : unlocked.join(" / ");
}

function getPowerStat(key, branch) {
  return player.powerBranches[key][branch] || 0;
}

function getPulseStats() {
  return {
    damage: 2 + Math.floor(player.powerLevels.pulse / 2) + getPowerStat("pulse", "static"),
    radius: 170 + world.objectivesCollected * 14 + player.powerLevels.pulse * 10 + getPowerStat("pulse", "surge") * 18,
    cooldown: Math.max(0.55, 1.35 - getPowerStat("pulse", "surge") * 0.05),
    force: 200 + player.powerLevels.pulse * 14 + getPowerStat("pulse", "surge") * 18,
    staticArcs: getPowerStat("pulse", "static"),
  };
}

function getBeamStats() {
  return {
    damage: 3 + player.powerLevels.beam + getPowerStat("beam", "focus"),
    length: 360 + world.objectivesCollected * 20 + getPowerStat("beam", "focus") * 26,
    width: 42 + getPowerStat("beam", "lattice") * 8,
    cooldown: Math.max(0.45, 1.5 - getPowerStat("beam", "focus") * 0.06 - getPowerStat("drones", "forge") * 0.04),
    latticeBursts: getPowerStat("beam", "lattice"),
  };
}

function getBurstStats() {
  return {
    projectileCount: 3 + player.powerLevels.burst + getPowerStat("burst", "seeker"),
    damage: 2 + Math.floor(player.powerLevels.burst / 2) + getPowerStat("burst", "nova"),
    cooldown: Math.max(0.4, 1.1 - getPowerStat("burst", "seeker") * 0.05),
    speed: 280 + getPowerStat("burst", "seeker") * 18,
    novaRadius: 46 + getPowerStat("burst", "nova") * 12,
  };
}

function getDroneStats() {
  return {
    count: 2 + Math.floor((player.powerLevels.drones + getPowerStat("drones", "orbit")) / 2),
    radius: 54 + getPowerStat("drones", "orbit") * 8,
    damage: 1 + Math.floor(getPowerStat("drones", "forge") / 2),
    cooldown: Math.max(0.14, 0.34 - getPowerStat("drones", "forge") * 0.02),
  };
}

function getEnemyProfile(zoneIndex) {
  const profiles = [
    { behavior: "lancer", kind: "triangle", color: "#74f5ff", hp: 1, size: 18, speed: 170 },
    { behavior: "bulwark", kind: "square", color: "#ffd166", hp: 3, size: 26, speed: 118 },
    { behavior: "weaver", kind: "hex", color: "#ff6b93", hp: 2, size: 22, speed: 145 },
    { behavior: "drifter", kind: "diamond", color: "#9cff57", hp: 2, size: 19, speed: 155 },
  ];

  return profiles[zoneIndex] || profiles[0];
}

function getZones() {
  const halfWidth = world.width / 2;
  const halfHeight = world.height / 2;

  return [
    { index: 0, name: "North Crown", color: "#74f5ff", x: 0, y: 0, width: halfWidth, height: halfHeight },
    { index: 1, name: "Solar Verge", color: "#ffd166", x: halfWidth, y: 0, width: halfWidth, height: halfHeight },
    { index: 2, name: "Rose Circuit", color: "#ff6b93", x: 0, y: halfHeight, width: halfWidth, height: halfHeight },
    { index: 3, name: "Verdant Array", color: "#9cff57", x: halfWidth, y: halfHeight, width: halfWidth, height: halfHeight },
  ];
}

function getZoneAt(x, y) {
  return getZones().find((zone) => x >= zone.x && x < zone.x + zone.width && y >= zone.y && y < zone.y + zone.height) || getZones()[0];
}

function seedWorldFeatures() {
  landmarks.length = 0;
  obstacles.length = 0;

  const landmarksByZone = [
    { name: "Halo Gate", type: "ring", offsetX: 0.48, offsetY: 0.34 },
    { name: "Prism Forge", type: "spire", offsetX: 0.62, offsetY: 0.42 },
    { name: "Pulse Garden", type: "array", offsetX: 0.38, offsetY: 0.63 },
    { name: "Signal Bloom", type: "ring", offsetX: 0.6, offsetY: 0.6 },
  ];
  const obstacleOffsets = [
    [0.24, 0.26, 42],
    [0.72, 0.26, 34],
    [0.34, 0.72, 48],
    [0.76, 0.68, 38],
  ];

  for (const zone of getZones()) {
    const landmarkSeed = landmarksByZone[zone.index];
    landmarks.push({
      name: landmarkSeed.name,
      type: landmarkSeed.type,
      color: zone.color,
      zoneIndex: zone.index,
      x: zone.x + zone.width * landmarkSeed.offsetX,
      y: zone.y + zone.height * landmarkSeed.offsetY,
      radius: 56,
      objectiveCollected: false,
      objectiveAngle: Math.random() * Math.PI * 2,
    });

    for (let index = 0; index < obstacleOffsets.length; index += 1) {
      const [offsetX, offsetY, radius] = obstacleOffsets[index];
      obstacles.push({
        zoneIndex: zone.index,
        color: zone.color,
        x: zone.x + zone.width * offsetX,
        y: zone.y + zone.height * offsetY,
        radius: radius + zone.index * 4 + (index % 2) * 6,
      });
    }
  }
}

function getAvailablePowerDrops() {
  const activeTypes = powerups.map((powerup) => `${powerup.type}:${powerup.branch}`);
  return Object.keys(powerDefinitions).flatMap((key) => {
    return Object.keys(powerDefinitions[key].branches)
      .filter((branch) => !activeTypes.includes(`${key}:${branch}`))
      .map((branch) => ({ type: key, branch }));
  });
}

function rollPowerRarity() {
  const roll = Math.random();
  if (roll > 0.9) {
    return "epic";
  }
  if (roll > 0.58) {
    return "rare";
  }
  return "common";
}

function findSpawnPointNearPlayer(minDistance, maxDistance) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = minDistance + Math.random() * (maxDistance - minDistance);
    const x = clamp(player.x + Math.cos(angle) * distance, 60, world.width - 60);
    const y = clamp(player.y + Math.sin(angle) * distance, 60, world.height - 60);
    const blocked = obstacles.some((obstacle) => Math.hypot(x - obstacle.x, y - obstacle.y) < obstacle.radius + 48);
    if (!blocked) {
      return { x, y };
    }
  }

  return {
    x: clamp(player.x + 120, 60, world.width - 60),
    y: clamp(player.y + 120, 60, world.height - 60),
  };
}

function spawnPowerup() {
  const available = getAvailablePowerDrops();
  if (available.length === 0) {
    return;
  }

  const selection = available[Math.floor(Math.random() * available.length)];
  const definition = powerDefinitions[selection.type];
  const rarity = rollPowerRarity();
  const rarityDefinition = rarityDefinitions[rarity];
  const point = findSpawnPointNearPlayer(180, 420);
  powerups.push({
    type: selection.type,
    branch: selection.branch,
    rarity,
    label: `${definition.label} ${definition.branches[selection.branch]}`,
    color: definition.color,
    glow: rarityDefinition.color,
    bonus: rarityDefinition.bonus,
    x: point.x,
    y: point.y,
    radius: 18,
    bob: Math.random() * Math.PI * 2,
  });
  setMessage(`${rarityDefinition.label} ${definition.label} ${definition.branches[selection.branch]} has materialized nearby.`);
}

function collectPowerup(powerupIndex) {
  const powerup = powerups[powerupIndex];
  player.powers[powerup.type] = true;
  player.powerLevels[powerup.type] += powerup.bonus;
  player.powerBranches[powerup.type][powerup.branch] += powerup.bonus;
  powerups.splice(powerupIndex, 1);
  createBurst(powerup.x, powerup.y, powerup.glow, 18, 200);
  world.score += 180 * powerup.bonus;
  setMessage(`${powerup.label} ${rarityDefinitions[powerup.rarity].label} upgrade acquired. ${powerDefinitions[powerup.type].label} is now Lv${player.powerLevels[powerup.type]}.`);
  updateHud();
}

function triggerBeam() {
  if (!player.powers.beam || player.beamCooldown > 0 || world.phase !== "playing" || world.gameOver) {
    return;
  }

  const beamStats = getBeamStats();
  player.beamCooldown = beamStats.cooldown;
  const angle = player.angle;
  const length = beamStats.length;
  const beamWidth = beamStats.width;
  beamEffects.push({ x: player.x, y: player.y, angle, length, life: 0.18, color: powerDefinitions.beam.color, width: 8 + getPowerStat("beam", "lattice") * 1.5 });
  createBurst(player.x, player.y, powerDefinitions.beam.color, 14, 150);

  for (let index = enemies.length - 1; index >= 0; index -= 1) {
    const enemy = enemies[index];
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const forward = dx * Math.cos(angle) + dy * Math.sin(angle);
    const lateral = Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle));
    if (forward >= 0 && forward <= length && lateral <= beamWidth) {
      enemy.hp -= beamStats.damage;
      enemy.hitFlash = 0.22;
      if (player.powers.burst && beamStats.latticeBursts > 0) {
        for (let shardIndex = 0; shardIndex < beamStats.latticeBursts; shardIndex += 1) {
          const shardAngle = angle + (shardIndex - (beamStats.latticeBursts - 1) / 2) * 0.22;
          projectiles.push({
            kind: "beam-shard",
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(shardAngle) * 260,
            vy: Math.sin(shardAngle) * 260,
            speed: 260,
            targetIndex: -1,
            life: 0.8,
            radius: 5,
            damage: 1 + Math.floor(player.powerLevels.burst / 2),
            color: powerDefinitions.beam.color,
            splash: 0,
          });
        }
      }
      if (enemy.hp <= 0) {
        destroyEnemy(index);
      }
    }
  }

  setMessage("Prism Lance fired.");
}

function getNearestEnemies(limit) {
  return [...enemies]
    .sort((left, right) => {
      const leftDistance = Math.hypot(left.x - player.x, left.y - player.y);
      const rightDistance = Math.hypot(right.x - player.x, right.y - player.y);
      return leftDistance - rightDistance;
    })
    .slice(0, limit);
}

function triggerBurstAttack() {
  if (!player.powers.burst || player.burstCooldown > 0 || world.phase !== "playing" || world.gameOver) {
    return;
  }

  const burstStats = getBurstStats();
  const droneStats = getDroneStats();
  player.burstCooldown = burstStats.cooldown;
  const targets = getNearestEnemies(4);
  const projectileCount = Math.max(burstStats.projectileCount, targets.length || burstStats.projectileCount);

  for (let index = 0; index < projectileCount; index += 1) {
    const angle = player.angle + (index - (projectileCount - 1) / 2) * 0.18;
    projectiles.push({
      kind: "burst",
      x: player.x,
      y: player.y,
      vx: Math.cos(angle) * burstStats.speed,
      vy: Math.sin(angle) * burstStats.speed,
      speed: burstStats.speed,
      targetIndex: targets[index] ? enemies.indexOf(targets[index]) : -1,
      life: 1.6,
      radius: 7,
      damage: burstStats.damage,
      color: powerDefinitions.burst.color,
      splash: burstStats.novaRadius,
    });
  }

  if (player.powers.drones && droneStats.count > 2) {
    const droneExtra = Math.min(2, droneStats.count - 2);
    for (let droneIndex = 0; droneIndex < droneExtra; droneIndex += 1) {
      const angle = world.time * 2.2 + droneIndex * Math.PI;
      projectiles.push({
        kind: "drone-burst",
        x: player.x + Math.cos(angle) * droneStats.radius,
        y: player.y + Math.sin(angle) * droneStats.radius,
        vx: Math.cos(player.angle) * (burstStats.speed - 20),
        vy: Math.sin(player.angle) * (burstStats.speed - 20),
        speed: burstStats.speed - 20,
        targetIndex: -1,
        life: 1.1,
        radius: 5,
        damage: Math.max(1, burstStats.damage - 1),
        color: powerDefinitions.drones.color,
        splash: 0,
      });
    }
  }

  createBurst(player.x, player.y, powerDefinitions.burst.color, 12, 120);
  setMessage("Shard Bloom deployed.");
}

function updatePowerups(deltaSeconds) {
  if (world.phase !== "playing" || world.gameOver) {
    return;
  }

  world.powerupTimer -= deltaSeconds;
  if (world.powerupTimer <= 0) {
    spawnPowerup();
    world.powerupTimer = Math.max(6.5, 12 - player.powerLevels.drones * 0.35) + Math.random() * 6;
  }

  for (let index = powerups.length - 1; index >= 0; index -= 1) {
    const powerup = powerups[index];
    powerup.bob += deltaSeconds * 2.2;
    if (Math.hypot(player.x - powerup.x, player.y - powerup.y) < player.radius + powerup.radius + 10) {
      collectPowerup(index);
    }
  }
}

function updateProjectiles(deltaSeconds) {
  for (let index = projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = projectiles[index];
    projectile.life -= deltaSeconds;
    if (projectile.life <= 0) {
      projectiles.splice(index, 1);
      continue;
    }

    const target = enemies[projectile.targetIndex] || getNearestEnemies(1)[0];
    if (target) {
      const dx = target.x - projectile.x;
      const dy = target.y - projectile.y;
      const distance = Math.hypot(dx, dy) || 1;
      projectile.vx += (dx / distance) * deltaSeconds * 220;
      projectile.vy += (dy / distance) * deltaSeconds * 220;
      const velocity = Math.hypot(projectile.vx, projectile.vy) || 1;
      projectile.vx = (projectile.vx / velocity) * projectile.speed;
      projectile.vy = (projectile.vy / velocity) * projectile.speed;
    }

    projectile.x += projectile.vx * deltaSeconds;
    projectile.y += projectile.vy * deltaSeconds;

    for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
      const enemy = enemies[enemyIndex];
      if (Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y) < projectile.radius + enemy.size) {
        enemy.hp -= projectile.damage || 2;
        enemy.hitFlash = 0.2;
        createBurst(projectile.x, projectile.y, projectile.color, 8, 80);
        if (projectile.splash > 0) {
          for (let splashIndex = enemies.length - 1; splashIndex >= 0; splashIndex -= 1) {
            if (splashIndex === enemyIndex) {
              continue;
            }
            const splashTarget = enemies[splashIndex];
            if (Math.hypot(projectile.x - splashTarget.x, projectile.y - splashTarget.y) < projectile.splash) {
              splashTarget.hp -= Math.max(1, Math.floor((projectile.damage || 2) / 2));
              splashTarget.hitFlash = 0.14;
              if (splashTarget.hp <= 0) {
                destroyEnemy(splashIndex);
              }
            }
          }
        }
        projectiles.splice(index, 1);
        if (enemy.hp <= 0) {
          destroyEnemy(enemyIndex);
        }
        break;
      }
    }
  }
}

function updateDrones(deltaSeconds) {
  if (!player.powers.drones) {
    return;
  }

  const droneStats = getDroneStats();

  for (const enemy of enemies) {
    enemy.droneCooldown = Math.max(0, (enemy.droneCooldown || 0) - deltaSeconds);
  }

  const orbitRadius = droneStats.radius;
  const orbitCount = droneStats.count;
  for (let droneIndex = 0; droneIndex < orbitCount; droneIndex += 1) {
    const angle = world.time * 2.2 + droneIndex * ((Math.PI * 2) / orbitCount);
    const droneX = player.x + Math.cos(angle) * orbitRadius;
    const droneY = player.y + Math.sin(angle) * orbitRadius;
    for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
      const enemy = enemies[enemyIndex];
      if ((enemy.droneCooldown || 0) > 0) {
        continue;
      }
      if (Math.hypot(droneX - enemy.x, droneY - enemy.y) < enemy.size + 13) {
        enemy.droneCooldown = droneStats.cooldown;
        enemy.hp -= droneStats.damage;
        enemy.hitFlash = 0.18;
        createBurst(droneX, droneY, powerDefinitions.drones.color, 6, 70);
        if (player.powers.beam && getPowerStat("drones", "forge") > 0) {
          beamEffects.push({ x: droneX, y: droneY, angle: Math.atan2(enemy.y - droneY, enemy.x - droneX), length: 70, life: 0.08, color: powerDefinitions.drones.color, width: 4 });
        }
        if (enemy.hp <= 0) {
          destroyEnemy(enemyIndex);
        }
      }
    }
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function syncFullscreenButton() {
  const active = Boolean(document.fullscreenElement);
  document.body.classList.toggle("fullscreen-active", active);
  fullscreenButton.textContent = active ? "Windowed" : "Fullscreen";
}

function resizeWorld() {
  const bounds = arena.getBoundingClientRect();
  const availableWidth = Math.max(320, Math.floor(bounds.width));
  const availableHeight = Math.max(240, Math.floor(bounds.height));

  let nextWidth = availableWidth;
  let nextHeight = Math.floor(nextWidth / aspectRatio);

  if (nextHeight > availableHeight) {
    nextHeight = availableHeight;
    nextWidth = Math.floor(nextHeight * aspectRatio);
  }

  const previousViewportWidth = world.viewportWidth;
  const previousViewportHeight = world.viewportHeight;

  canvas.width = nextWidth;
  canvas.height = nextHeight;
  world.viewportWidth = nextWidth;
  world.viewportHeight = nextHeight;

  if (!world.width || !world.height) {
    world.width = nextWidth * mapScale;
    world.height = nextHeight * mapScale;
  }

  const scaleX = previousViewportWidth > 0 ? nextWidth / previousViewportWidth : 1;
  const scaleY = previousViewportHeight > 0 ? nextHeight / previousViewportHeight : 1;
  const nextWorldWidth = Math.max(nextWidth * mapScale, world.width * scaleX);
  const nextWorldHeight = Math.max(nextHeight * mapScale, world.height * scaleY);
  const worldScaleX = world.width > 0 ? nextWorldWidth / world.width : 1;
  const worldScaleY = world.height > 0 ? nextWorldHeight / world.height : 1;

  world.width = nextWorldWidth;
  world.height = nextWorldHeight;

  player.x *= worldScaleX;
  player.y *= worldScaleY;

  for (const enemy of enemies) {
    enemy.x *= worldScaleX;
    enemy.y *= worldScaleY;
  }

  for (const particle of particles) {
    particle.x *= worldScaleX;
    particle.y *= worldScaleY;
  }

  for (const landmark of landmarks) {
    landmark.x *= worldScaleX;
    landmark.y *= worldScaleY;
    landmark.radius *= (worldScaleX + worldScaleY) * 0.5;
  }

  for (const obstacle of obstacles) {
    obstacle.x *= worldScaleX;
    obstacle.y *= worldScaleY;
    obstacle.radius *= (worldScaleX + worldScaleY) * 0.5;
  }

  player.x = clamp(player.x, player.radius, world.width - player.radius);
  player.y = clamp(player.y, player.radius, world.height - player.radius);

  if (landmarks.length === 0 && obstacles.length === 0) {
    seedWorldFeatures();
  }

  updateCamera(true);
}

function updateCamera(snap = false) {
  const targetX = clamp(player.x - world.viewportWidth / 2, 0, Math.max(0, world.width - world.viewportWidth));
  const targetY = clamp(player.y - world.viewportHeight / 2, 0, Math.max(0, world.height - world.viewportHeight));

  if (snap) {
    camera.x = targetX;
    camera.y = targetY;
    return;
  }

  const smoothing = 0.14;
  camera.x += (targetX - camera.x) * smoothing;
  camera.y += (targetY - camera.y) * smoothing;
}

function isVisible(x, y, radius = 0) {
  return (
    x + radius >= camera.x &&
    x - radius <= camera.x + world.viewportWidth &&
    y + radius >= camera.y &&
    y - radius <= camera.y + world.viewportHeight
  );
}

function getButtonValue(button) {
  if (!button) {
    return 0;
  }

  return typeof button === "number" ? button : button.value;
}

function pollGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const pad = gamepadState.index !== null ? pads[gamepadState.index] : Array.from(pads).find(Boolean);

  if (!pad) {
    gamepadState.connected = false;
    gamepadState.index = null;
    gamepadState.movement.x = 0;
    gamepadState.movement.y = 0;
    return;
  }

  gamepadState.connected = true;
  gamepadState.index = pad.index;

  const deadzone = 0.18;
  const axisX = Math.abs(pad.axes[0] || 0) > deadzone ? pad.axes[0] : 0;
  const axisY = Math.abs(pad.axes[1] || 0) > deadzone ? pad.axes[1] : 0;
  const dpadX = getButtonValue(pad.buttons[15]) - getButtonValue(pad.buttons[14]);
  const dpadY = getButtonValue(pad.buttons[13]) - getButtonValue(pad.buttons[12]);

  gamepadState.movement.x = clamp(axisX + dpadX, -1, 1);
  gamepadState.movement.y = clamp(axisY + dpadY, -1, 1);

  const nextPulse = getButtonValue(pad.buttons[0]) > 0.5;
  const nextDash = getButtonValue(pad.buttons[1]) > 0.5;
  const nextBeam = getButtonValue(pad.buttons[2]) > 0.5;
  const nextBurst = getButtonValue(pad.buttons[3]) > 0.5;
  const nextFullscreen = getButtonValue(pad.buttons[9]) > 0.5;

  if (world.phase !== "playing") {
    if ((nextPulse && !gamepadState.buttons.action) || (nextFullscreen && !gamepadState.buttons.fullscreen)) {
      handlePrimaryAction();
    }

    gamepadState.buttons.action = nextPulse;
    gamepadState.buttons.dash = nextDash;
    gamepadState.buttons.fullscreen = nextFullscreen;
    return;
  }

  if (nextPulse && !gamepadState.buttons.pulse) {
    triggerPulse();
  }

  if (nextDash && !gamepadState.buttons.dash) {
    triggerDash();
  }

  if (nextBeam && !gamepadState.buttons.beam) {
    triggerBeam();
  }

  if (nextBurst && !gamepadState.buttons.burst) {
    triggerBurstAttack();
  }

  if (nextFullscreen && !gamepadState.buttons.fullscreen) {
    toggleFullscreen();
  }

  gamepadState.buttons.pulse = nextPulse;
  gamepadState.buttons.dash = nextDash;
  gamepadState.buttons.beam = nextBeam;
  gamepadState.buttons.burst = nextBurst;
  gamepadState.buttons.action = nextPulse;
  gamepadState.buttons.fullscreen = nextFullscreen;
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await gamePanel.requestFullscreen();
  } catch {
    setMessage("Fullscreen is unavailable in this browser context.");
  }
}

function resetGame(phase = "start") {
  world.time = 0;
  world.spawnTimer = 0;
  world.difficultyTimer = 0;
  world.spawnRate = 1.15;
  world.score = 0;
  world.combo = 1;
  world.comboTimer = 0;
  world.currentZoneIndex = 0;
  world.wave = 0;
  world.waveZoneIndex = 0;
  world.waveBurstRemaining = 0;
  world.waveBurstTimer = 0;
  world.intermissionTimer = 1.8;
  world.powerupTimer = 8;
  world.objectivesCollected = 0;
  world.maxCombo = 1;
  world.runTime = 0;
  world.phase = phase;
  world.gameOver = false;
  world.flash = 0;

  player.x = world.width / 2;
  player.y = world.height / 2;
  player.health = 5;
  player.dashCooldown = 0;
  player.dashTime = 0;
  player.pulseCooldown = 0;
  player.beamCooldown = 0;
  player.burstCooldown = 0;
  player.hitTimer = 0;
  player.angle = -Math.PI / 2;
  player.powers.pulse = false;
  player.powers.beam = false;
  player.powers.burst = false;
  player.powers.drones = false;
  player.powerLevels.pulse = 0;
  player.powerLevels.beam = 0;
  player.powerLevels.burst = 0;
  player.powerLevels.drones = 0;
  player.powerBranches.pulse.surge = 0;
  player.powerBranches.pulse.static = 0;
  player.powerBranches.beam.focus = 0;
  player.powerBranches.beam.lattice = 0;
  player.powerBranches.burst.seeker = 0;
  player.powerBranches.burst.nova = 0;
  player.powerBranches.drones.orbit = 0;
  player.powerBranches.drones.forge = 0;

  enemies.length = 0;
  particles.length = 0;
  powerups.length = 0;
  projectiles.length = 0;
  beamEffects.length = 0;
  seedWorldFeatures();
  world.currentZoneIndex = getZoneAt(player.x, player.y).index;
  world.waveZoneIndex = world.currentZoneIndex;
  updateCamera(true);

  setMessage(phase === "playing"
    ? "Run live. Collect the relay shards and survive the breach."
    : gamepadState.connected
      ? "Controller ready. Press A or Start to launch the run."
      : "Press Enter or click Start Run to launch.");
  updateHud();
  updateOverlay();
}

function updateHud() {
  scoreNode.textContent = Math.floor(world.score).toString();
  comboNode.textContent = `x${world.combo}`;
  healthNode.textContent = player.health.toString();
  zoneNode.textContent = getZones()[world.currentZoneIndex].name;
  waveNode.textContent = world.phase === "start" ? "Standby" : world.wave === 0 ? "Prep" : `${world.wave}`;
  objectivesNode.textContent = `${world.objectivesCollected}/${landmarks.length || 4}`;
  powersNode.textContent = getPowerSummary();
  waveZoneNode.textContent = getZones()[world.waveZoneIndex].name;
}

function setMessage(text) {
  messageNode.textContent = text;
}

function spawnEnemy(zoneIndex = world.currentZoneIndex) {
  const zone = getZones()[zoneIndex];
  const profile = getEnemyProfile(zoneIndex);
  const side = Math.floor(Math.random() * 4);
  const margin = 120;
  const nearZoneX = zone.x + 40 + Math.random() * Math.max(32, zone.width - 80);
  const nearZoneY = zone.y + 40 + Math.random() * Math.max(32, zone.height - 80);
  let x = 0;
  let y = 0;

  if (side === 0) {
    x = nearZoneX;
    y = clamp(zone.y - margin * 0.25, -margin, world.height + margin);
  } else if (side === 1) {
    x = clamp(zone.x + zone.width + margin * 0.25, -margin, world.width + margin);
    y = nearZoneY;
  } else if (side === 2) {
    x = nearZoneX;
    y = clamp(zone.y + zone.height + margin * 0.25, -margin, world.height + margin);
  } else {
    x = clamp(zone.x - margin * 0.25, -margin, world.width + margin);
    y = nearZoneY;
  }

  const speed = profile.speed + Math.random() * 24 + world.wave * 3.5;
  const size = profile.size + Math.random() * 4;
  const color = profile.color;
  const hp = profile.hp + Math.floor(world.wave / 5);

  enemies.push({
    x,
    y,
    vx: 0,
    vy: 0,
    size,
    color,
    kind: profile.kind,
    hp,
    spin: (Math.random() * 2 - 1) * 2.5,
    rotation: Math.random() * Math.PI * 2,
    hitFlash: 0,
    speed,
    zoneIndex,
    behavior: profile.behavior,
    weave: Math.random() * Math.PI * 2,
  });
}

function createBurst(x, y, color, count, force) {
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.4;
    const speed = force * (0.55 + Math.random() * 0.7);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.35 + Math.random() * 0.35,
      maxLife: 0.7,
      size: 2 + Math.random() * 4,
      color,
    });
  }
}

function destroyEnemy(enemyIndex) {
  const enemy = enemies[enemyIndex];
  createBurst(enemy.x, enemy.y, enemy.color, 12, 150);
  enemies.splice(enemyIndex, 1);

  world.combo = Math.min(9, world.combo + 1);
  world.maxCombo = Math.max(world.maxCombo, world.combo);
  world.comboTimer = 2.4;
  world.score += 100 * world.combo;
  world.flash = 0.12;
  updateHud();
}

function hitPlayer() {
  if (player.hitTimer > 0 || world.gameOver) {
    return;
  }

  player.health -= 1;
  player.hitTimer = 1;
  world.combo = 1;
  world.comboTimer = 0;
  world.flash = 0.28;
  createBurst(player.x, player.y, "#ffffff", 18, 220);
  updateHud();

  if (player.health <= 0) {
    world.gameOver = true;
    world.phase = "gameover";
    setMessage("Run ended. Hit Restart to dive back in.");
    updateOverlay();
    return;
  }

  setMessage("Impact registered. Rebuild the combo.");
}

function triggerPulse() {
  if (player.pulseCooldown > 0 || world.gameOver || world.phase !== "playing") {
    return;
  }

  const pulseStats = getPulseStats();
  player.pulseCooldown = pulseStats.cooldown;
  world.flash = 0.18;
  setMessage("Shock pulse released.");
  createBurst(player.x, player.y, powerDefinitions.pulse.color, 22 + player.powerLevels.pulse * 2, 260 + player.powerLevels.pulse * 12);
  const pulseRadius = pulseStats.radius;

  for (let index = enemies.length - 1; index >= 0; index -= 1) {
    const enemy = enemies[index];
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.hypot(dx, dy);

    if (distance < pulseRadius) {
      enemy.hp -= pulseStats.damage;
      enemy.hitFlash = 0.18;
      enemy.vx += (dx / Math.max(distance, 1)) * pulseStats.force;
      enemy.vy += (dy / Math.max(distance, 1)) * pulseStats.force;

      if (pulseStats.staticArcs > 0) {
        beamEffects.push({
          x: player.x,
          y: player.y,
          angle: Math.atan2(dy, dx),
          length: Math.min(distance, pulseRadius),
          life: 0.08,
          color: powerDefinitions.pulse.color,
          width: 3 + pulseStats.staticArcs,
        });
      }

      if (enemy.hp <= 0) {
        destroyEnemy(index);
      }
    }
  }

  updateHud();
}

function triggerDash() {
  if (player.dashCooldown > 0 || world.gameOver || world.phase !== "playing") {
    return;
  }

  const direction = getMovementVector();
  if (direction.x === 0 && direction.y === 0) {
    return;
  }

  player.dashCooldown = 1.1;
  player.dashTime = 0.16;
  player.x += direction.x * 74;
  player.y += direction.y * 74;
  player.x = clamp(player.x, player.radius, world.width - player.radius);
  player.y = clamp(player.y, player.radius, world.height - player.radius);
  createBurst(player.x, player.y, "#ffd166", 14, 160);
  setMessage("Dash executed.");
}

function collectObjective(landmark) {
  if (landmark.objectiveCollected) {
    return;
  }

  landmark.objectiveCollected = true;
  world.objectivesCollected += 1;
  world.score += 320 + world.wave * 60;
  player.health = Math.min(6, player.health + 1);
  world.flash = 0.2;
  createBurst(landmark.x, landmark.y, landmark.color, 20, 220);

  if (world.objectivesCollected === landmarks.length) {
    world.score += 1200;
    setMessage("All landmark relays stabilized. Pulse range boosted to maximum.");
  } else {
    setMessage(`${landmark.name} stabilized. Relay ${world.objectivesCollected}/${landmarks.length} secured.`);
  }

  updateHud();
}

function updateObjectives(deltaSeconds) {
  for (const landmark of landmarks) {
    landmark.objectiveAngle += deltaSeconds * 1.9;

    if (landmark.objectiveCollected) {
      continue;
    }

    const distance = Math.hypot(player.x - landmark.x, player.y - landmark.y);
    if (distance < landmark.radius + player.radius + 14) {
      collectObjective(landmark);
    }
  }
}

function resolveObstacleCollision(entity, radius, bounce = false) {
  for (const obstacle of obstacles) {
    const dx = entity.x - obstacle.x;
    const dy = entity.y - obstacle.y;
    const distance = Math.hypot(dx, dy) || 0.0001;
    const overlap = obstacle.radius + radius - distance;

    if (overlap > 0) {
      const nx = dx / distance;
      const ny = dy / distance;
      entity.x += nx * overlap;
      entity.y += ny * overlap;

      if (bounce) {
        entity.vx += nx * 22;
        entity.vy += ny * 22;
      }
    }
  }
}

function startNextWave() {
  const zones = getZones();
  const currentZone = getZoneAt(player.x, player.y);
  world.wave += 1;
  world.waveZoneIndex = world.wave % 2 === 0 ? (currentZone.index + 1 + Math.floor(Math.random() * 2)) % zones.length : currentZone.index;
  world.waveBurstRemaining = 5 + Math.floor(world.wave * 1.35);
  world.waveBurstTimer = 0.15;
  world.intermissionTimer = 0;
  setMessage(`Wave ${world.wave} breaking into ${zones[world.waveZoneIndex].name}.`);
  updateHud();
}

function getMovementVector() {
  const keyboardX = (input.has("ArrowRight") || input.has("d") ? 1 : 0) - (input.has("ArrowLeft") || input.has("a") ? 1 : 0);
  const keyboardY = (input.has("ArrowDown") || input.has("s") ? 1 : 0) - (input.has("ArrowUp") || input.has("w") ? 1 : 0);
  const x = clamp(keyboardX + gamepadState.movement.x, -1, 1);
  const y = clamp(keyboardY + gamepadState.movement.y, -1, 1);
  const length = Math.hypot(x, y);

  if (length === 0) {
    return { x: 0, y: 0 };
  }

  return { x: x / length, y: y / length };
}

function updatePlayer(deltaSeconds) {
  const movement = getMovementVector();
  const activeSpeed = player.dashTime > 0 ? player.speed * 2.1 : player.speed;

  player.x += movement.x * activeSpeed * deltaSeconds;
  player.y += movement.y * activeSpeed * deltaSeconds;

  player.x = Math.max(player.radius, Math.min(world.width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(world.height - player.radius, player.y));
  resolveObstacleCollision(player, player.radius + 4);
  player.x = Math.max(player.radius, Math.min(world.width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(world.height - player.radius, player.y));

  if (movement.x !== 0 || movement.y !== 0) {
    player.angle = Math.atan2(movement.y, movement.x);
  }

  player.dashCooldown = Math.max(0, player.dashCooldown - deltaSeconds);
  player.dashTime = Math.max(0, player.dashTime - deltaSeconds);
  player.pulseCooldown = Math.max(0, player.pulseCooldown - deltaSeconds);
  player.beamCooldown = Math.max(0, player.beamCooldown - deltaSeconds);
  player.burstCooldown = Math.max(0, player.burstCooldown - deltaSeconds);
  player.hitTimer = Math.max(0, player.hitTimer - deltaSeconds);
}

function updateEnemies(deltaSeconds) {
  for (let index = enemies.length - 1; index >= 0; index -= 1) {
    const enemy = enemies[index];
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;

    let acceleration = 2.4;
    let drag = 0.92;

    if (enemy.behavior === "lancer") {
      acceleration = 3.05;
      drag = 0.94;
    } else if (enemy.behavior === "bulwark") {
      acceleration = 1.55;
      drag = 0.88;
    } else if (enemy.behavior === "weaver") {
      enemy.weave += deltaSeconds * 4.2;
      enemy.vx += (-dy / distance) * Math.sin(enemy.weave) * enemy.speed * deltaSeconds * 1.25;
      enemy.vy += (dx / distance) * Math.sin(enemy.weave) * enemy.speed * deltaSeconds * 1.25;
      drag = 0.9;
    } else if (enemy.behavior === "drifter") {
      enemy.weave += deltaSeconds * 3.2;
      enemy.vx += (-dy / distance) * Math.cos(enemy.weave) * enemy.speed * deltaSeconds * 0.82;
      enemy.vy += (dx / distance) * Math.cos(enemy.weave) * enemy.speed * deltaSeconds * 0.82;
      acceleration = distance > 160 ? 2.15 : 2.8;
      drag = 0.91;
    }

    enemy.vx += (dx / distance) * enemy.speed * deltaSeconds * acceleration;
    enemy.vy += (dy / distance) * enemy.speed * deltaSeconds * acceleration;
    enemy.vx *= drag;
    enemy.vy *= drag;

    enemy.x += enemy.vx * deltaSeconds;
    enemy.y += enemy.vy * deltaSeconds;
    resolveObstacleCollision(enemy, enemy.size + 2, true);
    enemy.rotation += enemy.spin * deltaSeconds;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - deltaSeconds);

    if (distance < enemy.size + player.radius - 3) {
      hitPlayer();
      enemy.vx *= -0.4;
      enemy.vy *= -0.4;
    }
  }
}

function updateParticles(deltaSeconds) {
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    particle.life -= deltaSeconds;

    if (particle.life <= 0) {
      particles.splice(index, 1);
      continue;
    }

    particle.x += particle.vx * deltaSeconds;
    particle.y += particle.vy * deltaSeconds;
    particle.vx *= 0.98;
    particle.vy *= 0.98;
  }
}

function updateWorld(deltaSeconds) {
  pollGamepad();
  updateCamera();

  if (world.phase === "start") {
    updateParticles(deltaSeconds);
    return;
  }

  if (world.gameOver) {
    updateParticles(deltaSeconds);
    return;
  }

  world.time += deltaSeconds;
  world.runTime += deltaSeconds;
  world.difficultyTimer += deltaSeconds;
  world.flash = Math.max(0, world.flash - deltaSeconds);
  world.currentZoneIndex = getZoneAt(player.x, player.y).index;

  if (world.comboTimer > 0) {
    world.comboTimer -= deltaSeconds;
    if (world.comboTimer <= 0) {
      world.combo = 1;
      updateHud();
    }
  }

  if (world.intermissionTimer > 0) {
    world.intermissionTimer -= deltaSeconds;
    if (world.intermissionTimer <= 0) {
      startNextWave();
    }
  } else if (world.waveBurstRemaining > 0) {
    world.waveBurstTimer -= deltaSeconds;

    if (world.waveBurstTimer <= 0) {
      const spawnCount = Math.random() > 0.55 ? 2 : 1;
      for (let index = 0; index < spawnCount && world.waveBurstRemaining > 0; index += 1) {
        spawnEnemy(world.waveZoneIndex);
        world.waveBurstRemaining -= 1;
      }
      world.waveBurstTimer = Math.max(0.16, 0.7 - world.wave * 0.03);
    }

    if (world.waveBurstRemaining <= 0) {
      world.intermissionTimer = Math.max(2.6, 5.2 - world.wave * 0.1);
      setMessage(`${getZones()[world.waveZoneIndex].name} is cooling. Reposition before the next breach.`);
    }
  }

  updatePlayer(deltaSeconds);
  updateObjectives(deltaSeconds);
  updateEnemies(deltaSeconds);
  updateDrones(deltaSeconds);
  updatePowerups(deltaSeconds);
  updateProjectiles(deltaSeconds);
  updateParticles(deltaSeconds);
  for (let index = beamEffects.length - 1; index >= 0; index -= 1) {
    beamEffects[index].life -= deltaSeconds;
    if (beamEffects[index].life <= 0) {
      beamEffects.splice(index, 1);
    }
  }
  updateCamera();
  updateHud();
}

function drawBackground() {
  const gradient = context.createLinearGradient(0, 0, 0, world.viewportHeight);
  gradient.addColorStop(0, "#10233f");
  gradient.addColorStop(1, "#030914");
  context.fillStyle = gradient;
  context.fillRect(0, 0, world.viewportWidth, world.viewportHeight);

  context.save();
  context.translate(-camera.x, -camera.y);
  const zones = getZones();
  for (const zone of zones) {
    context.fillStyle = `${zone.color}10`;
    context.fillRect(zone.x, zone.y, zone.width, zone.height);
  }

  context.strokeStyle = "rgba(116, 245, 255, 0.08)";
  context.lineWidth = 1;
  const startX = Math.floor(camera.x / 48) * 48;
  const endX = camera.x + world.viewportWidth + 48;
  for (let x = startX; x < endX; x += 48) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, world.height);
    context.stroke();
  }
  const startY = Math.floor(camera.y / 48) * 48;
  const endY = camera.y + world.viewportHeight + 48;
  for (let y = startY; y < endY; y += 48) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(world.width, y);
    context.stroke();
  }

  context.strokeStyle = "rgba(255, 255, 255, 0.1)";
  context.lineWidth = 4;
  context.strokeRect(0, 0, world.width, world.height);
  context.restore();
}

function drawLandmarks() {
  for (const landmark of landmarks) {
    if (!isVisible(landmark.x, landmark.y, landmark.radius + 20)) {
      continue;
    }

    const drawX = landmark.x - camera.x;
    const drawY = landmark.y - camera.y;
    context.save();
    context.translate(drawX, drawY);
    context.strokeStyle = landmark.color;
    context.fillStyle = `${landmark.color}22`;
    context.shadowColor = landmark.color;
    context.shadowBlur = 18;
    context.lineWidth = 3;

    if (landmark.type === "ring") {
      context.beginPath();
      context.arc(0, 0, landmark.radius * 0.72, 0, Math.PI * 2);
      context.stroke();
      context.beginPath();
      context.arc(0, 0, landmark.radius * 0.38, 0, Math.PI * 2);
      context.stroke();
    } else if (landmark.type === "spire") {
      context.beginPath();
      context.moveTo(0, -landmark.radius);
      context.lineTo(landmark.radius * 0.46, landmark.radius * 0.78);
      context.lineTo(-landmark.radius * 0.46, landmark.radius * 0.78);
      context.closePath();
      context.fill();
      context.stroke();
    } else {
      for (let index = 0; index < 3; index += 1) {
        context.beginPath();
        context.arc((index - 1) * 18, index % 2 === 0 ? -8 : 10, landmark.radius * 0.28, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      }
    }

    if (!landmark.objectiveCollected) {
      const pickupX = Math.cos(landmark.objectiveAngle) * (landmark.radius * 0.74);
      const pickupY = Math.sin(landmark.objectiveAngle) * (landmark.radius * 0.74);
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(pickupX, pickupY);
      context.strokeStyle = "rgba(255, 255, 255, 0.18)";
      context.stroke();
      context.fillStyle = "#ffffff";
      context.beginPath();
      context.arc(pickupX, pickupY, 8, 0, Math.PI * 2);
      context.fill();
    }

    context.shadowBlur = 0;
    context.fillStyle = "rgba(243, 247, 251, 0.85)";
    context.font = "500 13px Space Grotesk";
    context.textAlign = "center";
    context.fillText(landmark.name, 0, landmark.radius + 18);
    context.restore();
  }
}

function drawObstacles() {
  for (const obstacle of obstacles) {
    if (!isVisible(obstacle.x, obstacle.y, obstacle.radius + 10)) {
      continue;
    }

    const drawX = obstacle.x - camera.x;
    const drawY = obstacle.y - camera.y;
    context.save();
    context.translate(drawX, drawY);
    context.fillStyle = `${obstacle.color}2b`;
    context.strokeStyle = obstacle.color;
    context.lineWidth = 2.5;
    context.shadowColor = obstacle.color;
    context.shadowBlur = 14;
    context.beginPath();
    context.arc(0, 0, obstacle.radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.beginPath();
    context.arc(0, 0, obstacle.radius * 0.45, 0, Math.PI * 2);
    context.strokeStyle = "rgba(255, 255, 255, 0.22)";
    context.stroke();
    context.restore();
  }
}

function drawPowerups() {
  for (const powerup of powerups) {
    if (!isVisible(powerup.x, powerup.y, powerup.radius + 12)) {
      continue;
    }
    const drawX = powerup.x - camera.x;
    const drawY = powerup.y - camera.y + Math.sin(powerup.bob) * 6;
    context.save();
    context.translate(drawX, drawY);
    context.fillStyle = `${powerup.glow}30`;
    context.strokeStyle = powerup.glow;
    context.shadowColor = powerup.glow;
    context.shadowBlur = 18;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(0, 0, powerup.radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.beginPath();
    context.moveTo(0, -8);
    context.lineTo(7, 8);
    context.lineTo(-7, 8);
    context.closePath();
    context.fillStyle = powerup.color;
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = "rgba(243, 247, 251, 0.92)";
    context.font = "600 10px Space Grotesk";
    context.textAlign = "center";
    context.fillText(rarityDefinitions[powerup.rarity].label, 0, -powerup.radius - 10);
    context.fillText(powerDefinitions[powerup.type].branches[powerup.branch], 0, powerup.radius + 14);
    context.restore();
  }
}

function drawPlayer() {
  context.save();
  context.translate(player.x - camera.x, player.y - camera.y);
  context.rotate(player.angle + Math.PI / 2);

  context.fillStyle = player.hitTimer > 0 ? "#ffffff" : "#9cff57";
  context.shadowColor = "rgba(156, 255, 87, 0.7)";
  context.shadowBlur = 18;

  context.beginPath();
  context.moveTo(0, -22);
  context.lineTo(15, 16);
  context.lineTo(0, 9);
  context.lineTo(-15, 16);
  context.closePath();
  context.fill();

  context.fillStyle = "rgba(255, 255, 255, 0.85)";
  context.beginPath();
  context.arc(0, 1, 4, 0, Math.PI * 2);
  context.fill();
  context.restore();

  if (player.powers.drones) {
    const droneStats = getDroneStats();
    const orbitRadius = droneStats.radius;
    for (let droneIndex = 0; droneIndex < droneStats.count; droneIndex += 1) {
      const angle = world.time * 2.2 + droneIndex * ((Math.PI * 2) / droneStats.count);
      const droneX = player.x - camera.x + Math.cos(angle) * orbitRadius;
      const droneY = player.y - camera.y + Math.sin(angle) * orbitRadius;
      context.save();
      context.fillStyle = powerDefinitions.drones.color;
      context.shadowColor = powerDefinitions.drones.color;
      context.shadowBlur = 14;
      context.beginPath();
      context.arc(droneX, droneY, 8, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }

  if (player.pulseCooldown > 0) {
    const pulseStats = getPulseStats();
    const cooldownProgress = 1 - Math.min(1, player.pulseCooldown / pulseStats.cooldown);
    const radius = Math.max(18, getPulseRadius() * cooldownProgress);
    context.save();
    context.strokeStyle = `${powerDefinitions.pulse.color}${player.powerLevels.pulse > 0 ? "bb" : "80"}`;
    context.lineWidth = 3 + Math.min(3, getPowerStat("pulse", "static") * 0.4);
    context.beginPath();
    context.arc(player.x - camera.x, player.y - camera.y, radius, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }
}

function drawEnemy(enemy) {
  if (!isVisible(enemy.x, enemy.y, enemy.size + 8)) {
    return;
  }

  context.save();
  context.translate(enemy.x - camera.x, enemy.y - camera.y);
  context.rotate(enemy.rotation);
  context.fillStyle = enemy.hitFlash > 0 ? "#ffffff" : enemy.color;
  context.shadowColor = enemy.color;
  context.shadowBlur = 16;

  context.beginPath();
  if (enemy.kind === "triangle") {
    context.moveTo(0, -enemy.size);
    context.lineTo(enemy.size * 0.88, enemy.size);
    context.lineTo(-enemy.size * 0.88, enemy.size);
  } else if (enemy.kind === "hex") {
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
      const pointX = Math.cos(angle) * enemy.size;
      const pointY = Math.sin(angle) * enemy.size;
      if (index === 0) {
        context.moveTo(pointX, pointY);
      } else {
        context.lineTo(pointX, pointY);
      }
    }
  } else if (enemy.kind === "diamond") {
    context.moveTo(0, -enemy.size);
    context.lineTo(enemy.size * 0.75, 0);
    context.lineTo(0, enemy.size);
    context.lineTo(-enemy.size * 0.75, 0);
  } else {
    context.rect(-enemy.size, -enemy.size, enemy.size * 2, enemy.size * 2);
  }
  context.closePath();
  context.fill();

  if (enemy.behavior === "bulwark") {
    context.strokeStyle = "rgba(255, 255, 255, 0.35)";
    context.lineWidth = 2;
    context.strokeRect(-enemy.size * 0.42, -enemy.size * 0.42, enemy.size * 0.84, enemy.size * 0.84);
  }

  if (enemy.behavior === "drifter") {
    context.strokeStyle = "rgba(255, 255, 255, 0.28)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, 0, enemy.size * 0.68, 0, Math.PI * 2);
    context.stroke();
  }

  context.restore();
}

function drawParticles() {
  for (const particle of particles) {
    if (!isVisible(particle.x, particle.y, particle.size + 4)) {
      continue;
    }

    const alpha = Math.max(0, particle.life / particle.maxLife);
    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = particle.color;
    context.shadowColor = particle.color;
    context.shadowBlur = 10;
    context.beginPath();
    context.arc(particle.x - camera.x, particle.y - camera.y, particle.size, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

function drawProjectiles() {
  for (const projectile of projectiles) {
    if (!isVisible(projectile.x, projectile.y, projectile.radius + 6)) {
      continue;
    }
    context.save();
    context.fillStyle = projectile.color;
    context.shadowColor = projectile.color;
    context.shadowBlur = 14;
    context.beginPath();
    context.arc(projectile.x - camera.x, projectile.y - camera.y, projectile.radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

function drawBeamEffects() {
  for (const beam of beamEffects) {
    context.save();
    context.translate(beam.x - camera.x, beam.y - camera.y);
    context.rotate(beam.angle);
    context.strokeStyle = `${beam.color}${beam.life > 0.09 ? "dd" : "88"}`;
    context.shadowColor = beam.color;
    context.shadowBlur = 16;
    context.lineWidth = beam.width || 8;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(beam.length, 0);
    context.stroke();
    context.restore();
  }
}

function drawCooldownBars() {
  const cooldowns = [
    { label: player.powerLevels.pulse > 0 ? `Pulse Lv${player.powerLevels.pulse}` : "Pulse", ready: player.pulseCooldown <= 0, progress: 1 - Math.min(1, player.pulseCooldown / getPulseStats().cooldown), color: powerDefinitions.pulse.color },
    player.powers.beam ? { label: `Beam Lv${player.powerLevels.beam}`, ready: player.beamCooldown <= 0, progress: 1 - Math.min(1, player.beamCooldown / getBeamStats().cooldown), color: powerDefinitions.beam.color } : null,
    player.powers.burst ? { label: `Burst Lv${player.powerLevels.burst}`, ready: player.burstCooldown <= 0, progress: 1 - Math.min(1, player.burstCooldown / getBurstStats().cooldown), color: powerDefinitions.burst.color } : null,
  ].filter(Boolean);

  const boxWidth = 162;
  const startX = world.viewportWidth - boxWidth - 26;
  const startY = world.viewportHeight - 26 - cooldowns.length * 28;

  for (let index = 0; index < cooldowns.length; index += 1) {
    const cooldown = cooldowns[index];
    const y = startY + index * 28;
    context.save();
    context.fillStyle = "rgba(3, 10, 18, 0.72)";
    context.fillRect(startX, y, boxWidth, 20);
    context.fillStyle = cooldown.ready ? `${cooldown.color}cc` : `${cooldown.color}55`;
    context.fillRect(startX, y, boxWidth * cooldown.progress, 20);
    context.strokeStyle = "rgba(255, 255, 255, 0.12)";
    context.strokeRect(startX, y, boxWidth, 20);
    context.fillStyle = "#f3f7fb";
    context.font = "600 11px Space Grotesk";
    context.textAlign = "left";
    context.fillText(cooldown.label, startX + 8, y + 13.5);
    context.restore();
  }
}

function drawOverlay() {
  if (world.flash > 0) {
    context.save();
    context.fillStyle = `rgba(255, 255, 255, ${world.flash * 0.25})`;
    context.fillRect(0, 0, world.viewportWidth, world.viewportHeight);
    context.restore();
  }

  if (world.gameOver) {
    context.save();
    context.fillStyle = "rgba(2, 8, 15, 0.66)";
    context.fillRect(0, 0, world.viewportWidth, world.viewportHeight);
    context.textAlign = "center";
    context.fillStyle = "#f3f7fb";
    context.font = "700 48px Space Grotesk";
    context.fillText("Run Over", world.viewportWidth / 2, world.viewportHeight / 2 - 10);
    context.fillStyle = "#9bb4c7";
    context.font = "400 20px Space Grotesk";
    context.fillText("Restart and try for a longer combo chain.", world.viewportWidth / 2, world.viewportHeight / 2 + 30);
    context.restore();
  }

  if (world.phase !== "playing") {
    context.save();
    context.textAlign = "left";
    context.fillStyle = "rgba(243, 247, 251, 0.82)";
    context.font = "500 14px Space Grotesk";
    context.fillText("Press Enter or click Start Run.", 22, world.viewportHeight - 22);
    context.restore();
    return;
  }

  context.save();
  context.textAlign = "left";
  context.fillStyle = "rgba(243, 247, 251, 0.82)";
  context.font = "500 14px Space Grotesk";
  context.fillText(`Active wave zone: ${getZones()[world.waveZoneIndex].name}`, 22, world.viewportHeight - 22);
  context.restore();
}

function drawMinimap() {
  minimapContext.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
  minimapContext.fillStyle = "rgba(4, 12, 24, 0.96)";
  minimapContext.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);

  const scaleX = minimapCanvas.width / world.width;
  const scaleY = minimapCanvas.height / world.height;
  const zones = getZones();

  for (const zone of zones) {
    minimapContext.fillStyle = `${zone.color}22`;
    minimapContext.fillRect(zone.x * scaleX, zone.y * scaleY, zone.width * scaleX, zone.height * scaleY);
  }

  minimapContext.strokeStyle = "rgba(255, 255, 255, 0.16)";
  minimapContext.lineWidth = 1;
  minimapContext.strokeRect(0, 0, minimapCanvas.width, minimapCanvas.height);

  minimapContext.strokeStyle = `${zones[world.waveZoneIndex].color}`;
  minimapContext.lineWidth = 2;
  minimapContext.strokeRect(
    zones[world.waveZoneIndex].x * scaleX,
    zones[world.waveZoneIndex].y * scaleY,
    zones[world.waveZoneIndex].width * scaleX,
    zones[world.waveZoneIndex].height * scaleY,
  );

  for (const landmark of landmarks) {
    minimapContext.fillStyle = landmark.objectiveCollected ? `${landmark.color}88` : landmark.color;
    minimapContext.beginPath();
    minimapContext.arc(landmark.x * scaleX, landmark.y * scaleY, landmark.objectiveCollected ? 3 : 4.5, 0, Math.PI * 2);
    minimapContext.fill();
  }

  for (const obstacle of obstacles) {
    minimapContext.fillStyle = `${obstacle.color}aa`;
    minimapContext.beginPath();
    minimapContext.arc(obstacle.x * scaleX, obstacle.y * scaleY, Math.max(2.5, obstacle.radius * scaleX * 0.18), 0, Math.PI * 2);
    minimapContext.fill();
  }

  for (const enemy of enemies) {
    minimapContext.fillStyle = enemy.color;
    minimapContext.fillRect(enemy.x * scaleX - 1.5, enemy.y * scaleY - 1.5, 3, 3);
  }

  for (const powerup of powerups) {
    minimapContext.fillStyle = powerup.glow;
    minimapContext.beginPath();
    minimapContext.arc(powerup.x * scaleX, powerup.y * scaleY, 3.5, 0, Math.PI * 2);
    minimapContext.fill();
  }

  minimapContext.strokeStyle = "rgba(255, 255, 255, 0.65)";
  minimapContext.lineWidth = 1.4;
  minimapContext.strokeRect(camera.x * scaleX, camera.y * scaleY, world.viewportWidth * scaleX, world.viewportHeight * scaleY);

  minimapContext.fillStyle = "#9cff57";
  minimapContext.beginPath();
  minimapContext.arc(player.x * scaleX, player.y * scaleY, 4, 0, Math.PI * 2);
  minimapContext.fill();
}

function render() {
  drawBackground();
  drawLandmarks();
  drawObstacles();
  drawPowerups();
  drawBeamEffects();
  drawParticles();
  drawProjectiles();
  for (const enemy of enemies) {
    drawEnemy(enemy);
  }
  drawPlayer();
  drawOverlay();
  drawCooldownBars();
  drawMinimap();
}

let lastTime = 0;

function frame(timestamp) {
  const deltaSeconds = Math.min(0.033, (timestamp - lastTime) / 1000 || 0.016);
  lastTime = timestamp;

  updateWorld(deltaSeconds);
  render();
  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

  if (world.phase !== "playing" && (key === "Enter" || key === " ")) {
    event.preventDefault();
    handlePrimaryAction();
    return;
  }

  if (key === " ") {
    event.preventDefault();
    triggerPulse();
    return;
  }

  if (key === "Shift") {
    triggerDash();
    return;
  }

  if (key === "q") {
    triggerBeam();
    return;
  }

  if (key === "e") {
    triggerBurstAttack();
    return;
  }

  if (key === "f") {
    toggleFullscreen();
    return;
  }

  input.add(key);
});

window.addEventListener("keyup", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  input.delete(key);
});

restartButton.addEventListener("click", () => {
  restartRun();
});

overlayActionNode.addEventListener("click", () => {
  handlePrimaryAction();
});

fullscreenButton.addEventListener("click", () => {
  toggleFullscreen();
});

canvas.addEventListener("dblclick", () => {
  toggleFullscreen();
});

window.addEventListener("resize", resizeWorld);

document.addEventListener("fullscreenchange", () => {
  syncFullscreenButton();
  window.requestAnimationFrame(resizeWorld);
});

window.addEventListener("gamepadconnected", (event) => {
  const pad = event.gamepad || Array.from(navigator.getGamepads ? navigator.getGamepads() : []).find(Boolean);

  if (!pad) {
    gamepadState.connected = true;
    setMessage("Controller linked.");
    return;
  }

  gamepadState.connected = true;
  gamepadState.index = pad.index;
  setMessage(`Controller linked: ${pad.id}`);
});

window.addEventListener("gamepaddisconnected", () => {
  gamepadState.connected = false;
  gamepadState.index = null;
  gamepadState.movement.x = 0;
  gamepadState.movement.y = 0;
  gamepadState.buttons.pulse = false;
  gamepadState.buttons.dash = false;
  gamepadState.buttons.beam = false;
  gamepadState.buttons.burst = false;
  gamepadState.buttons.action = false;
  gamepadState.buttons.fullscreen = false;
  setMessage("Controller disconnected. Keyboard controls remain active.");
});

syncFullscreenButton();
resizeWorld();
resetGame();

window.__neonDriftDebug = {
  world,
  player,
  enemies,
  powerups,
  projectiles,
  beamEffects,
  getPulseStats,
  getBeamStats,
  getBurstStats,
  getDroneStats,
  updateHud,
  setMessage,
  spawnEnemy,
  spawnPowerup,
  triggerBeam,
  triggerBurstAttack,
  triggerPulse,
  resetGame,
  forceStart() {
    resetGame("playing");
  },
  spawnSpecificPowerup(type, branch, rarity = "common") {
    const definition = powerDefinitions[type];
    const rarityDefinition = rarityDefinitions[rarity];
    if (!definition || !definition.branches[branch] || !rarityDefinition) {
      return false;
    }

    const point = findSpawnPointNearPlayer(80, 120);
    powerups.push({
      type,
      branch,
      rarity,
      label: `${definition.label} ${definition.branches[branch]}`,
      color: definition.color,
      glow: rarityDefinition.color,
      bonus: rarityDefinition.bonus,
      x: point.x,
      y: point.y,
      radius: 18,
      bob: 0,
    });
    return true;
  },
  collectAllPowerups() {
    while (powerups.length > 0) {
      collectPowerup(powerups.length - 1);
    }
  },
  spawnTestEnemies(count = 6, zoneIndex = world.currentZoneIndex) {
    for (let index = 0; index < count; index += 1) {
      spawnEnemy(zoneIndex);
    }
  },
};

requestAnimationFrame(frame);