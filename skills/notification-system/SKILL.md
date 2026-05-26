---
name: notification-system
description: Add notification entities to a schema. In-app notifications, email digests, delivery preferences, and read/unread tracking. Triggers on "add notifications", "notification schema", "in-app notifications", "alert system", "notification preferences".
---

# Notification System Patterns

Add in-app notifications, delivery preferences, and notification history.

## Pattern 1: Basic Notifications

A notification entity with read/unread tracking and linking to the source action.

```json
{
  "entities": [
    {
      "name": "Notification",
      "created_at": true,
      "scopeBy": "organizationId",
      "fields": [
        { "name": "type", "type": "text", "length": 50 },
        { "name": "title", "type": "text", "length": 200 },
        { "name": "body", "type": "text", "nullable": true },
        { "name": "entityType", "type": "text", "length": 50, "nullable": true },
        { "name": "entityId", "type": "text", "length": 50, "nullable": true },
        { "name": "actionUrl", "type": "text", "nullable": true },
        { "name": "isRead", "type": "boolean", "default": "false" },
        { "name": "readAt", "type": "date", "nullable": true }
      ],
      "indexes": [
        { "fields": ["recipientId", "isRead", "created_at"] },
        { "fields": ["organizationId", "created_at"] }
      ]
    }
  ],
  "relationships": [
    { "from": "Notification", "to": "User", "type": "ManyToOne", "to_name": "recipient" },
    { "from": "Notification", "to": "User", "type": "ManyToOne", "to_name": "actor", "nullable": true },
    { "from": "Organization", "to": "Notification", "type": "OneToMany" },
    { "from": "Notification", "to": "Organization", "type": "ManyToOne" }
  ]
}
```

The `type` field drives rendering: `"task_assigned"`, `"comment_added"`, `"invoice_paid"`, etc.

The `entityType` + `entityId` fields link to the source record so the notification can deep-link to the relevant page.

## Pattern 2: With Delivery Preferences

Let users control which notifications they receive and through which channels.

```json
{
  "entities": [
    {
      "name": "NotificationPreference",
      "created_at": true,
      "updated_at": true,
      "fields": [
        { "name": "notificationType", "type": "text", "length": 50 },
        { "name": "inApp", "type": "boolean", "default": "true" },
        { "name": "email", "type": "boolean", "default": "true" },
        { "name": "push", "type": "boolean", "default": "false" }
      ],
      "indexes": [
        { "fields": ["userId", "notificationType"], "unique": true }
      ]
    }
  ],
  "relationships": [
    { "from": "User", "to": "NotificationPreference", "type": "OneToMany" },
    { "from": "NotificationPreference", "to": "User", "type": "ManyToOne" }
  ]
}
```

## Pattern 3: With Email Digest Tracking

Track which notifications have been sent via email and batch them into digests.

```json
{
  "entities": [
    {
      "name": "NotificationDelivery",
      "created_at": true,
      "fields": [
        { "name": "channel", "type": "enum", "values": ["in_app", "email", "push", "slack"] },
        { "name": "status", "type": "enum", "values": ["pending", "sent", "failed", "bounced"], "default": "pending" },
        { "name": "sentAt", "type": "date", "nullable": true },
        { "name": "failureReason", "type": "text", "nullable": true }
      ],
      "indexes": [
        { "fields": ["channel", "status"] }
      ]
    }
  ],
  "relationships": [
    { "from": "Notification", "to": "NotificationDelivery", "type": "OneToMany" },
    { "from": "NotificationDelivery", "to": "Notification", "type": "ManyToOne" }
  ]
}
```

## Choosing the Right Pattern

| Need | Pattern |
|------|---------|
| Simple in-app bell icon with unread count | Basic (Pattern 1) |
| Users control what they get notified about | + Preferences (Pattern 2) |
| Email digests, multi-channel delivery | + Delivery Tracking (Pattern 3) |

Start with Pattern 1. Add preferences and delivery tracking when user feedback demands it.
