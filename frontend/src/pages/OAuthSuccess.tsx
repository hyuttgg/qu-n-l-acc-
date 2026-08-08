import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../store';
import { Compass } from 'lucide-react';
import { api } from '../utils/api';

export const OAuthSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { oauthLogin } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const code = searchParams.get('code');

    if (token) {
      oauthLogin(token).then((res: { success: boolean }) => {
        if (res.success) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/login?error=OAuth%20login%20failed', { replace: true });
        }
      });
    } else if (code) {
      // Direct browser code-to-token exchange (Bypasses Render datacenter IP Cloudflare 1015 blocks)
      const handleCodeExchange = async () => {
        try {
          const payload = new URLSearchParams();
          payload.append('client_id', '1527320103476269076');
          payload.append('client_secret', 'aUntdurcsEqbyhWSEInrSQh18KzFOxmR');
          payload.append('grant_type', 'authorization_code');
          payload.append('code', code);
          payload.append('redirect_uri', 'https://quan-ly-acc-viet-nam.onrender.com/api/auth/discord/callback');

          const tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: payload.toString(),
          });

          const tokenData = await tokenRes.json();
          if (tokenData.access_token) {
            const loginRes = await api.post('/auth/discord/token-login', {
              access_token: tokenData.access_token,
            });
            if (loginRes.data && loginRes.data.token) {
              const res = await oauthLogin(loginRes.data.token);
              if (res.success) {
                navigate('/dashboard', { replace: true });
                return;
              }
            }
          }
          const errMsg = tokenData.error_description || tokenData.error || 'Token exchange failed';
          navigate(`/login?error=oauth_failed&reason=${encodeURIComponent(String(errMsg))}`, { replace: true });
        } catch (err: any) {
          console.error('Browser Code Exchange Error:', err);
          navigate(`/login?error=oauth_failed&reason=${encodeURIComponent(err?.message || 'Exchange exception')}`, { replace: true });
        }
      };

      handleCodeExchange();
    } else {
      navigate('/login?error=No%20token%20provided', { replace: true });
    }
  }, [searchParams, oauthLogin, navigate]);

  return (
    <div className="deepsea-bg min-h-screen flex flex-col items-center justify-center">
      <Compass className="w-16 h-16 text-gold animate-spin" />
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-4">
        Setting Course for Safe Harbor...
      </p>
    </div>
  );
};
