import { CouponError } from "../errors.js";

// Coupon expiry dates look like 2030-01-01T00:00:00Z.
function parseTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`invalid timestamp: ${value}`);
  }
  return date;
}

export function applyCoupon(store, code, totalCents) {
  const coupon = store.getCoupon(code);
  if (coupon === undefined) {
    throw new CouponError(`unknown coupon code: ${code}`);
  }

  const expiresAt = parseTimestamp(coupon.expiresAt);
  if (expiresAt < new Date()) {
    throw new CouponError(`coupon has expired: ${code}`);
  }

  const discount = Math.floor((totalCents * coupon.percentOff) / 100);
  return totalCents - discount;
}
