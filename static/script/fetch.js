// IndexedDB utility functions
const DB_NAME = "contentsCache";
const DB_VERSION = 3;
const STORE_NAME = "contents";
const SETTINGS_STORE_NAME = "settings";
const RECENTS_STORE_NAME = "recents";
const CACHE_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

let dbPromise = null;

async function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      db.onerror = (event) => {
        console.error("Database error:", event.target.error);
      };
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;

      // Create or upgrade the contents store
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "hash" });
        store.createIndex("lastAccessed", "lastAccessed", { unique: false });
      } else if (oldVersion < 2) {
        // If upgrading from version 1, ensure the lastAccessed index exists
        const store = event.target.transaction.objectStore(STORE_NAME);
        if (!store.indexNames.contains("lastAccessed")) {
          store.createIndex("lastAccessed", "lastAccessed", { unique: false });
        }
      }

      // Create or upgrade the settings store
      if (!db.objectStoreNames.contains(SETTINGS_STORE_NAME)) {
        db.createObjectStore(SETTINGS_STORE_NAME, { keyPath: "key" });
      }

      // Create or upgrade the recents store
      if (!db.objectStoreNames.contains(RECENTS_STORE_NAME)) {
        const store = db.createObjectStore(RECENTS_STORE_NAME, {
          keyPath: "hash",
        });
        store.createIndex("recent_read_at", "recent_read_at", {
          unique: false,
        });
      }
    };
  });

  return dbPromise;
}

async function getFromDB(hash) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(hash);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        if (request.result) {
          // Update lastAccessed timestamp
          request.result.lastAccessed = Date.now();
          store.put(request.result);
        }
        resolve(request.result);
      };
    });
  } catch (e) {
    console.error("Error getting from DB:", e);
    throw e;
  }
}

async function saveToDB(hash, data) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({
        hash,
        ...data,
        lastAccessed: Date.now(),
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  } catch (e) {
    console.error("Error saving to DB:", e);
    throw e;
  }
}

async function getSetting(key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SETTINGS_STORE_NAME, "readonly");
      const store = transaction.objectStore(SETTINGS_STORE_NAME);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result?.value);
    });
  } catch (e) {
    console.error("Error getting setting:", e);
    return null;
  }
}

async function saveSetting(key, value) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SETTINGS_STORE_NAME, "readwrite");
      const store = transaction.objectStore(SETTINGS_STORE_NAME);
      const request = store.put({ key, value });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  } catch (e) {
    console.error("Error saving setting:", e);
    throw e;
  }
}

async function fetchContentsText(hash, pos, length) {
  try {
    return await fetchContentsTextFromCache(hash, pos, length);
  } catch (e) {
    console.log(e);
    // Cache miss - clean up expired cache before fetching from server
    await cleanupExpiredCache();
    return await fetchContentsTextFromServer(hash, pos);
  }
}

async function fetchContentsTextFromCache(hash, pos, contentslength) {
  const cacheContentsInfo = await getFromDB(hash);
  if (!cacheContentsInfo) throw new Error("No Cache!");

  const cachePosStart = cacheContentsInfo.index;
  const cachePosEnd = cacheContentsInfo.index + cacheContentsInfo.length;

  const reqPosStart = pos < 0 ? 0 : pos;
  const reqPosEnd =
    pos + config.contents.text.pageLength > contentslength
      ? contentslength
      : pos + config.contents.text.pageLength;

  if (reqPosStart < cachePosStart || reqPosEnd > cachePosEnd)
    throw new Error("Range Out!");

  const calcPosStart = reqPosStart - cachePosStart;
  const calcPosEnd = reqPosEnd - cachePosStart;

  return cacheContentsInfo.text.slice(calcPosStart, calcPosEnd);
}

async function fetchContentsTextFromServer(hash, pos) {
  try {
    const posCache =
      pos - config.contents.text.cacheLength / 2 < 0
        ? 0
        : pos - config.contents.text.cacheLength / 2;

    const res = await capi({
      method: "GET",
      url: `/${hash}/contents/${posCache}?length=${config.contents.text.cacheLength}`,
      rowResponse: true,
    });

    const text = res.data;

    await saveToDB(hash, {
      index: posCache,
      length: text.length,
      text: text,
    });

    const calcPos = pos - posCache;

    return text.slice(calcPos, calcPos + config.contents.text.pageLength);
  } catch (e) {
    if (e.message === "Unauthorized") {
    } else {
      console.error(e);
    }
  }
}

async function fetchContentsImage(hash, pos) {
  try {
    const res = await capi({
      method: "GET",
      url: `/${hash}/contents/${pos}`,
      rowResponse: true,
    });

    const image = res.data;

    console.log(image);

    return;
  } catch (e) {
    if (e.message === "Unauthorized") {
    } else {
      console.error(e);
    }
  }
}

async function cleanupExpiredCache() {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("lastAccessed");

    const cutoffTime = Date.now() - CACHE_EXPIRY_MS;
    const range = IDBKeyRange.upperBound(cutoffTime);

    return new Promise((resolve, reject) => {
      const request = index.openCursor(range);

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  } catch (e) {
    console.error("Error cleaning up expired cache:", e);
    throw e;
  }
}

async function saveRecents(recents) {
  try {
    const db = await openDB();
    const transaction = db.transaction(RECENTS_STORE_NAME, "readwrite");
    const store = transaction.objectStore(RECENTS_STORE_NAME);

    // Clear existing recents
    await new Promise((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onerror = () => reject(clearRequest.error);
      clearRequest.onsuccess = () => resolve();
    });

    // Save new recents
    for (const recent of recents) {
      await new Promise((resolve, reject) => {
        const request = store.put(recent);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }
  } catch (e) {
    console.error("Error saving recents:", e);
    throw e;
  }
}

async function getRecents() {
  try {
    const db = await openDB();
    const transaction = db.transaction(RECENTS_STORE_NAME, "readonly");
    const store = transaction.objectStore(RECENTS_STORE_NAME);
    const index = store.index("recent_read_at");

    return new Promise((resolve, reject) => {
      const request = index.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const recents = request.result;
        // Sort by recent_read_at in descending order
        recents.sort(
          (a, b) => new Date(b.recent_read_at) - new Date(a.recent_read_at)
        );
        resolve(recents);
      };
    });
  } catch (e) {
    console.error("Error getting recents:", e);
    return [];
  }
}
