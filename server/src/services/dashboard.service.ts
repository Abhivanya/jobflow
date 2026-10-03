import { Types } from "mongoose";
import { applicationStatuses, statusLabel } from "../constants";
import { Application } from "../models/Application";
import { ApplicationEvent } from "../models/ApplicationEvent";
import { FollowUp } from "../models/FollowUp";
import { Job } from "../models/Job";
import { redisGet, redisSet } from "./cache";

function weekKey(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? 6 : day - 1;
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().slice(0, 10);
}

export async function dashboard(userId: string) {
  const cached = await redisGet(`dashboard:${userId}`);
  if (cached) return JSON.parse(cached) as Awaited<ReturnType<typeof compute>>;
  const data = await compute(userId);
  await redisSet(`dashboard:${userId}`, JSON.stringify(data), 30);
  return data;
}

async function compute(userId: string) {
  const userObjectId = new Types.ObjectId(userId);
  const [jobs, saved, applications, pendingFollowUps, grouped, recentEvents] = await Promise.all([
    Job.countDocuments({ userId, deletedAt: null }),
    Job.countDocuments({ userId, deletedAt: null, saved: true }),
    Application.countDocuments({ userId }),
    FollowUp.countDocuments({ userId, status: "scheduled" }),
    Application.aggregate<{ _id: string; count: number }>([
      { $match: { userId: userObjectId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    ApplicationEvent.find({ userId }).sort({ createdAt: -1 }).limit(8),
  ]);

  const byStatus = applicationStatuses.map((status) => ({
    status,
    label: statusLabel[status],
    count: grouped.find((row) => row._id === status)?.count ?? 0,
  }));

  const since = new Date();
  since.setDate(since.getDate() - 7 * 12);
  const recentApps = await Application.find({ userId, createdAt: { $gte: since } }).select("createdAt");
  const buckets = new Map<string, number>();
  for (const app of recentApps) {
    const key = weekKey(app.createdAt);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const overTime = Array.from(buckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, count]) => ({ week, count }));

  const events = await ApplicationEvent.find({
    userId,
    toStatus: { $in: ["APPLIED", "FOLLOW_UP", "INTERVIEW", "OFFER", "REJECTED"] },
  }).select("applicationId toStatus");
  const applied = new Set<string>();
  const interviews = new Set<string>();
  const offers = new Set<string>();
  for (const event of events) {
    const id = event.applicationId.toString();
    if (event.toStatus === "OFFER") {
      offers.add(id);
      applied.add(id);
    } else if (event.toStatus === "INTERVIEW") {
      interviews.add(id);
      applied.add(id);
    } else if (event.toStatus) {
      applied.add(id);
    }
  }

  const snapshot = Object.fromEntries(byStatus.map((row) => [row.status, row.count])) as Record<string, number>;

  return {
    counts: {
      jobs,
      saved,
      applications,
      interviews: snapshot.INTERVIEW ?? 0,
      offers: snapshot.OFFER ?? 0,
      rejections: snapshot.REJECTED ?? 0,
      pendingFollowUps,
    },
    byStatus,
    overTime,
    conversion: {
      applied: applied.size,
      interviews: interviews.size,
      offers: offers.size,
    },
    recent: recentEvents.map((event) => ({
      id: event.id,
      summary: event.summary,
      createdAt: event.createdAt,
      applicationId: event.applicationId.toString(),
    })),
  };
}
