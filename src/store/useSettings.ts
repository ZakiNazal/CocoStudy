import { useCallback, useEffect, useState } from 'react';
import { getMeta, putMeta } from '../lib/db';
import { setApiKey } from '../services/ai';
import type { AppMeta } from '../types';

export function useSettings() {
  const [meta, setMeta] = useState<AppMeta | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMeta().then(m => {
      if (cancelled) return;
      setMeta(m);
      setApiKey(m.apiKey);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(async (patch: Partial<AppMeta>) => {
    const next = await putMeta(patch);
    setMeta(next);
    if ('apiKey' in patch) setApiKey(next.apiKey);
  }, []);

  return { meta, update };
}
