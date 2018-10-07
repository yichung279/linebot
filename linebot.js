const sqlite3 = require('sqlite3').verbose()
const db = new sqlite3.Database('DeePrecipitation.db3')
const line = require('@line/bot-sdk')

const config = require('./config')

const channel = {
  channelSecret: config.channelSecret, 
  channelAccessToken: config.channelAccessToken
}

const client = new line.Client(channel)


const self = module.exports = {
  middleware: line.middleware(channel),

  handleEvent: (event) => new Promise(async(resolve, reject) => {
    const type = event.source.type
    let id
    switch (type) {
      case "user":
        id = event.source.userId
        break
      case "group":
        id = event.source.groupId
        break
      case "room":
        id = event.source.roomId
        break
      default:
        id = event.source.userId
    } 
    
    switch (event.type) {
      case 'follow':
        const thx = { type: 'text', text: '感謝訂閱' }
        try{
          await client.replyMessage(event.replyToken, thx)
          
          if (!(await self.checkId(id))) {
            await self.insertId(id, type)
            console.log(`${id} inserted`)
            resolve()
          }else{
            resolve()
          }
        }catch(e){
          console.log(`${id} insert failed`)
          reject()
        } 
        break
      case 'unfollow':
        console.log(`${id} deleted`)
        return self.deleteId(id)
        break
      case 'message':
        const imbot = { type: 'text', text: "你好，我是小雨"}
        await client.replyMessage(event.replyToken, imbot)
        resolve()
    }
  
  }),

  push: (id, msg) => client.pushMessage(id, msg),

  checkId: (id) => new Promise((resolve, reject) => {
    db.get("SELECT * FROM id_list WHERE id = $id", { $id: id } ,(err, rows) => {
      if (rows) resolve(true)
      else resolve(false)
    })
  }),

  deleteId: (id) => new Promise((resolve, reject)=>{
    db.run("DELETE FROM id_list WHERE $id=id", { $id : id}, err => {
      if (err) reject(err)
      else resolve()
    })
  
  }),
  
  insertId: (id, type) => new Promise((resolve, reject)=>{
    db.run("INSERT INTO id_list VALUES ($id , $type )", { $id : id, $type : type }, err => {
      if (err) reject(err)
      else resolve()
    })
  }),
  
  getAllId: () => new Promise((resolve, reject) => {
    db.all("SELECT id FROM id_list ",(err, rows) => {
      // rows = [{id:'aaa'},
      //         {id:'bbb'},
      //         {id:'ccc'}]
      if (err) reject(err)
      else resolve(rows)
    })
  }),
}
