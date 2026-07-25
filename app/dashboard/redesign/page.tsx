import { DocumentWizard } from "@/components/wizard/DocumentWizard";

export default function RedesignPortfolioPage() {
  return (
    <DocumentWizard
      docType="portfolio"
      sourceMode="redesign"
      heading="Rediseñar portafolio existente"
      description="Sube tu portafolio actual (PDF o archivos). La IA lo analiza y genera una versión rediseñada con nuestras plantillas."
      defaultTitle="Portafolio rediseñado"
      notesLabel="Notas adicionales (opcional)"
      notesPlaceholder="Contexto extra: qué quieres enfatizar, proyectos a ocultar, tono deseado…"
      notesRequired={false}
      filesLabel="Portafolio actual (PDF, imágenes u otros archivos) — requerido"
      filesRequired={true}
      accept="application/pdf,.pdf,image/*,.txt,.md"
    />
  );
}
