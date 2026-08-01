/**
 * Turn a dmz.chat_by_token reply into the bubbles the Conversation panel
 * renders — the counterpart of share-content.js for the workspace chat.
 *
 * Row shape from the endpoint:
 *   { message_id, author_id, author, message, ctime, is_reply }
 *
 * Everything a guest sees here is incoming: the panel is read-only and the
 * visitor has authored nothing, so no bubble is ever `out`.
 */

/** "11:42 AM" from unix seconds; "" when there is no usable timestamp. */
function formatTime(ts) {
  const n = Number(ts || 0);
  if (!n) return "";
  try {
    return new Date(n * 1000).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch (e) {
    return "";
  }
}

/**
 * The bubble body is assigned to innerHTML (the sample carries markup for file
 * chips), so anything coming from a real message has to be escaped or a message
 * could inject markup into the page. Escaped here rather than at the view,
 * which cannot tell trusted sample text from a stranger's message.
 */
function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * @param {Array} rows messages returned by dmz.chat_by_token
 * @returns {Array<{author: string, text: string, time: string}>}
 */
function mapMessages(rows) {
  const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
  const out = [];
  for (const row of list) {
    if (!row) continue;
    const text = escapeHtml(row.message);
    if (!text) continue;
    out.push({
      // The endpoint sends a display name or nothing at all — it will not hand
      // out an author's email, which is what the account falls back to in-app
      // when no name is set. So an unnamed author reads as a generic member
      // rather than leaking who they are.
      author: (row.author || "").trim() || LOCALE.MEMBER || "Member",
      text,
      time: formatTime(row.ctime),
    });
  }
  return out;
}

module.exports = { mapMessages };
