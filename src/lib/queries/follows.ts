import { supabase } from "../supabase";
import { authRequired } from "@/shared/errors/app-error";

export async function getMyFollows() {
  const { data, error } = await supabase
    .from("follows")
    .select(
      "*, nganyas(*, corridors(name), nganya_media(media_url, media_type))",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function followNganya(nganyaId: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user?.id) throw authRequired();

  const { data, error } = await (supabase.from("follows") as any).upsert(
    { user_id: session.user.id, nganya_id: nganyaId, notify_live: true },
    { onConflict: "user_id,nganya_id" },
  );

  if (error) throw error;
  return data;
}

export async function unfollowNganya(nganyaId: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user?.id) throw authRequired();

  const { error } = await supabase
    .from("follows")
    .delete()
    .match({ user_id: session.user.id, nganya_id: nganyaId });

  if (error) throw error;
}

export async function updateFollowAlerts(
  nganyaId: string,
  notifyLive: boolean,
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user?.id) throw authRequired();

  const { data, error } = await (supabase.from("follows") as any)
    .update({ notify_live: notifyLive })
    .match({ user_id: session.user.id, nganya_id: nganyaId })
    .select();

  if (error) throw error;
  return data;
}
