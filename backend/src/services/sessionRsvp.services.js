const sessionRsvpModel = require("../models/sessionRsvp.model");

async function sessionsWithConfirmedRsvpCounts(sessions = []) {
  if (!sessions.length) return [];
  const ids = sessions.map((session) => session._id).filter(Boolean);
  const rows = ids.length
    ? await sessionRsvpModel.aggregate([
      {
        $match: {
          sessionId: { $in: ids },
          status: { $in: ["confirmed", "attended"] },
        },
      },
      { $group: { _id: "$sessionId", count: { $sum: 1 } } },
    ])
    : [];
  const counts = new Map(rows.map((row) => [String(row._id), row.count]));
  return sessions.map((session) => {
    const value = typeof session.toObject === "function" ? session.toObject() : { ...session };
    return { ...value, confirmedRsvpCount: counts.get(String(session._id)) || 0 };
  });
}

module.exports = { sessionsWithConfirmedRsvpCounts };
