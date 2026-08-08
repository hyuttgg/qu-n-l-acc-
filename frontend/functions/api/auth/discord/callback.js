// Cloudflare Pages Function: Full Discord OAuth Callback Handler
// Completely bypasses Render's backend for Discord API interactions.
// Supports both Public Client (No Secret) and Confidential Client (Secret).

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  const FRONTEND_URL = context.env?.FRONTEND_URL || 'https://oceanforge-web.pages.dev';
  const BACKEND_URL = context.env?.BACKEND_URL || 'https://quan-ly-acc-viet-nam.onrender.com';
  const DISCORD_CLIENT_ID = context.env?.DISCORD_CLIENT_ID || '1527320103476269076';
  const DISCORD_CLIENT_SECRET = context.env?.DISCORD_CLIENT_SECRET || 'aUntdurcsEqbyhWSEInrSQh18KzFOxmR';
  const DISCORD_CALLBACK_URL = `${FRONTEND_URL}/api/auth/discord/callback`;

  if (error) {
    return Response.redirect(`${FRONTEND_URL}/login?error=oauth_failed&reason=${encodeURIComponent(error)}`, 302);
  }

  if (!code) {
    return Response.redirect(`${FRONTEND_URL}/login?error=oauth_failed&reason=no_code`, 302);
  }

  try {
    let tokenData = null;

    // Step 1: Attempt exchange as Public Client (client_id only, NO client_secret)
    // Discord Public Clients (SPA) strictly require NO client_secret
    const publicPayload = new URLSearchParams();
    publicPayload.append('client_id', DISCORD_CLIENT_ID);
    publicPayload.append('grant_type', 'authorization_code');
    publicPayload.append('code', code);
    publicPayload.append('redirect_uri', DISCORD_CALLBACK_URL);

    let tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: publicPayload.toString(),
    });

    tokenData = await tokenRes.json();

    // Fallback: If Public Client mode returns invalid_client, retry with Client Secret (Confidential Client)
    if (tokenData.error === 'invalid_client') {
      const secretPayload = new URLSearchParams();
      secretPayload.append('client_id', DISCORD_CLIENT_ID);
      secretPayload.append('client_secret', DISCORD_CLIENT_SECRET);
      secretPayload.append('grant_type', 'authorization_code');
      secretPayload.append('code', code);
      secretPayload.append('redirect_uri', DISCORD_CALLBACK_URL);

      tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: secretPayload.toString(),
      });

      tokenData = await tokenRes.json();
    }

    if (!tokenData.access_token) {
      const errMsg = tokenData.error_description || tokenData.error || 'token_exchange_failed';
      return Response.redirect(
        `${FRONTEND_URL}/login?error=oauth_failed&reason=${encodeURIComponent(errMsg)}`,
        302
      );
    }

    // Step 2: Fetch Discord user profile on Cloudflare Edge (Trusted IPs)
    const profileRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profileData = profileRes.ok ? await profileRes.json() : null;

    // Step 3: Send token & profile to backend to generate JWT session (Render does 0 Discord API requests)
    const loginRes = await fetch(`${BACKEND_URL}/api/auth/discord/token-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: tokenData.access_token,
        profile: profileData,
      }),
    });

    const loginData = await loginRes.json();

    if (loginData.success && loginData.token) {
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
