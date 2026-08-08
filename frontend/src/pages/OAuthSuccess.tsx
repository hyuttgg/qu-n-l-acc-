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
      // Case 1: JWT token provided directly (from backend or edge function)
      oauthLogin(token).then((res: { success: boolean }) => {
        if (res.success) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/login?error=OAuth%20login%20failed', { replace: true });
        }
      });
    } else if (code) {
      // Case 2: Discord code forwarded from backend - exchange via Cloudflare Edge Function
      const handleCodeExchange = async () => {
        try {
          // Call Cloudflare Pages Function to exchange code for access_token
          // This runs on Cloudflare's edge network (trusted IPs, no 1015 block)
          const tokenRes = await fetch('/api/discord-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              redirect_uri: 'https://quan-ly-acc-viet-nam.onrender.com/api/auth/discord/callback',
            }),
          });

          const tokenData = await tokenRes.json();
          if (tokenData.access_token) {
            // Send access_token to backend for user creation/login
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
            // If loginRes has a token at top level (api wrapper)
            if (loginRes.token) {
              const res = await oauthLogin(loginRes.token);
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
