import { DocumentWizard } from "@/components/wizard/DocumentWizard";

export default function RedesignPortfolioPage() {
  return (
    <DocumentWizard
      docType="portfolio"
      sourceMode="redesign"
      heading="Rediseñar portafolio existente"
      description="Sube un PDF multipágina o varias imágenes de proyectos. La IA rediseña el conjunto completo sin inventar proyectos nuevos."
      defaultTitle="Portafolio rediseñado"
      notesLabel="Notas adicionales (opcional)"
      notesPlaceholder="Qué enfatizar, tipologías a priorizar, tono deseado…"
      notesRequired={false}
      filesLabel="Portafolio actual — PDF multipágina y/o múltiples imágenes (requerido)"
      filesRequired={true}
      accept="application/pdf,.pdf,image/*,.txt,.md"
      enableJobLink
      defaultTemplateId="minimal"
    />
  );
}
