// Cloudflare Pages Function: Full Discord OAuth Callback Handler
// This completely bypasses Render's backend for the token exchange step.
// Flow: Discord → this function → exchange code → backend token-login → JWT → frontend

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  const FRONTEND_URL = 'https://oceanforge-web.pages.dev';
  const BACKEND_URL = 'https://quan-ly-acc-viet-nam.onrender.com';
  const DISCORD_CLIENT_ID = '1527320103476269076';
  const DISCORD_CLIENT_SECRET = 'aUntdurcsEqbyhWSEInrSQh18KzFOxmR';
  const DISCORD_CALLBACK_URL = `${FRONTEND_URL}/api/auth/discord/callback`;

  if (error) {
    return Response.redirect(`${FRONTEND_URL}/login?error=oauth_failed&reason=${encodeURIComponent(error)}`, 302);
  }

  if (!code) {
    return Response.redirect(`${FRONTEND_URL}/login?error=oauth_failed&reason=no_code`, 302);
  }

  try {
    // Step 1: Exchange code for access_token using Basic Auth header (RFC 6749 recommended)
    const basicAuth = btoa(`${DISCORD_CLIENT_ID}:${DISCORD_CLIENT_SECRET}`);

    const tokenPayload = new URLSearchParams();
    tokenPayload.append('grant_type', 'authorization_code');
    tokenPayload.append('code', code);
    tokenPayload.append('redirect_uri', DISCORD_CALLBACK_URL);

    let tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: tokenPayload.toString(),
    });

    let tokenData = await tokenRes.json();

    // Fallback: if Basic auth fails, try with credentials in body
    if (tokenData.error === 'invalid_client') {
      const bodyPayload = new URLSearchParams();
      bodyPayload.append('client_id', DISCORD_CLIENT_ID);
      bodyPayload.append('client_secret', DISCORD_CLIENT_SECRET);
      bodyPayload.append('grant_type', 'authorization_code');
      bodyPayload.append('code', code);
      bodyPayload.append('redirect_uri', DISCORD_CALLBACK_URL);

      tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyPayload.toString(),
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

    // Step 2: Send access_token to backend's /auth/discord/token-login
    const loginRes = await fetch(`${BACKEND_URL}/api/auth/discord/token-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: tokenData.access_token }),
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
