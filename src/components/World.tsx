import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { world, state, updateWorld, LANE_WIDTH } from "../game";
import * as THREE from "three";
import { FlamingCoin } from "./FlamingCoin";
import { Float } from "@react-three/drei";

const stoneTexUrl = import.meta.env.BASE_URL + 'textures/stone_diffuse.png';

const MAX_OBSTACLES = 60;

// Solstice Theme Colors
const STONE_COLOR = "#121215";
const EMISSIVE_COLOR = "#ff5500";
const ABYSS_COLOR = "#050100";

export function World() {
  const obsGroup = useRef<THREE.Group>(null);
  const decorGroup = useRef<THREE.Group>(null);
  const sunGateRef = useRef<THREE.Group>(null);

  const [stoneTex, setStoneTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    new THREE.TextureLoader().load(stoneTexUrl, (tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 2);
      setStoneTex(tex);
    });
  }, []);

  useFrame((_, delta) => {
    // Cap delta
    const safeDelta = Math.min(delta, 0.1);
    updateWorld(safeDelta);

    // Rotate Sun Gate slightly
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
        const model = child.children.find((c) => c.name === o.type) as THREE.Group;
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
        if (decorGroup.current.position.z >= 20) {
          decorGroup.current.position.z %= 20;
        }
      }
    }
  });

  return (
    <group>
      {/* Sun Gate Background */}
      <group position={[0, 40, -300]}>
         {/* Inner Bright Core */}
         <mesh>
             <sphereGeometry args={[20, 32, 32]} />
             <meshBasicMaterial color="#ffffff" />
         </mesh>
         <mesh>
             <sphereGeometry args={[25, 32, 32]} />
             <meshBasicMaterial color="#ffcc00" transparent opacity={0.5} />
         </mesh>
         {/* The Rotating Runic Ring */}
         <group ref={sunGateRef}>
            <mesh>
                <torusGeometry args={[50, 4, 16, 64]} />
                <meshStandardMaterial color={STONE_COLOR} map={stoneTex} roughness={0.9} />
            </mesh>
            {/* Inner glowing ring */}
            <mesh>
                <torusGeometry args={[48, 1, 16, 64]} />
                <meshStandardMaterial color="#fff" emissive={EMISSIVE_COLOR} emissiveIntensity={5} />
            </mesh>
            {/* Runes/Spikes on the ring */}
            {Array.from({length: 12}).map((_, i) => (
                <mesh key={i} position={[Math.cos(i * Math.PI/6) * 55, Math.sin(i * Math.PI/6) * 55, 0]} rotation={[0, 0, i * Math.PI/6]}>
                    <coneGeometry args={[4, 10, 4]} />
                    <meshStandardMaterial color={STONE_COLOR} map={stoneTex} roughness={0.9} />
                </mesh>
            ))}
         </group>
         {/* Light Pillar going up */}
         <mesh position={[0, 100, 0]}>
             <cylinderGeometry args={[2, 2, 200, 16]} />
             <meshBasicMaterial color="#ffaa00" transparent opacity={0.7} />
         </mesh>
      </group>

      {/* Floating Debris in the Sky */}
      {Array.from({ length: 20 }).map((_, i) => (
         <Float key={i} speed={2} rotationIntensity={1} floatIntensity={2} position={[(Math.random() - 0.5) * 150, 30 + Math.random() * 50, -100 - Math.random() * 200]}>
            <mesh rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}>
                <dodecahedronGeometry args={[2 + Math.random() * 5]} />
                <meshStandardMaterial color={STONE_COLOR} map={stoneTex} roughness={1.0} />
            </mesh>
         </Float>
      ))}

      {/* Dynamic Obstacle Object Pool */}
      <group ref={obsGroup}>
        {Array.from({ length: MAX_OBSTACLES }).map((_, i) => (
          <group key={i} visible={false}>
            {/* COLUMN: Ancient Stone Block */}
            <group name="COLUMN" visible={false}>
                <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
                  <boxGeometry args={[1.5, 3.0, 1.5]} />
                  <meshStandardMaterial color={STONE_COLOR} map={stoneTex} roughness={0.9} />
                </mesh>
                <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
                  <boxGeometry args={[1.51, 0.5, 1.51]} />
                  <meshStandardMaterial color="#fff" emissive={EMISSIVE_COLOR} emissiveIntensity={2} />
                </mesh>
            </group>

            {/* HURDLE: Fallen Stone / Trap */}
            <group name="HURDLE" visible={false}>
                <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
                    <boxGeometry args={[2.5, 1.0, 0.8]} />
                    <meshStandardMaterial color={STONE_COLOR} map={stoneTex} roughness={0.9} />
                </mesh>
                <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
                    <boxGeometry args={[2.51, 0.2, 0.81]} />
                    <meshStandardMaterial color="#fff" emissive={EMISSIVE_COLOR} emissiveIntensity={2} />
                </mesh>
            </group>

            {/* ARCH: Ruins Gate */}
            <group name="ARCH" visible={false}>
                <mesh position={[-1.3, 2.0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.6, 4.0, 0.6]} />
                    <meshStandardMaterial color={STONE_COLOR} map={stoneTex} roughness={0.9} />
                </mesh>
                <mesh position={[1.3, 2.0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.6, 4.0, 0.6]} />
                    <meshStandardMaterial color={STONE_COLOR} map={stoneTex} roughness={0.9} />
                </mesh>
                <mesh position={[0, 4.0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[3.2, 0.6, 0.6]} />
                    <meshStandardMaterial color={STONE_COLOR} map={stoneTex} roughness={0.9} />
                </mesh>
                {/* Glowing accents */}
                <mesh position={[0, 4.0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[1.0, 0.61, 0.61]} />
                    <meshStandardMaterial color="#fff" emissive={EMISSIVE_COLOR} emissiveIntensity={2} />
                </mesh>
            </group>

            {/* FLAMING STAR COIN */}
            <group name="COIN" visible={false}>
               <FlamingCoin />
            </group>
          </group>
        ))}
      </group>

      {/* Main Floor Track (Stone Bridge) */}
      <mesh position={[0, -0.1, -150]} receiveShadow>
        <boxGeometry args={[LANE_WIDTH * 3, 0.2, 400]} />
        <meshStandardMaterial color={STONE_COLOR} map={stoneTex} roughness={0.8} />
      </mesh>
      {/* Glowing path lines */}
      <mesh position={[0, 0.01, -150]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[0.2, 400]} />
        <meshStandardMaterial color="#fff" emissive={EMISSIVE_COLOR} emissiveIntensity={1} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-LANE_WIDTH, 0.01, -150]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[0.1, 400]} />
        <meshStandardMaterial color="#fff" emissive={EMISSIVE_COLOR} emissiveIntensity={1} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[LANE_WIDTH, 0.01, -150]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[0.1, 400]} />
        <meshStandardMaterial color="#fff" emissive={EMISSIVE_COLOR} emissiveIntensity={1} side={THREE.DoubleSide} />
      </mesh>

      {/* Abyss ground below the track */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -20, -100]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color={ABYSS_COLOR} roughness={1.0} />
      </mesh>

      {/* Endless Side Decorations (Giant Pillars & Fire Bowls) */}
      <group ref={decorGroup}>
        {Array.from({ length: 20 }).map((_, i) => (
            <group key={i} position={[0, 0, -i * 20]}>
              {/* LEFT PILLAR */}
              <group position={[-LANE_WIDTH * 1.5 - 1.5, 0, 0]}>
                 <mesh position={[0, 5, 0]} castShadow receiveShadow>
                    <boxGeometry args={[2, 10, 2]} />
                    <meshStandardMaterial color={STONE_COLOR} map={stoneTex} roughness={0.9} />
                 </mesh>
                 {/* Glowing Base */}
                 <mesh position={[0, 1, 0]} castShadow receiveShadow>
                    <boxGeometry args={[2.2, 2, 2.2]} />
                    <meshStandardMaterial color={STONE_COLOR} map={stoneTex} roughness={0.9} />
                 </mesh>
                 <mesh position={[0, 1, 0]} castShadow receiveShadow>
                    <boxGeometry args={[2.25, 0.5, 2.25]} />
                    <meshStandardMaterial color="#fff" emissive={EMISSIVE_COLOR} emissiveIntensity={2} />
                 </mesh>
                 {/* Banner */}
                 <mesh position={[1.1, 6, 0]} castShadow receiveShadow>
                    <planeGeometry args={[1.5, 4]} />
                    <meshStandardMaterial color="#111" side={THREE.DoubleSide} roughness={0.9} />
                 </mesh>
                 <mesh position={[1.11, 6, 0]} castShadow receiveShadow>
                    <ringGeometry args={[0.2, 0.3, 16]} />
                    <meshStandardMaterial color="#fff" emissive={EMISSIVE_COLOR} emissiveIntensity={2} side={THREE.DoubleSide} />
                 </mesh>
              </group>

              {/* RIGHT PILLAR */}
              <group position={[LANE_WIDTH * 1.5 + 1.5, 0, 0]}>
                 <mesh position={[0, 5, 0]} castShadow receiveShadow>
                    <boxGeometry args={[2, 10, 2]} />
                    <meshStandardMaterial color={STONE_COLOR} map={stoneTex} roughness={0.9} />
                 </mesh>
                 {/* Glowing Base */}
                 <mesh position={[0, 1, 0]} castShadow receiveShadow>
                    <boxGeometry args={[2.2, 2, 2.2]} />
                    <meshStandardMaterial color={STONE_COLOR} map={stoneTex} roughness={0.9} />
                 </mesh>
                 <mesh position={[0, 1, 0]} castShadow receiveShadow>
                    <boxGeometry args={[2.25, 0.5, 2.25]} />
                    <meshStandardMaterial color="#fff" emissive={EMISSIVE_COLOR} emissiveIntensity={2} />
                 </mesh>
                 {/* Banner */}
                 <mesh position={[-1.1, 6, 0]} castShadow receiveShadow>
                    <planeGeometry args={[1.5, 4]} />
                    <meshStandardMaterial color="#111" side={THREE.DoubleSide} roughness={0.9} />
                 </mesh>
                 <mesh position={[-1.11, 6, 0]} castShadow receiveShadow>
                    <ringGeometry args={[0.2, 0.3, 16]} />
                    <meshStandardMaterial color="#fff" emissive={EMISSIVE_COLOR} emissiveIntensity={2} side={THREE.DoubleSide} />
                 </mesh>
              </group>
            </group>
        ))}
      </group>
    </group>
  );
}
