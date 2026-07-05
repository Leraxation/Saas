import { getAccessToken } from "@/lib/token";
import { redisGet } from "@/lib/redis";
import * as mock from "@/lib/mock-data";

const BASE = "https://graph.microsoft.com/v1.0";

type DataSource = "graph" | "redis" | "demo";

function envDataSource(): DataSource {
  if (process.env.MICROSOFT_REFRESH_TOKEN) return "graph";
  if (process.env.UPSTASH_REDIS_REST_URL) return "redis";
  return "demo";
}

async function gFetch(path: string, userToken?: string) {
  const token = userToken ?? (await getAccessToken());
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Graph ${res.status}: ${path}`);
  return res.json();
}

export async function gMutate(path: string, method: string, body: unknown, userToken: string) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Graph ${res.status}: ${path}`);
  return res.status === 204 ? null : res.json();
}

export function getDataSource(): DataSource {
  return envDataSource();
}

export async function getLastSyncedAt(): Promise<number | null> {
  if (envDataSource() !== "redis") return null;
  try {
    return await redisGet<number>("pa:syncedAt");
  } catch {
    return null;
  }
}

export async function getMe(userToken?: string) {
  if (userToken) return gFetch("/me?$select=displayName,givenName,mail,userPrincipalName", userToken);
  if (envDataSource() !== "graph") return mock.ME;
  return gFetch("/me?$select=displayName,givenName,mail,userPrincipalName");
}

export async function getEmails(userToken?: string) {
  const src = envDataSource();
  if (!userToken && src === "demo") return { value: mock.EMAILS };
  if (!userToken && src === "redis") {
    const emails = await redisGet<unknown[]>("pa:emails");
    return { value: emails ?? [] };
  }
  const params = new URLSearchParams({
    $top: "25",
    $select: "id,subject,from,receivedDateTime,isRead,bodyPreview",
    $orderby: "receivedDateTime desc",
  });
  return gFetch(`/me/mailFolders/inbox/messages?${params}`, userToken);
}

export async function getCalendarEvents(userToken?: string) {
  const src = envDataSource();
  if (!userToken && src === "demo") return { value: mock.CALENDAR_EVENTS };
  if (!userToken && src === "redis") {
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
  return gFetch(`/me/calendarView?${params}`, userToken);
}

export async function getTasksWithListId(userToken?: string) {
  const src = envDataSource();
  if (!userToken && src === "demo") return { tasks: mock.TASKS, listId: "demo-list" };
  if (!userToken && src === "redis") {
    const tasks = await redisGet<unknown[]>("pa:tasks");
    return { tasks: tasks ?? [], listId: null };
  }
  const lists = await gFetch("/me/todo/lists", userToken);
  if (!lists.value?.length) return { tasks: [], listId: null };
  const defaultList =
    lists.value.find((l: { wellknownListName: string }) => l.wellknownListName === "defaultList") ??
    lists.value[0];
  const params = new URLSearchParams({
    $filter: "status ne 'completed'",
    $top: "20",
    $orderby: "createdDateTime desc",
  });
  const tasks = await gFetch(`/me/todo/lists/${defaultList.id}/tasks?${params}`, userToken);
  return { tasks: tasks.value ?? [], listId: defaultList.id as string };
}
