import { getAccessToken } from "@/lib/token";
import { redisGet } from "@/lib/redis";
import * as mock from "@/lib/mock-data";

const BASE = "https://graph.microsoft.com/v1.0";

type DataSource = "graph" | "redis" | "demo";

function dataSource(): DataSource {
  if (process.env.MICROSOFT_REFRESH_TOKEN) return "graph";
  if (process.env.UPSTASH_REDIS_REST_URL) return "redis";
  return "demo";
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

export function getDataSource(): DataSource {
  return dataSource();
}

export async function getLastSyncedAt(): Promise<number | null> {
  if (dataSource() !== "redis") return null;
  try {
    return await redisGet<number>("pa:syncedAt");
  } catch {
    return null;
  }
}

export async function getMe() {
  if (dataSource() !== "graph") return mock.ME;
  return gFetch("/me?$select=displayName,givenName,mail,userPrincipalName");
}

export async function getEmails() {
  const src = dataSource();
  if (src === "demo") return { value: mock.EMAILS };
  if (src === "redis") {
    const emails = await redisGet<unknown[]>("pa:emails");
    return { value: emails ?? [] };
  }
  const params = new URLSearchParams({
    $top: "25",
    $select: "id,subject,from,receivedDateTime,isRead,bodyPreview",
    $orderby: "receivedDateTime desc",
  });
  return gFetch(`/me/mailFolders/inbox/messages?${params}`);
}

export async function getCalendarEvents() {
  const src = dataSource();
  if (src === "demo") return { value: mock.CALENDAR_EVENTS };
  if (src === "redis") {
    const events = await redisGet<unknown[]>("pa:calendar");
    return { value: events ?? [] };
  }
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
  const src = dataSource();
  if (src === "demo") return { tasks: mock.TASKS, listId: "demo-list" };
  if (src === "redis") {
    const tasks = await redisGet<unknown[]>("pa:tasks");
    return { tasks: tasks ?? [], listId: null };
  }
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
