import { Fragment, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { bakingNoteByPath, formatPublishDate, type NoteBlock, type NoteSection } from '../content/bakingNotes';
import { WHOLESALE_GUIDE_PATH, wholesaleGuide } from '../content/wholesaleGuide';
import { useStoreConfig } from '../lib/storeConfig';
import { GUIDE_LINKS, guidePath } from '../content/guideIndex';
import { parseRich, type RichNode } from '../content/richText';
import { useSeo } from '../lib/seo';
import { bakingNoteCrumbs, bakingNoteMeta } from '../seo/bakingNoteMeta';
import { notFoundMeta } from '../seo/meta';

/**
 * /guides and /guides/:slug — the Ingredient Notes cluster.
 * Head (title, description, canonical, Article, FAQPage, breadcrumbs) comes
 * from bakingNoteMeta, the same module the server snapshot uses.
 */
export function BakingNote() {
  const { slug } = useParams<{ slug?: string }>();
  const path = slug ? `/guides/${slug}` : '/guides';
  const cfg = useStoreConfig();
  const note = useMemo(() => {
    const found = bakingNoteByPath(path);
    if (found && path === WHOLESALE_GUIDE_PATH) return wholesaleGuide(cfg);
    return found;
  }, [path, cfg]);
  useSeo(useMemo(() => (note ? bakingNoteMeta(note) : notFoundMeta()), [note]));

  if (!note) {
    return (
      <div className="min-h-[70vh] pt-28 px-6 flex flex-col items-center justify-center text-center">
        <p className="eyebrow text-brand-leaf mb-3">Error 404</p>
        <h1 className="text-4xl md:text-5xl mb-5">Guide not found.</h1>
        <Link to="/guides" className="btn-primary !px-8 !py-4">All guides</Link>
      </div>
    );
  }

  return (
    <div className="bg-brand-paper pt-20 min-h-screen">
      <article className="max-w-3xl mx-auto px-6 pt-8 pb-16">
        <Breadcrumbs crumbs={bakingNoteCrumbs(note)} />
        <p className="eyebrow text-brand-leaf mt-8 mb-3">Ingredient notes</p>
        <h1 className="font-display text-4xl md:text-5xl leading-[1.05] text-brand-forest">{note.h1}</h1>
        {note.published && (
          <p className="mt-4 text-sm text-brand-muted">Published <time dateTime={note.published}>{formatPublishDate(note.published)}</time></p>
        )}

        <NoteSections sections={note.sections} />

        {note.path === '/guides' && (
          <section className="mt-10" aria-labelledby="ingredient-library">
            <h2 id="ingredient-library" className="font-display text-2xl md:text-3xl text-brand-forest mb-3">The ingredient library</h2>
            <ul className="mt-3 list-disc pl-6 space-y-2 text-[16px] leading-relaxed text-brand-ink/80">
              {GUIDE_LINKS.map((g) => (
                <li key={g.slug}>
                  <Link to={guidePath(g)} className="text-brand-leaf hover:underline">{g.name}</Link>
                  {': '}{g.blurb}
                </li>
              ))}
            </ul>
          </section>
        )}

        {note.faqs.length > 0 && (
          <section aria-labelledby="note-faq" className="mt-12">
            <h2 id="note-faq" className="font-display text-3xl text-brand-forest mb-6">Frequently asked questions</h2>
            <div className="divide-y divide-brand-line border-y border-brand-line">
              {note.faqs.map((f) => (
                <div key={f.q} className="py-5">
                  <h3 className="font-display font-bold text-lg text-brand-forest">{f.q}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-brand-ink/80"><Rich text={f.a} /></p>
                </div>
              ))}
            </div>
          </section>
        )}

        {note.closing && note.closing.length > 0 && <NoteSections sections={note.closing} />}

        <nav aria-label="Related pages" className="mt-12">
          <h2 className="eyebrow mb-4">On this site</h2>
          <ul className="flex flex-wrap gap-2">
            {note.related.map((l) => (
              <li key={l.href}>
                <Link to={l.href} className="inline-flex px-4 py-2 rounded-full border border-brand-line text-sm text-brand-forest hover:border-brand-forest transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </article>
    </div>
  );
}

function NoteSections({ sections }: { sections: NoteSection[] }) {
  return (
    <>
      {sections.map((section, i) => (
        <section key={section.heading ?? i} className={section.heading ? 'mt-10' : 'mt-5'}>
          {section.heading && (
            <h2 className="font-display text-2xl md:text-3xl text-brand-forest mb-3">{section.heading}</h2>
          )}
          {section.blocks.map((block, j) => (
            <Fragment key={j}><Block block={block} /></Fragment>
          ))}
        </section>
      ))}
    </>
  );
}

function Block({ block }: { block: NoteBlock }) {
  if (block.type === 'p') {
    return <p className="mt-3 text-[16px] leading-relaxed text-brand-ink/80"><Rich text={block.text} /></p>;
  }
  if (block.type === 'h3') {
    return <h3 className="font-display text-xl md:text-2xl text-brand-forest mt-8 mb-2">{block.text}</h3>;
  }
  if (block.type === 'ul' || block.type === 'ol') {
    const Tag = block.type === 'ol' ? 'ol' : 'ul';
    const list = block.type === 'ol' ? 'list-decimal' : 'list-disc';
    return (
      <Tag className={`mt-3 ${list} pl-6 space-y-2 text-[16px] leading-relaxed text-brand-ink/80`}>
        {block.items.map((item) => <li key={item}><Rich text={item} /></li>)}
      </Tag>
    );
  }
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr>
            {block.headers.map((h) => (
              <th key={h} scope="col" className="border border-brand-line bg-brand-surface px-3 py-2 font-display text-brand-forest">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row) => (
            <tr key={row.join('|')}>
              {row.map((cell, i) => (
                <td key={i} className="border border-brand-line px-3 py-2 align-top text-brand-ink/80 leading-relaxed"><Rich text={cell} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Rich({ text }: { text: string }) {
  return (
    <>
      {parseRich(text).map((node, i) => (
        <Fragment key={i}><RichView node={node} /></Fragment>
      ))}
    </>
  );
}

function RichView({ node }: { node: RichNode }) {
  if (node.type === 'text') {
    const lines = node.text.split('\n');
    return (
      <>
        {lines.map((line, i) => (
          <Fragment key={i}>
            {i > 0 && <br />}
            {line}
          </Fragment>
        ))}
      </>
    );
  }
  if (node.type === 'bold') {
    return (
      <strong className="font-semibold text-brand-ink">
        {node.children.map((child, i) => (
          <Fragment key={i}><RichView node={child} /></Fragment>
        ))}
      </strong>
    );
  }
  if (/^https?:/i.test(node.href)) {
    return <a href={node.href} className="text-brand-leaf hover:underline" target="_blank" rel="noopener noreferrer">{node.text}</a>;
  }
  return <Link to={node.href} className="text-brand-leaf hover:underline">{node.text}</Link>;
}
