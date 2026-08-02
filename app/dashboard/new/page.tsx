import { DocumentWizard } from "@/components/wizard/DocumentWizard";

export default function NewPortfolioPage() {
  return (
    <DocumentWizard
      docType="portfolio"
      sourceMode="create"
      heading="Nuevo portafolio"
      description="Sube tu material, elige plantilla y genera un borrador con IA."
      defaultTitle="Mi portafolio"
      notesLabel="Experiencia, formación, proyectos (texto libre)"
      notesPlaceholder="Pega aquí tu trayectoria, estudios, skills y descripciones de proyectos…"
      notesRequired={false}
      filesLabel="Imágenes de proyectos y/o PDF de referencia (opcional si ya pegaste texto)"
      filesRequired={false}
    />
  );
}
