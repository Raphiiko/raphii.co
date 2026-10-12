// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  site: "https://raphii.co",

  integrations: [
    starlight({
      title: ">raphii",
      lastUpdated: true,
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/Raphiiko" },
        { icon: "blueSky", label: "BlueSky", href: "https://bsky.app/profile/raphii.co" },
        { icon: "x.com", label: "X", href: "https://x.com/Raphiiko" },
        { icon: "discord", label: "Discord", href: "https://discord.gg/7MqdPJhYxC" },
        { icon: "email", label: "Email", href: "mailto:iam@raphii.co" },
        { icon: "patreon", label: "Patreon", href: "https://patreon.com/Raphii" },
      ],
      favicon: "/favicon-96x96.png",
      head: [
        {
          tag: "link",
          attrs: {
            rel: "icon",
            type: "image/png",
            href: "/favicon-96x96.png",
            sizes: "96x96",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "shortcut icon",
            href: "/favicon.ico",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "apple-touch-icon",
            sizes: "180x180",
            href: "/apple-touch-icon.png",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "apple-mobile-web-app-title",
            content: "raphii.co",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "manifest",
            href: "/site.webmanifest",
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:site_name",
            content: "raphii.co",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "twitter:site",
            content: "@Raphiiko",
          },
        },
      ],
      sidebar: [
        {
          label: "OyasumiVR",
          items: [{ autogenerate: { directory: "oyasumivr" } }],
        },
        {
          label: "VRTI",
          items: [
            { label: "Introduction", slug: "vrti/introduction" },
            {
              label: "Getting Started",
              items: [{ autogenerate: { directory: "vrti/Getting Started" } }],
            },
            { label: "VRTI Features", slug: "vrti/vrti-features" },
            {
              label: "Supported Devices",
              items: [{ autogenerate: { directory: "vrti/Supported Devices" } }],
            },
            { label: "Help", items: [{ autogenerate: { directory: "vrti/Help" } }] },
            { label: "Community", slug: "vrti/community" },
            {
              label: "Patch notes",
              collapsed: true,
              items: [{ autogenerate: { directory: "vrti/Changelog" } }],
            },
            {
              label: "Developer",
              items: [{ autogenerate: { directory: "vrti/Developer" } }],
            },
          ],
        },
      ],
      customCss: ["./src/tailwind.css"],
      routeMiddleware: "./src/routeData.ts",
      components: {
        SiteTitle: "./src/components/CustomSiteTitle.astro",
        ThemeProvider: "./src/components/CustomThemeProvider.astro",
        ThemeSelect: "./src/components/CustomThemeSelect.astro",
      },
    }),
    react(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
