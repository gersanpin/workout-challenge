"use client";

import { Suspense, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
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

const vertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;

void main() {
  vUv = uv;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D uWater;
uniform sampler2D uTopo;
uniform vec3 uLand;
uniform vec3 uLandHigh;
uniform vec3 uOcean;
uniform vec3 uOceanDeep;
uniform vec3 uLightDir;

varying vec2 vUv;
varying vec3 vNormalW;

void main() {
  float water = texture2D(uWater, vUv).r;
  float topo = texture2D(uTopo, vUv).r;

  // Real coastlines, abstract material palette
  float landMask = 1.0 - smoothstep(0.22, 0.62, water);
  vec3 land = mix(uLand, uLandHigh, pow(topo, 0.7));
  vec3 ocean = mix(uOceanDeep, uOcean, 0.35 + 0.65 * topo);
  vec3 base = mix(ocean, land, landMask);

  // Soft coast edge
  float coast = smoothstep(0.18, 0.45, water) * (1.0 - smoothstep(0.45, 0.75, water));
  base = mix(base, mix(uLand, uOcean, 0.45), coast * 0.18);

  float ndotl = clamp(dot(normalize(vNormalW), normalize(uLightDir)), 0.0, 1.0);
  float hemi = 0.55 + 0.45 * ndotl;
  float relief = mix(1.0, 0.9 + topo * 0.22, landMask);

  gl_FragColor = vec4(base * hemi * relief, 1.0);
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

function AbstractEarth() {
  const [waterMap, topoMap] = useTexture([
    "/textures/earth-water.png",
    "/textures/earth-topology.png",
  ]);

  useEffect(() => {
    waterMap.colorSpace = THREE.NoColorSpace;
    topoMap.colorSpace = THREE.NoColorSpace;
    waterMap.anisotropy = 8;
    topoMap.anisotropy = 8;
  }, [waterMap, topoMap]);

  const uniforms = useMemo(
    () => ({
      uWater: { value: waterMap },
      uTopo: { value: topoMap },
      uLand: { value: new THREE.Color("#cfc8bc") },
      uLandHigh: { value: new THREE.Color("#e4dfd6") },
      uOcean: { value: new THREE.Color("#6a767f") },
      uOceanDeep: { value: new THREE.Color("#4a545c") },
      uLightDir: { value: new THREE.Vector3(4.5, 2.8, 2.2).normalize() },
    }),
    [waterMap, topoMap],
  );

  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS, 128, 128]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}

function Atmosphere() {
  return (
    <mesh scale={1.016} raycast={() => null}>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <meshBasicMaterial
        color="#8a949c"
        transparent
        opacity={0.07}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function MapPinMesh({ selected }: { selected: boolean }) {
  const scale = selected ? 1.15 : 1;
  const body = selected ? "#2f3840" : "#1b2228";
  const head = selected ? "#f2efe8" : "#2a3238";
  const ring = selected ? "#6d7c89" : "#ecebe8";

  return (
    <group scale={scale}>
      <mesh position={[0, 0.042, 0]} rotation={[Math.PI, 0, 0]} raycast={() => null}>
        <coneGeometry args={[0.024, 0.08, 20]} />
        <meshStandardMaterial color={body} roughness={0.5} metalness={0.18} />
      </mesh>
      <mesh position={[0, 0.09, 0]} raycast={() => null}>
        <sphereGeometry args={[0.03, 24, 24]} />
        <meshStandardMaterial
          color={head}
          roughness={0.4}
          metalness={0.12}
          emissive={selected ? "#cfc8bc" : "#111417"}
          emissiveIntensity={selected ? 0.18 : 0.08}
        />
      </mesh>
      <mesh position={[0, 0.09, 0.016]} raycast={() => null}>
        <circleGeometry args={[0.012, 20]} />
        <meshStandardMaterial color={ring} roughness={0.45} metalness={0.08} />
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
      GLOBE_RADIUS + 0.01,
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
        position={[0, 0.08, 0]}
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
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <MapPinMesh selected={selected} />
    </group>
  );
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

  return (
    <div className={styles.wrap}>
      <div className={styles.canvas}>
        <Canvas
          camera={{ position: [0, 0.3, 4.05], fov: 40 }}
          dpr={[1, 1.75]}
          onPointerMissed={() => onSelect(null)}
        >
          <color attach="background" args={["#e4e2dd"]} />
          <ambientLight intensity={0.85} />
          <directionalLight position={[4.5, 2.8, 2.2]} intensity={0.9} />
          <Suspense fallback={null}>
            <AbstractEarth />
            <Atmosphere />
            {projects.map((project) => (
              <ProjectPin
                key={project.slug}
                project={project}
                selected={project.slug === selectedSlug}
                onSelect={onSelect}
              />
            ))}
            <OrbitControls
              makeDefault
              enablePan={false}
              minDistance={2.8}
              maxDistance={6}
              rotateSpeed={0.45}
              autoRotate={!selectedSlug}
              autoRotateSpeed={0.28}
            />
          </Suspense>
        </Canvas>
      </div>

      <aside className={styles.panel}>
        {selected ? (
          <>
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
