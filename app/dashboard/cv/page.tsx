import { DocumentWizard } from "@/components/wizard/DocumentWizard";

export default function CreateCvPage() {
  return (
    <DocumentWizard
      docType="cv"
      sourceMode="create"
      heading="Crear / mejorar CV"
      description="Pega texto o sube tu CV viejo en PDF. Generamos un CV nuevo, reorganizado y con mejor diseño — separado del portafolio de proyectos."
      defaultTitle="Mi CV"
      notesLabel="Texto del CV o trayectoria (opcional si subes PDF)"
      notesPlaceholder="Pega aquí tu CV actual o una lista de experiencia, formación y skills…"
      notesRequired={false}
      filesLabel="CV en PDF u otro archivo (opcional si ya pegaste texto)"
      filesRequired={false}
      accept="application/pdf,.pdf,.txt,.md,image/*"
    />
  );
}
