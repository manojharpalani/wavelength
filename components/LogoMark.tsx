export function LogoMark({ className = "logo-mark" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 12c1.4-4.2 2.8-6.3 4.3-6.3s2.9 8.6 4.4 8.6 2.9-6.3 4.4-6.3 2.6 3.7 4.1 3.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
