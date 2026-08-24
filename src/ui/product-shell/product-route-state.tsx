"use client";

import type { ProductDestination } from "./product-shell";
import { ProductShell } from "./product-shell";
import { SurfaceError, SurfaceLoading } from "./surface-state";

export function ProductRouteLoading({ active, label }: Readonly<{
  active: ProductDestination;
  label: string;
}>) {
  return <ProductShell active={active}><SurfaceLoading label={label}/></ProductShell>;
}

export function ProductRouteError({ active, reset }: Readonly<{
  active: ProductDestination;
  reset: () => void;
}>) {
  return (
    <ProductShell active={active}>
      <SurfaceError
        message="This private page could not be loaded. No financial result has been changed."
        retry={reset}
      />
    </ProductShell>
  );
}
