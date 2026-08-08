// Cloudflare Pages Function: Full Discord OAuth Callback Handler
// This completely bypasses Render's backend for the token exchange step.
// Flow: Discord → this function → exchange code → get user → redirect to backend token-login → JWT → frontend

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  const FRONTEND_URL = 'https://oceanforge-web.pages.dev';
  const BACKEND_URL = 'https://quan-ly-acc-viet-nam.onrender.com';
  const DISCORD_CLIENT_ID = '1527320103476269076';
  const DISCORD_CLIENT_SECRET = 'aUntdurcsEqbyhWSEInrSQh18KzFOxmR';
  const DISCORD_CALLBACK_URL = `${BACKEND_URL}/api/auth/discord/callback`;

  if (error) {
    return Response.redirect(`${FRONTEND_URL}/login?error=oauth_failed&reason=${encodeURIComponent(error)}`, 302);
  }

  if (!code) {
    return Response.redirect(`${FRONTEND_URL}/login?error=oauth_failed&reason=no_code`, 302);
  }

  try {
    // Step 1: Exchange code for access_token (Cloudflare Edge IP, trusted by Discord WAF)
    const tokenPayload = new URLSearchParams();
    tokenPayload.append('client_id', DISCORD_CLIENT_ID);
    tokenPayload.append('client_secret', DISCORD_CLIENT_SECRET);
    tokenPayload.append('grant_type', 'authorization_code');
    tokenPayload.append('code', code);
    tokenPayload.append('redirect_uri', DISCORD_CALLBACK_URL);

    const tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'DiscordBot (https://oceanforge-web.pages.dev, 1.0.0)',
      },
      body: tokenPayload.toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      const errMsg = tokenData.error_description || tokenData.error || 'token_exchange_failed';
      return Response.redirect(
        `${FRONTEND_URL}/login?error=oauth_failed&reason=${encodeURIComponent(errMsg)}`,
        302
      );
    }

    // Step 2: Send access_token to backend's /auth/discord/token-login (no Discord API call needed from Render)
    const loginRes = await fetch(`${BACKEND_URL}/api/auth/discord/token-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: tokenData.access_token }),
    });

    const loginData = await loginRes.json();

    if (loginData.success && loginData.token) {
      // Step 3: Redirect to frontend with JWT
      return Response.redirect(`${FRONTEND_URL}/oauth-success?token=${loginData.token}`, 302);
    }

    const loginErr = loginData.message || 'backend_login_failed';
    return Response.redirect(
      `${FRONTEND_URL}/login?error=oauth_failed&reason=${encodeURIComponent(loginErr)}`,
      302
    );
  } catch (err) {
    return Response.redirect(
      `${FRONTEND_URL}/login?error=oauth_failed&reason=${encodeURIComponent(err.message || 'edge_exception')}`,
      302
    );
  }
}
