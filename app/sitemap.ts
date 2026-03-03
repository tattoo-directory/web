import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://tattoocityguide.com";

  return [
    { url: `${baseUrl}/`, lastModified: new Date() },
    { url: `${baseUrl}/france`, lastModified: new Date() },
    { url: `${baseUrl}/france/paris`, lastModified: new Date() },
  ];
}
