import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { state, LANE_WIDTH } from "../game";
import { useGameStore, ITEMS } from "../store";
import * as THREE from "three";

export function Player() {
  const groupRef = useRef<THREE.Group>(null);
  const store = useGameStore();

  // Limbs for animation
  const torsoRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLowerLegRef = useRef<THREE.Group>(null);
  const rightLowerLegRef = useRef<THREE.Group>(null);
  const leftLowerArmRef = useRef<THREE.Group>(null);
  const rightLowerArmRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;

    // Position player main group
    groupRef.current.position.set(state.lane * LANE_WIDTH, state.y, 0);

    const isPlaying = state.status !== "GAMEOVER";
    const isAirborne = state.y > 0.1;

    let legSwing = 0;

    if (isPlaying) {
      legSwing = Math.sin(state.distance * 1.5);
    }

    if (isAirborne && !state.isSliding) {
      // Jump pose
      if (leftLegRef.current) leftLegRef.current.rotation.x = -0.6;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0.3;
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0.6;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.6;
      if (torsoRef.current) {
        torsoRef.current.rotation.x = 0.2;
        torsoRef.current.position.y = 1.6;
      }
    } else if (state.isSliding) {
      // Slide pose: low profile
      if (leftLegRef.current) leftLegRef.current.rotation.x = -1.57;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -1.57;
      if (leftArmRef.current) leftArmRef.current.rotation.x = 3.14;
      if (rightArmRef.current) rightArmRef.current.rotation.x = 3.14;
      if (torsoRef.current) {
        torsoRef.current.rotation.x = -1.57;
        torsoRef.current.position.y = 0.4;
        // slide wobble
        if (isPlaying) {
          torsoRef.current.position.y += Math.sin(state.distance * 5) * 0.05;
        }
      }
      if (headRef.current) headRef.current.rotation.x = 1.0;
    } else {
      // Running pose
      if (torsoRef.current) {
        torsoRef.current.rotation.x = 0.2; // lean forward slightly
        torsoRef.current.position.y =
          1.4 + Math.abs(Math.sin(state.distance * 3)) * 0.15;
        torsoRef.current.rotation.y = Math.sin(state.distance * 1.5) * 0.1;
      }

      if (headRef.current) {
        headRef.current.rotation.x = -0.1; // look straight forward
      }

      if (leftLegRef.current) leftLegRef.current.rotation.x = legSwing * 1.2;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -legSwing * 1.2;

      if (leftLowerLegRef.current)
        leftLowerLegRef.current.rotation.x = legSwing < 0 ? -legSwing * 1.5 : 0;
      if (rightLowerLegRef.current)
        rightLowerLegRef.current.rotation.x = legSwing > 0 ? legSwing * 1.5 : 0;

      if (leftArmRef.current) leftArmRef.current.rotation.x = -legSwing * 1.2;
      if (rightArmRef.current) rightArmRef.current.rotation.x = legSwing * 1.2;

      // Permanent slight elbow bend
      if (leftLowerArmRef.current) leftLowerArmRef.current.rotation.x = -0.5;
      if (rightLowerArmRef.current) rightLowerArmRef.current.rotation.x = -0.5;

      // Bend knees slightly based on swing (prevent feet going through floor)
      if (leftLegRef.current)
        leftLegRef.current.position.y =
          -0.05 + Math.abs(Math.sin(state.distance * 1.5)) * 0.1;
      if (rightLegRef.current)
        rightLegRef.current.position.y =
          -0.05 + Math.abs(Math.cos(state.distance * 1.5)) * 0.1;
    }
  });

  const charDef =
    ITEMS.chars.find((c) => c.id === store.selChar) || ITEMS.chars[0];
  const charId = store.selChar;

  // Reusable Materials (Dynamic)
  const isVoid = charId === "c2";
  const isGold = charId === "c3";
  const isGhost = charId === "c4";
  const isMecha = charId === "c5";

  const getSkinColor = () => {
    switch (charId) {
      case "c1": return "#ffb085"; // A more human/vibrant tone
      case "c2": return "#8000ff"; // Void
      case "c3": return "#ffea00"; // Gold
      case "c4": return "#e2e8f0"; // Ghostly
      case "c5": return "#94a3b8"; // Mecha metallic
      default: return charId.startsWith("gen-c") ? charDef.color : "#c58c66";
    }
  };

  const getShirtColor = () => {
    if (isGhost) return "#ffffff";
    if (isMecha) return "#3b82f6";
    return charId.startsWith("gen-c") ? "#222222" : charDef.color; // Dark shirt for custom color bodies
  };

  const skinMat = (
    <meshStandardMaterial
      color={getSkinColor()}
      roughness={isMecha ? 0.3 : 0.6}
      metalness={isVoid ? 0.8 : isGold ? 0.9 : isMecha ? 0.8 : 0.1}
      transparent={isGhost}
      opacity={isGhost ? 0.7 : 1}
    />
  );
  const shirtMat = (
    <meshStandardMaterial
      color={getShirtColor()}
      roughness={isMecha ? 0.3 : 0.9}
      metalness={isGold ? 0.5 : isMecha ? 0.8 : 0.0}
      emissive={isVoid ? "#9333ea" : isGhost ? "#ffffff" : "#000"}
      emissiveIntensity={isVoid ? 0.5 : isGhost ? 0.2 : 0}
      transparent={isGhost}
      opacity={isGhost ? 0.7 : 1}
    />
  );
  const pantMat = (
    <meshStandardMaterial
      color={isVoid ? "#0f0f0f" : isGhost ? "#f1f5f9" : isMecha ? "#1e293b" : "#4a3a2a"}
      roughness={isMecha ? 0.4 : 0.9}
      metalness={isMecha ? 0.7 : 0.1}
      transparent={isGhost}
      opacity={isGhost ? 0.5 : 1}
    />
  );
  const shoeMat = (
    <meshStandardMaterial
      color={isVoid ? "#1e1b4b" : isMecha ? "#0f172a" : isGhost ? "#cbd5e1" : "#2e1f12"}
      roughness={isMecha ? 0.2 : 0.8}
      metalness={isMecha ? 0.8 : 0.1}
      transparent={isGhost}
      opacity={isGhost ? 0.4 : 1}
    />
  );
  const hatMat = (
    <meshStandardMaterial
      color={isGold ? "#fcd34d" : isVoid ? "#110022" : isGhost ? "#e2e8f0" : isMecha ? "#2563eb" : "#302013"}
      roughness={isGold ? 0.2 : isMecha ? 0.3 : 1.0}
      metalness={isGold ? 0.8 : isMecha ? 0.8 : 0}
      transparent={isGhost}
      opacity={isGhost ? 0.6 : 1}
    />
  );
  const beltMat = <meshStandardMaterial color="#221100" roughness={0.8} />;
  const backpackMat = (
    <meshStandardMaterial color={isVoid ? "#000" : "#554433"} roughness={1.0} />
  );
  const buckleMat = <meshStandardMaterial color="#ef4444" roughness={0.8} />; // Red scarf/bandana

  const adventurer = (
    <group ref={torsoRef} position={[0, 1.4, 0]}>
      <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
        <capsuleGeometry args={[0.25, 0.5, 4, 16]} />
        {shirtMat}
      </mesh>
      <mesh castShadow receiveShadow position={[0, -0.45, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.1, 16]} />
        {beltMat}
      </mesh>
      <mesh castShadow receiveShadow position={[0, -0.15, -0.2]}>
        <boxGeometry args={[0.4, 0.5, 0.2]} />
        {backpackMat}
      </mesh>
      <mesh
        castShadow
        receiveShadow
        position={[0, 0.15, -0.22]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.12, 0.12, 0.45, 12]} />
        <meshStandardMaterial color="#475569" roughness={0.9} />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        position={[0, 0.1, 0.05]}
        rotation={[0.2, 0, 0]}
      >
        <torusGeometry args={[0.15, 0.05, 8, 16]} />
        {buckleMat}
      </mesh>
      <mesh
        castShadow
        receiveShadow
        position={[0, 0.0, -0.15]}
        rotation={[-0.4, 0, 0]}
      >
        <planeGeometry args={[0.15, 0.25]} />
        <meshStandardMaterial
          color="#ef4444"
          roughness={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      <group ref={headRef} position={[0, 0.4, 0]}>
        <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.2, 16]} />
          {skinMat}
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.05, 0]}>
          <sphereGeometry args={[0.22, 32, 32]} />
          {skinMat}
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 0.04, 32]} />
          {hatMat}
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.2, 0.22, 0.2, 32]} />
          {hatMat}
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.15, -0.1]}>
          <sphereGeometry
            args={[0.23, 32, 32, 0, Math.PI * 2, 0, Math.PI / 1.8]}
          />
          <meshStandardMaterial color="#451a03" roughness={0.9} />
        </mesh>
        <mesh position={[-0.08, 0.08, 0.2]}>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshBasicMaterial color="black" />
        </mesh>
        <mesh position={[0.08, 0.08, 0.2]}>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshBasicMaterial color="black" />
        </mesh>
      </group>

      <group ref={leftArmRef} position={[-0.35, 0.0, 0]}>
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
          <sphereGeometry args={[0.13, 16, 16]} />
          {shirtMat}
        </mesh>
        <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
          <capsuleGeometry args={[0.1, 0.25, 4, 16]} />
          {shirtMat}
        </mesh>
        <group ref={leftLowerArmRef} position={[0, -0.4, 0]}>
          <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
            <capsuleGeometry args={[0.08, 0.3, 4, 16]} />
            {skinMat}
          </mesh>
          <mesh castShadow receiveShadow position={[0, -0.4, 0]}>
            <sphereGeometry args={[0.09, 16, 16]} />
            {skinMat}
          </mesh>
        </group>
      </group>

      <group ref={rightArmRef} position={[0.35, 0.0, 0]}>
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
          <sphereGeometry args={[0.13, 16, 16]} />
          {shirtMat}
        </mesh>
        <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
          <capsuleGeometry args={[0.1, 0.25, 4, 16]} />
          {shirtMat}
        </mesh>
        <group ref={rightLowerArmRef} position={[0, -0.4, 0]}>
          <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
            <capsuleGeometry args={[0.08, 0.3, 4, 16]} />
            {skinMat}
          </mesh>
          <mesh castShadow receiveShadow position={[0, -0.4, 0]}>
            <sphereGeometry args={[0.09, 16, 16]} />
            {skinMat}
          </mesh>
        </group>
      </group>

      <group position={[0, -0.65, 0]}>
        <mesh
          castShadow
          receiveShadow
          position={[0, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <capsuleGeometry args={[0.2, 0.2, 4, 16]} />
          {pantMat}
        </mesh>

        <group ref={leftLegRef} position={[-0.18, -0.05, 0]}>
          <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
            <capsuleGeometry args={[0.12, 0.3, 4, 16]} />
            {pantMat}
          </mesh>
          <group ref={leftLowerLegRef} position={[0, -0.45, 0]}>
            <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
              <capsuleGeometry args={[0.1, 0.3, 4, 16]} />
              {skinMat}
            </mesh>
            <mesh
              castShadow
              receiveShadow
              position={[0, -0.45, 0.08]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <capsuleGeometry args={[0.11, 0.18, 4, 16]} />
              {shoeMat}
            </mesh>
          </group>
        </group>

        <group ref={rightLegRef} position={[0.18, -0.05, 0]}>
          <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
            <capsuleGeometry args={[0.12, 0.3, 4, 16]} />
            {pantMat}
          </mesh>
          <group ref={rightLowerLegRef} position={[0, -0.45, 0]}>
            <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
              <capsuleGeometry args={[0.1, 0.3, 4, 16]} />
              {skinMat}
            </mesh>
            <mesh
              castShadow
              receiveShadow
              position={[0, -0.45, 0.08]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <capsuleGeometry args={[0.11, 0.18, 4, 16]} />
              {shoeMat}
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );

  const ghost = (
    <group ref={torsoRef} position={[0, 1.4, 0]}>
      {/* Main Ghost Sheet */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <capsuleGeometry args={[0.4, 0.6, 16, 32]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>
      {/* Ragged bottom */}
      <mesh castShadow receiveShadow position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.4, 0.5, 0.4, 16, 1, false]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Head/Face area */}
      <group ref={headRef} position={[0, 0.4, 0]}>
        {/* Hollow glowing eyes */}
        <mesh position={[-0.15, 0, 0.35]}>
          <capsuleGeometry args={[0.04, 0.08, 8, 8]} />
          <meshStandardMaterial
            color="#a855f7"
            emissive="#a855f7"
            emissiveIntensity={2}
          />
        </mesh>
        <mesh position={[0.15, 0, 0.35]}>
          <capsuleGeometry args={[0.04, 0.08, 8, 8]} />
          <meshStandardMaterial
            color="#a855f7"
            emissive="#a855f7"
            emissiveIntensity={2}
          />
        </mesh>
      </group>

      {/* Ghostly arms (using arm refs so they swing) */}
      <group ref={leftArmRef} position={[-0.45, 0.0, 0]} rotation={[0, 0, 0.5]}>
        <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
          <capsuleGeometry args={[0.1, 0.4, 8, 8]} />
          <meshStandardMaterial
            color="#ffffff"
            roughness={0.5}
            transparent
            opacity={0.8}
          />
        </mesh>
      </group>
      <group
        ref={rightArmRef}
        position={[0.45, 0.0, 0]}
        rotation={[0, 0, -0.5]}
      >
        <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
          <capsuleGeometry args={[0.1, 0.4, 8, 8]} />
          <meshStandardMaterial
            color="#ffffff"
            roughness={0.5}
            transparent
            opacity={0.8}
          />
        </mesh>
      </group>
    </group>
  );

  const robot = (
    <group ref={torsoRef} position={[0, 1.4, 0]}>
      {/* Boxy Torso */}
      <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
        <boxGeometry args={[0.6, 0.7, 0.4]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Core light */}
      <mesh position={[0, -0.2, 0.21]}>
        <circleGeometry args={[0.15, 16]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={2}
        />
      </mesh>

      <group ref={headRef} position={[0, 0.4, 0]}>
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[0.45, 0.45, 0.45]} />
          <meshStandardMaterial
            color="#f59e0b"
            metalness={0.8}
            roughness={0.3}
          />
        </mesh>
        {/* Antennas */}
        <mesh position={[-0.25, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.1]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.8} />
        </mesh>
        <mesh position={[0.25, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.1]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.8} />
        </mesh>
        {/* Visor */}
        <mesh position={[0, 0.05, 0.23]}>
          <planeGeometry args={[0.3, 0.15]} />
          <meshStandardMaterial
            color="#22c55e"
            emissive="#22c55e"
            emissiveIntensity={1.5}
          />
        </mesh>
      </group>

      <group ref={leftArmRef} position={[-0.4, 0.0, 0]}>
        <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
          <boxGeometry args={[0.15, 0.4, 0.15]} />
          <meshStandardMaterial color="#d97706" metalness={0.7} />
        </mesh>
        <group ref={leftLowerArmRef} position={[0, -0.4, 0]}>
          <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
            <boxGeometry args={[0.12, 0.35, 0.12]} />
            <meshStandardMaterial color="#9ca3af" metalness={0.8} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, -0.45, 0]}>
            <boxGeometry args={[0.18, 0.18, 0.18]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
        </group>
      </group>

      <group ref={rightArmRef} position={[0.4, 0.0, 0]}>
        <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
          <boxGeometry args={[0.15, 0.4, 0.15]} />
          <meshStandardMaterial color="#d97706" metalness={0.7} />
        </mesh>
        <group ref={rightLowerArmRef} position={[0, -0.4, 0]}>
          <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
            <boxGeometry args={[0.12, 0.35, 0.12]} />
            <meshStandardMaterial color="#9ca3af" metalness={0.8} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, -0.45, 0]}>
            <boxGeometry args={[0.18, 0.18, 0.18]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
        </group>
      </group>

      <group position={[0, -0.55, 0]}>
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[0.4, 0.2, 0.2]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>

        <group ref={leftLegRef} position={[-0.15, -0.1, 0]}>
          <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
            <boxGeometry args={[0.15, 0.4, 0.15]} />
            <meshStandardMaterial color="#d97706" metalness={0.7} />
          </mesh>
          <group ref={leftLowerLegRef} position={[0, -0.4, 0]}>
            <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
              <boxGeometry args={[0.12, 0.35, 0.12]} />
              <meshStandardMaterial color="#9ca3af" metalness={0.8} />
            </mesh>
            <mesh castShadow receiveShadow position={[0, -0.45, 0.05]}>
              <boxGeometry args={[0.2, 0.15, 0.25]} />
              <meshStandardMaterial color="#1f2937" />
            </mesh>
          </group>
        </group>

        <group ref={rightLegRef} position={[0.15, -0.1, 0]}>
          <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
            <boxGeometry args={[0.15, 0.4, 0.15]} />
            <meshStandardMaterial color="#d97706" metalness={0.7} />
          </mesh>
          <group ref={rightLowerLegRef} position={[0, -0.4, 0]}>
            <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
              <boxGeometry args={[0.12, 0.35, 0.12]} />
              <meshStandardMaterial color="#9ca3af" metalness={0.8} />
            </mesh>
            <mesh castShadow receiveShadow position={[0, -0.45, 0.05]}>
              <boxGeometry args={[0.2, 0.15, 0.25]} />
              <meshStandardMaterial color="#1f2937" />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );

  const voidwalker = (
    <group ref={torsoRef} position={[0, 1.4, 0]}>
      {/* Floating Dark Core */}
      <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color="#3b0764" emissive="#9333ea" emissiveIntensity={1} roughness={0.1} metalness={0.9} />
      </mesh>
      
      {/* Head */}
      <group ref={headRef} position={[0, 0.35, 0]}>
        <mesh castShadow receiveShadow>
          <icosahedronGeometry args={[0.2, 1]} />
          <meshStandardMaterial color="#000000" emissive="#581c87" emissiveIntensity={0.5} roughness={0.2} metalness={1} />
        </mesh>
        {/* glowing eye slit */}
        <mesh position={[0, 0.05, 0.18]}>
          <boxGeometry args={[0.2, 0.05, 0.05]} />
          <meshStandardMaterial color="#d8b4fe" emissive="#d8b4fe" emissiveIntensity={2} />
        </mesh>
      </group>

      {/* Floating shards (arms) */}
      <group ref={leftArmRef} position={[-0.4, -0.1, 0]}>
        <mesh castShadow receiveShadow position={[0, -0.1, 0]} rotation={[0, 0, Math.PI / 4]}>
          <octahedronGeometry args={[0.15, 0]} />
          <meshStandardMaterial color="#581c87" emissive="#9333ea" emissiveIntensity={0.5} metalness={0.8} />
        </mesh>
        <group ref={leftLowerArmRef} position={[0, -0.3, 0]}>
          <mesh castShadow receiveShadow>
            <coneGeometry args={[0.08, 0.3, 4]} />
            <meshStandardMaterial color="#3b0764" metalness={1} />
          </mesh>
        </group>
      </group>
      
      <group ref={rightArmRef} position={[0.4, -0.1, 0]}>
        <mesh castShadow receiveShadow position={[0, -0.1, 0]} rotation={[0, 0, -Math.PI / 4]}>
          <octahedronGeometry args={[0.15, 0]} />
          <meshStandardMaterial color="#581c87" emissive="#9333ea" emissiveIntensity={0.5} metalness={0.8} />
        </mesh>
        <group ref={rightLowerArmRef} position={[0, -0.3, 0]}>
          <mesh castShadow receiveShadow>
            <coneGeometry args={[0.08, 0.3, 4]} />
            <meshStandardMaterial color="#3b0764" metalness={1} />
          </mesh>
        </group>
      </group>

      {/* Hovering legs */}
      <group position={[0, -0.6, 0]}>
        <group ref={leftLegRef} position={[-0.15, 0, 0]}>
          <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.08, 0.02, 0.4, 4]} />
            <meshStandardMaterial color="#1e1b4b" metalness={0.8} roughness={0.4} />
          </mesh>
          <group ref={leftLowerLegRef} position={[0, -0.4, 0]}>
            <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
              <boxGeometry args={[0.06, 0.3, 0.06]} />
              <meshStandardMaterial color="#000000" metalness={1} />
            </mesh>
          </group>
        </group>
        <group ref={rightLegRef} position={[0.15, 0, 0]}>
          <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.08, 0.02, 0.4, 4]} />
            <meshStandardMaterial color="#1e1b4b" metalness={0.8} roughness={0.4} />
          </mesh>
          <group ref={rightLowerLegRef} position={[0, -0.4, 0]}>
            <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
              <boxGeometry args={[0.06, 0.3, 0.06]} />
              <meshStandardMaterial color="#000000" metalness={1} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );

  const goldensun = (
    <group ref={torsoRef} position={[0, 1.4, 0]}>
      {/* Sun Torso */}
      <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color="#fcd34d" emissive="#d97706" emissiveIntensity={0.5} roughness={0.2} metalness={0.8} />
      </mesh>
      {/* glowing inner core/decor */}
      <mesh position={[0, -0.2, 0.25]}>
        <torusGeometry args={[0.15, 0.03, 16, 32]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={1} />
      </mesh>

      <group ref={headRef} position={[0, 0.35, 0]}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.22, 32, 32]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Sun rays (crown) */}
        {[...Array(6)].map((_, i) => (
          <mesh key={i} position={[Math.sin(i * Math.PI / 3) * 0.25, 0.1, Math.cos(i * Math.PI / 3) * 0.25]} rotation={[0, -i * Math.PI/3, Math.PI/4]}>
             <coneGeometry args={[0.05, 0.2, 4]} />
             <meshStandardMaterial color="#fef08a" emissive="#fbbf24" emissiveIntensity={1} />
          </mesh>
        ))}
        {/* Eyes */}
        <mesh position={[-0.08, 0.05, 0.2]}>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshStandardMaterial color="#000" emissive="#ea580c" emissiveIntensity={1} />
        </mesh>
        <mesh position={[0.08, 0.05, 0.2]}>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshStandardMaterial color="#000" emissive="#ea580c" emissiveIntensity={1} />
        </mesh>
      </group>

      <group ref={leftArmRef} position={[-0.35, -0.1, 0]}>
        <mesh castShadow receiveShadow position={[0, -0.15, 0]}>
          <capsuleGeometry args={[0.08, 0.25, 4, 16]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.7} />
        </mesh>
        <group ref={leftLowerArmRef} position={[0, -0.4, 0]}>
          <mesh castShadow receiveShadow position={[0, -0.15, 0]}>
            <capsuleGeometry args={[0.06, 0.25, 4, 16]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.9} />
          </mesh>
        </group>
      </group>

      <group ref={rightArmRef} position={[0.35, -0.1, 0]}>
        <mesh castShadow receiveShadow position={[0, -0.15, 0]}>
          <capsuleGeometry args={[0.08, 0.25, 4, 16]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.7} />
        </mesh>
        <group ref={rightLowerArmRef} position={[0, -0.4, 0]}>
          <mesh castShadow receiveShadow position={[0, -0.15, 0]}>
            <capsuleGeometry args={[0.06, 0.25, 4, 16]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.9} />
          </mesh>
        </group>
      </group>

      <group position={[0, -0.6, 0]}>
        <group ref={leftLegRef} position={[-0.15, -0.05, 0]}>
          <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
            <capsuleGeometry args={[0.1, 0.25, 4, 16]} />
            <meshStandardMaterial color="#b45309" metalness={0.5} />
          </mesh>
          <group ref={leftLowerLegRef} position={[0, -0.4, 0]}>
            <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
              <capsuleGeometry args={[0.08, 0.25, 4, 16]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.8} />
            </mesh>
            <mesh castShadow receiveShadow position={[0, -0.4, 0.05]}>
              <sphereGeometry args={[0.12, 16, 16]} />
              <meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={0.5} />
            </mesh>
          </group>
        </group>

        <group ref={rightLegRef} position={[0.15, -0.05, 0]}>
          <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
            <capsuleGeometry args={[0.1, 0.25, 4, 16]} />
            <meshStandardMaterial color="#b45309" metalness={0.5} />
          </mesh>
          <group ref={rightLowerLegRef} position={[0, -0.4, 0]}>
            <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
              <capsuleGeometry args={[0.08, 0.25, 4, 16]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.8} />
            </mesh>
            <mesh castShadow receiveShadow position={[0, -0.4, 0.05]}>
              <sphereGeometry args={[0.12, 16, 16]} />
              <meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={0.5} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );

  return (
    <group ref={groupRef}>
      <group rotation={[0, Math.PI, 0]}>
        {charId === "c5" ? robot : charId === "c4" ? ghost : charId === "c3" ? goldensun : charId === "c2" ? voidwalker : adventurer}
      </group>
    </group>
  );
}
