import { useRef, useState, useEffect, Fragment } from "react";
import { useFrame } from "@react-three/fiber";
import { world, state, updateWorld, getActiveMap } from "../game";
import { store, useGameStore } from "../store";
import * as THREE from "three";
import { FlamingCoin } from "./FlamingCoin";
import { Float } from "@react-three/drei";
import { DynamicObject } from "./DynamicObject";

const stoneTexUrl = import.meta.env.BASE_URL + 'textures/stone_diffuse.png';

const MAX_OBSTACLES = 60;

// Solstice Theme Colors
const SOLSTICE_STONE = "#121215";
const SOLSTICE_EMISSIVE = "#ff5500";
const SOLSTICE_ABYSS = "#050100";

export function World() {
  const storeState = useGameStore();
  const LANE_WIDTH = storeState.globalSettings.laneWidth;
  
  const obsGroup = useRef<THREE.Group>(null);
  const decorGroup = useRef<THREE.Group>(null);
  const sunGateRef = useRef<THREE.Group>(null);
  
  const [activeMap, setActiveMap] = useState(getActiveMap());
  const [stoneTex, setStoneTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    new THREE.TextureLoader().load(stoneTexUrl, (tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 2);
      setStoneTex(tex);
    });
  }, []);

  // Map settings
  const isDefault = activeMap === "m1";
  const isSolstice = activeMap === "m2";
  const isGraveyard = activeMap === "m3";
  const cMap = store.customMaps.find(m => m.id === activeMap) as any;
  const isCustomMap = activeMap.startsWith("gen-m-") && cMap;

  // Colors for Default / Graveyard
  const floorColor = isGraveyard ? "#1a1a25" : "#8c6b3e";
  const groundColor = isGraveyard ? "#050105" : "#0a120a";
  const propColor = isGraveyard ? "#304050" : "#5b6c5d";
  const wallColor = isGraveyard ? "#151525" : "#303b32";
  const leafColor = isGraveyard ? "#050510" : "#1a2f1c";
  const trunkColor = isGraveyard ? "#101015" : "#2d1f14";

  useFrame((_, delta) => {
    const currentActive = getActiveMap();
    if (activeMap !== currentActive) {
        setActiveMap(currentActive);
    }

    const safeDelta = Math.min(delta, 0.1);
    updateWorld(safeDelta);

    if (sunGateRef.current) {
        sunGateRef.current.rotation.z -= safeDelta * 0.05;
    }

    if (obsGroup.current) {
      obsGroup.current.children.forEach((c) => (c.visible = false));

      world.obstacles.forEach((o, i) => {
        if (o.collected) return;
        if (i >= obsGroup.current!.children.length) return;

        const child = obsGroup.current!.children[i] as THREE.Group;
        child.visible = true;
        child.position.set(o.lane * LANE_WIDTH, 0, o.z);

        child.children.forEach((c) => (c.visible = false));
        const modelName = o.type === "COIN" ? "COIN" : `${o.type}_${activeMap}`;
        let model = child.getObjectByName(modelName) as THREE.Group;
        if (model && model.children.length === 0) {
            model = undefined as any;
        }
        if (!model && o.type !== "COIN") {
            model = child.getObjectByName(`${o.type}_m1`) as THREE.Group;
        }
        
        if (model) {
          model.visible = true;
          if (o.type === "COIN") {
            model.position.y = 1.0 + Math.sin(state.distance * 0.1 + o.z) * 0.2;
            model.rotation.y += safeDelta * 3;
          }
        }
      });
    }

    if (state.status !== "GAMEOVER") {
      const currentSpeed = state.status !== "PLAYING" ? 30 : state.speed;
      if (decorGroup.current) {
        decorGroup.current.position.z += currentSpeed * safeDelta;
        
        const loopDist = isSolstice ? 20 : 15;
        if (decorGroup.current.position.z >= loopDist) {
          decorGroup.current.position.z %= loopDist;
        }
      }
    }
  });

  return (
    <group>
      {/* Solstice ONLY: Sun Gate Background */}
      {isSolstice && (
          <group position={[0, 40, -300]}>
             <mesh>
                 <sphereGeometry args={[20, 32, 32]} />
                 <meshBasicMaterial color="#ffffff" />
             </mesh>
             <mesh>
                 <sphereGeometry args={[25, 32, 32]} />
                 <meshBasicMaterial color="#ffcc00" transparent opacity={0.5} />
             </mesh>
             <group ref={sunGateRef}>
                <mesh>
                    <torusGeometry args={[50, 4, 16, 64]} />
                    <meshStandardMaterial color={SOLSTICE_STONE} map={stoneTex} roughness={0.9} />
                </mesh>
                <mesh>
                    <torusGeometry args={[48, 1, 16, 64]} />
                    <meshStandardMaterial color="#fff" emissive={SOLSTICE_EMISSIVE} emissiveIntensity={5} />
                </mesh>
                {Array.from({length: 12}).map((_, i) => (
                    <mesh key={i} position={[Math.cos(i * Math.PI/6) * 55, Math.sin(i * Math.PI/6) * 55, 0]} rotation={[0, 0, i * Math.PI/6]}>
                        <coneGeometry args={[4, 10, 4]} />
                        <meshStandardMaterial color={SOLSTICE_STONE} map={stoneTex} roughness={0.9} />
                    </mesh>
                ))}
             </group>
             <mesh position={[0, 100, 0]}>
                 <cylinderGeometry args={[2, 2, 200, 16]} />
                 <meshBasicMaterial color="#ffaa00" transparent opacity={0.7} />
             </mesh>
          </group>
      )}

      {/* Solstice ONLY: Floating Debris in the Sky */}
      {isSolstice && Array.from({ length: 20 }).map((_, i) => (
         <Float key={`float-${i}`} speed={2} rotationIntensity={1} floatIntensity={2} position={[(Math.random() - 0.5) * 150, 30 + Math.random() * 50, -100 - Math.random() * 200]}>
            <mesh rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}>
                <dodecahedronGeometry args={[2 + Math.random() * 5]} />
                <meshStandardMaterial color={SOLSTICE_STONE} map={stoneTex} roughness={1.0} />
            </mesh>
         </Float>
      ))}

      {/* Custom Map Floating Sky Debris */}
      {isCustomMap && cMap.skyDecorations && Array.from({ length: 15 }).map((_, i) => (
         <Float key={`sky-decor-${i}`} speed={2} rotationIntensity={1} floatIntensity={2} position={[(Math.random() - 0.5) * 150, 30 + Math.random() * 50, -100 - Math.random() * 200]}>
            <DynamicObject parts={cMap.skyDecorations} />
         </Float>
      ))}

      {/* Default Map ONLY: Hot Air Balloons */}
      {isDefault && (
          <>
              <group position={[40, 40, -150]}>
                <mesh position={[0, 5, 0]} castShadow>
                  <sphereGeometry args={[8, 32, 32]} />
                  <meshStandardMaterial color="#d4b483" roughness={0.8} />
                </mesh>
                <mesh position={[0, -4, 0]} castShadow>
                  <cylinderGeometry args={[1.5, 1, 3]} />
                  <meshStandardMaterial color="#4a2e1b" roughness={1} />
                </mesh>
              </group>
              <group position={[-50, 60, -200]}>
                <mesh position={[0, 7, 0]} castShadow>
                  <sphereGeometry args={[12, 32, 32]} />
                  <meshStandardMaterial color="#c06c57" roughness={0.8} />
                </mesh>
                <mesh position={[0, -4, 0]} castShadow>
                  <cylinderGeometry args={[2, 1.5, 4]} />
                  <meshStandardMaterial color="#4a2e1b" roughness={1} />
                </mesh>
              </group>
          </>
      )}

      {/* Dynamic Obstacle Object Pool */}
      <group ref={obsGroup}>
        {Array.from({ length: MAX_OBSTACLES }).map((_, i) => (
          <group key={`obs-${i}`} visible={false}>
            {/* COLUMN m1 (Default) */}
            <group name="COLUMN_m1" visible={false}>
                <mesh position={[0, 2, 0]} castShadow receiveShadow>
                  <boxGeometry args={[1.5, 3.8, 1.5]} />
                  <meshStandardMaterial color={propColor} roughness={0.9} />
                </mesh>
                <mesh position={[0, 4.0, 0]} castShadow receiveShadow>
                  <boxGeometry args={[1.8, 0.4, 1.8]} />
                  <meshStandardMaterial color={wallColor} roughness={1.0} />
                </mesh>
                <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
                  <boxGeometry args={[1.8, 0.4, 1.8]} />
                  <meshStandardMaterial color={wallColor} roughness={1.0} />
                </mesh>
            </group>

            {/* COLUMN m2 (Solstice) */}
            <group name="COLUMN_m2" visible={false}>
                <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
                  <boxGeometry args={[1.5, 3.0, 1.5]} />
                  <meshStandardMaterial color={SOLSTICE_STONE} map={stoneTex} roughness={0.9} />
                </mesh>
                <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
                  <boxGeometry args={[1.51, 0.5, 1.51]} />
                  <meshStandardMaterial color="#fff" emissive={SOLSTICE_EMISSIVE} emissiveIntensity={2} />
                </mesh>
            </group>

            {/* COLUMN m3 (Graveyard) */}
            <group name="COLUMN_m3" visible={false}>
                <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
                  <boxGeometry args={[1.5, 3.0, 0.4]} />
                  <meshStandardMaterial color={propColor} roughness={0.9} />
                </mesh>
                <mesh position={[0, 3.2, 0]} castShadow receiveShadow>
                  <cylinderGeometry args={[0.75, 0.75, 0.4, 16]} rotation={[Math.PI / 2, 0, 0]} />
                  <meshStandardMaterial color={propColor} roughness={0.9} />
                </mesh>
            </group>

            {/* HURDLE m1 (Default) */}
            <group name="HURDLE_m1" visible={false}>
                <mesh position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
                  <cylinderGeometry args={[0.5, 0.5, 2.5, 12]} />
                  <meshStandardMaterial color={trunkColor} roughness={1.0} />
                </mesh>
                <mesh position={[0.8, 0.8, 0]} rotation={[0, 0, Math.PI / 4]} castShadow receiveShadow>
                  <cylinderGeometry args={[0.15, 0.15, 0.7, 6]} />
                  <meshStandardMaterial color={trunkColor} roughness={1.0} />
                </mesh>
            </group>

            {/* HURDLE m2 (Solstice) */}
            <group name="HURDLE_m2" visible={false}>
                <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
                    <boxGeometry args={[2.5, 1.0, 0.8]} />
                    <meshStandardMaterial color={SOLSTICE_STONE} map={stoneTex} roughness={0.9} />
                </mesh>
                <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
                    <boxGeometry args={[2.51, 0.2, 0.81]} />
                    <meshStandardMaterial color="#fff" emissive={SOLSTICE_EMISSIVE} emissiveIntensity={2} />
                </mesh>
            </group>

            {/* HURDLE m3 (Graveyard) */}
            <group name="HURDLE_m3" visible={false}>
                <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
                  <boxGeometry args={[2.5, 1.0, 0.8]} />
                  <meshStandardMaterial color={trunkColor} roughness={1.0} />
                </mesh>
                <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
                  <boxGeometry args={[2.4, 0.1, 0.7]} />
                  <meshStandardMaterial color={wallColor} roughness={1.0} />
                </mesh>
            </group>

            {/* ARCH m1 (Default) */}
            <group name="ARCH_m1" visible={false}>
                <mesh position={[-1.3, 1.5, 0]} castShadow receiveShadow>
                  <boxGeometry args={[0.8, 3, 0.8]} />
                  <meshStandardMaterial color={propColor} roughness={0.9} />
                </mesh>
                <mesh position={[1.3, 1.5, 0]} castShadow receiveShadow>
                  <boxGeometry args={[0.8, 3, 0.8]} />
                  <meshStandardMaterial color={propColor} roughness={0.9} />
                </mesh>
                <mesh position={[0, 3.4, 0]} castShadow receiveShadow>
                  <boxGeometry args={[3.6, 0.8, 1.0]} />
                  <meshStandardMaterial color={wallColor} roughness={0.9} />
                </mesh>
            </group>

            {/* ARCH m2 (Solstice) */}
            <group name="ARCH_m2" visible={false}>
                <mesh position={[-1.3, 2.0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.6, 4.0, 0.6]} />
                    <meshStandardMaterial color={SOLSTICE_STONE} map={stoneTex} roughness={0.9} />
                </mesh>
                <mesh position={[1.3, 2.0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.6, 4.0, 0.6]} />
                    <meshStandardMaterial color={SOLSTICE_STONE} map={stoneTex} roughness={0.9} />
                </mesh>
                <mesh position={[0, 4.0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[3.2, 0.6, 0.6]} />
                    <meshStandardMaterial color={SOLSTICE_STONE} map={stoneTex} roughness={0.9} />
                </mesh>
                <mesh position={[0, 4.0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[1.0, 0.61, 0.61]} />
                    <meshStandardMaterial color="#fff" emissive={SOLSTICE_EMISSIVE} emissiveIntensity={2} />
                </mesh>
            </group>

            {/* ARCH m3 (Graveyard) */}
            <group name="ARCH_m3" visible={false}>
                <mesh position={[-1.3, 2.0, 0]} castShadow receiveShadow>
                  <cylinderGeometry args={[0.1, 0.1, 4.0, 8]} />
                  <meshStandardMaterial color="#0a0a0a" metalness={0.8} />
                </mesh>
                <mesh position={[1.3, 2.0, 0]} castShadow receiveShadow>
                  <cylinderGeometry args={[0.1, 0.1, 4.0, 8]} />
                  <meshStandardMaterial color="#0a0a0a" metalness={0.8} />
                </mesh>
                <mesh position={[0, 3.2, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
                  <cylinderGeometry args={[0.08, 0.08, 3.0, 8]} />
                  <meshStandardMaterial color="#0a0a0a" metalness={0.8} />
                </mesh>
                {/* Bats or spikes on top */}
                <mesh position={[-1.3, 4.2, 0]} castShadow receiveShadow>
                  <coneGeometry args={[0.15, 0.5, 4]} />
                  <meshStandardMaterial color="#050505" />
                </mesh>
                <mesh position={[1.3, 4.2, 0]} castShadow receiveShadow>
                  <coneGeometry args={[0.15, 0.5, 4]} />
                  <meshStandardMaterial color="#050505" />
                </mesh>
            </group>

            {/* COIN (Solstice Flaming Coin for all maps as requested by user) */}
            <group name="COIN" visible={false}>
               <FlamingCoin />
            </group>


          </group>
        ))}
      </group>

      {/* Main Floor Track */}
      <group visible={isSolstice}>
          <mesh position={[0, -0.1, -150]} receiveShadow>
            <boxGeometry args={[LANE_WIDTH * 3, 0.2, 400]} />
            <meshStandardMaterial color={SOLSTICE_STONE} map={stoneTex} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.01, -150]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[0.2, 400]} />
            <meshStandardMaterial color="#fff" emissive={SOLSTICE_EMISSIVE} emissiveIntensity={1} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[-LANE_WIDTH, 0.01, -150]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[0.1, 400]} />
            <meshStandardMaterial color="#fff" emissive={SOLSTICE_EMISSIVE} emissiveIntensity={1} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[LANE_WIDTH, 0.01, -150]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[0.1, 400]} />
            <meshStandardMaterial color="#fff" emissive={SOLSTICE_EMISSIVE} emissiveIntensity={1} side={THREE.DoubleSide} />
          </mesh>
      </group>
      <group visible={!isSolstice}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, -100]} receiveShadow>
            <planeGeometry args={[LANE_WIDTH * 3, 300]} />
            <meshStandardMaterial color={floorColor} roughness={1.0} />
          </mesh>
      </group>

      {/* Ground Background */}
      <group visible={isSolstice}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -20, -100]} receiveShadow>
            <planeGeometry args={[500, 500]} />
            <meshStandardMaterial color={SOLSTICE_ABYSS} roughness={1.0} />
          </mesh>
      </group>
      <group visible={!isSolstice}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -10, -100]} receiveShadow>
            <planeGeometry args={[500, 500]} />
            <meshStandardMaterial color={groundColor} roughness={1.0} />
          </mesh>
      </group>

      {/* Endless Side Decorations */}
      <group ref={decorGroup}>
        {Array.from({ length: 16 }).map((_, i) => (
            <group key={`decor-${i}`} position={[0, 0, isSolstice ? -i * 20 : -i * 15]}>
              {/* LEFT SIDE */}
              <group position={[-LANE_WIDTH * 1.5 - 1.5, 0, 0]}>
                 <group visible={!!(isCustomMap && cMap?.decorations)}>
                     <DynamicObject parts={cMap?.decorations || []} />
                 </group>
                 <group visible={isSolstice}>
                     <mesh position={[0, 5, 0]} castShadow receiveShadow>
                        <boxGeometry args={[2, 10, 2]} />
                        <meshStandardMaterial color={SOLSTICE_STONE} map={stoneTex} roughness={0.9} />
                     </mesh>
                     <mesh position={[0, 1, 0]} castShadow receiveShadow>
                        <boxGeometry args={[2.25, 0.5, 2.25]} />
                        <meshStandardMaterial color="#fff" emissive={SOLSTICE_EMISSIVE} emissiveIntensity={2} />
                     </mesh>
                 </group>
                 <group visible={isGraveyard}>
                    <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
                      <boxGeometry args={[0.2, 3, 15]} />
                      <meshStandardMaterial color="#222" metalness={0.7} />
                    </mesh>
                    <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
                      <cylinderGeometry args={[0.1, 0.1, 4]} rotation={[0, 0, Math.PI / 8]} />
                      <meshStandardMaterial color="#111" metalness={0.9} />
                    </mesh>
                    <mesh position={[-3, 8, 0]} castShadow receiveShadow>
                      <coneGeometry args={[1.5, 16, 4]} />
                      <meshStandardMaterial color="#0a0a0a" roughness={1.0} />
                    </mesh>
                    <mesh position={[-4, 12, 0]} castShadow receiveShadow rotation={[0, 0, -0.4]}>
                      <cylinderGeometry args={[0.2, 0.8, 10, 4]} />
                      <meshStandardMaterial color="#0a0a0a" roughness={1.0} />
                    </mesh>
                 </group>
                 <group visible={isDefault}>
                    <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
                      <boxGeometry args={[1.5, 3, 15]} />
                      <meshStandardMaterial color={wallColor} roughness={0.9} />
                    </mesh>
                    <mesh position={[-3, 15, 0]} castShadow receiveShadow>
                      <cylinderGeometry args={[2.5, 3.5, 40, 8]} />
                      <meshStandardMaterial color={trunkColor} roughness={1.0} />
                    </mesh>
                    <mesh position={[-2, 35, 0]} castShadow receiveShadow>
                      <dodecahedronGeometry args={[14, 1]} />
                      <meshStandardMaterial color={leafColor} roughness={1.0} />
                    </mesh>
                 </group>
              </group>

              {/* RIGHT SIDE */}
              <group position={[LANE_WIDTH * 1.5 + 1.5, 0, 0]}>
                 <group visible={!!(isCustomMap && cMap?.decorations)}>
                     <DynamicObject parts={cMap?.decorations || []} />
                 </group>
                 <group visible={isSolstice}>
                     <mesh position={[0, 5, 0]} castShadow receiveShadow>
                        <boxGeometry args={[2, 10, 2]} />
                        <meshStandardMaterial color={SOLSTICE_STONE} map={stoneTex} roughness={0.9} />
                     </mesh>
                     <mesh position={[0, 1, 0]} castShadow receiveShadow>
                        <boxGeometry args={[2.25, 0.5, 2.25]} />
                        <meshStandardMaterial color="#fff" emissive={SOLSTICE_EMISSIVE} emissiveIntensity={2} />
                     </mesh>
                 </group>
                 <group visible={isGraveyard}>
                    <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
                      <boxGeometry args={[0.2, 3, 15]} />
                      <meshStandardMaterial color="#222" metalness={0.7} />
                    </mesh>
                    <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
                      <cylinderGeometry args={[0.1, 0.1, 4]} rotation={[0, 0, -Math.PI / 8]} />
                      <meshStandardMaterial color="#111" metalness={0.9} />
                    </mesh>
                    <mesh position={[3, 8, 0]} castShadow receiveShadow>
                      <coneGeometry args={[1.5, 16, 4]} />
                      <meshStandardMaterial color="#0a0a0a" roughness={1.0} />
                    </mesh>
                    <mesh position={[4, 12, 0]} castShadow receiveShadow rotation={[0, 0, 0.4]}>
                      <cylinderGeometry args={[0.2, 0.8, 10, 4]} />
                      <meshStandardMaterial color="#0a0a0a" roughness={1.0} />
                    </mesh>
                 </group>
                 <group visible={isDefault}>
                    <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
                      <boxGeometry args={[1.5, 3, 15]} />
                      <meshStandardMaterial color={wallColor} roughness={0.9} />
                    </mesh>
                    <mesh position={[3, 15, 0]} castShadow receiveShadow>
                      <cylinderGeometry args={[2.5, 3.5, 40, 8]} />
                      <meshStandardMaterial color={trunkColor} roughness={1.0} />
                    </mesh>
                    <mesh position={[2, 35, 0]} castShadow receiveShadow>
                      <dodecahedronGeometry args={[14, 1]} />
                      <meshStandardMaterial color={leafColor} roughness={1.0} />
                    </mesh>
                 </group>
              </group>
            </group>
        ))}
      </group>
    </group>
  );
}
