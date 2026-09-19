---
name: 🏗️ New CRUD Module
description: Scaffold a complete DDD CRUD module from scratch
title: "[CRUD] "
labels: ["claude-skill:new-crud", "automated"]
body:
  - type: input
    id: entity_name
    attributes:
      label: Entity Name
      description: The name of the entity (PascalCase, singular)
      placeholder: "e.g. Product, Order, CustomerProfile"
    validations:
      required: true

  - type: textarea
    id: entity_fields
    attributes:
      label: Entity Fields
      description: List the domain fields you want (name, type, constraints)
      placeholder: |
        - name: String, required, max 255
        - description: String, optional, text
        - price: BigDecimal, required, min 0
        - sku: String, required, unique
        - stock: Integer, required, default 0
        - status: Enum (ACTIVE, INACTIVE), default ACTIVE
    validations:
      required: true

  - type: dropdown
    id: features
    attributes:
      label: Include Extra Features?
      multiple: true
      options:
        - Search & Filter on GET all
        - Status transition endpoint (PATCH /{id}/status)
        - Bulk delete endpoint (DELETE /bulk)
        - CSV Export
        - None (basic CRUD only)

  - type: textarea
    id: notes
    attributes:
      label: Additional Notes
      description: Any special requirements, relationships, or constraints
      placeholder: "e.g. Product belongs to Category, price must support multi-currency"
---