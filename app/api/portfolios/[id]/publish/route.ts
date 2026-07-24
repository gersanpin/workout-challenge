import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  assertCanPublish,
  LimitError,
  slugify,
} from "@/lib/usage";
import type { PortfolioContent } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const publish = Boolean(body.publish);

  const { data: current, error: fetchError } = await supabase
    .from("portfolios")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !current) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  if (publish && !current.published) {
    try {
      await assertCanPublish(user.id);
    } catch (err) {
      if (err instanceof LimitError) {
        return NextResponse.json({ error: err.message }, { status: 402 });
      }
      throw err;
    }
  }

  let slug = current.slug as string | null;
  if (publish) {
    const content = current.content as PortfolioContent;
    const base = slugify(content.fullName || current.title || "portfolio");
    slug = `${base}-${id.slice(0, 8)}`;
  }

  const { data, error } = await supabase
    .from("portfolios")
    .update({
      published: publish,
      slug: publish ? slug : current.slug,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ portfolio: data });
}
