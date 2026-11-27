/** Plain cancel and refund sentences under an order. Empty when there is nothing more to say. */
export function OrderStatusNotes({
  lines,
  className = 'text-sm',
}: {
  lines: string[];
  className?: string;
}) {
  if (lines.length === 0) return null;
  return (
    <div className="mt-2 space-y-1" data-testid="order-status-notes">
      {lines.map((line, index) => (
        <p key={`${index}-${line}`} className={`${className} text-brand-muted`}>{line}</p>
      ))}
    </div>
  );
}
