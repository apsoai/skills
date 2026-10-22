In this service, downstream systems must reliably learn when an order is created and when it is paid, with no lost events if the process crashes right after a write. Set this up: schema changes, library, and delivery to a webhook. Explain the design and show the code.

Current schema:

```json
{
  "version": 2,
  "rootFolder": "src",
  "apiType": "Rest",
  "entities": [
    {
      "name": "Order",
      "created_at": true,
      "updated_at": true,
      "fields": [
        {
          "name": "total",
          "type": "decimal",
          "precision": 10,
          "scale": 2
        },
        {
          "name": "status",
          "type": "enum",
          "values": [
            "pending",
            "paid",
            "fulfilled"
          ],
          "default": "pending"
        }
      ]
    }
  ],
  "relationships": []
}
```
