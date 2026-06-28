const now = Date.now();
const mins = (n: number) => new Date(now - n * 60_000).toISOString();
const days = (n: number) => new Date(now + n * 86_400_000).toISOString();

export const ME = {
  displayName: "Alex Rivera",
  givenName: "Alex",
  mail: "alex.rivera@outlook.com",
  userPrincipalName: "alex.rivera@outlook.com",
};

export const EMAILS = [
  {
    id: "1",
    subject: "Q3 Performance Report — Action Required",
    from: { emailAddress: { name: "Sarah Johnson", address: "sarah.johnson@acme.com" } },
    receivedDateTime: mins(8),
    isRead: false,
    bodyPreview:
      "Hi Alex, please review the attached Q3 report before Thursday's board meeting. Key highlights include a 23% increase in revenue and...",
  },
  {
    id: "2",
    subject: "Re: Project Phoenix — Sprint 4 Kickoff",
    from: { emailAddress: { name: "Marcus Lee", address: "m.lee@acme.com" } },
    receivedDateTime: mins(42),
    isRead: false,
    bodyPreview:
      "Sounds good! I've updated the Jira board and assigned the new tickets. Can we push the design review to Wednesday instead?",
  },
  {
    id: "3",
    subject: "Your invoice #INV-2891 is ready",
    from: { emailAddress: { name: "Stripe", address: "receipts@stripe.com" } },
    receivedDateTime: mins(95),
    isRead: false,
    bodyPreview:
      "Your invoice for $1,249.00 is now available. Payment is due by July 15, 2026. View invoice →",
  },
  {
    id: "4",
    subject: "Team lunch — Friday 12:30pm",
    from: { emailAddress: { name: "Priya Kapoor", address: "priya@acme.com" } },
    receivedDateTime: mins(180),
    isRead: true,
    bodyPreview:
      "Hey everyone! Booking Osteria Morini for Friday. Please RSVP by Wednesday so I can confirm the reservation. Looking forward to it!",
  },
  {
    id: "5",
    subject: "GitHub Actions CI failure on main",
    from: { emailAddress: { name: "GitHub", address: "noreply@github.com" } },
    receivedDateTime: mins(260),
    isRead: true,
    bodyPreview:
      "Run #4821 failed. Job: build. The workflow 'CI' on branch 'main' failed. View the full log to diagnose the issue.",
  },
  {
    id: "6",
    subject: "Welcome to the new design system",
    from: { emailAddress: { name: "Design Team", address: "design@acme.com" } },
    receivedDateTime: mins(480),
    isRead: true,
    bodyPreview:
      "We're excited to announce the rollout of our refreshed component library. Storybook is live at design.acme.com. All teams should...",
  },
  {
    id: "7",
    subject: "Quarterly OKR check-in reminder",
    from: { emailAddress: { name: "Google Calendar", address: "calendar-notification@google.com" } },
    receivedDateTime: mins(720),
    isRead: true,
    bodyPreview:
      "This is a reminder: Quarterly OKR check-in starts in 30 minutes. Join the video call at meet.google.com/xyz-abc-def",
  },
  {
    id: "8",
    subject: "New comment on your PR #312",
    from: { emailAddress: { name: "Tom Chen", address: "t.chen@acme.com" } },
    receivedDateTime: mins(1200),
    isRead: true,
    bodyPreview:
      "Left a few minor nits on the auth refactor PR. Nothing blocking — mainly style consistency. LGTM otherwise, nice work!",
  },
];

export const CALENDAR_EVENTS = [
  {
    id: "c1",
    subject: "Daily Standup",
    start: { dateTime: days(0).replace("T", "T09:00:00").slice(0, 19) + ".000Z", timeZone: "UTC" },
    end: { dateTime: days(0).replace("T", "T09:15:00").slice(0, 19) + ".000Z", timeZone: "UTC" },
    location: { displayName: "Zoom" },
    isAllDay: false,
  },
  {
    id: "c2",
    subject: "Design Review — Phoenix v2",
    start: { dateTime: days(0).replace("T", "T14:00:00").slice(0, 19) + ".000Z", timeZone: "UTC" },
    end: { dateTime: days(0).replace("T", "T15:00:00").slice(0, 19) + ".000Z", timeZone: "UTC" },
    location: { displayName: "Conference Room B" },
    isAllDay: false,
  },
  {
    id: "c3",
    subject: "1:1 with Sarah",
    start: { dateTime: days(1).replace("T", "T10:30:00").slice(0, 19) + ".000Z", timeZone: "UTC" },
    end: { dateTime: days(1).replace("T", "T11:00:00").slice(0, 19) + ".000Z", timeZone: "UTC" },
    location: { displayName: "" },
    isAllDay: false,
  },
  {
    id: "c4",
    subject: "Sprint 4 Planning",
    start: { dateTime: days(1).replace("T", "T13:00:00").slice(0, 19) + ".000Z", timeZone: "UTC" },
    end: { dateTime: days(1).replace("T", "T14:30:00").slice(0, 19) + ".000Z", timeZone: "UTC" },
    location: { displayName: "Zoom" },
    isAllDay: false,
  },
  {
    id: "c5",
    subject: "Team Lunch",
    start: { dateTime: days(4).replace("T", "T12:30:00").slice(0, 19) + ".000Z", timeZone: "UTC" },
    end: { dateTime: days(4).replace("T", "T14:00:00").slice(0, 19) + ".000Z", timeZone: "UTC" },
    location: { displayName: "Osteria Morini" },
    isAllDay: false,
  },
  {
    id: "c6",
    subject: "Quarterly OKR Review",
    start: { dateTime: days(5).replace("T", "T09:00:00").slice(0, 19) + ".000Z", timeZone: "UTC" },
    end: { dateTime: days(5).replace("T", "T10:00:00").slice(0, 19) + ".000Z", timeZone: "UTC" },
    location: { displayName: "Board Room" },
    isAllDay: false,
  },
];

export const TASKS = [
  {
    id: "t1",
    title: "Review Q3 performance report",
    status: "notStarted",
    importance: "high",
    dueDateTime: { dateTime: days(0).slice(0, 10) + "T23:59:00.000Z" },
    createdDateTime: mins(500),
  },
  {
    id: "t2",
    title: "Merge auth refactor PR #312",
    status: "notStarted",
    importance: "normal",
    dueDateTime: { dateTime: days(1).slice(0, 10) + "T23:59:00.000Z" },
    createdDateTime: mins(600),
  },
  {
    id: "t3",
    title: "Update component library docs",
    status: "notStarted",
    importance: "normal",
    dueDateTime: { dateTime: days(3).slice(0, 10) + "T23:59:00.000Z" },
    createdDateTime: mins(800),
  },
  {
    id: "t4",
    title: "RSVP for team lunch on Friday",
    status: "notStarted",
    importance: "low",
    dueDateTime: { dateTime: days(2).slice(0, 10) + "T23:59:00.000Z" },
    createdDateTime: mins(200),
  },
  {
    id: "t5",
    title: "Prepare Sprint 4 planning agenda",
    status: "notStarted",
    importance: "high",
    dueDateTime: { dateTime: days(1).slice(0, 10) + "T23:59:00.000Z" },
    createdDateTime: mins(300),
  },
];
