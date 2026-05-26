import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, ContactShadows, useGLTF, PresentationControls } from '@react-three/drei';
import * as THREE from 'three';

// 1. The Real 3D Model Component
function RealIronBlock() {
  // Loads your 8MB file from the public folder
  const { scene } = useGLTF('/anvil.glb');
  
  // Reference to target the anvil for the continuous spin animation
  const anvilRef = useRef<THREE.Group>(null);

  // This hook runs every single frame (60fps) to slowly rotate the anvil
  useFrame((state, delta) => {
    if (anvilRef.current) {
      // delta * 0.1 creates a slow horizontal spin. Increase to 0.5 for a faster spin.
      anvilRef.current.rotation.y += delta * 0.1;
    }
  });

  // This runs exactly once right after the model loads to fix transparency glitches
  useEffect(() => {
    scene.traverse((child: any) => {
      // If the part of the model is a physical shape
      if (child.isMesh) {
        // Force the material to be 100% solid, heavy metal
        child.material.transparent = false;
        child.material.depthWrite = true;
        child.material.opacity = 1;
        
        if (child.material.transmission > 0) {
          child.material.transmission = 0;
        }
        
        // Tell Three.js to update the renderer with these new rules
        child.material.needsUpdate = true;
      }
    });
  }, [scene]);

  return (
    // Allows the user to click and drag the anvil without breaking the auto-spin
    <PresentationControls 
      global={false} 
      cursor={true}
      snap={true} // Snaps back to the center when they let go
      speed={1.5}
      zoom={1}
      polar={[-Math.PI / 4, Math.PI / 4]} // Prevents them from flipping it upside down
    >
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        {/* We wrap the primitive in a group and attach our animation ref to it */}
        <group ref={anvilRef}>
          <primitive 
            object={scene} 
            scale={1.5} // Change this if the anvil is too big or small!
            position={[0, -1, 0]} 
          />
        </group>
      </Float>
    </PresentationControls>
  );
}

// 2. The Main Canvas Component
export default function ForgeCanvas() {
  return (
    <div style={{ height: '450px', width: '100%', position: 'relative', cursor: 'grab' }}>
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        {/* Suspense hides the scene until the 8MB file is fully downloaded */}
        <Suspense fallback={null}>
          
          {/* Pitch black ambient light to make the shadows aggressive */}
          <ambientLight intensity={0.2} />
          
          {/* Brutal forge fire from below (Deep Orange/Red) */}
          <directionalLight position={[-5, -5, 5]} intensity={5} color="#ff3b00" />
          
          {/* Stark, cold moonlight from above to highlight the metal scratches */}
          <directionalLight position={[5, 10, -5]} intensity={2} color="#ffffff" />

          <RealIronBlock />

          {/* Sharp, heavy shadow right underneath the floating anvil */}
          <ContactShadows position={[0, -2.5, 0]} opacity={0.7} scale={10} blur={2.5} far={4} />
          
          {/* Studio environment so the metal actually reflects light realistically */}
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Pre-load the model in the background so it renders instantly when users visit
useGLTF.preload('/anvil.glb');