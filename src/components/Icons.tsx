import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

// ── Shared defaults ─────────────────────────────────────────────────

const defaults: IconProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
};

function icon(size: number, children: React.ReactNode) {
  const Icon = ({ ...props }: IconProps) => (
    <svg width={size} height={size} {...defaults} {...props}>
      {children}
    </svg>
  );
  Icon.displayName = 'Icon';
  return Icon;
}

// ── Icons ───────────────────────────────────────────────────────────

/** Sidebar panel (rect + vertical divider) */
export const SidebarIcon = icon(
  18,
  <>
    <rect width='18' height='18' x='3' y='3' rx='2' />
    <path d='M9 3v18' />
  </>,
);

/** Folder with plus sign */
export const FolderPlusIcon = icon(
  18,
  <>
    <path d='M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z' />
    <path d='M12 10v6' />
    <path d='M9 13h6' />
  </>,
);

/** Pencil / compose */
export const PencilIcon = icon(
  14,
  <>
    <path d='M12 20h9' />
    <path d='M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.855z' />
  </>,
);

/** Retry / refresh (half-circle arrow) */
export const RetryIcon = icon(
  12,
  <>
    <path d='M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' />
    <path d='M3 3v5h5' />
  </>,
);

/** Full refresh (double half-circle arrows) */
export const RefreshIcon = icon(
  13,
  <>
    <path d='M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' />
    <path d='M3 3v5h5' />
    <path d='M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16' />
    <path d='M16 16h5v5' />
  </>,
);

/** Plus sign */
export const PlusIcon = icon(
  16,
  <>
    <path d='M12 5v14' />
    <path d='M5 12h14' />
  </>,
);

/** X / close */
export const CloseIcon = icon(
  16,
  <>
    <path d='M18 6 6 18' />
    <path d='m6 6 12 12' />
  </>,
);

/** Trash can */
export const TrashIcon = icon(
  13,
  <>
    <path d='M3 6h18' />
    <path d='M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6' />
    <path d='M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2' />
  </>,
);

/** Chevron down */
export const ChevronDownIcon = icon(12, <path d='m6 9 6 6 6-6' />);

/** Chevron right */
export const ChevronRightIcon = icon(12, <polyline points='9 18 15 12 9 6' />);

/** Checkmark */
export const CheckIcon = icon(14, <polyline points='20 6 9 17 4 12' />);

/** Copy / clipboard */
export const CopyIcon = icon(
  14,
  <>
    <rect width='14' height='14' x='8' y='8' rx='2' ry='2' />
    <path d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' />
  </>,
);

/** Small checkmark (for success badges) */
export const CheckSmallIcon = icon(12, <polyline points='20 6 9 17 4 12' />);

/** Circle alert (error) */
export const CircleAlertIcon = icon(
  16,
  <>
    <circle cx='12' cy='12' r='10' />
    <line x1='12' y1='8' x2='12' y2='12' />
    <line x1='12' y1='16' x2='12.01' y2='16' />
  </>,
);

/** Circle check (success) */
export const CircleCheckIcon = icon(
  16,
  <>
    <path d='M22 11.08V12a10 10 0 1 1-5.93-9.14' />
    <polyline points='22 4 12 14.01 9 11.01' />
  </>,
);

/** Circle info */
export const CircleInfoIcon = icon(
  16,
  <>
    <circle cx='12' cy='12' r='10' />
    <line x1='12' y1='16' x2='12' y2='12' />
    <line x1='12' y1='8' x2='12.01' y2='8' />
  </>,
);

/** Offline / wifi warning */
export const WifiOffIcon = icon(
  16,
  <>
    <path d='M12 9v4' />
    <path d='M12 17h.01' />
    <path d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-.274.868-.656 1.686-1.132 2.44' />
    <path d='m2 2 20 20' />
  </>,
);

/** File document */
export const FileIcon = icon(
  14,
  <>
    <path d='M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z' />
    <path d='M14 2v4a2 2 0 0 0 2 2h4' />
  </>,
);

/** Folder (plain) */
export const FolderIcon = icon(
  14,
  <path d='M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z' />,
);

/** Close (14px variant for smaller contexts) */
export const CloseSmallIcon = icon(
  14,
  <>
    <path d='M18 6 6 18' />
    <path d='m6 6 12 12' />
  </>,
);

/** Spinner (loading refresh, 14px) */
export const SpinnerIcon = icon(
  14,
  <>
    <path d='M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' />
    <path d='M3 3v5h5' />
    <path d='M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16' />
    <path d='M16 16h5v5' />
  </>,
);

/** Folder empty (24px for empty states) */
export const FolderEmptyIcon = icon(
  24,
  <path d='M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z' />,
);

/** Arrow left (back navigation) */
export const ArrowLeftIcon = icon(
  14,
  <>
    <path d='m12 19-7-7 7-7' />
    <path d='M19 12H5' />
  </>,
);
