import { DocumentWizard } from "@/components/wizard/DocumentWizard";

export default function CreateCvPage() {
  return (
    <DocumentWizard
      docType="cv"
      sourceMode="create"
      heading="Crear / mejorar CV"
      description="Sube tu CV en PDF o pega texto. Opcionalmente indica la vacante: la IA prioriza lo relevante sin inventar experiencia."
      defaultTitle="Mi CV"
      notesLabel="Texto del CV o trayectoria (opcional si subes PDF)"
      notesPlaceholder="Pega aquí tu CV actual o una lista de experiencia, formación y skills…"
      notesRequired={false}
      filesLabel="CV en PDF (opcional si ya pegaste texto)"
      filesRequired={false}
      accept="application/pdf,.pdf,.txt,.md"
      enableJobLink
      defaultTemplateId="ats"
    />
  );
}
