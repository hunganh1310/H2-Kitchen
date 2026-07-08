import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Float, useGLTF } from '@react-three/drei'
import { Box3, Vector3, type Group } from 'three'

const MODEL_URL = '/models/ramen-bowl.glb'
useGLTF.preload(MODEL_URL)

interface Props {
  reducedDetail?: boolean
  reducedMotion?: boolean
}

/** The hero ramen bowl (compressed GLB) on a transparent canvas so the title shows through. */
export default function BowlScene({ reducedDetail = false, reducedMotion = false }: Props) {
  return (
    <Canvas
      camera={{ position: [0, 3, 5], fov: 40 }}
      dpr={[1, reducedDetail ? 1.3 : 2]}
      gl={{ antialias: !reducedDetail, alpha: true, powerPreference: 'high-performance' }}
    >
      <ambientLight intensity={0.75} />
      <directionalLight position={[4, 7, 4]} intensity={2.4} color="#ffffff" />
      <directionalLight position={[-5, 2, -2]} intensity={0.9} color="#c7d2fe" />
      <pointLight position={[-5, 3, 4]} intensity={35} color="#818cf8" />
      <pointLight position={[5, -1, -3]} intensity={18} color="#6d28d9" />

      <RamenBowl reducedMotion={reducedMotion} />

      <ContactShadows
        position={[0, -1.35, 0]}
        opacity={0.45}
        scale={9}
        blur={2.8}
        far={4}
        color="#1e1b4b"
      />
    </Canvas>
  )
}

function RamenBowl({ reducedMotion }: { reducedMotion?: boolean }) {
  const group = useRef<Group>(null)
  const { scene } = useGLTF(MODEL_URL)

  // Center + scale the model to a consistent size regardless of its source units.
  const { scale, center } = useMemo(() => {
    const box = new Box3().setFromObject(scene)
    const size = new Vector3()
    const c = new Vector3()
    box.getSize(size)
    box.getCenter(c)
    const maxDim = Math.max(size.x, size.y, size.z) || 1
    return { scale: 3.0 / maxDim, center: c }
  }, [scene])

  useFrame((_, delta) => {
    if (group.current && !reducedMotion) group.current.rotation.y += delta * 0.3
  })

  const content = (
    <group ref={group}>
      <group scale={scale}>
        <group position={[-center.x, -center.y, -center.z]}>
          <primitive object={scene} />
        </group>
      </group>
    </group>
  )

  if (reducedMotion) return content
  return (
    <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.55}>
      {content}
    </Float>
  )
}
