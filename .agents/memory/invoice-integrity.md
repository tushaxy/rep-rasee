---
name: Invoice data integrity
description: Rules for maintaining financial and inventory consistency in invoice routes.
---

## Rules

**Create invoice**: Wrap invoice insert + item inserts + stock deduction in `db.transaction()`. Use `greatest(0, stock - qty)` to never go below zero.

**Update invoice**: Always recompute subtotal/taxAmount/grandTotal whenever `items`, `discountAmount`, or `shippingAmount` changes. If items not provided but discount/shipping changed, fetch existing items to recompute.

**Delete invoice**: Restore stock before deleting (`stock + qty`). Delete items first, then invoice header — both inside the same transaction.

**Business profile update**: Always include `where(eq(businessProfileTable.id, existing.id))` — never do an unbounded update.

**Why**: Partial failures (network drop mid-write) or discount-only updates can leave grandTotal stale and stock counts permanently wrong. Transactions and always-recalculate eliminate both failure modes.
