/**
 * Shown when saving a book address fails. The save used to fail silently
 * (addAddress returned null and the form just closed).
 */
export function AddressSaveAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-red-700 mt-3">{message}</p>
  );
}
