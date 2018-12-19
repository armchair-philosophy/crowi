/**
 * Crowi::migrateStore
 *
 * @package Crowi
 * @author  otofune <otofune@gmail.com>
 */

const mongoose = require('mongoose')

const crowi = new (require('./lib/crowi'))(__dirname, process.env)

const migrationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true,
  },
  at: {
    type: Date,
    required: true,
    index: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['up', 'down'],
  },
  history: [
    {
      status: {
        type: String,
        required: true,
        enum: ['up', 'down'],
      },
      at: {
        type: Date,
        required: true,
      },
    },
  ],
})
migrationSchema.methods.toEntry = function() {
  const m = this
  const entry = {
    title: m.title,
    timestamp: m.status === 'up' ? m.at.getTime() : null,
  }
  return entry
}
migrationSchema.statics.updateByEntry = function(entry) {
  console.dir(entry)
  const { title } = entry
  const at = entry.timestamp || Date.now()
  const status = entry.timestamp === null ? 'down' : 'up'

  return this.findOneAndUpdate(
    { title: entry.title },
    {
      $set: {
        at,
        status,
      },
      $push: {
        history: {
          status,
          at,
        },
      },
      $setOnInsert: {
        title,
      },
    },
    { new: true, upsert: true },
  )
}
const Migration = mongoose.model('Migrations', migrationSchema)

module.exports = class MongoStore {
  constructor() {
    this.ready = false
    this.migrations = null
  }

  async init() {
    if (this.ready) return
    await crowi.setupDatabase()
    this.ready = true
  }

  async save(s, cb) {
    try {
      await this.init()
      const store = { ...s }
      console.dir(store)

      const entries = store.migrations.filter(m => !(m.title in this.migrations) || this.migrations[m.title].timestamp !== m.timestamp)
      console.dir(entries)

      await Promise.all(entries.map(m => Migration.updateByEntry(m)))
      // migrate call Store's save each file
      this.migrations = store.migrations.reduce((o, c) => {
        o[c.title] = c
        return o
      }, {})

      cb(null)
    } catch (e) {
      cb(e)
    }
  }

  async load(cb) {
    try {
      await this.init()
      const migrations = await Migration.find().sort({ at: -1 })
      const entries = migrations.map(m => m.toEntry())
      console.dir(entries)

      const store = {
        lastRun: migrations.find(m => m.status === 'up' && m.title),
        migrations: entries,
      }

      this.migrations = entries.reduce((o, c) => {
        o[c.title] = c
        return o
      }, {})

      return cb(null, store)
    } catch (e) {
      cb(e)
    }
  }
}
