---
name: ✨ Add Feature to Module
description: Add new functionality to an existing DDD module
title: "[FEATURE] "
labels: ["claude-skill:add-feature", "automated"]
body:
  - type: input
    id: target_module
    attributes:
      label: Target Module
      description: Which existing module to add the feature to
      placeholder: "e.g. Product, Order, Invoice"
    validations:
      required: true

  - type: dropdown
    id: feature_type
    attributes:
      label: Feature Type
      options:
        - Search & Filter
        - Bulk Operation (bulk create/update/delete)
        - Status Transition
        - Relationship (add link to another entity)
        - Export (CSV / Excel)
        - New Specific Endpoint
        - Other
    validations:
      required: true

  - type: textarea
    id: feature_description
    attributes:
      label: Feature Description
      description: Describe exactly what the new feature should do
      placeholder: |
        e.g. Add a PATCH /products/{id}/status endpoint that allows
        transitioning status between ACTIVE and INACTIVE.
        DELETED is a terminal state — no transitions allowed from it.
    validations:
      required: true

  - type: textarea
    id: acceptance_criteria
    attributes:
      label: Acceptance Criteria
      description: How do we know this feature is done?
      placeholder: |
        - [ ] PATCH /api/v1/products/{id}/status returns 200 with updated product
        - [ ] Invalid transition returns 409 Conflict
        - [ ] Unit + integration tests pass
    validations:
      required: true
---