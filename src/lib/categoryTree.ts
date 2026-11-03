/**
 * Category tree helpers — pure, shared by the storefront (useCategories) and
 * the Vercel render function. Categories are few and change rarely, so the tree
 * is computed in memory rather than with recursive SQL.
 */

/** Row shape as selected from `categories` (snake_case, straight from PostgREST). */
export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  sort_order: number | null;
  image_url: string | null;
  description: string | null;
}

/** Columns to select for CategoryRow. */
export const CATEGORY_SELECT = 'id, slug, name, parent_id, sort_order, image_url, description';

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

export function mapCategoryRow(c: CategoryRow): Category {
  return {
    id: c.id, slug: c.slug, name: c.name,
    parentId: c.parent_id, sortOrder: c.sort_order ?? 0,
    imageUrl: c.image_url, description: c.description ?? null,
  };
}

export function buildTree(all: Category[]): CategoryTree {
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
