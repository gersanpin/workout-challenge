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
const CAMERA_DISTANCE = 4.05;

/** Flat conceptual earth: real coastlines, solid colors, no material lighting. */
const vertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D uWater;
uniform vec3 uLand;
uniform vec3 uOcean;

varying vec2 vUv;

void main() {
  float water = texture2D(uWater, vUv).r;
  float landMask = 1.0 - smoothstep(0.42, 0.58, water);
  vec3 color = mix(uOcean, uLand, landMask);
  gl_FragColor = vec4(color, 1.0);
}
`;

function latLngToPosition(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function ConceptualEarth() {
  const [waterMap] = useTexture(["/textures/earth-water.png"]);

  useEffect(() => {
    waterMap.colorSpace = THREE.NoColorSpace;
    waterMap.minFilter = THREE.LinearFilter;
    waterMap.magFilter = THREE.LinearFilter;
    waterMap.anisotropy = 4;
  }, [waterMap]);

  const uniforms = useMemo(
    () => ({
      uWater: { value: waterMap },
      uLand: { value: new THREE.Color("#d8d2c8") },
      uOcean: { value: new THREE.Color("#2f353a") },
    }),
    [waterMap],
  );

  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS, 96, 96]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        toneMapped={false}
      />
    </mesh>
  );
}

function MapPinMesh({ selected }: { selected: boolean }) {
  const scale = selected ? 1.15 : 1;
  const fill = selected ? "#17191b" : "#17191b";
  const accent = selected ? "#f2efe8" : "#ecebe8";

  return (
    <group scale={scale}>
      <mesh position={[0, 0.04, 0]} rotation={[Math.PI, 0, 0]} raycast={() => null}>
        <coneGeometry args={[0.02, 0.07, 3]} />
        <meshBasicMaterial color={fill} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.085, 0]} raycast={() => null}>
        <sphereGeometry args={[0.026, 12, 12]} />
        <meshBasicMaterial color={fill} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.085, 0.012]} raycast={() => null}>
        <circleGeometry args={[0.01, 12]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
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
      GLOBE_RADIUS + 0.008,
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
        position={[0, 0.07, 0]}
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
        <sphereGeometry args={[0.11, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <MapPinMesh selected={selected} />
    </group>
  );
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
    const distance = Math.max(camera.position.length(), CAMERA_DISTANCE);
    const to = direction.multiplyScalar(distance);

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
          camera={{ position: [0, 0.25, CAMERA_DISTANCE], fov: 38 }}
          dpr={[1, 1.5]}
          gl={{ alpha: true, antialias: true }}
          style={{ background: "transparent" }}
          onPointerMissed={() => onSelect(null)}
        >
          <Suspense fallback={null}>
            <ConceptualEarth />
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
              minDistance={2.8}
              maxDistance={5.5}
              rotateSpeed={0.4}
              autoRotate={!selectedSlug}
              autoRotateSpeed={0.22}
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
                  sizes="280px"
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
