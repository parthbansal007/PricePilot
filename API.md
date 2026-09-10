# PricePilot API Documentation

## Authentication
Firebase ID Token required in Authorization header for all endpoints.
`Authorization: Bearer <token>`

## Auth
- `POST /api/auth/sync` - Sync Firebase user to MongoDB

## Products
- `GET /api/products/search?q=query` - Search for products
- `GET /api/products/:id` - Get product details
- `GET /api/products/compare?q=query` - Compare prices across retailers
- `GET /api/products/:id/history` - Get price history for a product

## Tracking
- `POST /api/tracking` - Start tracking a product (body: productId, productName, targetPrice)
- `GET /api/tracking` - Get user's tracked products
- `DELETE /api/tracking/:id` - Stop tracking

## Wishlist
- `POST /api/wishlist` - Add to wishlist
- `GET /api/wishlist` - View wishlist
- `DELETE /api/wishlist/:id` - Remove from wishlist

## Budget
- `GET /api/budget` - Get budget and expenses
- `PUT /api/budget` - Update monthly limit (body: monthlyLimit)
- `POST /api/budget/expenses` - Add expense (body: amount, category, description)
- `DELETE /api/budget/expenses/:id` - Remove expense

## Notifications
- `GET /api/notifications` - Get all notifications
- `PATCH /api/notifications/read-all` - Mark all as read
- `PATCH /api/notifications/:id/read` - Mark single as read

## AI Advisor
- `POST /api/advisor` - Get Smart Buy Score and AI advice (body: message, productId)

## Profile & Dashboard
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update profile
- `POST /api/profile/picture` - Upload profile picture (FormData)
- `GET /api/dashboard` - Get dashboard metrics
