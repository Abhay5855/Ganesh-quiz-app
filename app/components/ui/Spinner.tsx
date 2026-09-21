export const Spinner = ({ label = "Loading" }: { label?: string }) => (
  <div
    className="flex items-center justify-center gap-3 py-8 font-sans text-festival-muted"
    role="status"
    aria-live="polite"
  >
    <span className="h-6 w-6 animate-spin rounded-full border-2 border-festival-saffron border-t-transparent" />
    <span className="text-sm font-medium">{label}</span>
  </div>
);
