export const categories = [
  "residential",
  "hospitality",
  "masterplan",
  "commercial",
  "interior",
  "concept",
] as const;

export type Category = (typeof categories)[number];
export type LocaleCode = "en" | "es";

export type LocalizedString = Record<LocaleCode, string>;

export type Project = {
  slug: string;
  year: number;
  latitude: number;
  longitude: number;
  area: string;
  category: Category;
  images: string[];
  name: LocalizedString;
  location: LocalizedString;
  description: LocalizedString;
  seoTitle: LocalizedString;
  seoDescription: LocalizedString;
};

export const projects: Project[] = [
  {
    slug: "casa-sisal",
    year: 2024,
    latitude: 21.165,
    longitude: -90.045,
    area: "420 m²",
    category: "residential",
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
    ],
    name: {
      en: "Sisal House",
      es: "Casa Sisal",
    },
    location: {
      en: "Sisal, Yucatán, Mexico",
      es: "Sisal, Yucatán, México",
    },
    description: {
      en: "A coastal residence ordered around shade, breeze, and a quiet courtyard.",
      es: "Residencia costera organizada en torno a sombra, brisa y un patio sosegado.",
    },
    seoTitle: {
      en: "Sisal Beach House | Architecture Portfolio",
      es: "Casa frente al mar en Sisal | Portafolio de arquitectura",
    },
    seoDescription: {
      en: "Sisal House — coastal residential architecture in Yucatán.",
      es: "Casa Sisal — arquitectura residencial costera en Yucatán.",
    },
  },
  {
    slug: "casa-merida",
    year: 2023,
    latitude: 20.967,
    longitude: -89.623,
    area: "310 m²",
    category: "residential",
    images: [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=80",
    ],
    name: {
      en: "Mérida House",
      es: "Casa Mérida",
    },
    location: {
      en: "Mérida, Yucatán, Mexico",
      es: "Mérida, Yucatán, México",
    },
    description: {
      en: "A compact urban house with thick walls and a central light well.",
      es: "Casa urbana compacta con muros gruesos y un pozo de luz central.",
    },
    seoTitle: {
      en: "Mérida House | Architecture Portfolio",
      es: "Casa Mérida | Portafolio de arquitectura",
    },
    seoDescription: {
      en: "Mérida House — urban residential architecture in Yucatán.",
      es: "Casa Mérida — arquitectura residencial urbana en Yucatán.",
    },
  },
  {
    slug: "hotel-isla",
    year: 2022,
    latitude: 21.208,
    longitude: -86.731,
    area: "2,400 m²",
    category: "hospitality",
    images: [
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80",
    ],
    name: {
      en: "Isla Hotel",
      es: "Hotel Isla",
    },
    location: {
      en: "Isla Mujeres, Quintana Roo, Mexico",
      es: "Isla Mujeres, Quintana Roo, México",
    },
    description: {
      en: "A low hospitality cluster open to sea air and local stone.",
      es: "Conjunto hospitality bajo, abierto al aire marino y a la piedra local.",
    },
    seoTitle: {
      en: "Isla Hotel | Architecture Portfolio",
      es: "Hotel Isla | Portafolio de arquitectura",
    },
    seoDescription: {
      en: "Isla Hotel — hospitality architecture on Isla Mujeres.",
      es: "Hotel Isla — arquitectura hospitality en Isla Mujeres.",
    },
  },
  {
    slug: "costa-masterplan",
    year: 2021,
    latitude: 20.628,
    longitude: -87.078,
    area: "18 ha",
    category: "masterplan",
    images: [
      "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?auto=format&fit=crop&w=1600&q=80",
    ],
    name: {
      en: "Costa Masterplan",
      es: "Plan Maestro Costa",
    },
    location: {
      en: "Riviera Maya, Mexico",
      es: "Riviera Maya, México",
    },
    description: {
      en: "A coastal framework that protects dunes and sequences public access.",
      es: "Marco costero que protege dunas y ordena el acceso público.",
    },
    seoTitle: {
      en: "Costa Masterplan | Architecture Portfolio",
      es: "Plan Maestro Costa | Portafolio de arquitectura",
    },
    seoDescription: {
      en: "Costa Masterplan — landscape and settlement strategy on the Caribbean coast.",
      es: "Plan Maestro Costa — estrategia de paisaje y asentamiento en la costa caribeña.",
    },
  },
  {
    slug: "atelier-polanco",
    year: 2023,
    latitude: 19.433,
    longitude: -99.191,
    area: "180 m²",
    category: "commercial",
    images: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=80",
    ],
    name: {
      en: "Polanco Atelier",
      es: "Atelier Polanco",
    },
    location: {
      en: "Mexico City, Mexico",
      es: "Ciudad de México, México",
    },
    description: {
      en: "A showroom loft with soft partitions and north light.",
      es: "Loft showroom con particiones suaves y luz norte.",
    },
    seoTitle: {
      en: "Polanco Atelier | Architecture Portfolio",
      es: "Atelier Polanco | Portafolio de arquitectura",
    },
    seoDescription: {
      en: "Polanco Atelier — commercial interior architecture in Mexico City.",
      es: "Atelier Polanco — arquitectura comercial de interiores en Ciudad de México.",
    },
  },
  {
    slug: "casa-patio",
    year: 2020,
    latitude: 19.041,
    longitude: -98.206,
    area: "95 m²",
    category: "interior",
    images: [
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1600&q=80",
    ],
    name: {
      en: "Patio Apartment",
      es: "Departamento Patio",
    },
    location: {
      en: "Puebla, Mexico",
      es: "Puebla, México",
    },
    description: {
      en: "An interior renovation centered on a single planted court.",
      es: "Renovación de interior centrada en un único patio plantado.",
    },
    seoTitle: {
      en: "Patio Apartment | Architecture Portfolio",
      es: "Departamento Patio | Portafolio de arquitectura",
    },
    seoDescription: {
      en: "Patio Apartment — interior architecture in Puebla.",
      es: "Departamento Patio — arquitectura de interiores en Puebla.",
    },
  },
  {
    slug: "pabellon-luz",
    year: 2025,
    latitude: 41.387,
    longitude: 2.168,
    area: "60 m²",
    category: "concept",
    images: [
      "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=80",
    ],
    name: {
      en: "Light Pavilion",
      es: "Pabellón Luz",
    },
    location: {
      en: "Barcelona, Spain",
      es: "Barcelona, España",
    },
    description: {
      en: "A temporary pavilion studying shadow bands and timber frames.",
      es: "Pabellón temporal que estudia bandas de sombra y marcos de madera.",
    },
    seoTitle: {
      en: "Light Pavilion | Architecture Portfolio",
      es: "Pabellón Luz | Portafolio de arquitectura",
    },
    seoDescription: {
      en: "Light Pavilion — concept architecture study in Barcelona.",
      es: "Pabellón Luz — estudio conceptual de arquitectura en Barcelona.",
    },
  },
];

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}

export function getLocalized(
  value: LocalizedString,
  locale: LocaleCode,
): string {
  return value[locale] ?? value.en;
}

export function getNextProject(slug: string): Project | undefined {
  const index = projects.findIndex((project) => project.slug === slug);
  if (index === -1) return undefined;
  return projects[(index + 1) % projects.length];
}

export function filterProjects(category?: string | null): Project[] {
  if (!category || category === "all") return projects;
  return projects.filter((project) => project.category === category);
}
