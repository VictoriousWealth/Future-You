import Image from "next/image";

export function FutureYouAngularSymbol({ fullSize = false }: Readonly<{ fullSize?: boolean }>) {
  return (
    <span className={fullSize ? "auth-brand-symbol" : "fy-angular-symbol"} aria-hidden="true">
      <Image src="/images/future-you-logo.png" alt="" width={109} height={135}/>
    </span>
  );
}

export function FutureYouWordmark({ showAI = false }: Readonly<{ showAI?: boolean }>) {
  return (
    <>
      <FutureYouAngularSymbol/>
      <span className="fy-wordmark-copy"><span>FUTURE</span><strong>YOU</strong>{showAI ? <i>AI</i> : null}</span>
    </>
  );
}
