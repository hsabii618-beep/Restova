# API Contract: Phase 2 — Auth + Restaurant Provisioning

## 1. POST /api/restaurants
Creates a new restaurant and assigns the current user as the owner.

### Request
- **Body**:
  ```json
  {
    "name": "string",
    "slug": "string"
  }
  ```

### Response
- **201 Created**:
  ```json
  {
    "id": "uuid",
    "name": "string",
    "slug": "string",
    "owner_id": "uuid",
    "created_at": "iso-date",
    "membership": {
      "role": "owner"
    }
  }
  ```
- **400 Bad Request**: Invalid payload or slug format.
- **401 Unauthorized**: User is not logged in.
- **409 Conflict**: Slug already exists OR user already has a restaurant (MVP constraint).

---

## 2. GET /api/restaurants
Lists all restaurants where the current user is the owner.

### Response
- **200 OK**:
  ```json
  [
    {
      "id": "uuid",
      "name": "string",
      "slug": "string",
      "role": "owner"
    }
  ]
  ```

---

## 3. GET /api/restaurants/{id}
Fetches details for a specific restaurant.

### Response
- **200 OK**:
  ```json
  {
    "id": "uuid",
    "name": "string",
    "slug": "string",
    "owner_id": "uuid",
    "is_open": "boolean",
    "settings": "json"
  }
  ```
- **403 Forbidden**: User is not the owner of this restaurant.
- **404 Not Found**: Restaurant does not exist.
