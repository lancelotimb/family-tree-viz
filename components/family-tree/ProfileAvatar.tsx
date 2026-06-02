import { User } from "lucide-react";
import type { CSSProperties } from "react";
import type { MemberGender } from "./types";

type ProfileAvatarProps = {
  gender: MemberGender;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
};

/** Lucide-style silhouette with shoulder-length hair on both sides. */
function UserFemaleIcon({
  className,
  style,
  strokeWidth = 1.5,
}: Omit<ProfileAvatarProps, "gender">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
    >
      <path d="M8 13.5c0-4 1.6-6.5 4-7 2.4-.5 4 2.5 4 7 0 3-.8 6.5-2 9.5" />
      <path d="M16 13.5c0-4-1.6-6.5-4-7-2.4-.5-4 2.5-4 7 0 3 .8 6.5 2 9.5" />
      <circle cx="12" cy="8.5" r="3.25" />
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    </svg>
  );
}

export function ProfileAvatar({
  gender,
  className,
  style,
  strokeWidth,
}: ProfileAvatarProps) {
  if (gender === "female") {
    return (
      <UserFemaleIcon className={className} style={style} strokeWidth={strokeWidth} />
    );
  }
  return <User className={className} style={style} strokeWidth={strokeWidth} />;
}
