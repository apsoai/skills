---
name: billing-subscription
description: Add billing and subscription entities to a schema. Stripe-compatible plans, subscriptions, invoices, payment methods, and usage tracking. Triggers on "add billing", "subscription schema", "payment entities", "Stripe integration", "pricing plans", "usage tracking".
---

# Billing and Subscription Patterns

Add Stripe-compatible billing entities. Covers plans, subscriptions, invoices, payment methods, and usage-based billing.

## Pattern 1: Subscription Billing (Stripe)

The standard SaaS billing schema that maps to Stripe's data model.

```json
{
  "entities": [
    {
      "name": "Plan",
      "created_at": true,
      "updated_at": true,
      "fields": [
        { "name": "name", "type": "text", "length": 100 },
        { "name": "slug", "type": "text", "length": 50, "unique": true },
        { "name": "description", "type": "text", "nullable": true },
        { "name": "priceMonthly", "type": "decimal", "precision": 10, "scale": 2 },
        { "name": "priceYearly", "type": "decimal", "precision": 10, "scale": 2, "nullable": true },
        { "name": "currency", "type": "text", "length": 3, "default": "usd" },
        { "name": "stripePriceIdMonthly", "type": "text", "length": 255, "nullable": true },
        { "name": "stripePriceIdYearly", "type": "text", "length": 255, "nullable": true },
        { "name": "features", "type": "json-plain", "nullable": true },
        { "name": "limits", "type": "json-plain", "nullable": true },
        { "name": "sortOrder", "type": "integer", "default": "0" },
        { "name": "isActive", "type": "boolean", "default": "true" }
      ]
    },
    {
      "name": "Subscription",
      "created_at": true,
      "updated_at": true,
      "fields": [
        { "name": "stripeSubscriptionId", "type": "text", "length": 255, "unique": true },
        { "name": "status", "type": "enum", "values": ["active", "past_due", "canceled", "trialing", "incomplete", "paused"], "default": "active" },
        { "name": "billingCycle", "type": "enum", "values": ["monthly", "yearly"], "default": "monthly" },
        { "name": "currentPeriodStart", "type": "date" },
        { "name": "currentPeriodEnd", "type": "date" },
        { "name": "cancelAtPeriodEnd", "type": "boolean", "default": "false" },
        { "name": "trialEndsAt", "type": "date", "nullable": true }
      ],
      "indexes": [
        { "fields": ["stripeSubscriptionId"], "unique": true },
        { "fields": ["status"] }
      ]
    },
    {
      "name": "PaymentMethod",
      "created_at": true,
      "updated_at": true,
      "fields": [
        { "name": "stripePaymentMethodId", "type": "text", "length": 255 },
        { "name": "type", "type": "enum", "values": ["card", "bank_account", "other"], "default": "card" },
        { "name": "last4", "type": "text", "length": 4, "nullable": true },
        { "name": "brand", "type": "text", "length": 20, "nullable": true },
        { "name": "expiryMonth", "type": "integer", "nullable": true },
        { "name": "expiryYear", "type": "integer", "nullable": true },
        { "name": "isDefault", "type": "boolean", "default": "false" }
      ]
    },
    {
      "name": "Invoice",
      "created_at": true,
      "fields": [
        { "name": "stripeInvoiceId", "type": "text", "length": 255, "unique": true },
        { "name": "amountDue", "type": "decimal", "precision": 10, "scale": 2 },
        { "name": "amountPaid", "type": "decimal", "precision": 10, "scale": 2, "default": "0" },
        { "name": "currency", "type": "text", "length": 3, "default": "usd" },
        { "name": "status", "type": "enum", "values": ["draft", "open", "paid", "void", "uncollectible"], "default": "draft" },
        { "name": "invoiceUrl", "type": "text", "nullable": true },
        { "name": "paidAt", "type": "date", "nullable": true },
        { "name": "periodStart", "type": "date" },
        { "name": "periodEnd", "type": "date" }
      ]
    }
  ],
  "relationships": [
    { "from": "Organization", "to": "Subscription", "type": "OneToMany" },
    { "from": "Subscription", "to": "Organization", "type": "ManyToOne" },
    { "from": "Subscription", "to": "Plan", "type": "ManyToOne" },
    { "from": "Organization", "to": "PaymentMethod", "type": "OneToMany" },
    { "from": "PaymentMethod", "to": "Organization", "type": "ManyToOne" },
    { "from": "Organization", "to": "Invoice", "type": "OneToMany" },
    { "from": "Invoice", "to": "Organization", "type": "ManyToOne" },
    { "from": "Invoice", "to": "Subscription", "type": "ManyToOne" }
  ]
}
```

**The `limits` field** stores plan-specific limits as JSON:
```json
{
  "maxUsers": 10,
  "maxProjects": 50,
  "maxStorage": "10GB",
  "apiCallsPerMonth": 100000
}
```

## Pattern 2: Usage-Based Billing

Track metered usage for consumption-based pricing.

```json
{
  "entities": [
    {
      "name": "UsageRecord",
      "created_at": true,
      "fields": [
        { "name": "metric", "type": "text", "length": 50 },
        { "name": "quantity", "type": "decimal", "precision": 15, "scale": 4 },
        { "name": "unit", "type": "text", "length": 20 },
        { "name": "periodStart", "type": "date" },
        { "name": "periodEnd", "type": "date" },
        { "name": "metadata", "type": "json-plain", "nullable": true }
      ],
      "indexes": [
        { "fields": ["organizationId", "metric", "periodStart"] },
        { "fields": ["organizationId", "created_at"] }
      ]
    },
    {
      "name": "UsageLimit",
      "created_at": true,
      "updated_at": true,
      "fields": [
        { "name": "metric", "type": "text", "length": 50 },
        { "name": "limitValue", "type": "decimal", "precision": 15, "scale": 4 },
        { "name": "currentUsage", "type": "decimal", "precision": 15, "scale": 4, "default": "0" },
        { "name": "resetCycle", "type": "enum", "values": ["daily", "weekly", "monthly", "yearly"], "default": "monthly" },
        { "name": "lastResetAt", "type": "date" }
      ],
      "indexes": [
        { "fields": ["organizationId", "metric"], "unique": true }
      ]
    }
  ],
  "relationships": [
    { "from": "Organization", "to": "UsageRecord", "type": "OneToMany" },
    { "from": "UsageRecord", "to": "Organization", "type": "ManyToOne" },
    { "from": "Organization", "to": "UsageLimit", "type": "OneToMany" },
    { "from": "UsageLimit", "to": "Organization", "type": "ManyToOne" }
  ]
}
```

**When to use:** API platforms (charge per request), storage services (charge per GB), AI products (charge per token).

## Pattern 3: Organization Billing Fields

Add Stripe customer and billing fields directly to the Organization entity.

```json
{
  "name": "Organization",
  "created_at": true,
  "updated_at": true,
  "fields": [
    { "name": "name", "type": "text", "length": 100 },
    { "name": "slug", "type": "text", "length": 50, "unique": true },
    { "name": "stripeCustomerId", "type": "text", "length": 255, "nullable": true, "unique": true },
    { "name": "billingEmail", "type": "text", "length": 255, "is_email": true, "nullable": true },
    { "name": "billingName", "type": "text", "length": 100, "nullable": true },
    { "name": "taxId", "type": "text", "length": 50, "nullable": true }
  ]
}
```

This goes on the Organization entity, not as a separate table. Every org has at most one Stripe customer.

## Stripe Webhook Fields

Stripe sends events via webhooks. Store the `stripeSubscriptionId`, `stripeCustomerId`, `stripeInvoiceId`, and `stripePaymentMethodId` fields to correlate webhook payloads with your records. These are the join keys between your database and Stripe's.
