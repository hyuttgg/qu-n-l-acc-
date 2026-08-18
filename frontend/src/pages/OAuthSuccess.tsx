import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../store';
import { Compass } from 'lucide-react';

export const OAuthSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { oauthLogin } = useApp();
  const navigate = useNavigate();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const token = searchParams.get('token');

    if (token) {
      oauthLogin(token).then((res: { success: boolean }) => {
        if (res.success) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/login?error=oauth_failed&reason=Không%20thể%20xác%20thực%20tài%20khoản', { replace: true });
        }
      });
    } else {
      navigate('/login?error=oauth_failed&reason=Không%20nhận%20được%20token%20xác%20thực', { replace: true });
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
