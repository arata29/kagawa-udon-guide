import Image from "next/image";

type Props = {
  className?: string;
};

export default function UdonIcon({ className }: Props) {
  return (
    <Image
      src="/icon-192.png"
      alt=""
      aria-hidden="true"
      className={className}
      unoptimized
      loading="eager"
      width={24}
      height={24}
    />
  );
}
