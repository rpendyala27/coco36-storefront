import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { buildTree, mapCategoryRow, CATEGORY_SELECT, type Category, type CategoryRow, type CategoryTree } from '../lib/categoryTree';

export type { Category, CategoryTree };

/**
 * Live category tree for the storefront. Categories are few and change rarely,
 * so we fetch them once (with a realtime refresh on admin edits) and compute the
 * tree client-side — no recursive SQL needed.
 */
export function useCategories(): { tree: CategoryTree; loading: boolean } {
  const [cats, setCats]       = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data, error } = await supabase
        .from('categories')
        .select(CATEGORY_SELECT)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (!active) return;
      if (!error && data) {
        setCats((data as CategoryRow[]).map(mapCategoryRow));
      }
      setLoading(false);
    }
    void load();

    // Unique topic per effect run. supabase.channel() RETURNS the existing
    // channel for a reused topic, and removeChannel() is async — so under
    // React 19 StrictMode's double-invoked effect (or two components mounting
    // this hook at once) the cleanup hasn't finished when the effect re-runs,
    // and channel('public:categories-tree') would hand back the *already
    // subscribed* channel. Chaining .on() onto a subscribed channel throws
    // ("cannot add postgres_changes callbacks ... after subscribe()"). A fresh
    // topic each run guarantees a brand-new channel, so .on() is always pre-subscribe.
    const channel = supabase
      .channel(`public:categories-tree:${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => void load())
      .subscribe();

    return () => { active = false; void supabase.removeChannel(channel); };
  }, []);

  const tree = useMemo(() => buildTree(cats), [cats]);
  return { tree, loading };
}
