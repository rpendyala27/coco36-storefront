/** A short cancel reason, then one refund line per status. */
export function OrderStatusNotes({
  reason,
  refunds,
}: {
  reason: string | null;
  refunds: string[];
}) {
  if (!reason && refunds.length === 0) return null;
  return (
    <div className="mt-2 space-y-1" data-testid="order-status-notes">
      {reason ? <p className="text-xs text-brand-muted">{reason}</p> : null}
      {refunds.map((line, index) => (
        <p key={`${index}-${line}`} className="text-sm text-brand-muted">{line}</p>
      ))}
    </div>
  );
}
