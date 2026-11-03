# FreshTrack - Smart Food Expiry and Waste Prediction System

**Team member 1:** Bhuvan Raj H (PES1UG25CS808)
**Team member 2:** Tanmay Sridhar (PES1UG25CS849)

The diagrams have been prepared in the same presentation styles as the reference material:

1. [PRINTABLE_DIAGRAMS.html](PRINTABLE_DIAGRAMS.html) contains the ER diagram and relational schema diagram.
2. Print both pages directly from the browser as landscape A4 pages.
3. Keep the project title and both team members unchanged on both printed pages.

## Diagram data

The entities and attributes below are taken directly from [../sql/schema.sql](../sql/schema.sql).

| Entity | Attributes |
|---|---|
| `app_users` | `id`, `full_name`, `email`, `password_hash`, `role`, `created_at` |
| `products` | `id`, `name`, `category`, `created_at` |
| `inventory_batches` | `id`, `product_id`, `quantity`, `unit`, `purchase_date`, `expiry_date`, `cost_per_unit`, `supplier`, `created_at`, `updated_at` |
| `waste_records` | `id`, `product_id`, `batch_id`, `quantity`, `reason`, `estimated_loss`, `notes`, `wasted_at` |

## Relationships

- One product has many inventory batches.
- One product identifies many waste records.
- One inventory batch can have zero or many waste records.
