import { openDB } from 'idb'

const DB_NAME = 'soundbort-db'
const DB_VERSION = 1
const STORE_SOUNDBOARDS = 'soundboards'

let dbPromise = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_SOUNDBOARDS)) {
          db.createObjectStore(STORE_SOUNDBOARDS, { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

export async function saveSoundboard(soundboard) {
  const db = await getDB()
  await db.put(STORE_SOUNDBOARDS, soundboard)
}

export async function getSoundboard(id) {
  const db = await getDB()
  return db.get(STORE_SOUNDBOARDS, id)
}

export async function getAllSoundboards() {
  const db = await getDB()
  return db.getAll(STORE_SOUNDBOARDS)
}

export async function deleteSoundboard(id) {
  const db = await getDB()
  await db.delete(STORE_SOUNDBOARDS, id)
}
