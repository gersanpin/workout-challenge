export const siteConfig = {
  name: "Santiago Architecture",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://santiago.architecture",
  instagram: {
    handle: "Santiago.architecture",
    url: "https://www.instagram.com/santiago.architecture/",
  },
  /** Optional booking page (Calendly, Cal.com, etc.). */
  meetingUrl: process.env.NEXT_PUBLIC_MEETING_URL ?? "",
};
