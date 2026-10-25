import { OrderValidationError, OutOfStockError } from "../errors.js";
import { applyCoupon } from "./coupons.js";
import { chargePayment } from "./payments.js";
import { validateItems } from "./validation.js";

export async function createOrder(store, request) {
  const problems = validateItems(store, request.items);
  if (problems.length > 0) {
    throw new OrderValidationError(problems);
  }

  let totalCents = 0;
  const reserved = [];
  for (const item of request.items) {
    const product = store.getProduct(item.product_id);
    if (product.stock < item.quantity) {
      throw new OutOfStockError(product.name);
    }

    // Prices like 19.99 * 100 come out as 1998.9999..., so round instead of
    // cutting off the decimals.
    const unitPriceCents = Math.round(product.price * 100);
    totalCents += unitPriceCents * item.quantity;
    reserved.push({
      product,
      quantity: item.quantity,
      unitPriceCents,
    });
  }

  if (request.coupon_code) {
    totalCents = applyCoupon(store, request.coupon_code, totalCents);
  }

  // Take the stock now, before we wait on payment. If we wait first, other
  // orders can sneak in during the wait and grab the same units.
  for (const reservation of reserved) {
    reservation.product.stock -= reservation.quantity;
  }

  try {
    await chargePayment(totalCents);
  } catch (error) {
    // Payment failed, so put the stock back.
    for (const reservation of reserved) {
      reservation.product.stock += reservation.quantity;
    }
    throw error;
  }

  return store.saveOrder({
    id: 0,
    total_cents: totalCents,
    coupon_code: request.coupon_code ?? null,
    status: "confirmed",
    items: reserved.map((reservation) => ({
      product_id: reservation.product.id,
      quantity: reservation.quantity,
      unit_price_cents: reservation.unitPriceCents,
    })),
  });
}
