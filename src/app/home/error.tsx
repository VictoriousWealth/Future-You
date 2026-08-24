"use client";

import { ProductRouteError } from "../../ui/product-shell/product-route-state";

export default function ErrorPage({ reset }: Readonly<{ error: Error; reset: () => void }>) {
  return <ProductRouteError active="home" reset={reset}/>;
}
