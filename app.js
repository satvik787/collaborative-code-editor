require("dotenv").config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const {createServer} = require("http");
const apiRoutes = require("./routes/api");
const socket = require("socket.io");
const {response} = require("express");
const cors = require("cors");
const socketHandlers = require("./helper/collabHandler");
const app = express();
const httpServer = createServer(app);
const io = new socket.Server(httpServer,{
    cors:{
        origin:"*"
    }
});

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static("./public"));
app.use(express.static(path.resolve(__dirname,"public","dist")));
app.use('/api',apiRoutes);


app.get("*",(req, res)=>{
    res.sendFile(path.resolve(__dirname,"public","dist","index.html"));
})

const rooms = new Map();
const users = new Map();



io.on("connection",(socket)=>{
    socketHandlers(socket,io,rooms,users);
});
httpServer.listen(process.env.PORT || 8000,"0.0.0.0");