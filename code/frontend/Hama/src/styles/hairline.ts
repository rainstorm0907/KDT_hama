export const hairline = {
  page:
    'bg-[linear-gradient(#f8f9fb_0_0),linear-gradient(90deg,rgba(17,24,39,0.035)_1px,transparent_1px),linear-gradient(rgba(17,24,39,0.035)_1px,transparent_1px)] bg-[size:auto,56px_56px,56px_56px]',
  header:
    'sticky top-0 z-[90] w-full border-b border-[#C9CFDA]/85 bg-[#F8F9FB]/82 shadow-[0_1px_0_rgba(255,255,255,0.92),0_10px_28px_rgba(29,29,31,0.045)] backdrop-blur-md',
  modalOverlay:
    'bg-white/18 backdrop-blur-sm',
  panel:
    'border border-[#C6CDD8]/90 bg-white/90 shadow-[0_20px_56px_rgba(29,29,31,0.085),inset_0_1px_0_rgba(255,255,255,0.96),inset_0_-1px_0_rgba(0,0,0,0.028)] backdrop-blur-md',
  panelSoft:
    'border border-[#C6CDD8]/88 bg-white/72 shadow-[0_14px_40px_rgba(29,29,31,0.05),inset_0_1px_0_rgba(255,255,255,0.94)] backdrop-blur-xl',
  card:
    'border border-[#C9CFDA]/92 bg-white/82 shadow-[0_12px_32px_rgba(29,29,31,0.052)] backdrop-blur-xl',
  cardHover:
    'hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(29,29,31,0.055)]',
  image: 'bg-[#F3F4F6]',
  control:
    'border border-[#C9CFDA] bg-white text-[#5F6368] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_18px_rgba(29,29,31,0.025)]',
  controlHover: 'hover:border-[#AEB6C2] hover:bg-[#FDFDFE] hover:text-[#1D1D1F]',
  controlActive:
    'border border-[#111827] bg-white text-[#111827] shadow-[inset_0_0_0_1px_rgba(17,24,39,0.68)]',
  primaryButton:
    'border border-black/10 bg-[#1D1D1F] text-white shadow-[0_8px_18px_rgba(29,29,31,0.1),inset_0_1px_0_rgba(255,255,255,0.16)] hover:bg-black active:border-black active:shadow-[0_8px_18px_rgba(29,29,31,0.1),inset_0_0_0_1px_rgba(0,0,0,0.65)]',
  secondaryButton:
    'border border-[#C9CFDA] bg-white text-[#1D1D1F] shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_8px_18px_rgba(29,29,31,0.04)] hover:border-[#AEB6C2] hover:bg-[#FDFDFE] active:border-black active:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.65),0_8px_18px_rgba(29,29,31,0.04)]',
  focus: 'focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2',
  focusWide: 'focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-4',
  mutedText: 'text-[#626873]',
  quietText: 'text-[#86868B]',
  status:
    'rounded-full border border-emerald-200/80 bg-emerald-50/70 px-3 py-1 text-xs font-black text-emerald-700/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]',
} as const;
