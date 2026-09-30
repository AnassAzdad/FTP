export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  no_roblox: "Your Discord account has no Roblox account linked. In Discord go to User Settings → Connections → add Roblox, then try again.",
  roblox_already_claimed: "That Roblox account is already linked to a different Discord account.",
  discord_already_linked: "This Discord account is already linked to a different Roblox account.",
  state: "Login expired or was tampered with. Please try again.",
};

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <>
      <h1>Login</h1>
      {error && <div className="card error" style={{ margin: "12px 0" }}>{MESSAGES[error] ?? "Login failed. Please try again."}</div>}
      <p className="muted">Log in with Discord to verify your Roblox account and claim your player profile.</p>
      <a className="btn" href="/api/auth/discord">Login with Discord</a>
    </>
  );
}
