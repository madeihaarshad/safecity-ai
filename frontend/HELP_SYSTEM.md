# SafeCity AI - Multi-Level Help System

This document describes the three-level help system implemented following HCI Week 9 Multi-level Help pattern.

## Overview

The help system provides progressive disclosure of information through three levels:
1. **Tooltips** - Quick hints on hover/focus
2. **Contextual Help Panel** - Page-specific guidance
3. **Welcome Modal** - First-time user onboarding

## Level 1: Tooltips

### Implementation
- All icon-only buttons have `aria-label` and `title` attributes
- StatCards display info icon (ⓘ) buttons next to titles
- Clicking the info icon shows a popover with 2-3 sentences explaining the metric

### Usage
```jsx
<button
  aria-label="Open help panel"
  title="Help"
  onClick={handleClick}
>
  <HelpCircle size={20} />
</button>
```

### StatCard Info Popovers
```jsx
<StatCard
  title="Total Fleet"
  value={stats.drivers}
  icon={Car}
  color="blue"
  description="Total number of active registered city vehicles"
/>
```

## Level 2: Contextual Help Panel

### Component: `HelpPanel.jsx`

A slide-in panel from the right side that provides page-specific help content.

### Features
- Opens via `?` button in top header (before notification bell)
- Fixed position: `top-14, bottom-0, right-0, w-80`
- Dark theme: `bg-slate-900, border-slate-800`
- Closes with X button or Escape key
- Backdrop overlay when open
- Accordion sections for organized content

### Page-Specific Content

#### Dashboard
- Understanding KPIs (Fleet, Violations, Disasters, Risk Index)
- Risk Index Explained (update frequency, factors, levels)
- Alert Priorities (Critical, High, Normal, Low)
- Charts & Visualizations

#### Violations
- Understanding Columns (Driver, Type, Severity, Location, Time, Status)
- Filter Options (Severity, Type, Date Range, Status)
- Severity Levels (Critical, High, Medium, Low)

#### Disasters
- Event Types (Flood, Fire, Earthquake, Storm, Hazmat, Infrastructure)
- Recommended Responses (protocols for each event type)
- Status Indicators (Active, Monitoring, Resolved)

#### Map
- Sensor Colors (Green, Yellow, Orange, Red, Gray)
- Cluster Icons (grouping behavior)
- Map Controls (Zoom, Pan, Layers, Search)

#### Drivers
- Driver Profiles (License, Vehicle, History, Risk Score)
- Risk Scoring (calculation factors)

#### Analytics
- Predictive Models (accident probability, congestion, behavior)
- Data Sources (sensors, historical records, external feeds)

#### Route Planner
- Route Optimization (factors considered)
- Using the Planner (step-by-step guide)

### Usage
```jsx
import HelpPanel from './components/HelpPanel';

const [helpPanelOpen, setHelpPanelOpen] = useState(false);

<HelpPanel 
  isOpen={helpPanelOpen} 
  onClose={() => setHelpPanelOpen(false)} 
/>
```

## Level 3: Welcome Modal

### Component: `WelcomeModal.jsx`

A first-visit onboarding modal with a 3-step carousel.

### Features
- Shows only on first visit (checks `localStorage: 'safecity-welcomed'`)
- Full-screen backdrop: `bg-black/60 backdrop-blur-sm`
- Centered modal with smooth animations
- 3-step carousel with progress indicators

### Steps

1. **Welcome to SafeCity AI**
   - Icon: Shield
   - Message: Real-time city safety monitoring at a glance

2. **Monitor Everything in One Place**
   - Icon: Activity
   - Message: Access comprehensive dashboards for all modules

3. **AI-Powered Risk Intelligence**
   - Icon: Bell
   - Message: AI Risk Index updates every 30 seconds

### Controls
- "Skip" button (dismisses modal)
- "Next" button (advances to next step)
- "Get Started →" button (final step, sets localStorage and closes)

### Usage
```jsx
import WelcomeModal from './components/WelcomeModal';

// Add to App.jsx
<WelcomeModal />
```

### Reset Welcome Modal
To show the welcome modal again (for testing):
```javascript
localStorage.removeItem('safecity-welcomed');
```

## Accessibility Features

### ARIA Labels
All icon-only buttons include:
- `aria-label`: Descriptive text for screen readers
- `title`: Tooltip text for visual users

### Keyboard Navigation
- Help Panel closes with Escape key
- All interactive elements are keyboard accessible
- Focus management for modal dialogs

### Screen Reader Support
- Semantic HTML elements
- Proper ARIA roles and attributes
- Descriptive labels for all controls

## Styling

### Animations
Custom CSS animations in `index.css`:
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Color Scheme
- Background: `bg-slate-900`
- Borders: `border-slate-800`
- Text: `text-white`, `text-slate-300`, `text-slate-400`
- Accent: `text-accent` (cyan/blue)
- Hover states: `hover:bg-slate-800`

## File Structure

```
frontend/src/
├── components/
│   ├── HelpPanel.jsx          # Level 2: Contextual help
│   ├── WelcomeModal.jsx       # Level 3: First-visit onboarding
│   └── StatCard.jsx           # Level 1: Info icon popovers
├── App.jsx                    # Help button integration
└── index.css                  # Animation styles
```

## Testing Checklist

- [ ] All icon-only buttons have aria-label and title
- [ ] StatCard info icons display popovers on click
- [ ] Help button opens HelpPanel
- [ ] HelpPanel shows correct content for each page
- [ ] HelpPanel closes with X button
- [ ] HelpPanel closes with Escape key
- [ ] Welcome modal shows on first visit
- [ ] Welcome modal carousel advances through 3 steps
- [ ] Welcome modal sets localStorage on completion
- [ ] Welcome modal doesn't show on subsequent visits
- [ ] All animations work smoothly
- [ ] Keyboard navigation works throughout
- [ ] Screen reader announces all elements correctly

## Future Enhancements

- Add search functionality to Help Panel
- Include video tutorials in help content
- Add interactive tooltips with examples
- Implement context-sensitive help (based on user actions)
- Add help content versioning
- Include keyboard shortcuts reference
- Add "What's New" section for updates
