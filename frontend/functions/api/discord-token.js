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

    const payload = new URLSearchParams();
    payload.append('client_id', '1527320103476269076');
    payload.append('client_secret', 'aUntdurcsEqbyhWSEInrSQh18KzFOxmR');
    payload.append('grant_type', 'authorization_code');
    payload.append('code', code);
    payload.append('redirect_uri', redirect_uri || 'https://quan-ly-acc-viet-nam.onrender.com/api/auth/discord/callback');

    const discordRes = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'DiscordBot (https://oceanforge-web.pages.dev, 1.0.0)',
      },
      body: payload.toString(),
    });

    const data = await discordRes.json();
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
