"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
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

function GlobeMesh() {
  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <meshStandardMaterial
        color="#8a9198"
        roughness={0.92}
        metalness={0.08}
        transparent
        opacity={0.92}
      />
    </mesh>
  );
}

function GridLines() {
  const geometry = useMemo(() => new THREE.SphereGeometry(GLOBE_RADIUS + 0.001, 32, 24), []);
  return (
    <lineSegments>
      <edgesGeometry args={[geometry]} />
      <lineBasicMaterial color="#5d6770" transparent opacity={0.35} />
    </lineSegments>
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
    () => latLngToPosition(project.latitude, project.longitude, GLOBE_RADIUS + 0.02),
    [project.latitude, project.longitude],
  );

  return (
    <mesh
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(project.slug);
      }}
    >
      <sphereGeometry args={[selected ? 0.045 : 0.03, 16, 16]} />
      <meshStandardMaterial
        color={selected ? "#fbfaf8" : "#2f3840"}
        emissive={selected ? "#6d7c89" : "#17191b"}
        emissiveIntensity={selected ? 0.55 : 0.15}
      />
    </mesh>
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
  const selected = projects.find((project) => project.slug === selectedSlug) ?? null;

  return (
    <div className={styles.wrap}>
      <div className={styles.canvas}>
        <Canvas camera={{ position: [0, 0.4, 4.2], fov: 42 }}>
          <color attach="background" args={["#d9d7d2"]} />
          <ambientLight intensity={0.85} />
          <directionalLight position={[4, 3, 2]} intensity={1.1} />
          <Suspense fallback={null}>
            <GlobeMesh />
            <GridLines />
            <Stars radius={40} depth={20} count={1200} factor={2} fade speed={0.4} />
            {projects.map((project) => (
              <ProjectPin
                key={project.slug}
                project={project}
                selected={project.slug === selectedSlug}
                onSelect={(slug) => onSelect(slug)}
              />
            ))}
            <OrbitControls
              enablePan={false}
              minDistance={2.8}
              maxDistance={6}
              rotateSpeed={0.55}
              autoRotate
              autoRotateSpeed={0.35}
            />
          </Suspense>
        </Canvas>
      </div>

      <aside className={styles.panel}>
        {selected ? (
          <>
            <p className={styles.kicker}>{t("labels.typology")}</p>
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
            <Link href={`/projects/${selected.slug}`} className="btn btn-primary">
              {t("viewProject")}
            </Link>
          </>
        ) : (
          <p className={styles.placeholder}>{t("selected")}</p>
        )}
      </aside>
    </div>
  );
}
