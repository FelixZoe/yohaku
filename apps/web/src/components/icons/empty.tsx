import type { FC } from 'react'

export const EmptyIcon: FC = () => (
  <div aria-hidden className="relative h-[60px] w-[76px]">
    <div className="absolute bottom-0 left-1 h-11 w-12 -rotate-6 rounded-[3px] border border-black/10 bg-paper shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-neutral-2" />

    <div className="absolute bottom-1 left-4 h-11 w-12 rotate-3 rounded-[3px] border border-black/10 bg-paper shadow-[0_1px_4px_rgba(0,0,0,0.05)] dark:border-white/10 dark:bg-neutral-2" />

    <div className="absolute bottom-2 left-6 h-11 w-12 overflow-hidden rounded-[3px] border border-black/10 bg-paper shadow-[0_2px_6px_rgba(0,0,0,0.04)] dark:border-white/10 dark:bg-neutral-2">
      <div
        className="absolute inset-[4px] rounded-[2px] opacity-80 dark:opacity-55"
        style={{
          backgroundImage: [
            'linear-gradient(90deg, rgba(216,96,122,0.24) 0 1px, transparent 1px)',
            'repeating-linear-gradient(180deg, transparent 0 5px, rgba(113,150,205,0.24) 5px 6px)',
          ].join(', '),
          backgroundPosition: '4px 0, 0 1px',
          backgroundRepeat: 'no-repeat, repeat',
          backgroundSize: '1px 100%, 100% 100%',
        }}
      />
    </div>

    <div
      className="absolute top-[10px] right-1 h-3.5 w-9 rotate-12 rounded-[2px] bg-teal-300/28 shadow-sm dark:bg-teal-600/22"
      style={{
        backgroundImage:
          'repeating-linear-gradient(90deg, transparent 0 12%, rgba(255,255,255,0.3) 12% 14%, transparent 14% 30%)',
      }}
    >
      <div
        className="absolute -left-0.5 top-0 bottom-0 w-1 bg-teal-300/28 dark:bg-teal-600/22"
        style={{
          clipPath:
            'polygon(100% 0%, 0% 25%, 100% 50%, 0% 75%, 100% 100%, 100% 100%, 100% 0%)',
        }}
      />
      <div
        className="absolute -right-0.5 top-0 bottom-0 w-1 bg-teal-300/28 dark:bg-teal-600/22"
        style={{
          clipPath:
            'polygon(0% 0%, 100% 25%, 0% 50%, 100% 75%, 0% 100%, 0% 100%, 0% 0%)',
        }}
      />
    </div>

    <div
      className="absolute -bottom-0.5 left-0 h-3 w-7 -rotate-6 rounded-[2px] bg-rose-200/38 shadow-sm dark:bg-rose-700/25"
      style={{
        backgroundImage:
          'repeating-linear-gradient(90deg, transparent 0 18%, rgba(255,255,255,0.28) 18% 20%, transparent 20% 38%)',
      }}
    >
      <div
        className="absolute -left-0.5 top-0 bottom-0 w-1 bg-rose-200/38 dark:bg-rose-700/25"
        style={{
          clipPath:
            'polygon(100% 0%, 0% 33%, 100% 66%, 0% 100%, 100% 100%, 100% 0%)',
        }}
      />
      <div
        className="absolute -right-0.5 top-0 bottom-0 w-1 bg-rose-200/38 dark:bg-rose-700/25"
        style={{
          clipPath:
            'polygon(0% 0%, 100% 33%, 0% 66%, 100% 100%, 0% 100%, 0% 0%)',
        }}
      />
    </div>
  </div>
)
