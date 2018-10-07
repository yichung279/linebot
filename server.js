const fs = require('fs')
const https = require('https')
const express = require('express')
const config = require('./config')
const dateAndTime = require('date-and-time')
const util = require('util')
const setTimeoutPromise = util.promisify(setTimeout)

const linebot = require('./linebot')
const app = express()

const options = {
  ca : fs.readFileSync('./ssl/ca_bundle.crt'),
  key: fs.readFileSync('./ssl/private.key'),
  cert: fs.readFileSync('./ssl/certificate.crt')
}

https.createServer(options, app).listen(config.port,
  console.log(`listen on port:  ${config.port}`)
)

app.use(linebot.middleware)

app.post('/webhook', async (req, res) => {
  try{
    result = await Promise.all(req.body.events.map(linebot.handleEvent))
    res.status(200).end()
  }catch(e){
    res.status(500).end()
  }
})

const pushmsg = { type: 'text', text: 'this is a push message' }
//linebot.push(config.testId, pushmsg)

const timeString = (time, minutes=0) => dateAndTime.format(dateAndTime.addMinutes(time, minutes), 'YYYYMMDDHHmm')

const fetchImage = (time, verbose=false) => new Promise((resolve, reject) => { 
  const fname = `CV1_3600_${timeString(time)}.png`
  const path = `raddarImg/${fname}`
  const url = `https://www.cwb.gov.tw/V7/observe/radar/Data/HD_Radar/${fname}`

  if (fs.existsSync(path)) {
    if (verbose) console.log(`${fname} exists, skip fetching`)
    resolve()
  }

  https.get(url, (response) => {
    if (200 != response.statusCode) {
      if (verbose) console.log(`fetch ${fname} failed`)
      reject()
    }
    response.pipe(fs.createWriteStream(path).on('close', () => {
      resolve()
    }))
  })
})

const fetchService = async (time) => {
  try {
    await fetchImage(time)
    // analyze(time)
    console.log(`${timeString(time)} succeed, next fetch in ${config.cwb.successTimeout / 60000} minute`)
    await setTimeoutPromise(config.cwb.successTimeout)
    time = dateAndTime.addMinutes(time, 10)
    fetchService(time)
  } catch(e) {
    let now = new Date()
    if (dateAndTime.subtract(now, time).toMinutes() > 30) {
      let alert = { type: 'text', text: '<alert> FetchService failed. <alert>' }
      linebot.push(config.testId, alert)
      return
    }
    console.log(`${timeString(time)} failed, retry in ${config.cwb.failTimeout / 60000} minute`)
    await setTimeoutPromise(config.cwb.failTimeout)
    fetchService(time)
  }
}

let time = new Date()
time = dateAndTime.addMinutes(time, -parseInt(dateAndTime.format(time, 'mm')) % 10)
fetchService(time)
