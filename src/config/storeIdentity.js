function rawStoreName(row) {
  return String(row?.['Store ID'] || row?.['Store Name'] || row?.['Merchant Business Name'] || row?.['Merchant Name'] || '').trim();
}

export function normalizeStoreKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slug(value) {
  return normalizeStoreKey(value).replace(/\s+/g, '-');
}

export function canonicalStoreLabel(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

export function buildStoreRegistry(onboardingRows) {
  const registry = new Map();
  onboardingRows.forEach((row) => {
    const name = row['Merchant Business Name'] || row['Store Name'] || row['Merchant Name'];
    const key = normalizeStoreKey(name);
    if (!key || registry.has(key)) return;
    const suppliedId = String(row['Store ID'] || '').trim();
    registry.set(key, {
      id: suppliedId || `store-${slug(name)}`,
      name: canonicalStoreLabel(name),
      originalOwnerId: row._agentId || null,
      originalOwnerName: row._agentName || row['Field Agent Name'] || '',
    });
  });
  return registry;
}

export function attachStoreIdentity(row, registry = new Map()) {
  const suppliedId = String(row?.['Store ID'] || '').trim();
  const name = rawStoreName(row);
  const key = normalizeStoreKey(name);
  const registered = registry.get(key);
  const id = suppliedId || registered?.id || (key ? `store-${slug(name)}` : null);
  if (!id) return row;
  return {
    ...row,
    _storeId: id,
    _storeName: registered?.name || canonicalStoreLabel(name),
    _originalOwnerId: registered?.originalOwnerId || row?._originalOwnerId || null,
    _originalOwnerName: registered?.originalOwnerName || row?._originalOwnerName || '',
  };
}

export function storeId(row) {
  return row?._storeId || attachStoreIdentity(row)?._storeId || null;
}

export function storeName(row) {
  return row?._storeName || canonicalStoreLabel(rawStoreName(row)) || 'Unnamed Store';
}
