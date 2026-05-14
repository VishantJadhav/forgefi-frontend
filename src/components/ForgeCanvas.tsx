import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// 1. The 3D Object (The Code-Built Anvil)
export default function BrutalistIron() {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHover] = useState(false);

  // Slowly rotate the entire anvil group every frame
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  // Shared dark metal material for all parts
  const ironMaterial = (
    <meshStandardMaterial 
      color={hovered ? "#222222" : "#111111"} 
      metalness={0.9} 
      roughness={0.3} 
    />
  );

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <group 
        ref={groupRef}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
        scale={hovered ? 1.05 : 1}
      >
        {/* 1. The Base (Wide and flat) */}
        <mesh position={[0, -0.8, 0]}>
          <boxGeometry args={[1.5, 0.4, 1]} />
          {ironMaterial}
        </mesh>

        {/* 2. The Waist (Narrower middle block) */}
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.9, 0.8, 0.7]} />
          {ironMaterial}
        </mesh>

        {/* 3. The Top Face (The heavy striking surface) */}
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[1.8, 0.4, 0.9]} />
          {ironMaterial}
        </mesh>

        {/* 4. The Horn (The pointed cone on the right side) */}
        <mesh position={[1.3, 0.3, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.45, 1, 16]} />
          {ironMaterial}
        </mesh>

        {/* 5. The Heel (The squared off back part) */}
        <mesh position={[-1.1, 0.3, 0]}>
          <boxGeometry args={[0.4, 0.4, 0.9]} />
          {ironMaterial}
        </mesh>
      </group>
    </Float>
  );
}