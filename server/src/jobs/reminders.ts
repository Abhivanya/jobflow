import { Application } from "../models/Application";
import { FollowUp } from "../models/FollowUp";
import { RefreshSession } from "../models/RefreshSession";
import { withLock } from "../services/cache";
import { addEvent } from "../services/events";
import { notify } from "../services/notification.service";
import { logger } from "../utils/logger";

export async function runReminders() {
  await withLock("lock:reminders", 50, async () => {
    const due = await FollowUp.find({
      status: "scheduled",
      remindedAt: null,
      dueAt: { $lte: new Date() },
    }).limit(50);

    for (const followUp of due) {
      const application = await Application.findById(followUp.applicationId).select("title company");
      followUp.remindedAt = new Date();
      await followUp.save();
      await notify({
        userId: followUp.userId.toString(),
        type: "follow_up",
        title: application ? `Follow up with ${application.company}` : "Follow-up is due",
        body: followUp.message || application?.title || "",
        link: application ? `/applications/${application.id}` : "/follow-ups",
      });
      if (application) {
        await addEvent({
          userId: followUp.userId.toString(),
          applicationId: application.id,
          type: "follow_up_due",
          summary: `Follow-up due for ${application.company}`,
        });
      }
    }

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await RefreshSession.deleteMany({ expiresAt: { $lt: cutoff } });
  });
}

export function startSchedulers() {
  const timer = setInterval(() => {
    runReminders().catch((err) => logger.error({ err }, "reminder scan failed"));
  }, 60_000);
  timer.unref();
}
