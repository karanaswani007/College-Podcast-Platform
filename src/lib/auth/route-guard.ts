import { redirect } from "@tanstack/react-router";

export async function loadSignedIn<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      throw redirect({ to: "/login", search: { mode: "login" } });
    }
    if (error instanceof Error && error.message === "Only an admin can do that.") {
      throw redirect({ to: "/unauthorized" });
    }
    throw error;
  }
}
