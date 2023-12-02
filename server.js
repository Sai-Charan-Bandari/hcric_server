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
let tossValList = {}
let deliveryObj = {bat:-1, bowl:-1}



io.on('connection', async (socket) => {
    // socket is same as client
    console.log('connected to client ',socket.id)

    
    socket.on('play_req',k => {
        socket.broadcast.emit('play_req',k)
        io.emit('hello','hello')
    })
    
    socket.on('play_ack',k => {
        socket.broadcast.emit('play_ack',k)
        io.emit('hello','hello')
    })
    
    socket.on('toss',k => {
        // console.log(socket.broadcast.)
        socket.broadcast.emit('toss',k)
        // io.emit('hello','hello')
    })
    
    socket.on('toss_value',async k => {
        tossValList[k.id]=k.value
        console.log(tossValList)
        console.log('received by ',k.id,' : ',socket.id)
        if(Object.keys(tossValList).length == 2){
            console.log('filled')
            // SOME PRBLM IT IS NOT SENDING TO SENDER SOCKET
            io.emit('toss_results',tossValList)
            // socket.broadcast.emit('toss_results',tossValList)
            // socket.emit('toss_results',tossValList)
            const a = await io.fetchSockets()
            console.log('fetched sockets are ',a.map((s)=>s.id))
            // io.emit('hello','hello')
            // resetting tossValList
            tossValList = {}
        }
    })
    
    socket.on('action',k => {
        socket.broadcast.emit('action',k)
        // io.emit('hello','hello')
    })
    
    socket.on('bat',k => {
        deliveryObj.bat=k
        if(deliveryObj.bat!=-1 && deliveryObj.bowl!=-1){
            io.emit('delivery_result',deliveryObj)
            deliveryObj = {bat:-1, bowl:-1}
        }
        // io.emit('hello','hello')
    })
    
    socket.on('bowl',k => {
        deliveryObj.bowl=k
        if(deliveryObj.bat!=-1 && deliveryObj.bowl!=-1){
            io.emit('delivery_result',deliveryObj)
            deliveryObj = {bat:-1, bowl:-1}
        }
        // io.emit('hello','hello')
    })

    socket.on('disconnect', (reason) => {
        // console.log(reason+' disconnected');
      });
})

app.get('/', (req, res) => {
    res.send('<h1>hcric server</h1>')
// res.sendFile(__dirname + '/index.html');
});

server.listen(8000, () => {
    console.log('listening on :8000');
});