import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';

interface TurnstileProps {
  siteKey?: string;
  action?: string;
  onChange: (token: string | null) => void;
}

export interface ReCaptchaRef {
  reset: () => void;
}

export const ReCaptcha = forwardRef<ReCaptchaRef, TurnstileProps>(({ siteKey, action, onChange }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Detect if running on localhost / development
  const isLocal = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('192.168.')
  );

  const reset = () => {
    setIsChecked(false);
    setIsVerifying(false);
    if (widgetIdRef.current !== null && (window as any).turnstile) {
      try {
        (window as any).turnstile.reset(widgetIdRef.current);
      } catch (e) {}
    }
    onChange(null);
  };

  useImperativeHandle(ref, () => ({
    reset,
  }));

  const activeSiteKey = (siteKey && siteKey.trim() !== '') 
    ? siteKey.trim() 
    : (import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAAEjl5icutoFUTvcs').trim();

  // On production domains, load and render Cloudflare Turnstile iframe
  useEffect(() => {
    if (isLocal) {
      // On localhost, auto-verify or let user click cleanly without Cloudflare 110200 domain error
      return;
    }

    let active = true;
    let timeoutId: any;

    if (!(window as any).turnstile && !document.getElementById('cloudflare-turnstile-script')) {
      const script = document.createElement('script');
      script.id = 'cloudflare-turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const renderWidget = () => {
      if ((window as any).turnstile && (window as any).turnstile.render && containerRef.current) {
        containerRef.current.innerHTML = '';

        try {
          const id = (window as any).turnstile.render(containerRef.current, {
            sitekey: activeSiteKey,
            action: action || 'form_submit',
            theme: 'dark',
            size: 'normal',
            callback: (token: string) => {
              if (active) {
                setIsChecked(true);
                onChange(token);
              }
            },
            'expired-callback': () => {
              if (active) {
                setIsChecked(false);
                onChange(null);
              }
            },
          });
          widgetIdRef.current = id;
        } catch (err) {
          console.warn('Turnstile init error:', err);
        }
      }
    };

    const checkTurnstile = () => {
      if ((window as any).turnstile && (window as any).turnstile.render) {
        renderWidget();
      } else {
        timeoutId = setTimeout(checkTurnstile, 150);
      }
    };

    checkTurnstile();

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (widgetIdRef.current && (window as any).turnstile && (window as any).turnstile.remove) {
        try {
          (window as any).turnstile.remove(widgetIdRef.current);
        } catch (e) {}
      }
    };
  }, [isLocal, activeSiteKey, action, onChange]);

  // Handle local development interactive click
  const handleLocalClick = () => {
    if (isVerifying || isChecked) return;

    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setIsChecked(true);
      onChange('cf_turnstile_local_token_' + Date.now());
    }, 500);
  };

  // 1. LOCALHOST DEVELOPMENT VIEW: Clean, modern, 100% bug-free Dark Turnstile Card
  if (isLocal) {
    return (
      <div className="w-full flex justify-center my-3">
        <div 
          onClick={handleLocalClick}
          className={`w-[300px] h-[65px] px-3.5 py-2.5 rounded-xl border select-none transition-all duration-300 flex items-center justify-between shadow-md cursor-pointer ${
            isChecked 
              ? 'bg-[#1b2436] border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
              : 'bg-[#1b2436] border-slate-700/80 hover:border-cyan-500/50 hover:bg-[#202b40]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
              isChecked 
                ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-sm' 
                : 'bg-slate-950/80 border-slate-600'
            }`}>
              {isVerifying ? (
                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              ) : isChecked ? (
                <svg className="w-4 h-4 text-slate-950 font-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : null}
            </div>

            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-slate-100">
                {isVerifying ? 'Đang kiểm tra...' : isChecked ? 'Thành công!' : 'Tôi không phải người máy'}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {isChecked ? 'Đã bảo vệ an toàn' : 'Nhấn để xác minh'}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end opacity-90 pr-0.5">
            <svg className="w-7 h-5 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z"/>
            </svg>
            <span className="text-[8.5px] font-black text-slate-300 tracking-wider uppercase mt-0.5">CLOUDFLARE</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. PRODUCTION VIEW: Real Cloudflare Turnstile Widget (oceanforge-web.pages.dev)
  return (
    <div className="w-full flex justify-center my-3">
      <div className="w-[300px] h-[65px] flex items-center justify-center">
        <div ref={containerRef} className="w-[300px] h-[65px]" />
      </div>
    </div>
  );
});

ReCaptcha.displayName = 'ReCaptcha';

export const Turnstile = ReCaptcha;
export type TurnstileRef = ReCaptchaRef;
