export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { code, redirect_uri } = body;

    if (!code) {
      return new Response(JSON.stringify({ error: 'code is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const DISCORD_CLIENT_ID = context.env?.DISCORD_CLIENT_ID || '1527320103476269076';
    const DISCORD_CLIENT_SECRET = context.env?.DISCORD_CLIENT_SECRET || 'aUntdurcsEqbyhWSEInrSQh18KzFOxmR';
    const callbackUri = redirect_uri || 'https://oceanforge-web.pages.dev/api/auth/discord/callback';

    // Attempt 1: Public Client mode
    const publicPayload = new URLSearchParams();
    publicPayload.append('client_id', DISCORD_CLIENT_ID);
    publicPayload.append('grant_type', 'authorization_code');
    publicPayload.append('code', code);
    publicPayload.append('redirect_uri', callbackUri);

    let discordRes = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: publicPayload.toString(),
    });

    let data = await discordRes.json();

    // Attempt 2: Confidential Client fallback
    if (data.error === 'invalid_client') {
      const secretPayload = new URLSearchParams();
      secretPayload.append('client_id', DISCORD_CLIENT_ID);
      secretPayload.append('client_secret', DISCORD_CLIENT_SECRET);
      secretPayload.append('grant_type', 'authorization_code');
      secretPayload.append('code', code);
      secretPayload.append('redirect_uri', callbackUri);

      discordRes = await fetch('https://discord.com/api/v10/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: secretPayload.toString(),
      });

      data = await discordRes.json();
    }

    return new Response(JSON.stringify(data), {
      status: discordRes.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
