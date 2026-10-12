import { defineRouteMiddleware } from "@astrojs/starlight/route-data";

type Entry = App.Locals["starlightRoute"]["sidebar"][number];

const containsCurrent = (entry: Entry): boolean =>
  entry.type === "link" ? entry.isCurrent : entry.entries.some(containsCurrent);

// Each top-level sidebar group is one project. Show only the group that holds the current
// page, or the first group for pages that are in no sidebar.
export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;
  const project = route.sidebar.find(containsCurrent) ?? route.sidebar[0];
  route.sidebar = project?.type === "group" ? project.entries : [];
});
