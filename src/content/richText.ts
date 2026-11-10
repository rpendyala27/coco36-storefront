/**
 * Small markdown subset for the ingredient notes: **bold**, [label](url),
 * and newlines (rendered as breaks inside a paragraph or list item).
 * Shared by the React page and the server snapshot.
 */

export type RichNode =
  | { type: 'text'; text: string }
  | { type: 'bold'; children: RichNode[] }
  | { type: 'link'; text: string; href: string };

export function parseRich(input: string): RichNode[] {
  const nodes: RichNode[] = [];
  let i = 0;
  while (i < input.length) {
    if (input.startsWith('**', i)) {
      const end = input.indexOf('**', i + 2);
      if (end === -1) {
        nodes.push({ type: 'text', text: input.slice(i) });
        break;
      }
      nodes.push({ type: 'bold', children: parseRich(input.slice(i + 2, end)) });
      i = end + 2;
      continue;
    }
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(input.slice(i));
    if (link) {
      nodes.push({ type: 'link', text: link[1], href: link[2] });
      i += link[0].length;
      continue;
    }
    let next = input.length;
    const boldAt = input.indexOf('**', i);
    const linkAt = input.indexOf('[', i);
    if (boldAt >= 0) next = Math.min(next, boldAt);
    if (linkAt >= 0) next = Math.min(next, linkAt);
    if (next === i) {
      nodes.push({ type: 'text', text: input[i] });
      i += 1;
      continue;
    }
    nodes.push({ type: 'text', text: input.slice(i, next) });
    i = next;
  }
  return nodes;
}

/** Visible words of a rich string: link URLs dropped, labels kept. */
export function richPlain(input: string): string {
  const walk = (nodes: RichNode[]): string => nodes.map((n) => {
    if (n.type === 'text') return n.text;
    if (n.type === 'bold') return walk(n.children);
    return n.text;
  }).join('');
  return walk(parseRich(input)).replace(/\s+/g, ' ').trim();
}

export function richHtml(text: string, esc: (s: string) => string): string {
  const render = (node: RichNode): string => {
    if (node.type === 'text') return esc(node.text).replace(/\n/g, '<br>');
    if (node.type === 'bold') return `<strong>${node.children.map(render).join('')}</strong>`;
    const external = /^https?:/i.test(node.href);
    const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${esc(node.href)}"${attrs}>${esc(node.text)}</a>`;
  };
  return parseRich(text).map(render).join('');
}
