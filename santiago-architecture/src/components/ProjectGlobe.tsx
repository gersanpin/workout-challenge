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
    bumpMap.anisotropy = 4;
    colorMap.needsUpdate = true;
  }, [colorMap, bumpMap]);

  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS, 96, 96]} />
      <meshStandardMaterial
        map={colorMap}
        bumpMap={bumpMap}
        bumpScale={0.035}
        roughness={0.88}
        metalness={0.05}
      />
    </mesh>
  );
}

function Atmosphere() {
  return (
    <mesh scale={1.018} raycast={() => null}>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <meshBasicMaterial
        color="#7ea8c9"
        transparent
        opacity={0.08}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
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
  const position = useMemo(
    () =>
      latLngToPosition(
        project.latitude,
        project.longitude,
        GLOBE_RADIUS + 0.04,
      ),
    [project.latitude, project.longitude],
  );

  return (
    <group position={position}>
      <mesh
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
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh raycast={() => null}>
        <sphereGeometry args={[selected ? 0.055 : 0.038, 16, 16]} />
        <meshStandardMaterial
          color={selected ? "#fbfaf8" : "#c81e3a"}
          emissive={selected ? "#f2efe8" : "#8a1528"}
          emissiveIntensity={selected ? 0.55 : 0.35}
        />
      </mesh>
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
          <color attach="background" args={["#d4d2cd"]} />
          <ambientLight intensity={0.55} />
          <directionalLight position={[5, 2.5, 3]} intensity={1.45} />
          <directionalLight position={[-3, -1, -2]} intensity={0.25} />
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
