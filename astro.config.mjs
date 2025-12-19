// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import tailwind from "@astrojs/tailwind";
import starlightUtils from "@lorenzo_lewis/starlight-utils";

// https://astro.build/config
export default defineConfig({
  site: "https://raphii.co",
  integrations: [
    starlight({
      title: ">raphii",
      lastUpdated: true,
      social: {
        github: "https://github.com/Raphiiko",
        blueSky: "https://bsky.app/profile/raphii.co",
        "x.com": "https://x.com/Raphiiko",
        discord: "https://discord.gg/7MqdPJhYxC",
        email: "mailto:iam@raphii.co",
        patreon: "https://patreon.com/Raphii",
      },
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
          label: "leadingNavLinks",
          items: [
            { label: "OyasumiVR", slug: "oyasumivr/introduction" },
            { label: "VRTI", slug: "vrti/introduction" },
          ],
        },
        {
          label: "OyasumiVR",
          autogenerate: { directory: "oyasumivr" },
        },
        {
          label: "VRTI",
          items: [
            { label: "Introduction", slug: "vrti/introduction" },
            {
              label: "Getting Started",
              autogenerate: { directory: "vrti/Getting Started" },
            },
            { label: "Help", autogenerate: { directory: "vrti/Help" } },
            { label: "Pricing", slug: "vrti/pricing" },
            {
              label: "Developer",
              autogenerate: { directory: "vrti/Developer" },
            },
          ],
        },
      ],
      customCss: ["./src/tailwind.scss"],
      plugins: [
        starlightUtils({
          multiSidebar: {
            switcherStyle: "hidden",
          },
          navLinks: {
            leading: {
              useSidebarLabelled: "leadingNavLinks",
            },
          },
        }),
      ],
      components: {
        ThemeProvider: "./src/components/CustomThemeProvider.astro",
        ThemeSelect: "./src/components/CustomThemeSelect.astro",
      },
    }),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
});
