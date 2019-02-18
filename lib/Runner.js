const { spawn, exec } = require('child_process')
const { promisify } = require('util')
const { platform } = require('os')
const shellQuote = require('shell-quote')
const NixtRunner = require('nixt/lib/nixt/runner')
const NixtResult = require('nixt/lib/nixt/result')
const respond = require('nixt/lib/nixt/respond')

class Runner extends NixtRunner {
  env (key, val) {
    if (typeof key === 'object' && !Array.isArray(key)) {
      Object.keys(key).forEach((k) => {
        super.env(k, key[k])
      })
      return this
    }

    return super.env(key, val)
  }

  end (cb) {
    if (cb) return super.end(cb)
    return promisify(super.end.bind(this))().then(() => {
      if (this.child.kill(0)) {
        if (platform() === 'win32') {
          exec(`taskkill /PID ${this.child.pid} /T /F`)
        } else {
          this.child.kill('SIGINT')
        }
        while (this.child.kill(0)) {}
      }
    })
  }

  execFn (cmd) {
    const args = shellQuote.parse(cmd)
    const bin = args.shift(0)

    return (fn) => {
      if (cmd === '') {
        fn(undefined)
        return
      }

      const child = spawn(bin, args, this.world)
      let stdout = ''
      let stderr = ''
      let err

      if (this.standardInput != null) {
        child.stdin.end(this.standardInput)
      }

      if (this.world.timeout) {
        setTimeout(() => {
          child.kill()
          err = { killed: true }
        }, this.world.timeout)
      }

      respond.run(child.stdout, child.stdin, this.prompts, this.responses)

      child.stdout.on('data', (data) => { stdout += data })
      child.stderr.on('data', (data) => { stderr += data })

      child.on('close', (code) => {
        const result = new NixtResult(cmd, code, this.options).parse(stdout, stderr, err)
        let error = null

        for (let i = 0, l = this.expectations.length; i < l; i++) {
          error = this.expectations[i](result)
          if (error) break
        }

        fn(error)
      })

      this.child = child
    }
  }
}

module.exports = Runner