# PricePilot Database Documentation

Database: MongoDB Atlas
ORM: Mongoose

## Collections

### 1. Users (`users`)
Stores user profiles synced from Firebase.
Fields: `name`, `email`, `firebaseUid`, `profilePicture`, `preferredCurrency`, `monthlyBudget`

### 2. Products (`products`)
Caches external product data to avoid excessive API calls.
Fields: `externalId`, `title`, `image`, `retailer`, `currentPrice`

### 3. PriceHistories (`pricehistories`)
Stores historical prices to build the price trend chart.
Fields: `productId`, `price`, `currency`, `retailer`, `timestamp`

### 4. TrackedProducts (`trackedproducts`)
Stores user intent to track a product for price drops.
Fields: `userId`, `productId`, `productName`, `targetPrice`, `active`

### 5. Wishlists (`wishlists`)
Stores user saved items.
Fields: `userId`, `productId`, `productName`, `currentPrice`

### 6. Budgets (`budgets`)
Stores monthly limit and subdocument array of expenses.
Fields: `userId`, `monthlyLimit`, `expenses`

### 7. Notifications (`notifications`)
Stores alerts for price drops and target matches.
Fields: `userId`, `type` (PRICE_DROP, TARGET_PRICE), `title`, `message`, `read`
