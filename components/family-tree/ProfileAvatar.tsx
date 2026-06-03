import { MdMan, MdWoman } from "react-icons/md";
import type { CSSProperties } from "react";
import type { MemberGender } from "./types";

type ProfileAvatarProps = {
  gender: MemberGender;
  className?: string;
  style?: CSSProperties;
  /** Kept for API compatibility; filled icons ignore stroke width. */
  strokeWidth?: number;
};

export function ProfileAvatar({
  gender,
  className,
  style,
}: ProfileAvatarProps) {
  const Icon = gender === "female" ? MdWoman : MdMan;

  return <Icon className={className} style={style} aria-hidden />;
}
