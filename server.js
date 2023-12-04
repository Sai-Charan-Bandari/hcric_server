const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const cors = require('cors');
const { Server } = require("socket.io");

app.use(express.json())
app.use(cors());

///// IMPT NOTE :  /////
// IN SOCKET.IO SERVER CORS DO NOT MENTION 'http://localhost:5173' AS ORIGIN 
// MENTION IT AS "http://127.0.0.1:5173"
const io = new Server(server, {
    cors: {
        origin: "http://127.0.0.1:5173", // Adjust this to your client's origin
        methods: ["GET", "POST"],
        credentials: true
    }
});

// List of variables
let pairList = {} //key=fromId, value=toId
// Working of pairList
//  when a play_ack is sent then 2 key:val pairs (frndId:userId, userId:frndId) are added
//  upon disconnection of any client both the key:val pairs are removed
let roomList = {} //userId+':'+frndId : {tossObj,deliveryObj} 

function findRoomName(p) {
    q = pairList[p]
    if (p <= q) return '' + p + '$' + q
    else return '' + q + '$' + p
}

io.on('connection', async (socket) => {
    // socket is same as client
    console.log('connected to client ', socket.id)


    socket.on('play_req', k => {
        socket.broadcast.emit('play_req', { name: k, id: socket.id })
    })

    socket.on('play_ack', k => {
        if (k.senderId in pairList) {
            io.to(socket.id).emit('in_game', '')
        } else {
            // create pair in pairList for navigation
            pairList[k.senderId] = socket.id
            pairList[socket.id] = k.senderId
            console.log('pairList = ', pairList)
            // create new room obj
            roomList[findRoomName(socket.id)] = { tossObj: {}, deliveryObj: { bat: -1, bowl: -1 } }
            console.log('roomList = ', roomList)
            socket.to(k.senderId).emit('play_ack', k.name)
        }
    })

    socket.on('toss', k => {
        if (socket.id in pairList)
            socket.to(pairList[socket.id]).emit('toss', k)
        else io.to(socket.id).emit('opponent_disconnected')
    })

    socket.on('toss_value', async k => {
        let n = findRoomName(socket.id)
        roomList[n].tossObj[k.id] = k.value
        console.log(roomList[n])
        // console.log('received by ',k.id,' : ',socket.id)
        if (Object.keys(roomList[n].tossObj).length == 2) {
            console.log('filled')
            io.to(socket.id).to(pairList[socket.id]).emit('toss_results', roomList[n].tossObj)

            const a = await io.fetchSockets()
            console.log('fetched sockets are ', a.map((s) => s.id))

            // resetting tossObj
            roomList[n].tossObj = {}
        }
    })

    socket.on('action', k => {
        socket.to(pairList[socket.id]).emit('action', k)
    })

    socket.on('bat', k => {
        let n = findRoomName(socket.id)
        roomList[n].deliveryObj.bat = k
        if (roomList[n].deliveryObj.bat != -1 && roomList[n].deliveryObj.bowl != -1) {
            io.to(socket.id).to(pairList[socket.id]).emit('delivery_result', roomList[n].deliveryObj)
            // resetting delivery obj
            roomList[n].deliveryObj = { bat: -1, bowl: -1 }
        }
    })
    
    socket.on('bowl', k => {
        let n = findRoomName(socket.id)
        roomList[n].deliveryObj.bowl = k
        if (roomList[n].deliveryObj.bat != -1 && roomList[n].deliveryObj.bowl != -1) {
            io.to(socket.id).to(pairList[socket.id]).emit('delivery_result', roomList[n].deliveryObj)
            // resetting delivery obj
            roomList[n].deliveryObj = { bat: -1, bowl: -1 }
        }
    })
    
//     socket.on('game_over', s => {
//     })
    
    socket.on('no_rematch',s=>{
         // deleting room obj
                delete roomList[findRoomName(socket.id)]
                console.log('roomList = ', roomList)
                // removing both key:val pairs
                let k = pairList[socket.id]
                io.to(k).emit('opponent_disconnected', '')
                delete pairList[k]
                delete pairList[socket.id]
                console.log('pairList = ', pairList)
    })

    socket.on('rematch_req', name => {
        let n = findRoomName(socket.id)
        let frnd=pairList[socket.id]
        if(roomList[n].rematchObj){
            // rematchObj exists
            roomList[n].rematchObj[socket.id]=true
            if(Object.keys(roomList[n].rematchObj).length==2){
                // it means that both players have sent a rematch request
                // so start match
                console.log('rematch obj filled ',roomList[n].rematchObj)
                io.to(frnd).emit('rematch_started_toss','')
                io.to(socket.id).emit('rematch_started_wait','')
                // delete rematchObj
                delete roomList[n].rematchObj
            }
        }else{
            // create rematchObj
            roomList[n].rematchObj={[socket.id]:true}
            socket.to(frnd).emit('rematch_req')
        console.log(roomList[n].rematchObj)
        }
    })

    socket.on('disconnect', (reason) => {
        console.log(reason + ' disconnected');
        // deleting room obj
        delete roomList[findRoomName(socket.id)]
        console.log('roomList = ', roomList)
        // removing both key:val pairs
        let k = pairList[socket.id]
        io.to(k).emit('opponent_disconnected', '')
        delete pairList[socket.id]
        delete pairList[k]
        console.log('pairList = ', pairList)
    });
})

app.get('/', (req, res) => {
    res.send(`
    <div>
    <h1>hcric server</h1>
    <div>
    <h3>pairList</h3>
    ${JSON.stringify(pairList)}
    </div>
    <div>
    <h3>roomList</h3>
    ${JSON.stringify(roomList)}
    </div>
    </div>
    `)
    // res.sendFile(__dirname + '/index.html');
});

server.listen(8000, () => {
    console.log('listening on :8000');
});