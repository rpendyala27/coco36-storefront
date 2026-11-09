import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { infoPage, type InfoSection } from '../content/infoPages';
import { useStoreConfig } from '../lib/storeConfig';
import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from '../lib/supportContact';
import { staticPageCrumbs } from '../seo/meta';

/**
 * /about, /contact, /faq, /shipping, /returns.
 * Head (title, description, canonical, breadcrumb JSON-LD, and FAQPage on
 * /faq) comes from STATIC_PAGES via ScrollToTop, built from the same
 * infoPages module this component renders. No contact form: email and phone
 * are links.
 */
export function InfoPage({ path }: { path: string }) {
  const page = infoPage(path);
  const cfg = useStoreConfig();
  if (!page) return null;

  const sections = page.sections(cfg);
  const faqs = page.faqs?.(cfg) ?? [];
  const crumbs = staticPageCrumbs(path) ?? [
    { name: 'Home', path: '/' },
    { name: page.crumb, path },
  ];

  return (
    <div className="bg-brand-paper pt-20 min-h-screen">
      <article className="max-w-3xl mx-auto px-6 pt-8 pb-16">
        <Breadcrumbs crumbs={crumbs} />
        <p className="eyebrow text-brand-leaf mt-8 mb-3">{page.eyebrow}</p>
        <h1 className="font-display text-4xl md:text-5xl leading-[1.05] text-brand-forest">{page.h1}</h1>

        {page.showContactList && (
          <ul className="mt-6 space-y-2 text-lg text-brand-ink">
            <li>
              Email:{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-leaf hover:underline">{SUPPORT_EMAIL}</a>
            </li>
            <li>
              Phone:{' '}
              <a href={SUPPORT_PHONE_TEL} className="text-brand-leaf hover:underline">{SUPPORT_PHONE_DISPLAY}</a>
            </li>
          </ul>
        )}

        {sections.map((section, i) => (
          <Fragment key={section.heading ?? section.todo ?? i}>
            <SectionBlock section={section} />
          </Fragment>
        ))}

        {faqs.length > 0 && (
          <section aria-labelledby="info-faq" className="mt-12">
            <h2 id="info-faq" className="font-display text-3xl text-brand-forest mb-6">Frequently asked questions</h2>
            <div className="divide-y divide-brand-line border-y border-brand-line">
              {faqs.map((f) => (
                <div key={f.q} className="py-5">
                  <h3 className="font-display font-bold text-lg text-brand-forest">{f.q}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-brand-ink/80"><RichText text={f.a} /></p>
                </div>
              ))}
            </div>
          </section>
        )}

        <nav aria-label="Related pages" className="mt-12">
          <h2 className="eyebrow mb-4">On this site</h2>
          <ul className="flex flex-wrap gap-2">
            {page.related.map((l) => (
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

function SectionBlock({ section }: { section: InfoSection }) {
  if (!section.heading && !section.paragraphs?.length && !section.bullets?.length && section.todo) {
    return <OwnerTodo>{section.todo}</OwnerTodo>;
  }
  return (
    <section className="mt-10">
      {section.heading && (
        <h2 className="font-display text-2xl md:text-3xl text-brand-forest mb-3">{section.heading}</h2>
      )}
      {section.paragraphs?.map((p) => (
        <p key={p} className="mt-3 text-[16px] leading-relaxed text-brand-ink/80"><RichText text={p} /></p>
      ))}
      {section.bullets && (
        <ul className="mt-3 list-disc pl-6 space-y-1 text-[16px] leading-relaxed text-brand-ink/80">
          {section.bullets.map((b) => <li key={b}><RichText text={b} /></li>)}
        </ul>
      )}
      {section.todo && <OwnerTodo>{section.todo}</OwnerTodo>}
    </section>
  );
}

function OwnerTodo({ children }: { children: string }) {
  return (
    <aside className="mt-4 rounded-xl border border-dashed border-brand-gold bg-brand-surface px-4 py-3" aria-label="TODO for the owner">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-gold-deep mb-1">TODO for the owner</p>
      <p className="text-sm leading-relaxed text-brand-ink/80">{children}</p>
    </aside>
  );
}

function RichText({ text }: { text: string }) {
  const re = new RegExp(`(${SUPPORT_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${SUPPORT_PHONE_DISPLAY})`, 'g');
  return (
    <>
      {text.split(re).map((part, i) => {
        if (part === SUPPORT_EMAIL) {
          return <a key={i} href={`mailto:${part}`} className="text-brand-leaf hover:underline">{part}</a>;
        }
        if (part === SUPPORT_PHONE_DISPLAY) {
          return <a key={i} href={SUPPORT_PHONE_TEL} className="text-brand-leaf hover:underline">{part}</a>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
