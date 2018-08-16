const exec = require('child_process').exec
const async = require('async')
const processExists = require('process-exists')
const JSONStream = require('JSONStream')
const es = require('event-stream')

const { tools } = require('./index')
class Proc {
  constructor () {
    this.pid = null
    this.running = false
    this.killed = false
    this.instance = null
    this.messages = []
  }

  async start () {
    return new Promise((resolve, reject) => {
      const command = `${tools.getExecutable()} backend start`
      this.instance = exec(command, { 'cwd': tools.getProjectFolder() })
      this.pid = this.instance.pid
      this.instance.stderr.on('data', data => (reject(new Error('Error during backend start: ' + data))))
      this.instance.stdout.pipe(JSONStream.parse()).pipe(es.map(data => {
        this.messages.push(data)
        if (data.msg && data.msg.includes('Backend ready')) resolve(this.instance)
      }))
    })
  }

  async kill () {
    if (!this.pid || this.killed) return true
    if (!processExists(this.pid)) return true

    this.instance.kill()
    return new Promise((resolve, reject) => {
      async.retry({
        times: 100,
        interval: 100
      }, (cb) => {
        processExists(this.pid)
          .then(exists => cb(exists ? new Error(`Process ${this.pid} still exists`) : null))
          .catch(err => cb(err))
      }, (err) => {
        if (err) return reject(err)

        this.killed = true
        this.pid = null
        this.proc = null
        return resolve()
      })
    })
  }
}

module.exports = Proc
