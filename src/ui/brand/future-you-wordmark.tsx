import Image from "next/image";

export function FutureYouAngularSymbol({
  fullSize = false,
  withBackdrop = false
}: Readonly<{
  fullSize?: boolean;
  withBackdrop?: boolean;
}>) {
  return (
    <span className={fullSize ? "auth-brand-symbol" : "fy-angular-symbol"} aria-hidden="true">
      {withBackdrop ? (
        <Image
          className="fy-angular-backdrop"
          src="/images/future-you-auth-backdrop.svg"
          alt=""
          width={1280}
          height={1211}
        />
      ) : null}
      <Image className="fy-angular-artwork" src="/images/future-you-logo.svg" alt="" width={109} height={135}/>
    </span>
  );
}

export function FutureYouWordmark({
  showAI = false,
  symbolBackdrop = false
}: Readonly<{
  showAI?: boolean;
  symbolBackdrop?: boolean;
}>) {
  return (
    <>
      <FutureYouAngularSymbol withBackdrop={symbolBackdrop}/>
      <span className="fy-wordmark-copy"><span>FUTURE</span><strong>YOU</strong>{showAI ? <i>AI</i> : null}</span>
    </>
  );
}
