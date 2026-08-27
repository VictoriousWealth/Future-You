import Image from "next/image";

function FutureYouAngularSymbol({ withBackdrop }: Readonly<{ withBackdrop: boolean }>) {
  return (
    <span className="fy-angular-symbol" aria-hidden="true">
      {withBackdrop ? (
        <Image
          className="fy-angular-backdrop"
          src="/images/future-you-auth-backdrop.svg"
          alt=""
          width={1280}
          height={1211}
          loading="eager"
        />
      ) : null}
      <Image
        className="fy-angular-artwork"
        src="/images/future-you-logo.svg"
        alt=""
        width={109}
        height={135}
        loading="eager"
      />
    </span>
  );
}

export function FutureYouWordmark({
  showAI = false,
  symbolBackdrop = true
}: Readonly<{
  showAI?: boolean;
  symbolBackdrop?: boolean;
}>) {
  return (
    <span className="fy-wordmark-lockup">
      <FutureYouAngularSymbol withBackdrop={symbolBackdrop}/>
      <span className="fy-wordmark-copy"><span>FUTURE</span><strong>YOU</strong>{showAI ? <i>AI</i> : null}</span>
    </span>
  );
}
