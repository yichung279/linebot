const line = require('@line/bot-sdk')
const config = require('./config')

const channel = {
  channelSecret: config.channelSecret, 
  channelAccessToken: config.channelAccessToken
}

const client = new line.Client(channel)


const self = module.exports = {
  middleware: line.middleware(channel),

  handleEvent: async (event) => {
    if(event.type =='follow'){
        return Promise.resolve()
    }else if (event.type === 'message' && event.message.type === 'text') {
      const echo = { type: 'text', text: event.message.text }
      return Promise.resolve(
        client.replyMessage(event.replyToken, echo)
      )
    }
  
  },

  push: (id, msg) => client.pushMessage(id, msg)
}
