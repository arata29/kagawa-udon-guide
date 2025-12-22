type Props = {
  className?: string;
};

export default function UdonIcon({ className }: Props) {
  return (
    <img
      src="/icon-192.png"
      alt=""
      aria-hidden="true"
      className={className}
      loading="eager"
      decoding="async"
      width={24}
      height={24}
    />
  );
}
