import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface Category {
  id:          string;
  slug:        string;
  name:        string;
  parentId:    string | null;
  sortOrder:   number;
  imageUrl:    string | null;
  description: string | null;
}

export interface CategoryTree {
  all:           Category[];
  byId:          Map<string, Category>;
  bySlug:        Map<string, Category>;
  /** Top-level categories (parentId === null), sorted by sort_order then name. */
  roots:         Category[];
  childrenOf:    (id: string | null) => Category[];
  /** Inclusive subtree — every descendant id of `id`, plus `id` itself.
   *  This is the "roll up" used to filter products by a parent category. */
  descendantIds: (id: string) => Set<string>;
  /** root → … → self, for breadcrumbs. */
  ancestorsOf:   (id: string) => Category[];
}

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
        .select('id, slug, name, parent_id, sort_order, image_url, description')
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (!active) return;
      if (!error && data) {
        setCats(data.map((c: any) => ({
          id: c.id, slug: c.slug, name: c.name,
          parentId: c.parent_id, sortOrder: c.sort_order ?? 0,
          imageUrl: c.image_url, description: c.description ?? null,
        })));
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

function buildTree(all: Category[]): CategoryTree {
  const byId   = new Map(all.map((c) => [c.id, c]));
  const bySlug = new Map(all.map((c) => [c.slug, c]));

  const childrenMap = new Map<string | null, Category[]>();
  for (const c of all) {
    const key = c.parentId;
    (childrenMap.get(key) ?? childrenMap.set(key, []).get(key)!).push(c);
  }
  const childrenOf = (id: string | null) => childrenMap.get(id) ?? [];
  const roots = childrenOf(null);

  const descendantIds = (id: string): Set<string> => {
    const out = new Set<string>([id]);
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const ch of childrenOf(cur)) {
        if (!out.has(ch.id)) { out.add(ch.id); stack.push(ch.id); }
      }
    }
    return out;
  };

  const ancestorsOf = (id: string): Category[] => {
    const path: Category[] = [];
    let cur: Category | undefined = byId.get(id);
    const guard = new Set<string>();
    while (cur && !guard.has(cur.id)) {
      guard.add(cur.id);
      path.unshift(cur);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return path;
  };

  return { all, byId, bySlug, roots, childrenOf, descendantIds, ancestorsOf };
}
