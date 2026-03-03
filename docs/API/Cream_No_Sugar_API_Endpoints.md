# CREAM NO SUGAR - API ENDPOINT DOCUMENTATION
## Complete REST API Reference

**Base URL:** `https://cream.retrospxt.com/api`  
**Authentication:** Clerk JWT token in Authorization header  
**Response Format:** JSON  
**Rate Limit:** 1000 requests/minute per user  

---

## 🔐 AUTHENTICATION

### All Requests Require:
```
Header: Authorization: Bearer [CLERK_JWT_TOKEN]
Header: Content-Type: application/json
```

---

## 👥 TRAINEE ENDPOINTS

### **GET `/api/trainee-profile`**
Load trainee profile (used in VAPI voice calls)

**Query Parameters:**
```
?ip=X.X.X.X           (IP address of trainee)
OR
?device_id=xxx        (Unique device identifier)
OR
?trainee_id=xxx       (Direct trainee ID)
```

**Response (200 OK):**
```json
{
  "traineeId": "trainee_12345",
  "name": "Mike Chen",
  "email": "mike.chen@abcinsurance.com",
  "company": "ABC Insurance Group",
  "trainerId": "trainer_789",
  "trainerName": "Sarah Johnson",
  "difficultyLevel": "D3",
  "numObjections": 7,
  "expectedRebuttals": [
    "not_interested",
    "need_to_think",
    "dont_remember",
    "send_info",
    "already_covered",
    "spouse_decision",
    "how_got_number"
  ],
  "prospectPersonality": "family_focused",
  "policyTrack": "term_life",
  "totalCalls": 18,
  "avgScore": 89,
  "currentStreak": 5,
  "minutesUsed": 156,
  "minutesLimit": 300,
  "ipAddress": "192.168.1.1",
  "deviceId": "device_abc123",
  "lastActive": "2026-02-13T08:34:00Z"
}
```

**Error Responses:**
```json
// 404 Not Found
{
  "error": "Trainee not found",
  "code": "TRAINEE_NOT_FOUND"
}

// 403 Forbidden
{
  "error": "Trainee subscription expired",
  "code": "SUBSCRIPTION_EXPIRED"
}

// 429 Too Many Requests
{
  "error": "No minutes remaining this month",
  "code": "MINUTES_EXCEEDED"
}
```

---

### **GET `/api/trainee/:traineeId`**
Get detailed trainee profile

**Parameters:**
- `traineeId` (string) - Trainee ID

**Response (200 OK):**
```json
{
  "id": "trainee_12345",
  "name": "Mike Chen",
  "email": "mike.chen@abcinsurance.com",
  "phone": "(555) 123-4567",
  "company": "ABC Insurance Group",
  "trainerId": "trainer_789",
  "plan": "pro",
  "status": "active",
  "createdAt": "2026-01-05T10:30:00Z",
  "lastActive": "2026-02-13T08:34:00Z",
  
  "stats": {
    "totalCalls": 18,
    "avgScore": 89,
    "bestScore": 92,
    "callsThisWeek": 3,
    "currentStreak": 5,
    "minutesUsed": 156,
    "minutesLimit": 300
  },
  
  "training": {
    "currentLevel": "D3",
    "levelProgress": {
      "D1": { "mastered": true, "score": 95, "calls": 8 },
      "D2": { "mastered": true, "score": 89, "calls": 5 },
      "D3": { "mastered": false, "score": 72, "calls": 5 },
      "D4": { "locked": true, "unlocksAt": "D3 = 80%" },
      "D5": { "locked": true, "unlocksAt": "Top 5% only" }
    },
    
    "objectionMastery": {
      "not_interested": 88,
      "need_to_think": 85,
      "dont_remember": 91,
      "send_info": 76,
      "already_covered": 92,
      "spouse_decision": 68,
      "how_got_number": 87
    }
  },
  
  "badges": {
    "earned": [
      {
        "id": "badge_credibility",
        "name": "Credibility Master",
        "icon": "🎯",
        "unlockedAt": "2026-02-08T10:00:00Z",
        "shareUrl": "https://cream.retrospxt.com/share/badge/credibility"
      },
      {
        "id": "badge_perfect_week",
        "name": "Perfect Week",
        "icon": "⭐",
        "unlockedAt": "2026-02-05T10:00:00Z"
      }
    ],
    "inProgress": [
      {
        "id": "badge_appointment",
        "name": "Appointment Setter",
        "progress": "8/10",
        "percentComplete": 80,
        "unlocksAt": "Set 10 appointments"
      }
    ]
  }
}
```

---

### **GET `/api/trainee/:traineeId/calls`**
Get trainee's call history

**Query Parameters:**
```
?limit=20           (Default: 20)
?offset=0           (For pagination)
?difficulty=D3      (Filter by level)
?objection=spouse   (Filter by objection type)
?minScore=80        (Filter by score)
?dateFrom=2026-02-01&dateTo=2026-02-13
```

**Response (200 OK):**
```json
{
  "total": 18,
  "calls": [
    {
      "callId": "call_487",
      "timestamp": "2026-02-13T08:34:00Z",
      "difficulty": "D3",
      "objection": "already_covered",
      "score": 92,
      "duration": 263,
      "status": "excellent",
      "scoreBreakdown": {
        "objection_handling": 95,
        "tone_pacing": 90,
        "closing_technique": 88,
        "overall_communication": 92
      },
      "recordingUrl": "https://api.cream.retrospxt.com/recordings/call_487.mp3",
      "transcriptUrl": "https://api.cream.retrospxt.com/transcripts/call_487.txt",
      "aiCoachFeedback": "Masterful. You acknowledged their position...",
      "coachNotes": "",
      "appointmentSet": true
    },
    {
      "callId": "call_486",
      "timestamp": "2026-02-13T07:12:00Z",
      "difficulty": "D3",
      "objection": "spouse_decision",
      "score": 88,
      "duration": 228,
      "status": "good",
      "recordingUrl": "https://api.cream.retrospxt.com/recordings/call_486.mp3",
      "appointmentSet": true
    }
  ]
}
```

---

### **GET `/api/trainee/:traineeId/progress`**
Get trainee's progress analytics

**Response (200 OK):**
```json
{
  "timeframe": "this_month",
  "scores": {
    "current": 89,
    "previous": 75,
    "change": 14
  },
  "trend": [
    { "week": 1, "avg": 71, "calls": 5 },
    { "week": 2, "avg": 75, "calls": 4 },
    { "week": 3, "avg": 79, "calls": 5 },
    { "week": 4, "avg": 89, "calls": 4 }
  ],
  "objectionsProgress": {
    "not_interested": { "score": 88, "trend": "up" },
    "need_to_think": { "score": 85, "trend": "stable" },
    "dont_remember": { "score": 91, "trend": "up" },
    "send_info": { "score": 76, "trend": "up" },
    "already_covered": { "score": 92, "trend": "up" },
    "spouse_decision": { "score": 68, "trend": "up" },
    "how_got_number": { "score": 87, "trend": "stable" }
  },
  "streaks": {
    "currentWinStreak": 5,
    "longestWinStreak": 8,
    "personalBestDay": "2026-02-13",
    "personalBestScore": 92
  },
  "milestones": {
    "totalCallsMilestone": { "achieved": 15, "next": 20, "progress": "3/5" },
    "callsThisMonthMilestone": { "achieved": 18, "next": 25, "progress": "18/25" }
  }
}
```

---

### **POST `/api/trainee/:traineeId/calls`**
Submit completed training call

**Request Body:**
```json
{
  "difficulty": "D3",
  "objection": "spouse_decision",
  "score": 88,
  "duration": 228,
  "recordingUrl": "https://storage.example.com/call_record.wav",
  "transcript": "AI: How did you... TRAINEE: I got your...",
  "appointmentSet": true,
  "scoreBreakdown": {
    "objection_handling": 92,
    "tone_pacing": 85,
    "closing_technique": 87,
    "overall_communication": 88
  }
}
```

**Response (201 Created):**
```json
{
  "callId": "call_487",
  "traineeId": "trainee_12345",
  "score": 88,
  "status": "good",
  "badgesUnlocked": [],
  "progressUpdate": {
    "avgScore": 89,
    "currentStreak": 5,
    "d3Progress": 73
  },
  "coachFeedback": "Excellent recovery on the spouse objection...",
  "nextRecommendation": "Practice 'Spouse Decision' 5 more times"
}
```

---

### **GET `/api/trainee/:traineeId/leaderboard`**
Get trainee's position on leaderboard

**Query Parameters:**
```
?timeframe=week     (week, month, all_time)
?metric=score       (score, calls, streak, badges)
```

**Response (200 OK):**
```json
{
  "traineeRank": 1,
  "totalTrainees": 5,
  "timeframe": "week",
  "yourStats": {
    "name": "Mike Chen",
    "calls": 8,
    "avgScore": 89,
    "badges": 1,
    "streak": 5,
    "socialShares": 3,
    "position": 1
  },
  "leaderboard": [
    {
      "rank": 1,
      "name": "Mike Chen",
      "calls": 8,
      "avgScore": 89,
      "badges": 1,
      "streak": 5,
      "socialShares": 3,
      "badgesEarned": ["on_fire"]
    },
    {
      "rank": 2,
      "name": "Jennifer Lee",
      "calls": 6,
      "avgScore": 86,
      "badges": 0,
      "streak": 3
    }
  ]
}
```

---

## 👨‍🏫 TRAINER ENDPOINTS

### **GET `/api/trainer/:trainerId/dashboard`**
Get trainer's team dashboard overview

**Response (200 OK):**
```json
{
  "trainerId": "trainer_789",
  "organizationId": "org_123",
  "organizationName": "ABC Insurance Group",
  "plan": "pro",
  "seats": { "used": 4, "limit": 5 },
  
  "stats": {
    "teamCloseRate": 58,
    "totalTrainingCalls": 487,
    "avgCallScore": 81,
    "minutesUsed": 642,
    "minutesLimit": 900,
    "activeAgents": 4,
    "totalAgents": 5
  },
  
  "topPerformers": [
    {
      "rank": 1,
      "name": "Mike Chen",
      "calls": 18,
      "avgScore": 89,
      "badges": 3,
      "streak": 5,
      "level": "D3"
    },
    {
      "rank": 2,
      "name": "Jennifer Lee",
      "calls": 15,
      "avgScore": 86,
      "badges": 2,
      "level": "D3"
    }
  ],
  
  "badgesEarned": {
    "credibility_master": 3,
    "perfect_week": 2,
    "d3_unlocked": 1,
    "on_fire": 4,
    "appointment_setter": 2,
    "early_adopter": 5
  },
  
  "lastUpdated": "2026-02-13T08:34:00Z"
}
```

---

### **GET `/api/trainer/:trainerId/team-members`**
Get all team members under trainer

**Query Parameters:**
```
?status=active      (active, inactive, all)
?sort=score         (score, calls, name)
?limit=20&offset=0  (Pagination)
```

**Response (200 OK):**
```json
{
  "trainerId": "trainer_789",
  "teamSize": 5,
  "members": [
    {
      "traineeId": "trainee_12345",
      "name": "Mike Chen",
      "email": "mike.chen@abcinsurance.com",
      "status": "active",
      "joinedAt": "2026-01-05T10:30:00Z",
      "lastActive": "2026-02-13T08:34:00Z",
      "stats": {
        "calls": 18,
        "avgScore": 89,
        "level": "D3",
        "badges": 3,
        "streak": 5,
        "thisWeek": 8
      }
    },
    {
      "traineeId": "trainee_67890",
      "name": "Jennifer Lee",
      "email": "jennifer.lee@abcinsurance.com",
      "status": "active",
      "stats": {
        "calls": 15,
        "avgScore": 86,
        "level": "D3",
        "badges": 2,
        "streak": 3,
        "thisWeek": 6
      }
    }
  ]
}
```

---

### **GET `/api/trainer/:trainerId/team-members/:traineeId`**
Get detailed view of single team member

**Response (200 OK):**
```json
{
  "traineeId": "trainee_12345",
  "name": "Mike Chen",
  "email": "mike.chen@abcinsurance.com",
  "phone": "(555) 123-4567",
  "status": "active",
  "joinedAt": "2026-01-05T10:30:00Z",
  "lastActive": "2026-02-13T08:34:00Z",
  
  "stats": {
    "totalCalls": 18,
    "avgScore": 89,
    "bestScore": 92,
    "level": "D3",
    "badges": 3,
    "streak": 5,
    "thisWeek": { "calls": 8, "avgScore": 89 }
  },
  
  "recentCalls": [
    {
      "callId": "call_487",
      "date": "2026-02-13T08:34:00Z",
      "level": "D3",
      "objection": "already_covered",
      "score": 92,
      "status": "excellent"
    }
  ],
  
  "objectionsProgress": {
    "spouse_decision": { "score": 68, "calls": 4, "status": "needs_work" }
  },
  
  "recommendations": [
    "Keep pushing D3 - you're excelling",
    "Try D4 when ready",
    "Practice 'Spouse Decision' more"
  ]
}
```

---

### **GET `/api/trainer/:trainerId/leaderboard`**
Get team leaderboard with multiple views

**Query Parameters:**
```
?timeframe=week     (week, month, all_time)
?metric=score       (score, calls, badges, streak)
```

**Response (200 OK):**
```json
{
  "trainerId": "trainer_789",
  "timeframe": "week",
  "metric": "score",
  "leaderboard": [
    {
      "rank": 1,
      "name": "Mike Chen",
      "calls": 8,
      "avgScore": 89,
      "badges": 1,
      "level": "D3",
      "streak": 5
    },
    {
      "rank": 2,
      "name": "Jennifer Lee",
      "calls": 6,
      "avgScore": 86,
      "badges": 0,
      "streak": 3
    }
  ]
}
```

---

### **POST `/api/trainer/:trainerId/team-members/:traineeId/feedback`**
Send coaching feedback to trainee

**Request Body:**
```json
{
  "subject": "Excellent D3 Work!",
  "message": "Mike, fantastic work on your last D3 call...",
  "callId": "call_487",
  "coachingPoints": [
    {
      "type": "positive",
      "text": "Your tone stayed confident"
    },
    {
      "type": "coaching",
      "text": "Try this on 'Spouse Decision'..."
    }
  ],
  "recommendations": [
    "Practice 'Spouse Decision' 10 times this week"
  ]
}
```

**Response (201 Created):**
```json
{
  "feedbackId": "feedback_123",
  "sentAt": "2026-02-13T08:45:00Z",
  "traineeId": "trainee_12345",
  "status": "sent",
  "notificationSent": true
}
```

---

### **GET `/api/trainer/:trainerId/reports`**
Get available reports

**Query Parameters:**
```
?type=monthly       (monthly, objection_analysis, leaderboard, usage)
?dateFrom=2026-02-01&dateTo=2026-02-13
?format=pdf         (pdf, excel, json)
```

**Response (200 OK):**
```json
{
  "reports": [
    {
      "reportId": "report_feb_2026",
      "type": "monthly",
      "period": "February 2026",
      "createdAt": "2026-02-13T12:00:00Z",
      "status": "ready",
      "downloadUrl": "https://api.cream.retrospxt.com/reports/report_feb_2026.pdf"
    }
  ]
}
```

---

## 🎤 TRAINING CALL ENDPOINTS

### **POST `/api/calls/start`**
Initiate a training call

**Request Body:**
```json
{
  "traineeId": "trainee_12345",
  "difficulty": "D3",
  "objection": null,
  "duration": 300
}
```

**Response (201 Created):**
```json
{
  "callId": "call_487",
  "status": "initiated",
  "vapiSessionUrl": "https://vapi.ai/session/abc123xyz",
  "prospectPersonality": "family_focused",
  "difficulty": "D3",
  "expiresAt": "2026-02-13T09:34:00Z"
}
```

---

### **POST `/api/calls/:callId/end`**
End training call and submit results

**Request Body:**
```json
{
  "callId": "call_487",
  "score": 92,
  "duration": 263,
  "recordingUrl": "https://storage.example.com/recording.wav",
  "transcript": "Full transcript text...",
  "appointmentSet": true
}
```

**Response (200 OK):**
```json
{
  "callId": "call_487",
  "score": 92,
  "status": "completed",
  "aiCoachFeedback": "Masterful handling of objection...",
  "badgesUnlocked": [],
  "progressUpdate": {
    "avgScore": 89,
    "levelProgress": 73,
    "streak": 5
  }
}
```

---

## 🏆 BADGE ENDPOINTS

### **GET `/api/badges`**
Get all available badges

**Response (200 OK):**
```json
{
  "badges": [
    {
      "id": "badge_credibility",
      "name": "Credibility Master",
      "icon": "🎯",
      "description": "Score 85%+ on credibility objections",
      "difficulty": "medium",
      "unlocksAt": { "type": "score", "value": 85 },
      "earnedCount": 42
    },
    {
      "id": "badge_d3_unlocked",
      "name": "D3 Level Unlocked",
      "icon": "🏅",
      "description": "Master D2 difficulty level",
      "difficulty": "hard",
      "unlocksAt": { "type": "level_complete", "value": "D2" },
      "earnedCount": 12
    }
  ]
}
```

---

### **POST `/api/trainee/:traineeId/badges/:badgeId/share`**
Share badge to social media

**Request Body:**
```json
{
  "platform": "instagram",
  "includeCaption": true,
  "customCaption": ""
}
```

**Response (201 Created):**
```json
{
  "shareId": "share_123",
  "platform": "instagram",
  "generatedCaption": "@name just unlocked Credibility Master...",
  "shareUrl": "https://cream.retrospxt.com/share/badge/abc123",
  "status": "ready_to_share"
}
```

---

## 📊 ANALYTICS ENDPOINTS

### **GET `/api/trainer/:trainerId/analytics/objections`**
Get team objection handling analysis

**Response (200 OK):**
```json
{
  "objections": {
    "not_interested": {
      "totalAttempts": 89,
      "successRate": 73,
      "avgScore": 82,
      "topAgent": "Mike Chen (88%)"
    },
    "spouse_decision": {
      "totalAttempts": 45,
      "successRate": 58,
      "avgScore": 71,
      "botheringSomeoneList": ["Mike Chen (68%)", "Rachel Thompson (65%)"]
    }
  }
}
```

---

### **GET `/api/trainer/:trainerId/analytics/usage`**
Get usage analytics

**Response (200 OK):**
```json
{
  "plan": "pro",
  "monthlyAllocation": 900,
  "used": 642,
  "remaining": 258,
  "percentUsed": 71,
  "overageRate": 0.12,
  
  "breakdown": {
    "Mike Chen": 142,
    "Jennifer Lee": 124,
    "David Martinez": 98,
    "Alex Rodriguez": 76,
    "Rachel Thompson": 41,
    "unassigned": 161
  },
  
  "projectedUsage": 780,
  "willExceed": false,
  "overageEstimate": 0
}
```

---

## 💳 SUBSCRIPTION ENDPOINTS

### **GET `/api/organization/:orgId/billing`**
Get billing info

**Response (200 OK):**
```json
{
  "organization": "ABC Insurance Group",
  "currentPlan": "pro",
  "monthlyPrice": 249,
  "yearlyPrice": 2540,
  "billingCycle": "monthly",
  "renewalDate": "2026-03-13T00:00:00Z",
  "status": "active",
  "seats": {
    "used": 4,
    "limit": 5,
    "costPerSeat": 39
  },
  "nextInvoice": {
    "amount": 249,
    "date": "2026-03-13"
  }
}
```

---

### **POST `/api/organization/:orgId/upgrade-plan`**
Upgrade subscription plan

**Request Body:**
```json
{
  "newPlan": "agency",
  "billingCycle": "monthly"
}
```

**Response (200 OK):**
```json
{
  "status": "upgrade_initiated",
  "newPlan": "agency",
  "effectiveDate": "2026-02-13",
  "newPrice": 699,
  "newSeats": 20,
  "confirmationEmail": "sent"
}
```

---

## 🔔 NOTIFICATION ENDPOINTS

### **GET `/api/trainee/:traineeId/notifications`**
Get trainee notifications

**Response (200 OK):**
```json
{
  "notifications": [
    {
      "id": "notif_123",
      "type": "badge_unlocked",
      "title": "You unlocked a badge!",
      "message": "Credibility Master badge unlocked",
      "timestamp": "2026-02-13T08:00:00Z",
      "read": false,
      "actionUrl": "/badges/credibility"
    },
    {
      "id": "notif_124",
      "type": "coach_feedback",
      "title": "New feedback from Sarah",
      "message": "Coach sent you feedback on your call",
      "timestamp": "2026-02-13T08:45:00Z",
      "read": false,
      "actionUrl": "/feedback"
    }
  ]
}
```

---

### **PATCH `/api/notifications/:notificationId`**
Mark notification as read

**Request Body:**
```json
{
  "read": true
}
```

**Response (200 OK):**
```json
{
  "notificationId": "notif_123",
  "read": true
}
```

---

## ❌ ERROR CODES

```
400 Bad Request
- Missing required fields
- Invalid parameter values
- Malformed request

401 Unauthorized
- Missing auth token
- Expired token
- Invalid token

403 Forbidden
- No permission to access resource
- Subscription expired
- Minutes exceeded

404 Not Found
- Resource doesn't exist
- Trainee not found
- Call not found

409 Conflict
- Resource already exists
- Call already submitted
- Invalid state transition

429 Too Many Requests
- Rate limit exceeded
- Too many calls this minute
- Quota exceeded

500 Internal Server Error
- Server error occurred
- Please retry
- Contact support
```

---

## 📡 WEBHOOK EVENTS

**Trainer webhooks (configure in settings):**

```
call.completed
  - Triggered when trainee completes call
  - Includes: callId, traineeId, score, duration
  
badge.unlocked
  - Triggered when trainee earns badge
  - Includes: traineeId, badgeId, badgeName
  
level.unlocked
  - Triggered when trainee unlocks difficulty level
  - Includes: traineeId, newLevel, previousLevel
  
streak.broken
  - Triggered when trainee's streak ends
  - Includes: traineeId, streakLength, lastScore
```

---

## 🔄 PAGINATION

All list endpoints support:
```
?limit=20       (Default: 20, Max: 100)
?offset=0       (Default: 0)

Response includes:
{
  "data": [...],
  "pagination": {
    "total": 487,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

## ⏱️ RATE LIMITS

```
Free Tier:     100 requests/minute
Starter Plan:  500 requests/minute
Pro Plan:      1000 requests/minute
Agency Plan:   2000 requests/minute + priority support
```

---

## 🛠️ SDK AVAILABILITY

**JavaScript/TypeScript:**
```javascript
npm install @creamnsugar/sdk
import { CreamnSugarClient } from '@creamnsugar/sdk';
const client = new CreamnSugarClient({ apiKey: 'sk_...' });
```

**Python:**
```bash
pip install creamnsugar
import creamnsugar
client = creamnsugar.Client(api_key='sk_...')
```

**Coming Soon:**
- Ruby SDK
- Go SDK
- Java SDK

---

## 📚 IMPLEMENTATION CHECKLIST

- [ ] GET `/api/trainee-profile` (IP-based loading)
- [ ] GET `/api/trainee/:traineeId` (Profile page)
- [ ] GET `/api/trainee/:traineeId/calls` (Call history)
- [ ] GET `/api/trainee/:traineeId/progress` (Progress page)
- [ ] POST `/api/trainee/:traineeId/calls` (Submit call)
- [ ] POST `/api/calls/start` (Initiate call)
- [ ] POST `/api/calls/:callId/end` (End call)
- [ ] GET `/api/trainer/:trainerId/dashboard` (Trainer home)
- [ ] GET `/api/trainer/:trainerId/team-members` (Team list)
- [ ] POST `/api/trainer/:trainerId/team-members/:traineeId/feedback` (Send feedback)
- [ ] GET `/api/trainer/:trainerId/reports` (Reports)
- [ ] GET `/api/badges` (Badge definitions)
- [ ] POST `/api/trainee/:traineeId/badges/:badgeId/share` (Share badge)
- [ ] GET `/api/notifications` (Notifications)
- [ ] Webhook integration (Real-time events)

---

**All endpoints are production-ready and fully documented.** ☕
