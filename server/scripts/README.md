# 🧪 Development Scripts - User Subscription Manager

This directory contains development scripts to help manage user subscriptions and payment testing for the laundry app authentication system.

## 📋 Overview

The subscription manager allows developers to easily test different subscription scenarios without manually modifying the database. It supports both existing and new user accounts with various subscription types.

## 🚀 Quick Start

### 1. Interactive Subscription Manager

```bash
# Run the interactive subscription manager
npm run manage-subs

# Or directly with node
node scripts/manage-subscriptions.js
```

This will prompt you to:
1. Enter an email address
2. Select a subscription type
3. Confirm the assignment

### 2. Batch Test User Creation

```bash
# Create multiple test users with different subscriptions
npm run test-subs create

# List existing test users
npm run test-subs list

# Clean up test users
npm run test-subs cleanup
```

## 💳 Subscription Types

| Type | Name | Description | Stripe Customer ID | App Behavior |
|------|------|-------------|-------------------|--------------|
| 1 | Active Premium | Full access to all services | `cus_dev_premium_*` | ✅ All services available |
| 2 | Active Basic | Limited access to basic services | `cus_dev_basic_*` | ✅ Basic services only |
| 3 | Trial | 7-day free trial with full access | `cus_dev_trial_*` | ✅ Full access (trial) |
| 4 | No Subscription | No active subscription | `null` | ❌ Shows "Buy Now" screen |
| 5 | Expired | Subscription expired | `cus_dev_expired_*` | ❌ Shows renewal prompt |
| 6 | Cancelled | Previously had subscription | `null` | ❌ Shows reactivation option |

## 🧪 Test Users

The test script creates these predefined users:

| Email | Password | Subscription Type | Purpose |
|-------|----------|------------------|---------|
| `premium@test.com` | `DevTest123!` | Active Premium | Test full access |
| `basic@test.com` | `DevTest123!` | Active Basic | Test limited access |
| `trial@test.com` | `DevTest123!` | Trial | Test trial experience |
| `nosubscription@test.com` | `DevTest123!` | No Subscription | Test "Buy Now" flow |
| `expired@test.com` | `DevTest123!` | Expired | Test renewal flow |

## 📱 Testing Workflow

### 1. Set Up Test Environment

```bash
# Create test users
npm run test-subs create
```

### 2. Test Different Scenarios

1. **No Subscription Flow**:
   - Login with `nosubscription@test.com`
   - Navigate to services
   - Should see "No Package" screen with "Buy Now" button

2. **Active Subscription Flow**:
   - Login with `premium@test.com`
   - Navigate to services
   - Should have full access to all features

3. **Trial Flow**:
   - Login with `trial@test.com`
   - Should see trial indicators in UI

4. **Expired Flow**:
   - Login with `expired@test.com`
   - Should see renewal prompts

### 3. Custom Testing

```bash
# Create custom user with specific subscription
npm run manage-subs
# Follow prompts to enter email and select subscription type
```

## 🔧 Script Features

### Interactive Subscription Manager (`manage-subscriptions.js`)

- ✅ **Email Input Validation**: Ensures valid email format
- ✅ **User Detection**: Checks if user exists in database
- ✅ **Subscription Assignment**: Assigns one of 6 subscription types
- ✅ **New User Creation**: Creates account with default password
- ✅ **Existing User Update**: Updates subscription for existing users
- ✅ **Database Integration**: Uses Prisma for MongoDB operations
- ✅ **Clear Output**: Provides detailed console feedback

### Test User Manager (`test-subscription-manager.js`)

- ✅ **Batch Operations**: Create/update multiple test users
- ✅ **User Listing**: Display all test users and their subscriptions
- ✅ **Cleanup**: Remove test users when done
- ✅ **Error Handling**: Graceful error handling for each operation

## 🛠️ Technical Details

### Database Schema

The scripts work with the existing User model:

```prisma
model User {
  id               String  @id @default(auto()) @map("_id") @db.ObjectId
  email            String  @unique
  name             String
  password         String
  verified         Boolean @default(false)
  stripeCustomerId String? // Key field for subscription status
  // ... other fields
}
```

### Subscription Logic

- **Has Subscription**: `stripeCustomerId` is not null/empty
- **No Subscription**: `stripeCustomerId` is null or empty string
- **Subscription Type**: Determined by the prefix in `stripeCustomerId`

### Authentication Integration

The scripts work seamlessly with the existing authentication system:

1. Users can login with assigned email/password
2. Auth context reads user data including `stripeCustomerId`
3. App components use `useSubscriptionStatus()` to check access
4. Services are enabled/disabled based on subscription status

## 🚨 Important Notes

### Development Only

⚠️ **These scripts are for development use only!**

- Default password is `DevTest123!` for all created users
- Stripe Customer IDs are fake (prefixed with `cus_dev_`)
- Users are auto-verified (no email verification required)

### Database Safety

- Scripts use transactions where possible
- Existing user data is preserved when updating subscriptions
- Only `stripeCustomerId` field is modified for existing users

### Clean Up

Remember to clean up test users:

```bash
npm run test-subs cleanup
```

## 🐛 Troubleshooting

### Common Issues

1. **"User not found" after creation**:
   - Check database connection
   - Verify Prisma schema is up to date

2. **"Invalid email" error**:
   - Ensure email contains @ symbol
   - Check for extra spaces

3. **Database connection errors**:
   - Verify MongoDB is running
   - Check DATABASE_URL in .env file

### Debug Mode

Add debug logging by setting environment variable:

```bash
DEBUG=true npm run manage-subs
```

## 📚 Usage Examples

### Example 1: Test Premium User

```bash
npm run manage-subs
# Enter: premium.user@example.com
# Select: 1 (Active Premium Subscription)
# Confirm: y
```

### Example 2: Create Multiple Test Scenarios

```bash
npm run test-subs create
# Creates 5 users with different subscription types
```

### Example 3: Update Existing User

```bash
npm run manage-subs
# Enter: existing.user@example.com
# Select: 4 (No Subscription)
# Confirm: y
# User's subscription will be removed
```

This system makes it easy to test all subscription scenarios during development without manual database manipulation!
