import { AlertTriangle, X } from 'lucide-react'

interface Props {
  isOpen: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: Props) {
  if (!isOpen) return null

  const isDanger = variant === 'danger'

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-elevated rounded-2xl p-6 w-full max-w-md shadow-2xl border border-surface-highlight space-y-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isDanger ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
              <AlertTriangle size={22} className={isDanger ? 'text-red-400' : 'text-amber-400'} />
            </div>
            <h2 className="text-lg font-bold text-primary">{title}</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-subtext hover:text-primary hover:bg-surface-highlight transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <p className="text-sm text-subtext leading-relaxed pl-[52px]">
          {description}
        </p>

        {/* Actions */}
        <div className="flex gap-3 pt-2 pl-[52px]">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-full border border-surface-highlight text-sm font-medium hover:bg-surface-highlight transition-colors text-primary cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-full text-sm font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
              isDanger
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-black'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
