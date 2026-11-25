import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/** Base para ícones de traço (24×24, `currentColor`), no estilo do protótipo. */
function StrokeIcon({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Símbolo da marca Nexo (path do frame "Nexo Mark" em `nexo.pen`). */
export function NexoMark(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" fill="currentColor" aria-hidden="true" {...props}>
      <path
        transform="translate(1.806 3.682)"
        d="M21.763 0.24493l-3.374 1.687c-0.623 0.308-0.973 0.903-0.973 1.631l0 6.293-11.193-9.429c-0.623-0.469-1.372-0.553-2.03-0.245l-3.185 1.631c-0.651 0.322-1.008 0.924-1.008 1.673l0 15.218c0 1.477 1.526 2.289 2.716 1.785l3.073-1.617c0.693-0.322 1.057-0.952 1.057-1.722l0-7.7 11.732 10.591c0.602 0.546 1.421 0.679 2.086 0.364l2.786-1.505c0.602-0.315 0.938-0.931 0.938-1.68l0-15.288c0-1.463-1.505-2.275-2.625-1.687z"
      />
    </svg>
  );
}

export const ChatIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 20.5l1.4-4.3A8.2 8.2 0 0 1 3 11.5 8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5Z" />
  </StrokeIcon>
);

export const UserIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </StrokeIcon>
);

export const LogoutIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </StrokeIcon>
);

export const MailIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </StrokeIcon>
);

export const LockIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </StrokeIcon>
);

export const EyeIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </StrokeIcon>
);

export const EyeOffIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.1" />
    <path d="M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="m2 2 20 20" />
  </StrokeIcon>
);

export const ArrowRightIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </StrokeIcon>
);

export const ArrowUpIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <path d="M12 19V5" />
    <path d="m6 11 6-6 6 6" />
  </StrokeIcon>
);

export const ArrowUpRightIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <path d="M7 17 17 7" />
    <path d="M8 7h9v9" />
  </StrokeIcon>
);

export const SendIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
  </StrokeIcon>
);

export const SearchIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </StrokeIcon>
);

export const KeyIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="m10.7 12.3 9.3-9.3" />
    <path d="m16 7 3 3" />
    <path d="m14 9 2 2" />
  </StrokeIcon>
);

export const ResetIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </StrokeIcon>
);

export const CheckIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <path d="m5 12 5 5L20 7" />
  </StrokeIcon>
);

export const CheckCheckIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <path d="m2 12 5 5L17 7" />
    <path d="m12 16 1 1L23 7" />
  </StrokeIcon>
);

export const SwapIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <path d="M4 8h16" />
    <path d="m16 4 4 4-4 4" />
    <path d="M20 16H4" />
    <path d="m8 12-4 4 4 4" />
  </StrokeIcon>
);

export const HeadsetIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
    <rect x="3" y="14" width="4" height="6" rx="1.5" />
    <rect x="17" y="14" width="4" height="6" rx="1.5" />
  </StrokeIcon>
);

export const HandIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <path d="M18 11V6a2 2 0 0 0-4 0v5" />
    <path d="M14 10V4a2 2 0 0 0-4 0v6" />
    <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
    <path d="M18 8a2 2 0 0 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15" />
  </StrokeIcon>
);

export const BotIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <rect x="4" y="8" width="16" height="12" rx="3" />
    <path d="M12 4v4" />
    <path d="M9 14h.01" />
    <path d="M15 14h.01" />
  </StrokeIcon>
);

export const XCircleIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </StrokeIcon>
);

export const CheckCircleIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </StrokeIcon>
);

export const MoreVerticalIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="19" r="1" />
  </StrokeIcon>
);

export const CloseIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </StrokeIcon>
);

export const ChevronRightIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <path d="m9 6 6 6-6 6" />
  </StrokeIcon>
);
