# SafeCity AI - Error Handling & Recovery System

This document describes the comprehensive error handling and recovery mechanisms implemented in the SafeCity AI frontend.

## Overview

The error handling system provides multiple layers of protection:
1. **React Error Boundaries** - Catch JavaScript errors in components
2. **API Error States** - Handle backend connection failures gracefully
3. **Offline Detection** - Monitor network connectivity
4. **Sensor Offline Handling** - Display degraded sensor states

## 1. Error Boundary Component

### Location
`src/components/ErrorBoundary.jsx`

### Purpose
Catches JavaScript errors anywhere in the component tree and prevents the entire app from crashing.

### Features
- **Class Component**: Uses React lifecycle methods `componentDidCatch` and `getDerivedStateFromError`
- **Fallback UI**: Shows user-friendly error message with reload option
- **Development Mode**: Displays detailed error stack trace in development
- **Reload Functionality**: Provides "Reload Section" button to recover

### Implementation
```jsx
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

### Usage in App.jsx
Each route is wrapped with ErrorBoundary:
```jsx
<Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
<Route path="/drivers" element={<ErrorBoundary><Drivers /></ErrorBoundary>} />
// ... etc
```

### Error Display
- Icon: AlertTriangle (red)
- Title: "Something went wrong in this section"
- Message: "An unexpected error occurred. Reloading the page may fix the issue."
- Action: "Reload Section" button (calls `window.location.reload()`)
- Style: Dark theme with red accents

## 2. API Error States

### Affected Pages
- `Dashboard.jsx`
- `Violations.jsx`
- `Drivers.jsx`

### Implementation Pattern

#### State Management
```jsx
const [loading, setLoading] = useState(true);
const [error, setError] = useState(false);
const [data, setData] = useState([]);
```

#### Fetch Function with Error Handling
```jsx
const fetchData = async () => {
  setLoading(true);
  setError(false);
  try {
    const res = await fetchAPI();
    setData(res.data);
    setError(false);
    window.dispatchEvent(new CustomEvent('data-sync'));
  } catch (err) {
    console.error('Error fetching data:', err);
    setError(true);
  } finally {
    setLoading(false);
  }
};
```

#### Error UI Display
```jsx
{error && (
  <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6 text-center">
    <div className="flex justify-center mb-3">
      <WifiOff size={32} className="text-orange-400" />
    </div>
    <h3 className="text-lg font-bold text-orange-300 mb-2">
      Unable to reach SafeCity servers
    </h3>
    <p className="text-sm text-orange-400/80 mb-4">
      Showing last known data. Live updates paused.
    </p>
    <button
      onClick={fetchData}
      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
    >
      Retry Connection
    </button>
  </div>
)}
```

### Features
- **Graceful Degradation**: Shows last known data instead of empty state
- **Visual Feedback**: Orange warning theme (not critical red)
- **Retry Mechanism**: "Retry Connection" button to attempt reconnection
- **Icons**: WifiOff or ServerCrash from lucide-react
- **Auto-retry**: Continues attempting to fetch data every 30 seconds

### Dashboard.jsx Specifics
- Error state for stats API
- Shows error panel above stat cards
- Retry button calls `fetchData()` function
- Maintains mock alerts even when backend is down

### Violations.jsx Specifics
- Error state for violations list
- Shows error panel between stats and table
- Retry button calls `loadViolations()` function
- Preserves filter state during errors

### Drivers.jsx Specifics
- Error state for drivers list with safety scores
- Shows error panel between stats and table
- Retry button reloads the page
- Handles partial failures (some driver scores fail)

## 3. Offline Detection

### Location
`App.jsx` - `AppContent` component

### Implementation

#### State Management
```jsx
const [isOnline, setIsOnline] = useState(navigator.onLine);
const [showOnlineBanner, setShowOnlineBanner] = useState(false);
```

#### Event Listeners
```jsx
useEffect(() => {
  const handleOnline = () => {
    setIsOnline(true);
    setShowOnlineBanner(true);
    // Auto-dismiss "Back online" banner after 3 seconds
    setTimeout(() => setShowOnlineBanner(false), 3000);
  };

  const handleOffline = () => {
    setIsOnline(false);
    setShowOnlineBanner(false);
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

### Offline Banner
**Position**: Full width, below header, above main content
**Z-index**: 50 (high priority)
**Style**: Yellow warning theme

```jsx
{!isOnline && (
  <div className="w-full bg-yellow-500/20 text-yellow-300 border-b border-yellow-500/30 px-6 py-3 flex items-center justify-center gap-2 z-50">
    <span className="text-sm font-semibold">
      ⚠ No internet connection — data may be outdated
    </span>
  </div>
)}
```

### Online Banner
**Duration**: 3 seconds (auto-dismiss)
**Style**: Green success theme
**Animation**: fadeIn

```jsx
{isOnline && showOnlineBanner && (
  <div className="w-full bg-green-500/20 text-green-300 border-b border-green-500/30 px-6 py-3 flex items-center justify-center gap-2 z-50 animate-fadeIn">
    <span className="text-sm font-semibold">✓ Back online</span>
  </div>
)}
```

### Features
- **Persistent Offline Warning**: Stays visible until connection restored
- **Temporary Online Confirmation**: Shows for 3 seconds then auto-dismisses
- **Native Browser API**: Uses `navigator.onLine` and window events
- **Visual Feedback**: Clear color coding (yellow = warning, green = success)

## 4. Sensor Offline Handling

### Location
`src/components/SensorGrid.jsx`

### Problem Solved
Prevents crashes when sensor nodes return null/undefined data or go offline.

### Implementation

#### Offline Detection
```jsx
const isOffline = status !== 'Online' || speed === null || speed === undefined;
```

#### Visual Treatment
```jsx
<div className={`relative bg-slate-900 rounded-lg border border-slate-700 p-4 hover:border-slate-600 transition-all group ${
  isOffline ? 'opacity-50' : ''
}`}>
```

#### Offline Icon Overlay
```jsx
{isOffline && (
  <div className="absolute top-2 right-2 z-10">
    <div className="p-1.5 bg-slate-800/90 rounded-full border border-slate-700">
      <WifiOff size={14} className="text-slate-500" />
    </div>
  </div>
)}
```

#### Status Badge
```jsx
<span className="text-[10px]">{isOffline ? 'Offline' : status}</span>
```

#### Data Display
```jsx
{!isOffline && speed !== null ? (
  <div className="mb-3">
    <p className={`text-4xl font-mono font-bold ${colorClasses.text} tracking-tight`}>
      {Math.round(speed)}
    </p>
    <p className="text-xs text-slate-500 font-mono mt-1">{unit}</p>
  </div>
) : (
  <div className="mb-3 h-16 flex items-center justify-center">
    <p className="text-xs text-slate-600 font-mono">No reading</p>
  </div>
)}
```

### Features
- **Opacity Reduction**: Offline cards shown at 50% opacity
- **WifiOff Icon**: Small icon overlay in top-right corner
- **Status Badge**: Shows "Offline" instead of "Online"
- **No Data Display**: Shows "No reading" instead of 0 or crashing
- **Preserved Layout**: Maintains grid structure even with offline sensors
- **No Hover Effect**: Disables glow effect for offline sensors

### Offline Conditions
A sensor is considered offline if:
1. `status !== 'Online'`
2. `speed === null`
3. `speed === undefined`
4. `lastReading` is missing

## Error Handling Best Practices

### 1. Always Use Try-Catch
```jsx
try {
  const res = await fetchAPI();
  setData(res.data);
  setError(false);
} catch (err) {
  console.error('Error:', err);
  setError(true);
}
```

### 2. Provide Retry Mechanisms
```jsx
<button onClick={retryFunction}>Retry Connection</button>
```

### 3. Show Last Known Data
```jsx
// Don't clear data on error
catch (err) {
  setError(true);
  // Keep existing data in state
}
```

### 4. Use Appropriate Icons
- `WifiOff` - Network/connection issues
- `ServerCrash` - Backend server issues
- `AlertTriangle` - General errors
- `AlertCircle` - Warnings

### 5. Color Coding
- **Red** (`red-500`): Critical errors, crashes
- **Orange** (`orange-500`): API failures, recoverable errors
- **Yellow** (`yellow-500`): Warnings, offline state
- **Green** (`green-500`): Success, back online

### 6. Loading States
Always show loading state before error state:
```jsx
{loading ? <Skeleton /> : error ? <ErrorPanel /> : <Data />}
```

### 7. Auto-Retry with Intervals
```jsx
useEffect(() => {
  fetchData();
  const interval = setInterval(fetchData, 30000); // Retry every 30s
  return () => clearInterval(interval);
}, []);
```

## Testing Error Scenarios

### 1. Test Error Boundary
```jsx
// Temporarily add this to a component to trigger error
throw new Error('Test error boundary');
```

### 2. Test API Errors
- Stop the backend server
- Observe error panels appear
- Click "Retry Connection"
- Restart backend and verify recovery

### 3. Test Offline Detection
- Open DevTools → Network tab
- Set throttling to "Offline"
- Verify yellow banner appears
- Set back to "Online"
- Verify green banner appears for 3 seconds

### 4. Test Sensor Offline
- Modify sensor data to have `status: 'Offline'` or `speed: null`
- Verify card shows at 50% opacity
- Verify WifiOff icon appears
- Verify "No reading" message displays

## File Structure

```
frontend/src/
├── components/
│   ├── ErrorBoundary.jsx       # React error boundary
│   └── SensorGrid.jsx          # Sensor offline handling
├── pages/
│   ├── Dashboard.jsx           # API error handling
│   ├── Violations.jsx          # API error handling
│   └── Drivers.jsx             # API error handling
├── App.jsx                     # Offline detection, route wrapping
└── ERROR_HANDLING.md           # This documentation
```

## Browser Compatibility

### Online/Offline Detection
- Supported in all modern browsers
- Uses `navigator.onLine` API
- Event listeners: `window.addEventListener('online'/'offline')`

### Error Boundaries
- React 16.0+
- Class components only (not available in functional components)
- Catches errors during rendering, lifecycle methods, and constructors

## Future Enhancements

- [ ] Add exponential backoff for retry attempts
- [ ] Implement request queuing for offline mode
- [ ] Add service worker for offline functionality
- [ ] Show detailed error messages in development mode
- [ ] Add error reporting/logging service integration
- [ ] Implement partial data loading (show what's available)
- [ ] Add connection quality indicator (slow/fast)
- [ ] Implement optimistic UI updates
- [ ] Add undo/redo for failed operations
- [ ] Create error analytics dashboard
