# Food Statistics and Analytics Design Document

## Overview

The Food Statistics and Analytics system provides comprehensive insights into baby's solid food consumption patterns, preferences, and nutritional progress. This system builds upon the core solid food improvements infrastructure to deliver meaningful analytics through interactive dashboards, charts, and reports.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Analytics Layer                          │
├─────────────────────────────────────────────────────────────┤
│  Dashboard    │  Charts      │  Reports     │  Export       │
│  Components   │  Components  │  Generator   │  Service      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                 Analytics Store Methods                     │
├─────────────────────────────────────────────────────────────┤
│  Statistics   │  Trends      │  Preferences │  Aggregation  │
│  Calculator   │  Analyzer    │  Analyzer    │  Service      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│              Existing Data Layer                            │
├─────────────────────────────────────────────────────────────┤
│  User Food    │  Solid Food  │  Feeding     │  Baby         │
│  Items        │  Events      │  Events      │  Data         │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Data Collection**: Analytics system reads from existing user_food_items, solid_food_events, and feedings tables
2. **Data Processing**: Store methods calculate statistics, trends, and aggregations
3. **Data Presentation**: Components render interactive charts and dashboards
4. **Data Export**: Export service generates reports in various formats

## Components and Interfaces

### Core Components

#### 1. FoodAnalyticsDashboard.vue

**Purpose**: Main analytics dashboard providing overview of all food statistics

**Key Features**:

- Summary statistics cards
- Quick access to different analytics views
- Date range filtering
- Baby selection (for multi-baby accounts)

**Props**:

```typescript
interface DashboardProps {
  babyId?: string;
  dateRange?: DateRange;
  defaultView?: "overview" | "trends" | "preferences";
}
```

#### 2. FoodStatisticsCard.vue

**Purpose**: Reusable card component for displaying individual statistics

**Key Features**:

- Configurable statistic display
- Icon and color theming
- Click-through to detailed views
- Loading and error states

**Props**:

```typescript
interface StatisticsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  color?: string;
  clickable?: boolean;
  loading?: boolean;
}
```

#### 3. FoodConsumptionChart.vue

**Purpose**: Interactive chart component for consumption data visualization

**Key Features**:

- Multiple chart types (line, bar, pie)
- Interactive tooltips and legends
- Responsive design
- Export functionality

**Props**:

```typescript
interface ConsumptionChartProps {
  data: ChartData;
  type: "line" | "bar" | "pie" | "doughnut";
  title?: string;
  height?: number;
  responsive?: boolean;
}
```

#### 4. FoodPreferenceBreakdown.vue

**Purpose**: Specialized component for displaying food preference analysis

**Key Features**:

- Reaction type grouping
- Percentage calculations
- Visual preference indicators
- Drill-down to specific foods

#### 5. FoodMilestoneTracker.vue

**Purpose**: Component for tracking food introduction milestones

**Key Features**:

- Timeline visualization
- Milestone achievement tracking
- Progress indicators
- Celebration animations

### Store Methods

#### Analytics Calculation Methods

```typescript
// Get comprehensive food consumption statistics
async function getFoodConsumptionStats(
  babyId: string,
  dateRange?: DateRange
): Promise<FoodConsumptionAnalytics>;

// Get most consumed foods with ranking
async function getMostConsumedFoods(
  babyId: string,
  limit: number = 10
): Promise<UserFoodItem[]>;

// Get recently introduced foods
async function getRecentlyIntroducedFoods(
  babyId: string,
  days: number = 30
): Promise<UserFoodItem[]>;

// Get foods grouped by reaction type
async function getFoodsByReaction(
  babyId: string
): Promise<Record<ReactionType, UserFoodItem[]>>;

// Get consumption trends over time
async function getFoodConsumptionTrends(
  babyId: string,
  dateRange: DateRange
): Promise<ConsumptionTrend[]>;

// Get feeding pattern analysis
async function getFeedingPatterns(
  babyId: string,
  dateRange: DateRange
): Promise<FeedingPattern[]>;
```

## Data Models

### Analytics Data Structures

```typescript
interface FoodConsumptionAnalytics {
  user_id: string;
  baby_id: string;
  date_range: DateRange;
  total_foods_tried: number;
  total_solid_events: number;
  average_foods_per_event: number;
  most_consumed_foods: Array<{
    food: UserFoodItem;
    consumption_count: number;
    percentage: number;
  }>;
  recently_introduced: UserFoodItem[];
  foods_by_reaction: {
    liked: UserFoodItem[];
    disliked: UserFoodItem[];
    neutral: UserFoodItem[];
    allergic_reaction: UserFoodItem[];
  };
  consumption_patterns: {
    peak_hours: Array<{
      hour: number;
      event_count: number;
    }>;
    daily_averages: Array<{
      date: string;
      events: number;
      unique_foods: number;
    }>;
  };
}

interface ConsumptionTrend {
  date: string;
  total_events: number;
  unique_foods: number;
  new_foods_introduced: number;
  average_foods_per_event: number;
}

interface FeedingPattern {
  hour: number;
  day_of_week: number;
  event_count: number;
  average_foods: number;
  most_common_foods: string[];
}

interface FoodMilestone {
  id: string;
  name: string;
  description: string;
  target_age_months: number;
  achieved: boolean;
  achieved_date?: string;
  foods_involved: UserFoodItem[];
}
```

### Chart Data Structures

```typescript
interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
  }>;
}

interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  plugins: {
    legend: {
      display: boolean;
      position: "top" | "bottom" | "left" | "right";
    };
    tooltip: {
      enabled: boolean;
      callbacks?: Record<string, Function>;
    };
  };
  scales?: Record<string, any>;
}
```

## Error Handling

### Analytics-Specific Error Types

```typescript
enum AnalyticsErrorType {
  INSUFFICIENT_DATA = "insufficient_data",
  CALCULATION_ERROR = "calculation_error",
  CHART_RENDER_ERROR = "chart_render_error",
  EXPORT_ERROR = "export_error",
}

interface AnalyticsError {
  type: AnalyticsErrorType;
  message: string;
  details?: any;
  recoverable: boolean;
}
```

### Error Handling Strategy

1. **Insufficient Data**: Show helpful messages when not enough data exists for meaningful analytics
2. **Calculation Errors**: Gracefully handle edge cases in statistical calculations
3. **Chart Rendering**: Provide fallback displays when charts fail to render
4. **Export Failures**: Offer alternative export formats or retry mechanisms

## Testing Strategy

### Unit Tests

1. **Statistics Calculation Tests**

   - Test edge cases (no data, single data point, large datasets)
   - Verify calculation accuracy with known datasets
   - Test date range filtering and baby filtering

2. **Component Tests**

   - Test chart rendering with various data sets
   - Verify responsive behavior
   - Test interactive features (filtering, drilling down)

3. **Store Method Tests**
   - Test all analytics calculation methods
   - Verify error handling for edge cases
   - Test performance with large datasets

### Integration Tests

1. **End-to-End Analytics Workflows**

   - Test complete analytics dashboard loading
   - Verify data consistency across different views
   - Test export functionality

2. **Performance Tests**
   - Test with 1000+ food events
   - Verify loading times meet requirements
   - Test memory usage with complex charts

### Visual Regression Tests

1. **Chart Rendering Tests**
   - Verify charts render correctly across browsers
   - Test responsive behavior on different screen sizes
   - Validate color schemes and accessibility

## Performance Considerations

### Data Optimization

1. **Caching Strategy**

   - Cache calculated statistics for frequently accessed data
   - Implement smart cache invalidation when underlying data changes
   - Use browser storage for temporary analytics data

2. **Query Optimization**

   - Use database indexes for analytics queries
   - Implement pagination for large result sets
   - Use aggregation queries where possible

3. **Chart Performance**
   - Limit data points for complex charts
   - Use chart.js performance optimizations
   - Implement lazy loading for chart components

### Memory Management

1. **Component Lifecycle**

   - Properly cleanup chart instances
   - Remove event listeners on component unmount
   - Clear large data structures when not needed

2. **Data Streaming**
   - Stream large datasets instead of loading all at once
   - Implement virtual scrolling for large lists
   - Use progressive loading for complex analytics

## Accessibility

### Chart Accessibility

1. **Screen Reader Support**

   - Provide alternative text descriptions for charts
   - Include data tables as fallbacks
   - Use ARIA labels for interactive elements

2. **Keyboard Navigation**

   - Ensure all interactive elements are keyboard accessible
   - Provide keyboard shortcuts for common actions
   - Implement focus management for modal dialogs

3. **Visual Accessibility**
   - Use high contrast colors for charts
   - Provide pattern alternatives to color coding
   - Ensure text meets WCAG contrast requirements

## Security Considerations

### Data Privacy

1. **Data Access Control**

   - Verify user permissions for baby data access
   - Implement row-level security for analytics queries
   - Audit analytics data access

2. **Export Security**
   - Sanitize exported data
   - Implement rate limiting for export operations
   - Log export activities for security monitoring

## Future Enhancements

### Advanced Analytics

1. **Machine Learning Integration**

   - Predictive analytics for food acceptance
   - Personalized feeding recommendations
   - Anomaly detection for feeding patterns

2. **Comparative Analytics**

   - Compare with anonymized population data
   - Developmental milestone comparisons
   - Nutritional adequacy analysis

3. **Integration Features**
   - Healthcare provider sharing portals
   - Integration with pediatric growth charts
   - Nutrition database integration
