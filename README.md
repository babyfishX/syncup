# SyncUp - Group Calendar Coordination

A web app for coordinating group schedules with time slot selection and color-coded availability.

## Features
- Create events with date ranges
- Mark availability with specific time slots
- **Detailed Availability Popup** (Table view of participants)
- **Dynamic Summary Box** (Best dates & overlapping time windows)
- **Timezone Enforcement** (US Eastern Time)
- Color-coded participant view (25+ distinct colors)
- Side-by-side availability display

## Live Demo
**https://christinacalendarsync.onrender.com**

## Deployment

This app is configured for deployment on Render.com.

### Build Command
```
npm run install-all && npm run build
```

### Start Command
```
npm start
```

## Local Development

1. Install dependencies:
   ```
   cd server && npm install
   cd ../client && npm install
   ```

2. Start the server:
   ```
   cd server && npm start
   ```

3. Start the client (development):
   ```
   cd client && npm run dev
   ```
