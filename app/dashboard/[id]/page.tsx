import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Portfolio } from "@/lib/types";
import { EditorClient } from "@/components/editor/EditorClient";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("portfolios")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) notFound();

  return <EditorClient portfolio={data as Portfolio} />;
}
