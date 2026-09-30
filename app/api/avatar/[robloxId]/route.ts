import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Proxies Roblox's public headshot thumbnail so the browser only talks to our site.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ robloxId: string }> }) {
  const { robloxId } = await params;
  if (!/^\d{1,15}$/.test(robloxId)) return new NextResponse(null, { status: 400 });
  try {
    const res = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxId}&size=150x150&format=Png&isCircular=false`,
      { next: { revalidate: 3600 } },
    );
    const url: string | undefined = (await res.json())?.data?.[0]?.imageUrl;
    if (!url || !url.startsWith("https://")) return new NextResponse(null, { status: 404 });
    return NextResponse.redirect(url, {
      status: 302,
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
