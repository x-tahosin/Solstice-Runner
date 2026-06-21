import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { world, state, updateWorld, LANE_WIDTH, getActiveMap } from "../game";
import * as THREE from "three";
import { Float, Sparkles } from "@react-three/drei";
import { useGameStore } from "../store";

const MAX_OBSTACLES = 60;
const ARCH_Y = 2.0;

export function World() {
  const store = useGameStore();
  const obsGroup = useRef<THREE.Group>(null);
  const decorGroup = useRef<THREE.Group>(null);
  const floorRef = useRef<THREE.Mesh>(null);

  const sunRef = useRef<THREE.Group>(null);

  const [activeMap, setActiveMap] = useState(getActiveMap());

  // Map settings
  const isNeon = activeMap === "m3";
  const isMidnight = activeMap === "m2";
  const isGraveyard = activeMap === "m4";

  const floorColor = isNeon
    ? "#0f0f20"
    : isGraveyard
      ? "#1a1a25"
      : isMidnight
        ? "#353a55"
        : "#8c6b3e";
  const groundColor = isNeon
    ? "#000000"
    : isGraveyard
      ? "#050105"
      : isMidnight
        ? "#0a0b18"
        : "#0a120a";
  const propColor = isNeon
    ? "#ff00ff"
    : isGraveyard
      ? "#304050"
      : isMidnight
        ? "#304050"
        : "#5b6c5d";
  const wallColor = isNeon
    ? "#220044"
    : isGraveyard
      ? "#151525"
      : isMidnight
        ? "#151525"
        : "#303b32";
  const leafColor = isNeon
    ? "#00ffff"
    : isGraveyard
      ? "#050510"
      : isMidnight
        ? "#051510"
        : "#1a2f1c";
  const trunkColor = isNeon
    ? "#110022"
    : isGraveyard
      ? "#101015"
      : isMidnight
        ? "#101015"
        : "#2d1f14";
  const floorWireframe = isNeon;

  useFrame((_, delta) => {
    // Check map changes mid-game
    const currentActive = getActiveMap();
    if (activeMap !== currentActive) {
        setActiveMap(currentActive);
    }
    // Cap delta to prevent mega-jumps if the tab is backgrounded
    const safeDelta = Math.min(delta, 0.1);
    updateWorld(safeDelta);

    // Rotate the sun rays gently
    if (sunRef.current) {
      sunRef.current.rotation.z -= safeDelta * 0.1;
    }

    // Sync visual obstacle meshes with the internal game logic state
    if (obsGroup.current) {
      obsGroup.current.children.forEach((c) => (c.visible = false));

      world.obstacles.forEach((o, i) => {
        if (o.collected) return; // Hide collected coins
        if (i >= obsGroup.current!.children.length) return;

        const child = obsGroup.current!.children[i] as THREE.Group;
        child.visible = true;
        child.position.set(o.lane * LANE_WIDTH, 0, o.z);

        // Hide all inner models first
        child.children.forEach((c) => (c.visible = false));

        // Find and show specific obstacle model
        const model = child.children.find(
          (c) => c.name === o.type,
        ) as THREE.Group;
        if (model) {
          model.visible = true;
          if (o.type === "COIN") {
            model.position.y = 1.0 + Math.sin(state.distance * 0.1 + o.z) * 0.2; // Hover effect
            model.rotation.y += safeDelta * 3; // Spin
          }
        }
      });
    }

    // Scroll floor texture and side decorations
    if (state.status !== "GAMEOVER") {
      const currentSpeed = state.status !== "PLAYING" ? 30 : state.speed;
      if (decorGroup.current) {
        decorGroup.current.rotation.z = 0; // reset twist

        decorGroup.current.position.z += currentSpeed * safeDelta;
        // Loop decorations seamlessly
        if (decorGroup.current.position.z >= 15) {
          decorGroup.current.position.z %= 15;
        }
      }

      if (floorRef.current) {
        // Untwist the floor
        floorRef.current.rotation.y = 0;
      }
    } else if (state.status === "GAMEOVER") {
      // Stop scrolling decor
    }
  });

  return (
    <group>
      {/* Dynamic Obstacle Object Pool */}
      <group ref={obsGroup}>
        {Array.from({ length: MAX_OBSTACLES }).map((_, i) => (
          <group key={i} visible={false}>
            {/* COLUMN: Ancient Stone Pillar */}
            <group name="COLUMN" visible={false}>
              {isGraveyard ? (
                <>
                  <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
                    <boxGeometry args={[1.5, 3.0, 0.4]} />
                    <meshStandardMaterial color={propColor} roughness={0.9} />
                  </mesh>
                  <mesh position={[0, 3.2, 0]} castShadow receiveShadow>
                    <cylinderGeometry
                      args={[0.75, 0.75, 0.4, 16]}
                      rotation={[Math.PI / 2, 0, 0]}
                    />
                    <meshStandardMaterial color={propColor} roughness={0.9} />
                  </mesh>
                </>
              ) : (
                <>
                  <mesh position={[0, 2, 0]} castShadow receiveShadow>
                    <boxGeometry args={[1.5, 3.8, 1.5]} />
                    <meshStandardMaterial
                      color={propColor}
                      roughness={0.9}
                      wireframe={isNeon}
                    />
                  </mesh>
                  <mesh position={[0, 4.0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[1.8, 0.4, 1.8]} />
                    <meshStandardMaterial
                      color={wallColor}
                      roughness={1.0}
                      wireframe={isNeon}
                    />
                  </mesh>
                  <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
                    <boxGeometry args={[1.8, 0.4, 1.8]} />
                    <meshStandardMaterial
                      color={wallColor}
                      roughness={1.0}
                      wireframe={isNeon}
                    />
                  </mesh>
                </>
              )}
            </group>

            {/* HURDLE: Fallen Tree Log */}
            <group name="HURDLE" visible={false}>
              {isGraveyard ? (
                <>
                  <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
                    <boxGeometry args={[2.5, 1.0, 0.8]} />
                    <meshStandardMaterial color={trunkColor} roughness={1.0} />
                  </mesh>
                  <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
                    <boxGeometry args={[2.4, 0.1, 0.7]} />
                    <meshStandardMaterial color={wallColor} roughness={1.0} />
                  </mesh>
                </>
              ) : (
                <>
                  <mesh
                    position={[0, 0.5, 0]}
                    rotation={[0, 0, Math.PI / 2]}
                    castShadow
                    receiveShadow
                  >
                    <cylinderGeometry args={[0.5, 0.5, 2.5, 12]} />
                    <meshStandardMaterial
                      color={trunkColor}
                      roughness={1.0}
                      wireframe={isNeon}
                    />
                  </mesh>
                  <mesh
                    position={[0.8, 0.8, 0]}
                    rotation={[0, 0, Math.PI / 4]}
                    castShadow
                    receiveShadow
                  >
                    <cylinderGeometry args={[0.15, 0.15, 0.7, 6]} />
                    <meshStandardMaterial
                      color={trunkColor}
                      roughness={1.0}
                      wireframe={isNeon}
                    />
                  </mesh>
                </>
              )}
            </group>

            {/* ARCH: Ruins Gate */}
            <group name="ARCH" visible={false}>
              {isGraveyard ? (
                <>
                  <mesh position={[-1.3, 2.0, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.1, 0.1, 4.0, 8]} />
                    <meshStandardMaterial color="#0a0a0a" metalness={0.8} />
                  </mesh>
                  <mesh position={[1.3, 2.0, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.1, 0.1, 4.0, 8]} />
                    <meshStandardMaterial color="#0a0a0a" metalness={0.8} />
                  </mesh>
                  <mesh
                    position={[0, 3.2, 0]}
                    rotation={[0, 0, Math.PI / 2]}
                    castShadow
                    receiveShadow
                  >
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
                </>
              ) : (
                <>
                  <mesh position={[-1.3, 1.5, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.8, 3, 0.8]} />
                    <meshStandardMaterial
                      color={propColor}
                      roughness={0.9}
                      wireframe={isNeon}
                    />
                  </mesh>
                  <mesh position={[1.3, 1.5, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.8, 3, 0.8]} />
                    <meshStandardMaterial
                      color={propColor}
                      roughness={0.9}
                      wireframe={isNeon}
                    />
                  </mesh>
                  <mesh position={[0, 3.4, 0]} castShadow receiveShadow>
                    <boxGeometry args={[3.6, 0.8, 1.0]} />
                    <meshStandardMaterial
                      color={wallColor}
                      roughness={0.9}
                      wireframe={isNeon}
                    />
                  </mesh>
                </>
              )}
            </group>

            {/* FIREBALL: Floating Energy (Replaces COIN) */}
            <group name="COIN" visible={false}>
              {/* Inner bright core */}
              <mesh
                castShadow
                receiveShadow
                position={[0, Math.sin(Math.random() * Math.PI) * 0.2, 0]}
              >
                <icosahedronGeometry args={[0.3, 1]} />
                <meshStandardMaterial
                  color="#ffffff"
                  emissive="#f97316"
                  emissiveIntensity={2.0}
                  roughness={0.1}
                />
              </mesh>
              {/* Middle orange glow */}
              <mesh position={[0, Math.sin(Math.random() * Math.PI) * 0.2, 0]}>
                <icosahedronGeometry args={[0.45, 0]} />
                <meshBasicMaterial
                  color="#ea580c"
                  transparent
                  opacity={0.6}
                  wireframe
                />
              </mesh>
            </group>
          </group>
        ))}
      </group>

      {/* Main Floor Track */}
      <mesh
        ref={floorRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.1, -100]}
        receiveShadow
      >
        <planeGeometry args={[LANE_WIDTH * 3, 300]} />
        <meshStandardMaterial
          color={floorColor}
          roughness={1.0}
          wireframe={floorWireframe}
        />
      </mesh>

      {/* Deep forest ground below the track */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -10, -100]}
        receiveShadow
      >
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial
          color={groundColor}
          roughness={1.0}
          wireframe={floorWireframe}
        />
      </mesh>

      {/* Distant atmospheric details (Hot Air Balloons in the sky) */}
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

      {/* Endless Side Decorations (Giant Redwoods & Ancient Stone Walls) */}
      <group ref={decorGroup}>
        {Array.from({ length: 16 }).map((_, i) => {
          return (
            <group key={i} position={[0, 0, -i * 15]}>
              {/* Left Side: Ancient Trees & Stone Wall */}
              <group position={[-LANE_WIDTH * 1.5 - 1.5, 0, 0]}>
                {isGraveyard ? (
                  <>
                    <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
                      <boxGeometry args={[0.2, 3, 15]} />
                      <meshStandardMaterial color="#222" metalness={0.7} />
                    </mesh>
                    <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
                      <cylinderGeometry
                        args={[0.1, 0.1, 4]}
                        rotation={[0, 0, Math.PI / 8]}
                      />
                      <meshStandardMaterial color="#111" metalness={0.9} />
                    </mesh>
                    <mesh position={[-3, 8, 0]} castShadow receiveShadow>
                      <coneGeometry args={[1.5, 16, 4]} />
                      <meshStandardMaterial color="#0a0a0a" roughness={1.0} />
                    </mesh>
                    <mesh
                      position={[-4, 12, 0]}
                      castShadow
                      receiveShadow
                      rotation={[0, 0, -0.4]}
                    >
                      <cylinderGeometry args={[0.2, 0.8, 10, 4]} />
                      <meshStandardMaterial color="#0a0a0a" roughness={1.0} />
                    </mesh>
                  </>
                ) : (
                  <>
                    <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
                      <boxGeometry args={[1.5, 3, 15]} />
                      <meshStandardMaterial
                        color={wallColor}
                        roughness={0.9}
                        wireframe={isNeon}
                      />
                    </mesh>
                    <mesh position={[-3, 15, 0]} castShadow receiveShadow>
                      <cylinderGeometry args={[2.5, 3.5, 40, 8]} />
                      <meshStandardMaterial
                        color={trunkColor}
                        roughness={1.0}
                        wireframe={isNeon}
                      />
                    </mesh>
                    <mesh position={[-2, 35, 0]} castShadow receiveShadow>
                      <dodecahedronGeometry args={[14, 1]} />
                      <meshStandardMaterial
                        color={leafColor}
                        roughness={1.0}
                        wireframe={isNeon}
                      />
                    </mesh>
                  </>
                )}
              </group>

              {/* Right Side: Ancient Trees & Stone Wall */}
              <group position={[LANE_WIDTH * 1.5 + 1.5, 0, 0]}>
                {isGraveyard ? (
                  <>
                    <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
                      <boxGeometry args={[0.2, 3, 15]} />
                      <meshStandardMaterial color="#222" metalness={0.7} />
                    </mesh>
                    <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
                      <cylinderGeometry
                        args={[0.1, 0.1, 4]}
                        rotation={[0, 0, -Math.PI / 8]}
                      />
                      <meshStandardMaterial color="#111" metalness={0.9} />
                    </mesh>
                    <mesh position={[3, 8, 0]} castShadow receiveShadow>
                      <coneGeometry args={[1.5, 16, 4]} />
                      <meshStandardMaterial color="#0a0a0a" roughness={1.0} />
                    </mesh>
                    <mesh
                      position={[4, 12, 0]}
                      castShadow
                      receiveShadow
                      rotation={[0, 0, 0.4]}
                    >
                      <cylinderGeometry args={[0.2, 0.8, 10, 4]} />
                      <meshStandardMaterial color="#0a0a0a" roughness={1.0} />
                    </mesh>
                  </>
                ) : (
                  <>
                    <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
                      <boxGeometry args={[1.5, 3, 15]} />
                      <meshStandardMaterial
                        color={wallColor}
                        roughness={0.9}
                        wireframe={isNeon}
                      />
                    </mesh>
                    <mesh position={[3, 15, 0]} castShadow receiveShadow>
                      <cylinderGeometry args={[2.5, 3.5, 40, 8]} />
                      <meshStandardMaterial
                        color={trunkColor}
                        roughness={1.0}
                        wireframe={isNeon}
                      />
                    </mesh>
                    <mesh position={[2, 35, 0]} castShadow receiveShadow>
                      <dodecahedronGeometry args={[14, 1]} />
                      <meshStandardMaterial
                        color={leafColor}
                        roughness={1.0}
                        wireframe={isNeon}
                      />
                    </mesh>
                  </>
                )}
              </group>
            </group>
          );
        })}
      </group>
    </group>
  );
}
