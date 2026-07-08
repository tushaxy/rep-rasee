---
name: BizInvoice stack
description: Full-stack architecture of the BizInvoice mobile app — avoid re-discovering this.
---

## Stack
- **Mobile**: Expo (Expo Router, React Query, @workspace/api-client-react hooks)
- **Backend**: Express 5 + Drizzle ORM + PostgreSQL in artifacts/api-server
- **Codegen**: OpenAPI spec at lib/api-spec/openapi.yaml → Orval generates hooks in lib/api-client-react

## Color palette
- Primary: #4F46E5 indigo (dark: #818CF8)
- Accent: #00C896 emerald (dark: #00D4A8)
- Dark background: #080812
- `colors.light` and `colors.dark` have identical key sets including: text, tint, background, card, primary, secondary, muted, accent, destructive, border, input, success, warning, info, surface, overlay, shadow

## Schema tables (lib/db/src/schema/)
- businessProfileTable, categoriesTable, productsTable, customersTable, invoicesTable, invoiceItemsTable

## Navigation structure (Expo Router)
- app/(tabs)/_layout.tsx — 5 tabs: index, inventory, invoices, customers, reports
- app/inventory/new.tsx, app/inventory/[id].tsx — stack screens (registered in root _layout.tsx)
- Same pattern for invoices/ and customers/
- app/settings.tsx, app/onboarding.tsx — registered in root Stack

## Key patterns
- Business profile check in dashboard triggers router.replace('/onboarding') on isError
- setBaseUrl called at module level in app/_layout.tsx (outside component)
- Tab bar uses isLiquidGlassAvailable() → NativeTabs (iOS 26) or classic Tabs
