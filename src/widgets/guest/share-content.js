/**
 * Turn a media.show_node_by listing into the rows the external layout renders.
 *
 * Row shape comes from common/procedures/mfs/mfs_show_node_by.sql:
 * { nid, filename, ext, ftype, filetype, mtime, ctime, ... }. Folders and files
 * are separated because the layout draws them as two different tiles.
 */

// ext -> the tile glyph key external-view.js knows (FILE_ICO).
const KIND_BY_EXT = {
  pdf: "pdf",
  doc: "doc", docx: "doc", odt: "doc", rtf: "doc", txt: "doc",
  xls: "sheet", xlsx: "sheet", ods: "sheet", csv: "sheet",
  ppt: "slides", pptx: "slides", odp: "slides",
  md: "note",
};

const isFolder = (row) => {
  const t = row.ftype || row.filetype;
  return t === "folder" || t === "hub";
};

/** "Oct 12, 2023" from a unix-seconds timestamp; "" when there isn't one. */
function formatDate(row) {
  const ts = Number(row.mtime || row.ctime || 0);
  if (!ts) return "";
  try {
    return new Date(ts * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch (e) {
    return "";
  }
}

function fileName(row) {
  const base = row.filename || "";
  return row.ext ? `${base}.${row.ext}` : base;
}

function fileKind(row) {
  const t = row.ftype || row.filetype;
  if (t === "image") return "image";
  // Real listings carry ftype values well beyond file/folder — document, video,
  // script, audio … — so anything without an explicit extension mapping gets the
  // GENERIC file glyph rather than being mislabelled as a Word document.
  return KIND_BY_EXT[String(row.ext || "").toLowerCase()] || "note";
}

/**
 * @param {Array} rows listing returned by media.show_node_by
 * @returns {{folders: Array, files: Array}}
 */
function mapListing(rows) {
  const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
  const folders = [];
  const files = [];
  for (const row of list) {
    if (!row || !row.filename) continue;
    if (isFolder(row)) {
      folders.push({ name: row.filename });
    } else {
      files.push({
        name: fileName(row),
        kind: fileKind(row),
        date: formatDate(row),
        // Carried through untouched for preview-icon.js, which resolves the
        // glyph exactly as the desk grid does (filetype, then extension).
        ftype: row.ftype || row.filetype,
        ext: row.ext,
        mimetype: row.mimetype,
      });
    }
  }
  return { folders, files };
}

module.exports = { mapListing };
