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

function latLngToPosition(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function EarthGlobe() {
  const [colorMap, bumpMap] = useTexture([
    "/textures/earth-day.jpg",
    "/textures/earth-topology.png",
  ]);

  useEffect(() => {
    colorMap.colorSpace = THREE.SRGBColorSpace;
    colorMap.anisotropy = 8;
    bumpMap.anisotropy = 8;
    colorMap.needsUpdate = true;
  }, [colorMap, bumpMap]);

  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS, 128, 128]} />
      <meshStandardMaterial
        map={colorMap}
        bumpMap={bumpMap}
        bumpScale={0.14}
        displacementMap={bumpMap}
        displacementScale={0.032}
        displacementBias={-0.01}
        roughness={0.82}
        metalness={0.04}
      />
    </mesh>
  );
}

function Atmosphere() {
  return (
    <mesh scale={1.02} raycast={() => null}>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <meshBasicMaterial
        color="#8eb4d0"
        transparent
        opacity={0.1}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function MapPinMesh({ selected }: { selected: boolean }) {
  const scale = selected ? 1.18 : 1;
  const body = selected ? "#2a3238" : "#1b2228";
  const head = selected ? "#f4f1ec" : "#c4453a";
  const ring = selected ? "#6d7c89" : "#f7f4ef";

  return (
    <group scale={scale}>
      {/* Stem / tip pointing toward the surface (-Y) */}
      <mesh position={[0, 0.042, 0]} rotation={[Math.PI, 0, 0]} raycast={() => null}>
        <coneGeometry args={[0.026, 0.085, 20]} />
        <meshStandardMaterial
          color={body}
          roughness={0.45}
          metalness={0.2}
        />
      </mesh>
      {/* Pin head */}
      <mesh position={[0, 0.095, 0]} raycast={() => null}>
        <sphereGeometry args={[0.034, 24, 24]} />
        <meshStandardMaterial
          color={head}
          roughness={0.35}
          metalness={0.15}
          emissive={selected ? "#d7d2c8" : "#6b241f"}
          emissiveIntensity={selected ? 0.22 : 0.18}
        />
      </mesh>
      {/* Inner disc so it reads as a location pin */}
      <mesh position={[0, 0.095, 0.018]} raycast={() => null}>
        <circleGeometry args={[0.014, 20]} />
        <meshStandardMaterial
          color={ring}
          roughness={0.4}
          metalness={0.1}
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
        <sphereGeometry args={[0.13, 16, 16]} />
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
          camera={{ position: [0, 0.35, 4.1], fov: 42 }}
          dpr={[1, 1.75]}
          onPointerMissed={() => onSelect(null)}
        >
          <color attach="background" args={["#d0cec9"]} />
          <ambientLight intensity={0.42} />
          <directionalLight position={[5.5, 3.2, 2.5]} intensity={1.7} castShadow />
          <directionalLight position={[-4, -0.5, -2]} intensity={0.35} />
          <hemisphereLight args={["#e8eef4", "#3d4a38", 0.45]} />
          <Suspense fallback={null}>
            <EarthGlobe />
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
              rotateSpeed={0.5}
              autoRotate={!selectedSlug}
              autoRotateSpeed={0.35}
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
