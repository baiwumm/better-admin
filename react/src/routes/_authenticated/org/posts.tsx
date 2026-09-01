import { createFileRoute } from "@tanstack/react-router";

import { PostsPage } from "@/features/org/posts-page";

export const Route = createFileRoute("/_authenticated/org/posts")({
  staticData: { titleKey: "menu.pageTitle.posts" },
  component: PostsPage,
});
