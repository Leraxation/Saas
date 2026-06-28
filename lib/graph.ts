import { getAccessToken } from "@/lib/token";
import * as mock from "@/lib/mock-data";

const BASE = "https://graph.microsoft.com/v1.0";

function isDemo() {
  return !process.env.MICROSOFT_REFRESH_TOKEN;
}

async function gFetch(path: string) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Graph ${res.status}: ${path}`);
  return res.json();
}

export async function getMe() {
  if (isDemo()) return mock.ME;
  return gFetch("/me?$select=displayName,givenName,mail,userPrincipalName");
}

export async function getEmails() {
  if (isDemo()) return { value: mock.EMAILS };
  const params = new URLSearchParams({
    $top: "25",
    $select: "id,subject,from,receivedDateTime,isRead,bodyPreview",
    $orderby: "receivedDateTime desc",
  });
  return gFetch(`/me/mailFolders/inbox/messages?${params}`);
}

export async function getCalendarEvents() {
  if (isDemo()) return { value: mock.CALENDAR_EVENTS };
  const now = new Date().toISOString();
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    startDateTime: now,
    endDateTime: nextWeek,
    $top: "15",
    $select: "id,subject,start,end,location,organizer,isAllDay",
    $orderby: "start/dateTime",
  });
  return gFetch(`/me/calendarView?${params}`);
}

export async function getTasksWithListId() {
  if (isDemo()) return { tasks: mock.TASKS, listId: "demo-list" };
  const lists = await gFetch("/me/todo/lists");
  if (!lists.value?.length) return { tasks: [], listId: null };
  const defaultList =
    lists.value.find((l: { wellknownListName: string }) => l.wellknownListName === "defaultList") ??
    lists.value[0];
  const params = new URLSearchParams({
    $filter: "status ne 'completed'",
    $top: "20",
    $orderby: "createdDateTime desc",
  });
  const tasks = await gFetch(`/me/todo/lists/${defaultList.id}/tasks?${params}`);
  return { tasks: tasks.value ?? [], listId: defaultList.id as string };
}
