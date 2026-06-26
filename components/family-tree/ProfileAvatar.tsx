import { MdMan, MdWoman } from "react-icons/md";
import type { CSSProperties } from "react";
import type { MemberGender } from "./types";

type ProfileAvatarProps = {
  gender: MemberGender;
  src?: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  /** Kept for API compatibility; filled icons ignore stroke width. */
  strokeWidth?: number;
};

export function ProfileAvatar({
  gender,
  src,
  alt = "",
  className,
  style,
}: ProfileAvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`rounded-full object-cover ${className ?? ""}`}
        style={style}
      />
    );
  }

  const Icon = gender === "female" ? MdWoman : MdMan;
  return <Icon className={className} style={style} aria-hidden />;
}
