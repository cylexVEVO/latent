import { useState } from "react";

interface Props {
  currentPassword: string;
  onConfirm: (newPassword: string) => void;
  onClose: () => void;
}

export default function ChangePasswordModal({ currentPassword, onConfirm, onClose }: Props) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (current !== currentPassword) {
      setError("Current password is incorrect.");
      return;
    }
    if (next.length < 1) {
      setError("New password cannot be empty.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    onConfirm(next);
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white border border-neutral-200 rounded w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-900">Change password</h2>
          <button onClick={onClose} className="text-neutral-300 hover:text-neutral-500 text-xs cursor-pointer">
            Close
          </button>
        </div>
        <p className="text-xs text-neutral-400">
          The new password will be used the next time you export the vault.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-neutral-500">Current password</label>
            <input
              type="password"
              autoFocus
              value={current}
              onChange={(e) => { setCurrent(e.target.value); setError(null); }}
              className="w-full border border-neutral-200 rounded px-3 py-1.5 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-neutral-500">New password</label>
            <input
              type="password"
              value={next}
              onChange={(e) => { setNext(e.target.value); setError(null); }}
              className="w-full border border-neutral-200 rounded px-3 py-1.5 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-neutral-500">Confirm new password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(null); }}
              className="w-full border border-neutral-200 rounded px-3 py-1.5 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            className="w-full bg-neutral-900 hover:bg-neutral-700 text-white text-xs py-1.5 rounded font-medium transition-colors cursor-pointer"
          >
            Update password
          </button>
        </form>
      </div>
    </div>
  );
}
