const fs = require('fs')
const { execFileSync } = require('child_process')
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

const timeString = (time, minutes=0) => dateAndTime.format(dateAndTime.addMinutes(time, minutes), 'YYYYMMDDHHmm')

const fetchImage = (time, verbose=false) => new Promise((resolve, reject) => { 
  const fname = `CV1_3600_${timeString(time)}.png`
  const path = `radarImg/${fname}`
  const url = `https://www.cwb.gov.tw/V7/observe/radar/Data/HD_Radar/${fname}`

  if (fs.existsSync(path)) {
    if (verbose) console.log(`${fname} exists, skip fetching`)
    resolve()
  }

  https.get(url, (response) => {
    if (response.statusCode === 200) {
      response.pipe(fs.createWriteStream(path).on('close', () => {
        resolve()
      }))
    }else{
      if (verbose) console.log(`fetch ${fname} failed`)
      reject()
    }
  })
})

let execount = 0

const fetchService = async (time) => {
  if (execount >= 5){
    execount = 0
    let alert = { type: 'text', text: `<alert> CV1_3600_${timeString(time)}.png FetchService failed. <alert>` }
    linebot.push(config.devId, alert)
    console.log(`${execount} CV1_3600_${timeString(time)}.png failed, retry in ${config.cwb.successTimeout / 60000} minute`)
    await setTimeoutPromise(config.cwb.successTimeout)
    newtime = dateAndTime.addMinutes(time, 10)
    fetchService(newtime)
  }else{
    execount = execount + 1
    try {
      await fetchImage(time)
      // console.log(`${timeString(time)} succeed, next fetch in ${config.cwb.successTimeout / 60000} minute`)
      analyze(time)
      await setTimeoutPromise(config.cwb.successTimeout)
      newtime = dateAndTime.addMinutes(time, 10)
      fetchService(newtime)
      execount = 0
    } catch(e) {
      //console.log(`${execount} CV1_3600_${timeString(time)}.png failed, retry in ${config.cwb.failTimeout / 60000} minute`)
      await setTimeoutPromise(config.cwb.failTimeout)
      fetchService(time)
    }
  }
}

const analyze = (test="") => new Promise(async(resolve, reject) => {
  const result = execFileSync("./predict.py", [test]).toString().split("\n")
  const status = result[0]
  const filename = result[1]
  if (status === "raining"){
    let pushmsg = {
      "type": "imagemap",
      "baseUrl": `https://merry.ee.ncku.edu.tw/~yichung/Deeprecipitation/${filename}`, 
      "altText": "要下雨了，點擊前往氣象局網站",
      "baseSize": {
            "height": 1040,
            "width": 1040
        },
      "actions": [
        {
          "type": "uri",
          "linkUri": "https://www.cwb.gov.tw/V7/observe/radar/index2.htm", 
          "area": {
            "x": 0,
            "y": 0,
            "width": 1040,
            "height": 1040
          }
        }
      ]
    } 
    linebot.pushAll(pushmsg)
  }
})

//  analyze(test="testtrue")

let time = new Date()
time = dateAndTime.addMinutes(time, -parseInt(dateAndTime.format(time, 'mm')) % 10)
time = dateAndTime.addMinutes(time, -10)
fetchService(time)
