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
/** Far enough that the full sphere stays in frame with a little margin. */
const CAMERA_DISTANCE = 4.05;
const CAMERA_FOV = 36;

/** Flat schematic earth: two solids, hard coasts, thin ink outline. */
const vertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D uMask;
uniform vec3 uLand;
uniform vec3 uOcean;
uniform vec3 uStroke;
uniform vec2 uTexel;

varying vec2 vUv;

float sampleOcean(vec2 uv) {
  return texture2D(uMask, uv).r;
}

void main() {
  // Mask: 1.0 ocean, 0.0 land (holes already filled)
  float ocean = sampleOcean(vUv);
  // Hard cut for a graphic, print-like fill
  float landMask = 1.0 - step(0.5, ocean);

  // Thin coastline stroke via neighbor differences
  float n = sampleOcean(vUv + vec2(0.0, uTexel.y));
  float s = sampleOcean(vUv - vec2(0.0, uTexel.y));
  float e = sampleOcean(vUv + vec2(uTexel.x, 0.0));
  float w = sampleOcean(vUv - vec2(uTexel.x, 0.0));
  float ne = sampleOcean(vUv + uTexel);
  float nw = sampleOcean(vUv + vec2(-uTexel.x, uTexel.y));
  float se = sampleOcean(vUv + vec2(uTexel.x, -uTexel.y));
  float sw = sampleOcean(vUv - uTexel);
  float edge =
    abs(ocean - n) + abs(ocean - s) + abs(ocean - e) + abs(ocean - w) +
    abs(ocean - ne) + abs(ocean - nw) + abs(ocean - se) + abs(ocean - sw);
  float stroke = step(0.35, edge);

  vec3 color = mix(uOcean, uLand, landMask);
  color = mix(color, uStroke, stroke);
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
  const [maskMap] = useTexture(["/textures/earth-mask.png"]);

  useEffect(() => {
    maskMap.colorSpace = THREE.NoColorSpace;
    maskMap.minFilter = THREE.LinearFilter;
    maskMap.magFilter = THREE.LinearFilter;
    maskMap.generateMipmaps = false;
    maskMap.anisotropy = 1;
  }, [maskMap]);

  const uniforms = useMemo(
    () => ({
      uMask: { value: maskMap },
      // Reference schematic: khaki land, charcoal ocean, ink stroke
      uLand: { value: new THREE.Color("#c2b189") },
      uOcean: { value: new THREE.Color("#2a2a2a") },
      uStroke: { value: new THREE.Color("#141414") },
      uTexel: { value: new THREE.Vector2(2.2 / 1600, 2.2 / 800) },
    }),
    [maskMap],
  );

  return (
    <group>
      {/* Thin black silhouette rim, like the print outline */}
      <mesh scale={1.012} renderOrder={0}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshBasicMaterial
          color="#141414"
          side={THREE.BackSide}
          toneMapped={false}
        />
      </mesh>
      <mesh renderOrder={1}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function MapPinMesh({ selected }: { selected: boolean }) {
  const scale = selected ? 1.18 : 1;
  // Light pins read on charcoal ocean; dark core keeps the schematic mark.
  const fill = selected ? "#f4efe4" : "#efe6d4";
  const core = "#17191b";

  return (
    <group scale={scale}>
      <mesh position={[0, 0.04, 0]} rotation={[Math.PI, 0, 0]} raycast={() => null}>
        <coneGeometry args={[0.02, 0.07, 3]} />
        <meshBasicMaterial color={fill} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.085, 0]} raycast={() => null}>
        <sphereGeometry args={[0.028, 12, 12]} />
        <meshBasicMaterial color={fill} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.085, 0.012]} raycast={() => null}>
        <circleGeometry args={[0.011, 12]} />
        <meshBasicMaterial color={core} toneMapped={false} />
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

/** Shift projection so the globe sits left-of-center and fills the stage. */
function DesktopFraming() {
  const { camera, size } = useThree();

  useEffect(() => {
    const persp = camera as THREE.PerspectiveCamera;
    if (size.width < 960) {
      persp.clearViewOffset();
      persp.updateProjectionMatrix();
      return;
    }

    // Mild left bias so the full globe clears the right detail rail.
    const offsetX = Math.round(size.width * -0.08);
    persp.setViewOffset(
      size.width,
      size.height,
      offsetX,
      0,
      size.width,
      size.height,
    );
    persp.updateProjectionMatrix();

    return () => {
      persp.clearViewOffset();
      persp.updateProjectionMatrix();
    };
  }, [camera, size.height, size.width]);

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
          camera={{ position: [0, 0.05, CAMERA_DISTANCE], fov: CAMERA_FOV }}
          dpr={[1, 1.5]}
          gl={{ alpha: true, antialias: true }}
          style={{ background: "transparent" }}
          onPointerMissed={() => onSelect(null)}
        >
          <Suspense fallback={null}>
            <DesktopFraming />
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
              enableZoom={false}
              minDistance={CAMERA_DISTANCE}
              maxDistance={CAMERA_DISTANCE}
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
