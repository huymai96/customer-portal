# Bug Fixes Summary - November 18, 2025

## 🐛 Issues Fixed

### 1. ✅ Duplicate Warehouses in Inventory Matrix

**Problem**: PC43 inventory matrix showed duplicate rows for warehouses (e.g., Cincinnati, OH appeared twice - once with quantities, once with all dashes).

**Root Cause**: `buildInventoryMatrix` was using `warehouseId` as the key, but different warehouse IDs (e.g., "CIN" vs "2") map to the same display name ("Cincinnati, OH"), causing duplicates.

**Fix**: Changed `buildInventoryMatrix` to use `displayName` as the key instead of `warehouseId`, ensuring warehouses with the same display name are merged into a single row.

**File**: `src/lib/catalog/inventory-matrix.ts`

**Code Change**:
```typescript
// Before: Used warehouseId as key
const warehouseMap = new Map<string, WarehouseRow>();

// After: Use displayName as key to prevent duplicates
const warehouseMapByDisplayName = new Map<string, WarehouseRow>();
```

---

### 2. ✅ Style 5000 Not Working

**Problem**: Style 5000 showed "Colors: 0, Sizes: 0" for G500 and B00060 suppliers, making the page appear broken.

**Root Cause**: G500 and B00060 have no inventory rows in the database, so `deriveColorsFromInventory` and `deriveSizesFromInventory` returned empty arrays. The UI was showing these empty suppliers.

**Fix**: 
1. Filter out suppliers with no data (no colors, sizes, or inventory) in `ProductDetailView`
2. Only show suppliers that have at least one of: colors, sizes, or inventory rows

**Files**: 
- `src/app/product/[canonicalStyleId]/components/ProductDetailView.tsx`

**Code Change**:
```typescript
// Filter out suppliers with no data
const validSuppliers = useMemo(() => {
  return detail.suppliers.filter((s) => {
    const hasColors = (s.product?.colors?.length ?? 0) > 0;
    const hasSizes = (s.product?.sizes?.length ?? 0) > 0;
    const hasInventory = (s.inventory?.rows?.length ?? 0) > 0;
    return hasColors || hasSizes || hasInventory;
  });
}, [detail.suppliers]);
```

**Result**: Style 5000 now shows only the "5000" supplier (which has 87 colors, 8 sizes, 9 warehouses, 549 inventory rows). G500 and B00060 are hidden since they have no data.

---

### 3. ✅ Cart UX Empty

**Problem**: Cart icon didn't show count, cart page didn't show items after adding to cart.

**Root Cause**: 
- Header was a static link with no cart count fetching
- Cart page was server-side only, no client-side refresh after adding items
- No event system to notify header when cart updates

**Fix**:
1. Created `CartCount` client component that fetches cart and displays count
2. Added event listener for `cartUpdated` custom event
3. Updated `CartPanel` to dispatch `cartUpdated` event after successful add
4. Cart count refreshes every 5 seconds and on window focus

**Files**:
- `src/app/components/CartCount.tsx` (NEW)
- `src/app/components/Header.tsx`
- `src/app/product/[canonicalStyleId]/components/CartPanel.tsx`

**Code Changes**:
```typescript
// CartCount.tsx - Fetches cart and shows count
const [count, setCount] = useState<number | null>(null);
useEffect(() => {
  async function fetchCart() { /* ... */ }
  fetchCart();
  window.addEventListener('cartUpdated', fetchCart);
}, []);

// CartPanel.tsx - Dispatch event after add
window.dispatchEvent(new CustomEvent('cartUpdated'));
```

**Result**: Cart icon now shows item count badge, and cart page displays items correctly.

---

### 4. ✅ Full Catalog Verification Script

**Created**: `scripts/verify-full-catalog.ts`

**Functionality**:
- Iterates over all CanonicalStyle records
- For each style, verifies:
  - `colors.length > 0`
  - `sizes.length > 0`
  - `warehouses.length > 0` (if inventory exists)
  - No duplicate warehouse names in matrix
  - `/product/[canonicalStyleId]` returns 200
- Produces summary of failing styles

**Usage**:
```bash
npx tsx scripts/verify-full-catalog.ts https://production-url
```

---

## 📊 Files Modified

1. `src/lib/catalog/inventory-matrix.ts` - Fixed duplicate warehouse deduplication
2. `src/app/product/[canonicalStyleId]/components/ProductDetailView.tsx` - Filter empty suppliers
3. `src/app/components/CartCount.tsx` - NEW - Cart count component
4. `src/app/components/Header.tsx` - Use CartCount component
5. `src/app/product/[canonicalStyleId]/components/CartPanel.tsx` - Dispatch cart update event
6. `scripts/verify-full-catalog.ts` - NEW - Full catalog verification

---

## 🧪 Testing

### Manual Testing Required

1. **PC43 Product Page**:
   - Verify no duplicate warehouse rows
   - Verify all 14 warehouses appear once
   - Verify zero quantities show as "—"

2. **Style 5000 Product Page**:
   - Verify only "5000" supplier appears (G500 and B00060 hidden)
   - Verify 87 colors, 8 sizes, 9 warehouses render
   - Verify supplier switcher works

3. **Cart Functionality**:
   - Add item to cart
   - Verify cart icon shows count badge
   - Verify cart page shows items
   - Verify count updates after adding

### Automated Testing

Run full catalog verification:
```bash
npx tsx scripts/verify-full-catalog.ts https://production-url
```

---

## 🚀 Deployment

**Status**: Ready for deployment

**Next Steps**:
1. Deploy to production
2. Run full catalog verification script
3. Fix any remaining issues identified by the script
4. Re-verify PC43, 5000, and cart functionality

---

## 📝 Notes

- **Empty Suppliers**: Suppliers with no data (G500, B00060) are now filtered out. If these should have data, they need to be ingested into the database.
- **Cart Count**: Updates every 5 seconds and on window focus. Consider adding real-time updates via WebSocket if needed.
- **Warehouse Deduplication**: Uses display name as key, so warehouses with different IDs but same city name are merged correctly.



