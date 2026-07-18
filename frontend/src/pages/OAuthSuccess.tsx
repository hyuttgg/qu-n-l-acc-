import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../store';
import { Compass } from 'lucide-react';

export const OAuthSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { oauthLogin } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      oauthLogin(token).then((res: { success: boolean }) => {
        if (res.success) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/login?error=OAuth%20login%20failed', { replace: true });
        }
      });
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
