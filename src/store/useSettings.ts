import { useCallback, useEffect, useState } from 'react';
import { getMeta, putMeta } from '../lib/db';
import { setApiKey } from '../services/ai';
import { applyTheme } from '../lib/theme';
import type { AppMeta } from '../types';

export function useSettings() {
  const [meta, setMeta] = useState<AppMeta | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMeta().then(m => {
      if (cancelled) return;
      setMeta(m);
      setApiKey(m.apiKey);
      applyTheme(m.theme, document.documentElement);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(async (patch: Partial<AppMeta>) => {
    const next = await putMeta(patch);
    setMeta(next);
    if ('apiKey' in patch) setApiKey(next.apiKey);
    if ('theme' in patch) applyTheme(next.theme, document.documentElement);
  }, []);

  return { meta, update };
}
