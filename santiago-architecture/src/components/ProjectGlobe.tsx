"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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

const LAND = { r: 201, g: 195, b: 184 }; // stone
const LAND_HIGH = { r: 222, g: 217, b: 208 };
const OCEAN = { r: 58, g: 67, b: 74 }; // steel charcoal
const OCEAN_DEEP = { r: 42, g: 49, b: 54 };

function latLngToPosition(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function mixChannel(
  a: number,
  b: number,
  t: number,
) {
  return Math.round(a + (b - a) * t);
}

function useAbstractEarthMap() {
  const [waterMap, topoMap] = useTexture([
    "/textures/earth-water.png",
    "/textures/earth-topology.png",
  ]);
  const [colorMap, setColorMap] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    const waterImg = waterMap.image as HTMLImageElement | ImageBitmap;
    const topoImg = topoMap.image as HTMLImageElement | ImageBitmap;
    if (!waterImg || !topoImg) return;

    const width =
      "width" in waterImg ? waterImg.width : (waterImg as ImageBitmap).width;
    const height =
      "height" in waterImg ? waterImg.height : (waterImg as ImageBitmap).height;

    const waterCanvas = document.createElement("canvas");
    waterCanvas.width = width;
    waterCanvas.height = height;
    const waterCtx = waterCanvas.getContext("2d", { willReadFrequently: true });
    if (!waterCtx) return;
    waterCtx.drawImage(waterImg as CanvasImageSource, 0, 0, width, height);
    const waterData = waterCtx.getImageData(0, 0, width, height).data;

    const topoCanvas = document.createElement("canvas");
    topoCanvas.width = width;
    topoCanvas.height = height;
    const topoCtx = topoCanvas.getContext("2d", { willReadFrequently: true });
    if (!topoCtx) return;
    topoCtx.drawImage(topoImg as CanvasImageSource, 0, 0, width, height);
    const topoData = topoCtx.getImageData(0, 0, width, height).data;

    const out = waterCtx.createImageData(width, height);
    for (let i = 0; i < out.data.length; i += 4) {
      const water = waterData[i] / 255;
      const topo = topoData[i] / 255;
      const landT = Math.pow(topo, 0.85);
      const landR = mixChannel(LAND.r, LAND_HIGH.r, landT);
      const landG = mixChannel(LAND.g, LAND_HIGH.g, landT);
      const landB = mixChannel(LAND.b, LAND_HIGH.b, landT);
      const oceanT = 1 - topo * 0.35;
      const oceanR = mixChannel(OCEAN.r, OCEAN_DEEP.r, oceanT);
      const oceanG = mixChannel(OCEAN.g, OCEAN_DEEP.g, oceanT);
      const oceanB = mixChannel(OCEAN.b, OCEAN_DEEP.b, oceanT);
      const w = Math.min(1, Math.max(0, (water - 0.28) / 0.42));
      out.data[i] = mixChannel(landR, oceanR, w);
      out.data[i + 1] = mixChannel(landG, oceanG, w);
      out.data[i + 2] = mixChannel(landB, oceanB, w);
      out.data[i + 3] = 255;
    }

    waterCtx.putImageData(out, 0, 0);
    const texture = new THREE.CanvasTexture(waterCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    setColorMap(texture);

    return () => {
      texture.dispose();
    };
  }, [waterMap, topoMap]);

  return { colorMap, bumpMap: topoMap };
}

function AbstractEarth() {
  const { colorMap, bumpMap } = useAbstractEarthMap();

  useEffect(() => {
    bumpMap.anisotropy = 8;
  }, [bumpMap]);

  if (!colorMap) {
    return (
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshStandardMaterial color="#9e9688" roughness={0.9} />
      </mesh>
    );
  }

  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS, 128, 128]} />
      <meshStandardMaterial
        map={colorMap}
        bumpMap={bumpMap}
        bumpScale={0.055}
        roughness={0.92}
        metalness={0.02}
      />
    </mesh>
  );
}

function Atmosphere() {
  return (
    <mesh scale={1.015} raycast={() => null}>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <meshBasicMaterial
        color="#6d7c89"
        transparent
        opacity={0.06}
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
          <ambientLight intensity={0.7} />
          <directionalLight position={[4.5, 2.8, 2.2]} intensity={1.05} />
          <directionalLight position={[-3, -1, -2]} intensity={0.22} />
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
