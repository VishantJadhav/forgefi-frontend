import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, ContactShadows, useGLTF, PresentationControls } from '@react-three/drei';
import * as THREE from 'three';

// Define the prop we will pass from your dashboard
interface ForgeProps {
  isStaked: boolean;
}

// 1. The Real 3D Model Component
function RealIronBlock({ isStaked }: ForgeProps) {
  const { scene } = useGLTF('/anvil.glb');
  const anvilRef = useRef<THREE.Group>(null);

  // The Physics Engine (Runs 60fps)
  useFrame((state, delta) => {
    if (anvilRef.current) {
      if (!isStaked) {
        // UNSTAKED: Slow, buttery spin and reset to normal height
        anvilRef.current.rotation.y += delta * 0.1;
        anvilRef.current.position.y = THREE.MathUtils.lerp(anvilRef.current.position.y, -1, 0.05);
      } else {
        // STAKED: Stop spinning and slam down violently
        // A lerp factor of 0.3 makes it crash down fast but retain a feeling of massive weight
        anvilRef.current.position.y = THREE.MathUtils.lerp(anvilRef.current.position.y, -2.2, 0.3);
      }
    }
  });

  // Fix transparency glitches
  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.material.transparent = false;
        child.material.depthWrite = true;
        child.material.opacity = 1;
        if (child.material.transmission > 0) child.material.transmission = 0;
        child.material.needsUpdate = true;
      }
    });
  }, [scene]);

  return (
    <PresentationControls 
      global={false} cursor={true} snap={true} speed={1.5} zoom={1}
      polar={[-Math.PI / 4, Math.PI / 4]} 
    >
      {/* If staked, we instantly kill the hovering Float effect by setting speeds to 0 */}
      <Float 
        speed={isStaked ? 0 : 2} 
        rotationIntensity={isStaked ? 0 : 0.5} 
        floatIntensity={isStaked ? 0 : 0.5}
      >
        <group ref={anvilRef}>
          <primitive object={scene} scale={1.5} position={[0, -1, 0]} />
        </group>
      </Float>
    </PresentationControls>
  );
}

// 2. The Main Canvas Component
export default function ForgeCanvas({ isStaked = false }: ForgeProps) {
  // Dynamic Lighting Setup
  const forgeColor = isStaked ? "#ff0000" : "#ff3b00"; // Shifts from orange to blood red
  const rimColor = isStaked ? "#220000" : "#ffffff";   // Cold white moon dies, goes dark red
  const ambientIntensity = isStaked ? 0.05 : 0.2;      // The whole room gets darker

  return (
    <div style={{ height: '450px', width: '100%', position: 'relative', cursor: 'grab' }}>
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={ambientIntensity} />
          
          {/* Dynamic Lights that react to the smart contract state */}
          <directionalLight position={[-5, -5, 5]} intensity={5} color={forgeColor} />
          <directionalLight position={[5, 10, -5]} intensity={2} color={rimColor} />

          <RealIronBlock isStaked={isStaked} />

          <ContactShadows position={[0, -2.5, 0]} opacity={0.7} scale={10} blur={2.5} far={4} />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload('/anvil.glb');