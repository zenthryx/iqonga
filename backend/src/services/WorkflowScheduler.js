/**
 * WorkflowScheduler – Runs workflows on schedule (cron).
 */

const database = require('../database/connection');
const logger = require('../utils/logger');
const WorkflowExecutionService = require('./WorkflowExecutionService');

let intervalId = null;

function parseCronToMinutes(cronExpr) {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length < 5) return null;
  const [min, hour, dayOfMonth, month, dayOfWeek] = parts;
  return { min, hour, dayOfMonth, month, dayOfWeek };
}

function cronMatchesNow(cronExpr) {
  const now = new Date();
  const min = now.getMinutes();
  const hour = now.getHours();
  const dom = now.getDate();
  const month = now.getMonth() + 1;
  const dow = now.getDay();

  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length < 5) return false;

  const match = (val, cronPart) => {
    if (cronPart === '*' || cronPart === '?') return true;
    const ranges = cronPart.split(',');
    for (const r of ranges) {
      if (r.includes('-')) {
        const [lo, hi] = r.split('-').map(Number);
        if (val >= lo && val <= hi) return true;
      } else if (val === parseInt(r, 10)) return true;
    }
    return false;
  };

  return match(min, parts[0]) && match(hour, parts[1]) && match(dom, parts[2]) && match(month, parts[3]) && match(dow, parts[4]);
}

async function tick() {
  try {
    const r = await database.query(
      `SELECT id, user_id, name, schedule_cron FROM workflows
       WHERE trigger_type = 'schedule' AND schedule_cron IS NOT NULL AND schedule_cron != ''`
    );
    for (const w of r.rows) {
      if (cronMatchesNow(w.schedule_cron)) {
        try {
          await WorkflowExecutionService.runWorkflow(w.id, w.user_id, `Scheduled run: ${w.name}`);
          logger.info(`WorkflowScheduler: ran workflow ${w.name} (${w.id})`);
        } catch (err) {
          logger.error(`WorkflowScheduler: failed to run workflow ${w.id}:`, err);
        }
      }
    }
  } catch (err) {
    logger.error('WorkflowScheduler tick error:', err);
  }
}

function start() {
  if (intervalId) return;
  intervalId = setInterval(tick, 60 * 1000);
  logger.info('WorkflowScheduler started (checking every minute)');
}

function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('WorkflowScheduler stopped');
  }
}

module.exports = { start, stop, tick };