import { avatarToneClass, initialsFromName } from "@/lib/format/person";
import { cn } from "@/utils";

const SIZE_CLASS = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
} as const;

/** Avatar circular com iniciais e cor estável derivada do nome. */
export function PersonAvatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        SIZE_CLASS[size],
        avatarToneClass(name),
        className,
      )}
    >
      {initialsFromName(name)}
    </span>
  );
}
