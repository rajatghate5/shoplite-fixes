function positiveInteger(raw, fallback) {
  if (raw === null || raw === "") {
    return fallback;
  }
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : fallback;
}

export function listProducts(store, url) {
  const page = positiveInteger(url.searchParams.get("page"), 1);
  const pageSize = positiveInteger(url.searchParams.get("page_size"), 10);
  const all = store.listProducts();

  // Pages start at 1, so page 1 should begin with the first product.
  const offset = (page - 1) * pageSize;
  return {
    page,
    page_size: pageSize,
    items: all.slice(offset, offset + pageSize),
  };
}
