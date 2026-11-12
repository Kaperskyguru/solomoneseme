/* eslint-disable @next/next/no-img-element */
import type { Product } from "@/config/schema";

// Config-driven: `icon` set -> <img>; unset -> neutral letter tile. A test asserts every configured icon file exists in public/.
export function ProductIcon({ product, size = 28 }: { product: Pick<Product, "name" | "icon">; size?: number }) {
  const style = { width: size, height: size };
  if (product.icon) {
    return <img src={product.icon} alt="" width={size} height={size} style={style} className="shrink-0 rounded-[8px] object-contain" />;
  }
  return (
    <span
      aria-hidden="true"
      style={{ ...style, fontSize: Math.round(size * 0.45) }}
      className="inline-flex shrink-0 items-center justify-center rounded-[8px] bg-surface font-semibold text-muted"
    >
      {product.name.charAt(0).toUpperCase()}
    </span>
  );
}
