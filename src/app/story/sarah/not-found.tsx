import Link from "next/link";
import { FutureYouWordmark } from "../../../ui/brand/future-you-wordmark";

export default function SarahStoryNotFound() {
  return (
    <main className="fy-story-not-found">
      <FutureYouWordmark/>
      <p className="eyebrow">Unavailable</p>
      <h1>That page could not be found</h1>
      <p>The requested page is not available in this environment.</p>
      <Link href="/welcome">Return to Future You</Link>
    </main>
  );
}
