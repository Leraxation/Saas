import { getAccessToken } from "@/lib/token";

const BASE = "https://graph.microsoft.com/v1.0";

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
  return gFetch("/me?$select=displayName,givenName,mail,userPrincipalName");
}

export async function getEmails() {
  const params = new URLSearchParams({
    $top: "25",
    $select: "id,subject,from,receivedDateTime,isRead,bodyPreview",
    $orderby: "receivedDateTime desc",
  });
  return gFetch(`/me/mailFolders/inbox/messages?${params}`);
}

export async function getCalendarEvents() {
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
