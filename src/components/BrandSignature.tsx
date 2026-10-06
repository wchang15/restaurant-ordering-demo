import Image from 'next/image';

type Props = {
  compact?: boolean;
  align?: 'left' | 'center';
  showTagline?: boolean;
  hideText?: boolean;
};

export default function BrandSignature({
  compact = false,
  align = 'center',
  showTagline = true,
  hideText = false,
}: Props) {
  const wrapper = align === 'left' ? 'items-start text-left' : 'items-center text-center';

  return (
    <div className={`flex flex-col ${wrapper}`}>
      <div
        className={`relative overflow-hidden rounded-[26px] border border-white/12 bg-white shadow-[0_18px_45px_rgba(0,0,0,0.22)] ${
          compact ? 'px-3 py-2' : 'px-4 py-3'
        }`}
      >
        <Image
          src="/hamjibak-logo.png"
          alt="Hahmjibach logo"
          width={compact ? 220 : 280}
          height={compact ? 92 : 116}
          className="h-auto w-auto max-w-full"
          priority
        />
      </div>

      {!hideText ? (
        <>
          <div className={compact ? 'mt-3' : 'mt-5'}>
            <p
              className={`font-medium uppercase tracking-[0.38em] text-white/58 ${
                compact ? 'text-[10px]' : 'text-[11px]'
              }`}
            >
              Korean BBQ
            </p>
            <h1
              className={`mt-2 font-semibold tracking-[0.05em] text-white ${
                compact ? 'text-2xl' : 'text-4xl'
              }`}
            >
              Hahmjibach
            </h1>
            <p
              className={`mt-1 font-medium tracking-[0.22em] text-white/82 ${
                compact ? 'text-sm' : 'text-lg'
              }`}
            >
              함지박
            </p>
          </div>

          {showTagline ? (
            <p
              className={`max-w-xs text-white/72 ${
                compact ? 'mt-3 text-xs leading-5' : 'mt-5 text-sm leading-6'
              }`}
            >
              Modern Korean dining with a warmer first impression.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}