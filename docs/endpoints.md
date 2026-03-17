# Endpoints de la API

A continuación, se detallan los endpoints expuestos por el backend. Todos los endpoints (excepto login) requieren autenticación mediante cookies HttpOnly.

> **Roles:** `Público` = Sin autenticación | `Todos` = Admin y Cajero | `Admin` = Solo Admin

---

## Auth (`/api/auth`)

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| `POST` | `/api/auth/login` | Público | Inicia sesión. Establece cookies `access_token` y `refresh_token`. |
| `POST` | `/api/auth/refresh` | Todos | Renueva los tokens usando el Refresh Token rotativo. |
| `POST` | `/api/auth/logout` | Todos | Cierra sesión, invalida tokens y limpia cookies. |
| `GET` | `/api/auth/me` | Todos | Devuelve la información del usuario autenticado (incluye `role`). |

---

## Users (`/api/users`)

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| `POST` | `/api/users` | Admin | Crea un nuevo usuario con rol asignado (`ADMIN` o `CAJERO`). `mustChangePassword` se activa automáticamente. |
| `GET` | `/api/users` | Admin | Obtiene la lista de todos los usuarios. |
| `GET` | `/api/users/:id` | Admin | Obtiene un usuario por su ID. |
| `PATCH` | `/api/users/:id` | Admin | Actualiza un usuario. Si se envía `password`, `mustChangePassword` se reactiva. |
| `DELETE` | `/api/users/:id` | Admin | Elimina un usuario. |
| `POST` | `/api/users/change-password` | Todos | Permite al usuario autenticado cambiar su propia contraseña. Desactiva `mustChangePassword`. |

**Body de `POST /api/users`:**
```json
{
  "email": "nuevo@invenda.com",
  "password": "123456",
  "name": "Nombre (opcional)",
  "role": "CAJERO"
}
```

**Body de `PATCH /api/users/:id`:** *(todos los campos son opcionales)*
```json
{
  "email": "otro@invenda.com",
  "password": "nueva_password",
  "name": "Nuevo Nombre",
  "role": "ADMIN"
}
```

**Body de `POST /api/users/change-password`:**
```json
{
  "currentPassword": "password_actual",
  "newPassword": "nueva_password_segura"
}
```

---

## Categories (`/api/categories`)

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| `GET` | `/api/categories` | Todos | Obtiene categorías paginadas. Soporta query params: `?page=1&limit=10&search=termino`. |
| `POST` | `/api/categories` | Admin | Crea una nueva categoría. |
| `PATCH` | `/api/categories/:id` | Admin | Actualiza una categoría existente. |
| `DELETE` | `/api/categories/:id` | Admin | Elimina una categoría. |

**Formato de Respuesta (`GET /api/categories`):**
```json
{
  "data": [
    { 
      "id": "uuid", 
      "name": "Bebidas",
      "deletedAt": null,
      "createdAt": "2026-03-16T21:00:00.000Z",
      "updatedAt": "2026-03-16T21:00:00.000Z"
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

## Products (`/api/products`)

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| `GET` | `/api/products` | Todos | Obtiene productos paginados. Soporta query params: `?page=1&limit=10&search=termino&hasPrice=true/false`. |
| `POST` | `/api/products` | Admin | Crea un nuevo producto. |
| `PATCH` | `/api/products/:id` | Admin | Actualiza un producto existente. |
| `DELETE` | `/api/products/:id` | Admin | Elimina un producto. |
| `PATCH` | `/api/products/:id/prices` | Admin | Actualiza los precios de un producto. |

**Formato de Respuesta (`GET /api/products`):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Coca-Cola 500ml",
      "status": 1,
      "categoryId": "uuid",
      "stock": 48,
      "deletedAt": null,
      "createdAt": "2026-03-16T21:00:00.000Z",
      "updatedAt": "2026-03-16T21:00:00.000Z",
      "category": { "id": "uuid", "name": "Bebidas" },
      "price": {
        "id": "uuid",
        "usdTarjeta": 1.5,
        "usdFisico": 1.5,
        "cop": 6300,
        "ves": 117.75,
        "exchangeType": "usd",
        "isCustomUsdTarjeta": false,
        "isCustomUsdFisico": false,
        "isCustomCop": false,
        "isCustomVes": false,
        "deletedAt": null,
        "createdAt": "2026-03-16T21:00:00.000Z",
        "updatedAt": "2026-03-16T21:00:00.000Z",
        "productId": "uuid"
      }
    }
  ],
  "meta": { "total": 15, "page": 1, "limit": 10, "totalPages": 2 }
}
```

---

## Product Prices (`/api/product-prices`)

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| `GET` | `/api/product-prices` | Todos | Obtiene todos los precios con información del producto y categoría. |
| `GET` | `/api/product-prices/:productId` | Todos | Obtiene los precios de un producto específico. |
| `POST` | `/api/product-prices` | Admin | Crea los precios para un producto que aún no los tiene. |
| `PATCH` | `/api/product-prices/:productId` | Admin | Actualiza los precios de un producto existente. |
| `DELETE` | `/api/product-prices/:productId` | Admin | Elimina los precios asociados a un producto. |

**Body de `POST /api/product-prices` y `PATCH /api/product-prices/:productId`:**
```json
{
  "productId": "uuid", // Solo obligatorio en POST
  "usdTarjeta": 1.5,
  "usdFisico": 1.5,
  "cop": 6300,
  "ves": 117.75,
  "exchangeType": "usd"
}
```

---

## Exchange Rates (`/api/exchange-rates`)

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| `GET` | `/api/exchange-rates` | Todos | Obtiene los tipos de cambio actuales. |
| `PUT` | `/api/exchange-rates` | Todos | Actualiza los tipos de cambio. |

---

## Sales (`/api/sales`)

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| `GET` | `/api/sales` | Todos | Obtiene las ventas paginadas. Soporta query params: `?page=1&limit=10&search=status`. |
| `POST` | `/api/sales` | Todos | Crea un nuevo registro de venta. |

**Formato de Respuesta (`GET /api/sales`):**
```json
{
  "data": [
    {
      "id": "uuid",
      "date": "2026-03-14T19:00:00.000Z",
      "status": "pagado",
      "receivedTotals": { "usdFisico": 10, "usdTarjeta": 0, "cop": 0, "ves": 0 },
      "deletedAt": null,
      "createdAt": "2026-03-16T21:00:00.000Z",
      "updatedAt": "2026-03-16T21:00:00.000Z",
      "items": [
        {
          "id": "uuid",
          "productId": "uuid",
          "quantity": 2,
          "unitPrice": { "usdTarjeta": 5 },
          "totalPrice": { "usdTarjeta": 10 },
          "payments": { "usdFisico": 10 },
          "deletedAt": null,
          "createdAt": "2026-03-16T21:00:00.000Z",
          "updatedAt": "2026-03-16T21:00:00.000Z"
        }
      ]
    }
  ],
  "meta": { "total": 100, "page": 1, "limit": 10, "totalPages": 10 }
}
```

