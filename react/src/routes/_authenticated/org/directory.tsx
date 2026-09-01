import { createFileRoute } from "@tanstack/react-router";

import { DirectoryPage } from "@/features/org/directory-page";

export const Route = createFileRoute("/_authenticated/org/directory")({
  staticData: { titleKey: "menu.pageTitle.directory" },
  component: DirectoryPage,
});
