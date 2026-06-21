export const LANE_WIDTH = 2.5;

import { store, ITEMS } from './store';
import { audioManager } from './audio';

export type GameStatus = "MENU" | "CHOOSE_CHARACTER" | "CHOOSE_MAP" | "PLAYING" | "GAMEOVER" | "SKILLS" | "AI_FORGE";
export type ObstacleType = "COLUMN" | "HURDLE" | "ARCH" | "COIN";

export const state = {
  status: "MENU" as GameStatus,
  targetLane: 0,
  lane: 0,
  y: 0,
  yVel: 0,
  isSliding: false,
  slideTimer: 0,
  speed: 20, // Initial units per second
  score: 0,
  coins: 0,
  distance: 0,
  doubleJumped: false, // For Void Walker double jump
  level: 1,
};

export function getActiveMap() {
  if (store.selMap === "m5") {
      const order = ["m1", "m2", "m3", "m4"];
      return order[Math.floor(state.distance / 150) % 4];
  }
  return store.selMap;
}

export interface Obstacle {
  id: number;
  type: ObstacleType;
  lane: number;
  z: number;
  collected?: boolean;
}

export const world = {
  obstacles: [] as Obstacle[],
  nextId: 0,
};

function randomObstacle(): ObstacleType {
  const r = Math.random();
  if (r < 0.33) return "COLUMN";
  if (r < 0.66) return "HURDLE";
  return "ARCH";
}

function spawnRow(zPos: number) {
  const lanes = [-1, 0, 1];
  lanes.sort(() => Math.random() - 0.5);

  const r = Math.random();
  if (r < 0.2) {
    world.obstacles.push({ id: world.nextId++, type: "COIN", lane: -1, z: zPos });
    world.obstacles.push({ id: world.nextId++, type: "COIN", lane: 0, z: zPos });
    world.obstacles.push({ id: world.nextId++, type: "COIN", lane: 1, z: zPos });
  } else if (r < 0.6) {
    world.obstacles.push({ id: world.nextId++, type: randomObstacle(), lane: lanes[0], z: zPos });
    world.obstacles.push({ id: world.nextId++, type: "COIN", lane: lanes[1], z: zPos });
  } else {
    world.obstacles.push({ id: world.nextId++, type: randomObstacle(), lane: lanes[0], z: zPos });
    world.obstacles.push({ id: world.nextId++, type: randomObstacle(), lane: lanes[1], z: zPos });
    world.obstacles.push({ id: world.nextId++, type: "COIN", lane: lanes[2], z: zPos });
  }
}

export function resetGame() {
  state.status = "PLAYING";
  state.targetLane = 0;
  state.lane = 0;
  state.y = 0;
  state.yVel = 0;
  state.isSliding = false;
  state.slideTimer = 0;
  
  // Starting Speed Skill
  const speedSkill = store.getSkillLevel('s2');
  state.speed = 20 + (speedSkill * 3); 
  
  state.score = 0;
  state.coins = 0;
  state.distance = 0;
  state.doubleJumped = false;
  state.level = 1;

  world.obstacles = [];
  world.nextId = 0;

  for (let i = 0; i < 15; i++) {
    spawnRow(-30 - i * 30);
  }

  audioManager.init();
  audioManager.playBgm(store.selMap);
}

function doHit() {
  audioManager.playHit();
  audioManager.stopBgm();
  state.status = "GAMEOVER";
  if (state.score > store.highscore) {
    store.highscore = state.score;
  }
}

export function updateWorld(delta: number) {
  if (state.status === "GAMEOVER") return;
  const isDemo = state.status !== "PLAYING";

  // 1. Move Player
  state.yVel -= 80 * delta; 
  state.y += state.yVel * delta;
  
  if (state.y <= 0) {
    state.y = 0;
    state.yVel = 0;
    state.doubleJumped = false;
  }

  if (state.isSliding) {
    state.slideTimer -= delta;
    if (state.slideTimer <= 0) {
      state.isSliding = false;
    }
  }

  state.lane += (state.targetLane - state.lane) * 15 * delta;

  // 2. Move World 
  const currentSpeed = isDemo ? 30 : state.speed;
  state.distance += currentSpeed * delta;
  
  if (!isDemo) {
      // Level up every 200 units
      const newLevel = Math.floor(state.distance / 200) + 1;
      if (newLevel > state.level) {
          state.level = newLevel;
          // You gain some speed bursts per level
      }
      
      state.speed += 0.2 * delta; 
      if (state.speed > 50) state.speed = 50; // Cap max speed
      
      state.score = Math.floor(state.distance / 10);

      if (store.selMap === 'm2' && Math.random() < 0.002) {
          audioManager.playVampireSound();
      }
  }

  // Auto magnetizing
  const hasUniversalMagnet = store.getSkillLevel('s3') > 0;
  const isMagnet = store.selChar === 'c3' || hasUniversalMagnet;
  const magnetRangeSkill = store.getSkillLevel('s1');
  const magnetZDist = isMagnet ? (10 + (magnetRangeSkill * 5)) : 0;
  const playerX = state.lane * LANE_WIDTH;

  if (isDemo) {
      // Auto dodge
      let dangerous = false;
      for (const o of world.obstacles) {
          if (o.z > -15 && o.z < 0 && Math.abs(o.lane - state.targetLane) < 0.1 && o.type !== "COIN") {
             dangerous = true;
             break;
          }
      }

      // Only pick a new lane if currently dangerous
      if (dangerous) {
          // Find the first safe lane
          const safeLanes = [-1, 0, 1].filter(l => {
              for (const o of world.obstacles) {
                  if (o.z > -15 && o.z < 0 && Math.abs(o.lane - l) < 0.1 && o.type !== "COIN") {
                      return false;
                  }
              }
              return true;
          });
          if (safeLanes.length > 0) {
              state.targetLane = safeLanes[Math.floor(Math.random() * safeLanes.length)];
          }
      }
  }

  // 3. Update Obstacles 
  for (let i = world.obstacles.length - 1; i >= 0; i--) {
    const o = world.obstacles[i];
    o.z += currentSpeed * delta; 

    const oX = o.lane * LANE_WIDTH;
    const inLane = Math.abs(playerX - oX) < 1.2; 
    const inZ = o.z > -1 && o.z < 1.5; 
    
    // Magnet
    if (isMagnet && o.type === "COIN" && !o.collected) {
        if (o.z > -magnetZDist && o.z < 5) {
            o.lane += (state.lane - o.lane) * (5 + magnetRangeSkill) * delta;
        }
    }

    if (inLane && inZ && !o.collected) {
      if (o.type === "COIN") {
        o.collected = true;
        if (!isDemo) {
            state.coins += 1;
            state.score += 5; 
            store.fireballs += 1;
            audioManager.playCoin();
        }
      } else if (!isDemo) {
        let hit = false;
        if (o.type === "COLUMN") hit = true;
        if (o.type === "HURDLE" && state.y < 1.0) hit = true;
        if (o.type === "ARCH" && !state.isSliding) hit = true;

        if (hit) doHit();
      }
    }

    if (o.z > 5) {
      world.obstacles.splice(i, 1);
    }
  }

  // 4. Spawn
  let furthestZ = 10;
  for (const o of world.obstacles) {
    if (o.z < furthestZ) furthestZ = o.z;
  }
  
  if (furthestZ > -100) {
    spawnRow(furthestZ - 30);
  }
}
