import { useState, useEffect } from "react";

export const BASE_ITEMS = {
  chars: [
    {
      id: "c1",
      name: "The Runner",
      cost: 0,
      color: "#f97316",
      desc: "Standard Journey",
    },
    {
      id: "c2",
      name: "Void Walker",
      cost: 100,
      color: "#a855f7",
      desc: "Double Jump Ability",
    },
    {
      id: "c3",
      name: "Golden Sun",
      cost: 500,
      color: "#fbbf24",
      desc: "Auto Magnetizing",
    },
    {
      id: "c4",
      name: "Spooky Ghost",
      cost: 600,
      color: "#ffffff",
      desc: "Floating Spectre",
    },
    {
      id: "c5",
      name: "Mecha Bot",
      cost: 1000,
      color: "#3b82f6",
      desc: "Blocky Robot",
    },
  ],
  maps: [
    { id: "m2", name: "Solstice", cost: 0, desc: "The Longest Day" },
    { id: "m1", name: "Greenwood", cost: 0, desc: "Forest Trail" },
    { id: "m3", name: "Graveyard", cost: 100, desc: "Haunted Vampire Lair" },
    { id: "m4", name: "Multi Map", cost: 100, desc: "Shifts reality every 150m" },
  ],
  skills: [
    {
      id: "s1",
      name: "Magnet Range",
      baseCost: 50,
      maxLevel: 5,
      desc: "Increases coin magnet pull radius",
    },
    {
      id: "s2",
      name: "Starting Speed",
      baseCost: 100,
      maxLevel: 3,
      desc: "Start the run at a higher velocity",
    },
    {
      id: "s3",
      name: "Coin Magnet",
      baseCost: 150,
      maxLevel: 1,
      desc: "Unlock magnet for ALL characters",
    },
  ],
};

export const ITEMS = {
  get chars() {
    return [...BASE_ITEMS.chars, ...store.customChars];
  },
  get maps() {
    return [...BASE_ITEMS.maps, ...store.customMaps];
  },
  get skills() {
    return [...BASE_ITEMS.skills, ...store.customSkills];
  }
};

const emit = () => {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("store-update"));
};

export function useGameStore() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const forceUpdate = () => setTick((t) => t + 1);
    window.addEventListener("store-update", forceUpdate);
    return () => window.removeEventListener("store-update", forceUpdate);
  }, []);
  return store;
}

export const store = {
  globalSettings: {
    speedModifier: 1.0,
    gravity: 80,
    jumpVelocity: 15,
    laneWidth: 2.5,
    cameraY: 4,
    cameraZ: 8,
    fov: 60,
    coinSpawnRate: 0.2,
    obstacleSpawnRate: 0.4
  },
  applySettingsPatch(patch: any) {
    Object.assign(this.globalSettings, patch);
    emit();
  },

  get genaiKey() {
    return localStorage.getItem("genaiKey") || "";
  },
  set genaiKey(v) {
    localStorage.setItem("genaiKey", v);
    emit();
  },

  get customChars(): any[] {
    return JSON.parse(localStorage.getItem("customChars") || "[]");
  },
  addCustomChar(char: any) {
    localStorage.setItem("customChars", JSON.stringify([...this.customChars, char]));
    emit();
  },

  get customMaps(): any[] {
    return JSON.parse(localStorage.getItem("customMaps") || "[]");
  },
  addCustomMap(map: any) {
    localStorage.setItem("customMaps", JSON.stringify([...this.customMaps, map]));
    emit();
  },

  get customSkills(): any[] {
    return JSON.parse(localStorage.getItem("customSkills") || "[]");
  },
  addCustomSkill(skill: any) {
    localStorage.setItem("customSkills", JSON.stringify([...this.customSkills, skill]));
    emit();
  },

  get fireballs() {
    return parseInt(localStorage.getItem("fireballs") || "0");
  },
  set fireballs(v) {
    localStorage.setItem("fireballs", v.toString());
  },

  get highscore() {
    return parseInt(localStorage.getItem("highscore") || "0");
  },
  set highscore(v) {
    localStorage.setItem("highscore", v.toString());
  },

  get unlockedChars(): string[] {
    return JSON.parse(localStorage.getItem("unlockedChars") || '["c1"]');
  },
  unlockChar(id: string) {
    localStorage.setItem(
      "unlockedChars",
      JSON.stringify([...this.unlockedChars, id]),
    );
    emit();
  },

  get unlockedMaps(): string[] {
    return JSON.parse(localStorage.getItem("unlockedMaps") || '["m1", "m2"]');
  },
  unlockMap(id: string) {
    localStorage.setItem(
      "unlockedMaps",
      JSON.stringify([...this.unlockedMaps, id]),
    );
    emit();
  },

  get selChar() {
    return localStorage.getItem("selChar") || "c1";
  },
  set selChar(v) {
    localStorage.setItem("selChar", v);
    emit();
  },

  get selMap() {
    return localStorage.getItem("selMap") || "m2";
  },
  set selMap(v) {
    localStorage.setItem("selMap", v);
    emit();
  },

  getSkillLevel(id: string): number {
    const skills = JSON.parse(localStorage.getItem("skillsLvl") || "{}");
    return skills[id] || 0;
  },
  upgradeSkill(id: string) {
    const skills = JSON.parse(localStorage.getItem("skillsLvl") || "{}");
    skills[id] = (skills[id] || 0) + 1;
    localStorage.setItem("skillsLvl", JSON.stringify(skills));
    emit();
  },
};
