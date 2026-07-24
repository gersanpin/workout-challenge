import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { PortfolioContent, TemplateId } from "./types";

const fonts = StyleSheet.create({
  base: { fontFamily: "Helvetica", fontSize: 10, color: "#201c17" },
});

function stylesFor(template: TemplateId) {
  if (template === "editorial") {
    return StyleSheet.create({
      page: {
        ...fonts.base,
        padding: 40,
        backgroundColor: "#201c17",
        color: "#f6f5f2",
      },
      name: { fontSize: 28, fontFamily: "Helvetica-Bold", marginBottom: 4 },
      headline: { fontSize: 12, color: "#d6d0c2", marginBottom: 16 },
      section: { marginTop: 18, marginBottom: 6, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#c47a4a" },
      muted: { color: "#b8ae99", fontSize: 9 },
      body: { lineHeight: 1.45, marginBottom: 6, color: "#ebe8e0" },
      projectTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 2, color: "#f6f5f2" },
      rule: { borderBottomWidth: 1, borderBottomColor: "#453e34", marginVertical: 10 },
      row: { flexDirection: "row", gap: 12, marginBottom: 10 },
      col: { flex: 1 },
      image: { width: "100%", height: 120, objectFit: "cover", marginBottom: 6 },
      chip: { fontSize: 8, marginRight: 6, marginBottom: 4, color: "#d6d0c2" },
    });
  }
  if (template === "atelier") {
    return StyleSheet.create({
      page: {
        ...fonts.base,
        padding: 36,
        backgroundColor: "#f3eee6",
        color: "#201c17",
      },
      name: { fontSize: 26, fontFamily: "Helvetica-Bold", marginBottom: 4, color: "#8c4b2a" },
      headline: { fontSize: 11, marginBottom: 14, color: "#51483a" },
      section: { marginTop: 16, marginBottom: 6, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#a85f35" },
      muted: { color: "#7f7259", fontSize: 9 },
      body: { lineHeight: 1.45, marginBottom: 6 },
      projectTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 2 },
      rule: { borderBottomWidth: 1, borderBottomColor: "#d6d0c2", marginVertical: 8 },
      row: { flexDirection: "row", gap: 10, marginBottom: 10 },
      col: { flex: 1 },
      image: { width: "100%", height: 110, objectFit: "cover", marginBottom: 6 },
      chip: { fontSize: 8, marginRight: 6, marginBottom: 4, color: "#665a47" },
    });
  }
  return StyleSheet.create({
    page: {
      ...fonts.base,
      padding: 40,
      backgroundColor: "#ffffff",
      color: "#201c17",
    },
    name: { fontSize: 24, fontFamily: "Helvetica-Bold", marginBottom: 4 },
    headline: { fontSize: 11, marginBottom: 12, color: "#51483a" },
    section: { marginTop: 16, marginBottom: 6, fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "#665a47" },
    muted: { color: "#7f7259", fontSize: 9 },
    body: { lineHeight: 1.45, marginBottom: 6 },
    projectTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 2 },
    rule: { borderBottomWidth: 1, borderBottomColor: "#ebe8e0", marginVertical: 8 },
    row: { flexDirection: "row", gap: 10, marginBottom: 10 },
    col: { flex: 1 },
    image: { width: "100%", height: 110, objectFit: "cover", marginBottom: 6 },
    chip: { fontSize: 8, marginRight: 6, marginBottom: 4, color: "#665a47" },
  });
}

export function PortfolioPdfDocument({
  content,
  templateId,
}: {
  content: PortfolioContent;
  templateId: TemplateId;
}) {
  const s = stylesFor(templateId);
  const contact = [content.email, content.phone, content.location, content.website]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{content.fullName || "Arquitecto/a"}</Text>
        <Text style={s.headline}>{content.headline}</Text>
        {contact ? <Text style={s.muted}>{contact}</Text> : null}
        <View style={s.rule} />

        {content.summary ? (
          <>
            <Text style={s.section}>Perfil</Text>
            <Text style={s.body}>{content.summary}</Text>
          </>
        ) : null}

        {content.skills?.length ? (
          <>
            <Text style={s.section}>Habilidades</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {content.skills.map((sk) => (
                <Text key={sk} style={s.chip}>
                  {sk}
                </Text>
              ))}
            </View>
          </>
        ) : null}

        {content.experience?.length ? (
          <>
            <Text style={s.section}>Experiencia</Text>
            {content.experience.map((ex) => (
              <View key={ex.id} style={{ marginBottom: 8 }}>
                <Text style={s.projectTitle}>
                  {ex.role} — {ex.company}
                </Text>
                <Text style={s.muted}>
                  {[ex.startDate, ex.endDate].filter(Boolean).join(" – ")}
                  {ex.location ? ` · ${ex.location}` : ""}
                </Text>
                <Text style={s.body}>{ex.description}</Text>
              </View>
            ))}
          </>
        ) : null}

        {content.education?.length ? (
          <>
            <Text style={s.section}>Formación</Text>
            {content.education.map((ed) => (
              <View key={ed.id} style={{ marginBottom: 6 }}>
                <Text style={s.projectTitle}>
                  {ed.degree} — {ed.school}
                </Text>
                <Text style={s.muted}>{ed.year}</Text>
                {ed.description ? <Text style={s.body}>{ed.description}</Text> : null}
              </View>
            ))}
          </>
        ) : null}
      </Page>

      {content.projects?.length ? (
        <Page size="A4" style={s.page}>
          <Text style={s.section}>Proyectos</Text>
          {content.projects.map((p) => (
            <View key={p.id} style={{ marginBottom: 14 }} wrap={false}>
              <Text style={s.projectTitle}>{p.title}</Text>
              <Text style={s.muted}>
                {[p.year, p.location, p.typology].filter(Boolean).join(" · ")}
              </Text>
              {p.imageUrls?.[0] ? (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image src={p.imageUrls[0]} style={s.image} />
              ) : null}
              <Text style={s.body}>{p.description}</Text>
              {p.highlights?.map((h, i) => (
                <Text key={i} style={s.body}>
                  • {h}
                </Text>
              ))}
            </View>
          ))}
        </Page>
      ) : null}
    </Document>
  );
}
