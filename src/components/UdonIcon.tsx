type Props = {
  className?: string;
};

export default function UdonIcon({ className }: Props) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 13h16" />
      <path d="M6 13c0 3.1 3.1 5.5 6 5.5s6-2.4 6-5.5" />
      <path d="M8 4c0 1.8-1 2.2-1 4" />
      <path d="M12 4c0 1.8-1 2.2-1 4" />
      <path d="M16 4c0 1.8-1 2.2-1 4" />
    </svg>
  );
}
