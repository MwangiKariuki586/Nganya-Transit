import { redirect } from "@tanstack/react-router";
import { toAppError } from "@/shared/errors/app-error";
import { getCrewProfileServerFn } from "@/shared/server-fns/crew-profile";

export interface CrewProfileRouteData {
  profile: {
    id: string;
    handle: string;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    role: string;
    created_at: string;
    updated_at: string | null;
    cover_media_url: string | null;
    cover_media_type: "image" | "video" | null;
    cover_poster_url: string | null;
  };
}

export async function loadCrewProfileRouteData(): Promise<CrewProfileRouteData> {
  try {
    const profile = await getCrewProfileServerFn();
    return { profile: profile as CrewProfileRouteData["profile"] };
  } catch (error) {
    const normalized = toAppError(error);

    if (normalized.code === "AUTH_REQUIRED") {
      throw redirect({
        to: "/signin",
        search: { returnTo: "/crew/profile" },
        replace: true,
      });
    }

    throw normalized;
  }
}
