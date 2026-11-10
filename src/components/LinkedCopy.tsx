import { Link } from 'react-router-dom';
import { textRuns } from '../content/linkify';

/** Renders `{label|url}` copy as text, in-app links, and external anchors. */
export function LinkedCopy({ text }: { text: string }) {
  return (
    <>
      {textRuns(text).map((run, i) => {
        if (!run.href) return <span key={i}>{run.text}</span>;
        if (run.href.startsWith('/')) {
          return <Link key={i} to={run.href} className="text-brand-leaf hover:underline">{run.text}</Link>;
        }
        const external = /^https?:/i.test(run.href);
        return (
          <a
            key={i}
            href={run.href}
            className="text-brand-leaf hover:underline"
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >{run.text}</a>
        );
      })}
    </>
  );
}
