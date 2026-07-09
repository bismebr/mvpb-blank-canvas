import type { SVGProps } from "react";

const base = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const IconPin = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
);
export const IconStar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} fill="currentColor" stroke="none" {...p}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
);
export const IconChat = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} fill="currentColor" stroke="none" {...p}>
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.84 9.84 0 0 0 12.04 2zm0 18.15h-.01a8.23 8.23 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.41 5.83c0 4.55-3.7 8.25-8.23 8.25zm4.52-6.17c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.56.12-.16.25-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.04-.38-1.99-1.22-.74-.66-1.23-1.47-1.37-1.71-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.42l-.48-.01c-.16 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.57.12.16 1.75 2.67 4.23 3.75.59.25 1.05.4 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z"/>
  </svg>
);
export const IconInstagram = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
);
export const IconPhone = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
);
export const IconGlobe = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
);
export const IconX = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);
export const IconUsers = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
export const IconClipboardStar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <rect x="6" y="4" width="12" height="17" rx="2"/>
    <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/>
    <path d="M12 9.2l1.2 2.4 2.6.4-1.9 1.8.45 2.6L12 15.2l-2.35 1.2.45-2.6L8.2 12l2.6-.4z" fill="currentColor" stroke="none"/>
  </svg>
);
export const IconGrid = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5"/>
    <rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/>
    <rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </svg>
);
export const IconTiktok = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="currentColor" {...p}>
    <path d="M16.5 3c.3 2.2 1.6 3.8 3.8 4v2.4c-1.3.1-2.5-.2-3.8-.9v6.1c0 3.4-2.4 5.9-5.6 5.9-3 0-5.4-2.3-5.4-5.3 0-3.1 2.5-5.4 5.7-5.1v2.5c-.5-.1-1-.2-1.5-.1-1.3.2-2.2 1.2-2.1 2.6.1 1.3 1.1 2.2 2.4 2.1 1.3-.1 2.1-1.1 2.1-2.6V3h2.4z"/>
  </svg>
);
export const IconFacebook = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="currentColor" {...p}>
    <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z"/>
  </svg>
);
export const IconYoutube = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="currentColor" {...p}>
    <path d="M23 12s0-3.2-.4-4.7c-.2-.8-.9-1.5-1.7-1.7C19.4 5.2 12 5.2 12 5.2s-7.4 0-8.9.4c-.8.2-1.5.9-1.7 1.7C1 8.8 1 12 1 12s0 3.2.4 4.7c.2.8.9 1.5 1.7 1.7 1.5.4 8.9.4 8.9.4s7.4 0 8.9-.4c.8-.2 1.5-.9 1.7-1.7.4-1.5.4-4.7.4-4.7zM9.8 15.3V8.7l5.7 3.3-5.7 3.3z"/>
  </svg>
);
export const IconUserAvatar = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="currentColor" {...p}>
    <circle cx="12" cy="9" r="4" />
    <path d="M4 20c0-3.5 3.5-6 8-6s8 2.5 8 6" />
  </svg>
);

export const IconLink = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);