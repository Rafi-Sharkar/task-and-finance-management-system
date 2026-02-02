# User Activity Tracking System

This module tracks user activity sessions using WebSocket connections and stores session data in the database.

## Features

- **Real-time Activity Tracking**: Automatically tracks when users connect/disconnect
- **Session Management**: Records start time, end time, and total duration for each session
- **Daily Activity Aggregation**: Calculates total time spent per day
- **Heartbeat Mechanism**: Keeps sessions alive and detects stale connections
- **Active Status**: Check if a user is currently active
- **Activity Reports**: Get activity summaries for date ranges

## Database Schema

### UserSession

- `id`: Unique session identifier
- `userId`: Reference to the user
- `startTime`: When the session started
- `endTime`: When the session ended (null if active)
- `lastHeartbeat`: Last heartbeat timestamp
- `durationSec`: Total session duration in seconds

### UserDailyActivity

- `id`: Unique identifier
- `userId`: Reference to the user
- `date`: The date (without time)
- `totalDurationSec`: Total time spent on this date in seconds

## WebSocket API (Namespace: `/activity`)

### Connection

Connect to the activity namespace with JWT authentication:

\`\`\`javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/activity', {
auth: {
token: 'your-jwt-token'
}
});
\`\`\`

### Events

#### Client → Server

1. **activity:heartbeat**
   - Sends periodic heartbeat to keep session alive
   - Recommended interval: every 30 seconds
     \`\`\`javascript
     socket.emit('activity:heartbeat');
     \`\`\`

2. **activity:getStatus**
   - Get current activity status for today
     \`\`\`javascript
     socket.emit('activity:getStatus', (response) => {
     console.log(response.data);
     // { isActive: true, totalDurationSec: 3600, activeSessions: 1, date: '2026-01-11' }
     });
     \`\`\`

3. **activity:getSummary**
   - Get activity summary for a date range
     \`\`\`javascript
     socket.emit('activity:getSummary', {
     startDate: '2026-01-01',
     endDate: '2026-01-31'
     }, (response) => {
     console.log(response.data);
     });
     \`\`\`

4. **activity:checkUserActive**
   - Check if another user is currently active
     \`\`\`javascript
     socket.emit('activity:checkUserActive', { userId: 'user-id' }, (response) => {
     console.log(response.data.isActive); // true/false
     });
     \`\`\`

#### Server → Client

1. **activity:status**
   - Sent automatically on connect and when status changes
   - Contains current activity information
     \`\`\`javascript
     socket.on('activity:status', (data) => {
     console.log('Activity Status:', data);
     // { isActive: true, totalDurationSec: 3600, activeSessions: 1, date: '2026-01-11' }
     });
     \`\`\`

## HTTP API Endpoints

All endpoints require JWT authentication.

### GET `/activity/today`

Get current user's activity for today

**Response:**
\`\`\`json
{
"isActive": true,
"totalDurationSec": 3600,
"activeSessions": 1,
"date": "2026-01-11T00:00:00.000Z"
}
\`\`\`

### GET `/activity/summary?startDate=2026-01-01&endDate=2026-01-31`

Get activity summary for a date range

**Response:**
\`\`\`json
[
{
"id": "...",
"userId": "...",
"date": "2026-01-11T00:00:00.000Z",
"totalDurationSec": 7200
},
{
"id": "...",
"userId": "...",
"date": "2026-01-10T00:00:00.000Z",
"totalDurationSec": 5400
}
]
\`\`\`

### GET `/activity/is-active`

Check if current user is active

**Response:**
\`\`\`json
{
"isActive": true
}
\`\`\`

### GET `/activity/check-user?userId=user-id`

Check if another user is active

**Response:**
\`\`\`json
{
"isActive": false,
"userId": "user-id"
}
\`\`\`

## Frontend Implementation Example

### React/Next.js Example

\`\`\`typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useActivityTracking(token: string) {
const [socket, setSocket] = useState<Socket | null>(null);
const [activityStatus, setActivityStatus] = useState({
isActive: false,
totalDurationSec: 0,
activeSessions: 0,
});

useEffect(() => {
// Connect to activity namespace
const activitySocket = io('http://localhost:3000/activity', {
auth: { token },
});

    activitySocket.on('connect', () => {
      console.log('Connected to activity tracking');
    });

    // Listen for activity status updates
    activitySocket.on('activity:status', (data) => {
      setActivityStatus(data);
    });

    setSocket(activitySocket);

    // Send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      activitySocket.emit('activity:heartbeat');
    }, 30000);

    // Cleanup on unmount
    return () => {
      clearInterval(heartbeatInterval);
      activitySocket.disconnect();
    };

}, [token]);

return { socket, activityStatus };
}

// Usage in component
function Dashboard() {
const { activityStatus } = useActivityTracking(authToken);

const hours = Math.floor(activityStatus.totalDurationSec / 3600);
const minutes = Math.floor((activityStatus.totalDurationSec % 3600) / 60);

return (
<div>
<h2>Your Activity Today</h2>
<p>Status: {activityStatus.isActive ? 'Active' : 'Inactive'}</p>
<p>Time Spent: {hours}h {minutes}m</p>
</div>
);
}
\`\`\`

## How It Works

1. **Connection**: When a user connects to the `/activity` namespace, a new session is created
2. **Heartbeat**: Client sends periodic heartbeats to keep the session alive
3. **Tracking**: Session duration is calculated from start time to end time
4. **Disconnection**: When user disconnects, session is ended and duration is saved
5. **Daily Aggregation**: Session duration is added to the daily activity record
6. **Cleanup**: Stale sessions (no heartbeat for 5+ minutes) are automatically cleaned up every 5 minutes

## Configuration

- **Heartbeat Interval**: Recommended 30 seconds (client-side)
- **Session Timeout**: 5 minutes of inactivity
- **Cleanup Interval**: 5 minutes (server-side)

## Notes

- Sessions are automatically created on connection
- Active session time is included in real-time when fetching today's activity
- Multiple simultaneous sessions per user are supported
- Session durations are stored in seconds for precision
- Dates are stored at midnight (00:00:00) for consistent daily aggregation
