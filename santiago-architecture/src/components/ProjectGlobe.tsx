"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";
import Image from "next/image";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  getLocalized,
  type LocaleCode,
  type Project,
} from "@/data/projects";
import styles from "./ProjectGlobe.module.css";

const GLOBE_RADIUS = 1.6;
/** Fixed framing: full sphere + atmosphere with generous margin. */
const CAMERA_DISTANCE = 5.35;
const CAMERA_FOV = 38;
const SEGMENTS = 256;

function latLngToPosition(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function ConfigureRenderer() {
  const { gl } = useThree();

  useEffect(() => {
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.15;
    gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
  }, [gl]);

  return null;
}

function configureColorMap(texture: THREE.Texture, anisotropy: number) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
}

function configureDataMap(texture: THREE.Texture, anisotropy: number) {
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = anisotropy;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
}

function AppleEarth() {
  const { gl } = useThree();
  const cloudsRef = useRef<THREE.Mesh>(null);
  const [dayMap, normalMap, specularMap, cloudsMap] = useTexture([
    "/textures/earth-day-4k.jpg",
    "/textures/earth-normal.jpg",
    "/textures/earth-specular.jpg",
    "/textures/earth-clouds.png",
  ]);

  useEffect(() => {
    const anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
    configureColorMap(dayMap, anisotropy);
    configureDataMap(normalMap, anisotropy);
    configureDataMap(specularMap, anisotropy);
    configureColorMap(cloudsMap, anisotropy);
  }, [cloudsMap, dayMap, gl, normalMap, specularMap]);

  useFrame((_, delta) => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.012;
    }
  });

  return (
    <group>
      {/* Soft fill + key light — product-like illumination */}
      <ambientLight intensity={0.42} color="#f4f7ff" />
      <hemisphereLight args={["#dce9ff", "#f2efe8", 0.55]} />
      <directionalLight
        position={[4.5, 2.2, 3.2]}
        intensity={2.35}
        color="#fff4e5"
      />
      <directionalLight
        position={[-3.5, -1.2, -2.5]}
        intensity={0.45}
        color="#9eb7ff"
      />

      {/* Planet */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, SEGMENTS, SEGMENTS]} />
        <meshPhongMaterial
          map={dayMap}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.9, 0.9)}
          specularMap={specularMap}
          specular={new THREE.Color("#3a3a3a")}
          shininess={22}
        />
      </mesh>

      {/* Cloud veil */}
      <mesh ref={cloudsRef} scale={1.008}>
        <sphereGeometry args={[GLOBE_RADIUS, 192, 192]} />
        <meshPhongMaterial
          map={cloudsMap}
          transparent
          opacity={0.4}
          depthWrite={false}
          specular={new THREE.Color("#111111")}
          shininess={4}
        />
      </mesh>
    </group>
  );
}

function MapPinMesh({ selected }: { selected: boolean }) {
  const scale = selected ? 1.2 : 1;
  const core = selected ? "#ffffff" : "#f2f7ff";
  const glow = selected ? "#8ec5ff" : "#c9ddff";

  return (
    <group scale={scale}>
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <ringGeometry args={[0.035, 0.055, 48]} />
        <meshBasicMaterial
          color={glow}
          transparent
          opacity={selected ? 0.85 : 0.45}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.012, 0]} raycast={() => null}>
        <sphereGeometry args={[0.022, 32, 32]} />
        <meshBasicMaterial color={core} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.012, 0]} raycast={() => null}>
        <sphereGeometry args={[0.038, 32, 32]} />
        <meshBasicMaterial
          color={glow}
          transparent
          opacity={selected ? 0.35 : 0.18}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function ProjectPin({
  project,
  selected,
  onSelect,
}: {
  project: Project;
  selected: boolean;
  onSelect: (slug: string) => void;
}) {
  const { position, quaternion } = useMemo(() => {
    const pos = latLngToPosition(
      project.latitude,
      project.longitude,
      GLOBE_RADIUS + 0.012,
    );
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      pos.clone().normalize(),
    );
    return { position: pos, quaternion: q };
  }, [project.latitude, project.longitude]);

  return (
    <group position={position} quaternion={quaternion}>
      <mesh
        position={[0, 0.05, 0]}
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect(project.slug);
        }}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(project.slug);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <MapPinMesh selected={selected} />
    </group>
  );
}

/** Keep the camera locked so the full sphere stays in frame. */
function LockGlobeDistance({
  controlsRef,
}: {
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();

  useEffect(() => {
    const persp = camera as THREE.PerspectiveCamera;
    persp.fov = CAMERA_FOV;
    persp.near = 0.1;
    persp.far = 100;
    persp.clearViewOffset();
    persp.position.set(0, 0.15, CAMERA_DISTANCE);
    persp.lookAt(0, 0, 0);
    persp.updateProjectionMatrix();
  }, [camera]);

  useFrame(() => {
    const persp = camera as THREE.PerspectiveCamera;
    const dir = camera.position.clone();
    if (dir.lengthSq() < 1e-6) dir.set(0, 0.15, 1);
    dir.normalize();
    if (Math.abs(camera.position.length() - CAMERA_DISTANCE) > 0.02) {
      camera.position.copy(dir.multiplyScalar(CAMERA_DISTANCE));
    }
    if (Math.abs(persp.fov - CAMERA_FOV) > 0.01) {
      persp.fov = CAMERA_FOV;
      persp.updateProjectionMatrix();
    }
    const controls = controlsRef.current;
    if (controls) {
      controls.minDistance = CAMERA_DISTANCE;
      controls.maxDistance = CAMERA_DISTANCE;
      controls.target.set(0, 0, 0);
    }
  });

  return null;
}

function CameraFocus({
  project,
  controlsRef,
}: {
  project: Project | null;
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();
  const animation = useRef<{
    from: THREE.Vector3;
    to: THREE.Vector3;
    progress: number;
  } | null>(null);
  const focusKey = project
    ? `${project.slug}:${project.latitude}:${project.longitude}`
    : null;

  useEffect(() => {
    if (!project || !focusKey) {
      animation.current = null;
      return;
    }

    const direction = latLngToPosition(
      project.latitude,
      project.longitude,
      1,
    ).normalize();
    const to = direction.multiplyScalar(CAMERA_DISTANCE);

    animation.current = {
      from: camera.position.clone(),
      to,
      progress: 0,
    };
  }, [camera, focusKey, project]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    const current = animation.current;
    if (!current) return;

    current.progress = Math.min(1, current.progress + delta * 1.35);
    const eased = 1 - (1 - current.progress) ** 3;
    camera.position.lerpVectors(current.from, current.to, eased);
    camera.position.setLength(CAMERA_DISTANCE);
    camera.lookAt(0, 0, 0);

    if (controls) {
      controls.target.set(0, 0, 0);
      controls.update();
    }

    if (current.progress >= 1) {
      animation.current = null;
    }
  });

  return null;
}

type Props = {
  projects: Project[];
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
};

export function ProjectGlobe({ projects, selectedSlug, onSelect }: Props) {
  const t = useTranslations("Projects");
  const locale = useLocale() as LocaleCode;
  const selected =
    projects.find((project) => project.slug === selectedSlug) ?? null;
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const preview = selected?.images[0];

  return (
    <div className={styles.wrap}>
      <div className={styles.canvas}>
        <Canvas
          camera={{ position: [0, 0.15, CAMERA_DISTANCE], fov: CAMERA_FOV }}
          dpr={[1, 2.5]}
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: "high-performance",
            stencil: false,
            depth: true,
          }}
          style={{ background: "transparent" }}
          onPointerMissed={() => onSelect(null)}
        >
          <Suspense fallback={null}>
            <ConfigureRenderer />
            <LockGlobeDistance controlsRef={controlsRef} />
            <AppleEarth />
            {projects.map((project) => (
              <ProjectPin
                key={project.slug}
                project={project}
                selected={project.slug === selectedSlug}
                onSelect={onSelect}
              />
            ))}
            <CameraFocus project={selected} controlsRef={controlsRef} />
            <OrbitControls
              ref={controlsRef}
              makeDefault
              enablePan={false}
              enableZoom={false}
              minDistance={CAMERA_DISTANCE}
              maxDistance={CAMERA_DISTANCE}
              rotateSpeed={0.35}
              autoRotate={!selectedSlug}
              autoRotateSpeed={0.18}
            />
          </Suspense>
        </Canvas>
      </div>

      <aside className={styles.panel}>
        {selected ? (
          <>
            {preview ? (
              <Link
                href={`/projects/${selected.slug}`}
                className={styles.preview}
              >
                <Image
                  src={preview}
                  alt={getLocalized(selected.name, locale)}
                  fill
                  sizes="(max-width: 960px) 84vw, min(34rem, 40vw)"
                  className={styles.previewImage}
                />
              </Link>
            ) : null}
            <p className={styles.kicker}>{t(`filters.${selected.category}`)}</p>
            <h2>{getLocalized(selected.name, locale)}</h2>
            <dl className={styles.details}>
              <div>
                <dt>{t("labels.location")}</dt>
                <dd>{getLocalized(selected.location, locale)}</dd>
              </div>
              <div>
                <dt>{t("labels.typology")}</dt>
                <dd>{t(`filters.${selected.category}`)}</dd>
              </div>
              <div>
                <dt>{t("labels.year")}</dt>
                <dd>{selected.year}</dd>
              </div>
            </dl>
            <Link
              href={`/projects/${selected.slug}`}
              className="btn btn-primary"
            >
              {t("viewProject")}
            </Link>
          </>
        ) : (
          <>
            <p className={styles.placeholder}>{t("selected")}</p>
            <ul className={styles.quickList}>
              {projects.map((project) => (
                <li key={project.slug}>
                  <button
                    type="button"
                    onClick={() => onSelect(project.slug)}
                  >
                    {getLocalized(project.name, locale)}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>
    </div>
  );
}
