import { createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/stores/auth-store";

// Generated Routes（由 @tanstack/router-plugin 自动生成，勿手改）

export interface RouterContext {
  queryClient: typeof queryClient;
  auth: typeof useAuthStore;
}

// Create a new router instance
export const router = createRouter({
  routeTree,
  context: { queryClient, auth: useAuthStore },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
