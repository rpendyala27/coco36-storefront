import { existingAccountParts, type ExistingAccountAction } from '../lib/signup';

/**
 * Already-registered sign-up result. The sentence is the owner-approved copy;
 * Sign in, continue with Google, and reset your password are buttons styled
 * as links so they stay in the tab order.
 */
const linkButtonClass = [
  'inline cursor-pointer border-0 bg-transparent p-0 align-baseline',
  'text-inherit underline underline-offset-2',
  'hover:text-brand-leaf',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-leaf',
  'rounded-sm',
].join(' ');

export function AlreadyRegisteredNotice({
  onSignIn,
  onGoogle,
  onResetPassword,
}: {
  onSignIn: () => void;
  onGoogle: () => void;
  onResetPassword: () => void;
}) {
  const onAction: Record<ExistingAccountAction, () => void> = {
    sign_in: onSignIn,
    google: onGoogle,
    reset_password: onResetPassword,
  };

  const parts = existingAccountParts().map((part) => (
    part.action ? (
      <button
        key={part.action}
        type="button"
        data-action={part.action}
        onClick={onAction[part.action]}
        className={linkButtonClass}
      >{part.text}</button>
    ) : (
      <span key={part.text}>{part.text}</span>
    )
  ));

  return <p className="text-red-600 text-sm" role="alert">{parts}</p>;
}
