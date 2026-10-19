import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.resolve(__dirname, '../config/saleEvents.json');

let saleConfig = { events: [] };

try {
  if (fs.existsSync(configPath)) {
    saleConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  // Graceful fallback if file is temporarily locked or missing
}

/**
 * Returns current sale event status for Indian e-commerce
 * @param {Date} [now]
 * @param {number} [lookaheadDays=14]
 */
export function getSaleStatus(now = new Date(), lookaheadDays = 14) {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentDay = now.getDate();

  let activeEvent = null;
  let upcomingEvent = null;
  let minDaysUntil = Infinity;

  for (const ev of saleConfig.events || []) {
    // Determine start & end dates in the current calendar year
    let startDate = new Date(currentYear, ev.startMonth - 1, ev.startDay, 0, 0, 0);
    let endDate = new Date(currentYear, ev.endMonth - 1, ev.endDay, 23, 59, 59);

    // If event wraps across year boundary (e.g. Dec to Jan)
    if (endDate < startDate) {
      if (currentMonth >= ev.startMonth) {
        endDate = new Date(currentYear + 1, ev.endMonth - 1, ev.endDay, 23, 59, 59);
      } else {
        startDate = new Date(currentYear - 1, ev.startMonth - 1, ev.startDay, 0, 0, 0);
      }
    }

    // Check if event is currently active
    if (now >= startDate && now <= endDate) {
      activeEvent = {
        id: ev.id,
        name: ev.name,
        retailers: ev.retailers,
        description: ev.description,
        endDate
      };
      break; // Active event found
    }

    // Check if event is upcoming in the near future
    if (startDate > now) {
      const diffMs = startDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays <= lookaheadDays && diffDays < minDaysUntil) {
        minDaysUntil = diffDays;
        upcomingEvent = {
          id: ev.id,
          name: ev.name,
          retailers: ev.retailers,
          daysUntil: diffDays,
          startDate,
          description: ev.description
        };
      }
    }
  }

  return {
    isSaleActive: Boolean(activeEvent),
    activeEvent,
    isUpcomingSale: Boolean(upcomingEvent),
    upcomingEvent,
    daysUntilSale: upcomingEvent ? upcomingEvent.daysUntil : null
  };
}

export default { getSaleStatus };
