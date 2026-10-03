import { logger } from "./logger";

type Task = {
  key: string;
  retries: number;
  run: () => Promise<void>;
};

const queued = new Set<string>();
const tasks: Task[] = [];
let working = false;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function drain() {
  if (working) return;
  working = true;
  while (tasks.length > 0) {
    const task = tasks.shift();
    if (!task) break;
    let attempt = 0;
    while (attempt < task.retries) {
      attempt += 1;
      try {
        await task.run();
        break;
      } catch (err) {
        if (attempt >= task.retries) {
          logger.error({ err, key: task.key }, "background job failed");
        } else {
          await wait(200 * attempt);
        }
      }
    }
    queued.delete(task.key);
  }
  working = false;
}

// In-process queue. Fine for one server. A second instance would need a real queue.
export function enqueue(key: string, run: () => Promise<void>, retries = 3) {
  if (queued.has(key)) return;
  queued.add(key);
  tasks.push({ key, retries, run });
  void drain();
}
