import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

interface ReCaptchaProps {
  siteKey: string;
  onChange: (token: string | null) => void;
}

export interface ReCaptchaRef {
  reset: () => void;
}

export const ReCaptcha = forwardRef<ReCaptchaRef, ReCaptchaProps>(({ siteKey, onChange }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);

  const reset = () => {
    if (widgetIdRef.current !== null && (window as any).grecaptcha) {
      (window as any).grecaptcha.reset(widgetIdRef.current);
      onChange(null);
    }
  };

  useImperativeHandle(ref, () => ({
    reset,
  }));

  useEffect(() => {
    let active = true;
    let timeoutId: any;
    console.log("ReCaptcha siteKey is:", siteKey);

    const renderWidget = () => {
      if ((window as any).grecaptcha && (window as any).grecaptcha.render && containerRef.current) {
        containerRef.current.innerHTML = '';
        const el = document.createElement('div');
        containerRef.current.appendChild(el);

        try {
          const id = (window as any).grecaptcha.render(el, {
            sitekey: siteKey,
            theme: 'dark',
            callback: (token: string) => {
              if (active) onChange(token);
            },
            'expired-callback': () => {
              if (active) onChange(null);
            },
            'error-callback': () => {
              if (active) onChange(null);
            },
          });
          widgetIdRef.current = id;
        } catch (err) {
          console.error('Failed to render reCAPTCHA widget:', err);
        }
      }
    };

    const checkGrecaptcha = () => {
      if ((window as any).grecaptcha && (window as any).grecaptcha.render) {
        renderWidget();
      } else {
        timeoutId = setTimeout(checkGrecaptcha, 200);
      }
    };

    checkGrecaptcha();

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [siteKey, onChange]);

  return (
    <div className="w-full flex justify-center my-3">
      <div className="p-1 rounded-[6px] border border-slate-800/80 bg-ocean-deep/30 hover:border-ocean-cyan/60 hover:shadow-cyan-glow transition-all duration-300 flex justify-center items-center">
        <div ref={containerRef} />
      </div>
    </div>
  );
});

ReCaptcha.displayName = 'ReCaptcha';
