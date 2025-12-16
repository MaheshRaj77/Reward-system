# Parent Dashboard Documentation

## Overview

The Parent Dashboard is the central hub for parents to manage their family's reward system. It provides comprehensive tools for overseeing children, tasks, rewards, approvals, and family statistics.

## Key Features

### 1. Family Overview

- **Welcome Section**: Personalized greeting with family statistics
- **Subscription Status**: Current plan display with upgrade prompts
- **Family Code**: Unique 8-character code for child device access

### 2. Statistics Dashboard

Displays real-time family metrics:

- **Total Stars**: Sum of all growth stars earned by children
- **Active Tasks**: Number of currently active tasks across all children
- **Completed Tasks**: Total task completions (historical count)
- **Family Streak**: Highest current streak among all children

### 3. Children Management

#### Child Cards

Each child displays:

- Avatar and name
- Age group badge
- Current star balance
- Active streak counter
- Quick actions (View Profile, Delete)

#### Adding Children

- Name, birth year, 4-digit PIN
- Avatar selection from 8 preset options
- Automatic age group calculation
- Subscription limit enforcement

#### Child Data Structure

```typescript
interface ChildData {
  id: string;
  name: string;
  familyId: string;
  birthYear: number;
  ageGroup: "4-6" | "7-10" | "11-14" | "15+";
  avatar: {
    presetId: string;
    backgroundColor: string;
  };
  pin: string; // Hashed 4-digit PIN
  starBalances: {
    growth: number;
    weeklyEarned: number;
    weeklyLimit: number;
  };
  streaks: {
    currentStreak: number;
    longestStreak: number;
    lastCompletionDate: Timestamp | null;
  };
  screenTimeLimits: {
    dailyLimitMinutes: number;
    usedTodayMinutes: number;
    bonusMinutesAvailable: number;
    bonusUsedTodayMinutes: number;
    lastReset: Timestamp;
  };
  achievements: Achievement[];
  lastActive: Timestamp;
  createdAt: Timestamp;
  themeColor: string;
}
```

### 4. Quick Actions Panel

#### Task Management

- **New Task**: Link to task creation page
- **Approvals**: Link to pending approvals page

#### Reward Management

- **New Reward**: Modal for creating custom rewards
- **Rewards Store**: Link to view/manage rewards

#### Communication

- **Chat**: Link to family messaging system

## Logic Management

### Authentication & Authorization

#### Parent Authentication Flow

1. Check for authenticated parent user
2. Redirect to login if not authenticated
3. Load parent document from Firestore
4. Extract subscription plan and family ID
5. Initialize dashboard with family data

#### Family Code Generation

- Takes first 8 characters of family ID
- Converts to uppercase for display
- Used for child device login

### Data Loading & Real-time Updates

#### Children Subscription

```typescript
const q = query(
  collection(db, "children"),
  where("familyId", "==", parent.familyId)
);
const unsubscribe = onSnapshot(q, (snapshot) => {
  // Process children data
  // Update family streak calculation
  // Cache children data for offline access
});
```

#### Statistics Calculation

- **Total Stars**: Sum of all children's `starBalances.growth`
- **Active Tasks**: Query tasks where `isActive == true`
- **Completions**: Query all task completions (simple count)
- **Family Streak**: Max of all children's `streaks.currentStreak`

### Subscription Management

#### Plan Enforcement

- **Free Plan**: 2 children max, 5 tasks per child
- **Premium Plan**: Unlimited children and tasks
- Automatic redirects to subscription page when limits exceeded

#### Feature Gates

```typescript
const canAddChild = (plan: SubscriptionPlan, currentCount: number): boolean => {
  return currentCount < SUBSCRIPTION_PLANS[plan].features.maxChildren;
};
```

### Child Management Logic

#### Adding Children

1. Validate subscription limits
2. Calculate age group from birth year
3. Create child document with initial balances
4. Update family document with child ID
5. Set up default screen time limits

#### Age Group Calculation

```typescript
const age = new Date().getFullYear() - childForm.birthYear;
const ageGroup =
  age <= 6 ? "4-6" : age <= 10 ? "7-10" : age <= 14 ? "11-14" : "15+";
```

#### PIN Security

- 4-digit numeric PIN required
- Stored as plain text (consider hashing for production)
- Used for child device authentication

### Reward Creation Logic

#### Reward Form Validation

- Name required
- Cost range: 1-100 stars
- Star type selection (currently only 'growth')
- Icon selection from predefined emoji set
- Availability settings (all children or specific children)

#### Reward Document Structure

```typescript
interface Reward {
  id: string;
  familyId: string;
  name: string;
  cost: number;
  starType: "growth";
  icon: string;
  availableTo: string[] | "all";
  createdAt: Timestamp;
}
```

### Approvals System

#### Pending Items Tracking

The dashboard sidebar shows pending approvals for:

- Task completions awaiting parent approval
- Reward redemptions awaiting approval

#### Approval Logic

- **Task Approvals**: Add stars to child's balance, update streak
- **Reward Approvals**: Deduct stars from child's balance
- Real-time updates to statistics after approval actions

### Real-time Data Synchronization

#### Firestore Listeners

- Children collection changes
- Task collection changes (for active task count)
- Task completion collection changes (for completion count)

#### State Management

- Local state for UI interactions
- Server state synchronization
- Error handling and loading states

### Performance Optimizations

#### Data Fetching Strategy

- Single query for children list with real-time updates
- Separate queries for statistics (could be optimized with counters)
- Lazy loading for approval details

#### Caching Strategy

- Children data cached in IndexedDB for offline access
- Family code stored in PWA storage

### Error Handling

#### Authentication Errors

- Redirect to login page
- Clear invalid sessions

#### Data Loading Errors

- Graceful fallbacks to cached data
- User-friendly error messages
- Retry mechanisms for failed operations

#### Validation Errors

- Form validation with inline error messages
- Subscription limit warnings
- PIN format validation

### Security Considerations

#### Data Access Control

- Family-scoped queries ensure parents only see their data
- Child PINs for device access (consider strengthening)
- Server-side validation for all operations

#### Input Sanitization

- Form inputs validated on client and server
- Firestore security rules enforce data integrity

### UI/UX Patterns

#### Modal System

- Centralized modal state management
- Consistent modal styling and animations
- Click-outside-to-close functionality

#### Loading States

- Skeleton loading for initial data
- Button loading states for async operations
- Progress indicators for long-running tasks

#### Responsive Design

- Mobile-first approach
- Adaptive grid layouts
- Touch-friendly interactive elements

### Future Enhancements

#### Planned Features

- Advanced reporting and analytics
- Push notifications for approvals
- Bulk operations for task/reward management
- Family goal setting and tracking

#### Scalability Considerations

- Implement proper indexing for large families
- Add pagination for extensive data sets
- Optimize real-time listeners for performance

## API Integration Points

### Firestore Collections Used

- `parents`: Parent user data and subscriptions
- `children`: Child profiles and balances
- `tasks`: Task definitions and assignments
- `taskCompletions`: Task completion records
- `rewards`: Reward definitions
- `rewardRedemptions`: Reward redemption requests
- `families`: Family metadata and relationships

### External Services

- Firebase Authentication for user management
- Firestore for data persistence
- Email service for notifications (future)

This documentation provides a comprehensive overview of the Parent Dashboard's functionality, logic management, and architectural patterns. The system is designed to be scalable, maintainable, and user-friendly while enforcing proper security and data integrity.</content>
<parameter name="filePath">/Users/mahesh/work/Reward-system/PARENT_DASHBOARD.md
