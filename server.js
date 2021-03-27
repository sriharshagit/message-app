const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 9001 });
const mongo = require('mongodb').MongoClient;
const url = 'mongodb://mongo:27017';

    let channelsMap = new Map();
    let clientPhoneNumberMap = new Map();
    let phoneToClientMap = new Map();


wss.on('connection', async (ws) => {
    console.log('server started');

        const mongoClient = await mongo.connect(url, { useNewUrlParser: true });
    
    const db = mongoClient.db('MESSAGEAPP');
    const userCollection = db.collection('users');
    const groupCollection = db.collection('group');

        console.log('number of connections:'+wss.clients.size);
      
        ws.on('message',async( message) => {
          
          var checkMessageType = message.substr(0,message.indexOf(' '));
            var remainingMessage = message.substr(message.indexOf(' ') + 1);
        
            if (checkMessageType == 'registration') {
                clientPhoneNumberMap.set(ws, remainingMessage);
                phoneToClientMap.set(remainingMessage, ws);
                ws.send('R success');
            }
            else if (checkMessageType == 'subscribe') {
                if (channelsMap.has(ws)) {
                    let subscriberList = channelsMap.get(ws);
                    if (subscriberList.includes(remainingMessage)) {
                        ws.send('S already subscribed');
                    } else {
                        subscriberList.push(remainingMessage);
                        channelsMap.set(ws, subscriberList);
                        ws.send('S group added successfully');
                    }
                } else {
                    let subList = [];
                    subList.push(remainingMessage);
                    channelsMap.set(ws, subList);
                    ws.send('S group added successfully');
                }

            }
            else if (checkMessageType == 'group') {
                
                if(channelsMap.has(ws)){
                    //decode remaining message
                    let groupName = remainingMessage.substr(0, remainingMessage.indexOf(' '));
                    let groupMessage =  remainingMessage.substr(remainingMessage.indexOf(' ') + 1);
                    let subList = channelsMap.get(ws);
                    let userPhone = clientPhoneNumberMap.get(ws);
                    if (subList.includes(groupName)) {
                        try {
                            let groupDb = await groupCollection.findOne({ groupName: groupName });
                            console.log('this is group db',groupDb)
                            if (groupDb) {
                        
                                let newMessageList = JSON.parse(groupDb.groupMessageList);
                                newMessageList.push('from [' + userPhone + ']  ' + groupMessage);
                                newMessageList = JSON.stringify(newMessageList);
                                
                                await groupCollection.updateOne({ groupName: groupName }, { $set: { groupMessageList: newMessageList } });
                            }
                            else {
                                let newMsgList = [];
                                newMsgList.push('from [' + userPhone + ']  ' + groupMessage);
                                newMsgList = JSON.stringify(newMsgList);
                                await groupCollection.insertOne({ groupName: groupName, groupMessageList: newMsgList });
                            }
                        }
                        catch (e) {
                            console.log(e);
                        }
                      wss.clients.forEach(aliveClients=>{
          
                        var aliveClientGroupList = channelsMap.get(aliveClients);
                        if(aliveClientGroupList.includes(groupName)){
                            aliveClients.send('G from ['+userPhone+']  '+groupMessage);
                        }
          
                      })
                    }
                    else{
                      ws.send('G not subscribed to group '+groupName);
                    }
                
          
              }
              else{
                       ws.send('G not subscribed to any group');
              }
                
            }
            else if (checkMessageType == 'personal') {
                
                let otherPhone =   remainingMessage.substr(0, remainingMessage.indexOf(' '));
                let personalMessage = remainingMessage.substr(remainingMessage.indexOf(' ') + 1);
                let userPhone = clientPhoneNumberMap.get(ws);
                let personalPhoneFormat = otherPhone > userPhone ? userPhone + otherPhone : otherPhone + userPhone;
                try {
                    let personalMessageDb = await userCollection.findOne({ personalId: personalPhoneFormat });
                    console.log('this is personal chat',personalMessageDb)
                    if (personalMessageDb) {
                
                        let newMessageList = JSON.parse(personalMessageDb.personalMessageList);
                        newMessageList.push('from [' + userPhone + ']  ' + personalMessage);
                        newMessageList = JSON.stringify(newMessageList);
                        
                        await userCollection.updateOne({ personalId: personalPhoneFormat }, { $set: { personalMessageList: newMessageList } });
                    }
                    else {
                        let newMsgList = [];
                        newMsgList.push('from [' + userPhone + ']  ' + personalMessage);
                        newMsgList = JSON.stringify(newMsgList);
                        await userCollection.insertOne({ personalId: personalPhoneFormat, personalMessageList: newMsgList });
                    }
                }
                catch (e) {
                    console.log(e);
                }
      
                
                if (phoneToClientMap.has(otherPhone)) {
                    otherClient = phoneToClientMap.get(otherPhone);
                    otherClient.send('P from [' + userPhone + ']  ' + personalMessage);
                    otherClient.send('P Status of [' + userPhone + ']  Online')
                    ws.send('P Status of [' + otherPhone + ']  Online');
                }
                else {

                    ws.send('P Status of [' + otherPhone + ']  Offline');
                    
                }
             
                ws.send('P from [' + userPhone + ']  ' + personalMessage);

            }
            
        })
    
        ws.on('close', function () {
            phoneToClientMap.delete(clientPhoneNumberMap.get(ws))
            clientPhoneNumberMap.delete(ws);
      console.log('connection closed');  
  
    });

})



