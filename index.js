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
const index = express();
const httpServer = createServer(index);
const io = new socket.Server(httpServer,{
    cors:{
        origin:"*"
    }
});

index.use(cors());
index.use(logger('dev'));
index.use(express.json());
index.use(express.urlencoded({ extended: false }));
index.use(cookieParser());
index.use(express.static("./public"));
index.use(express.static(path.resolve(__dirname,"public","dist")));
index.use('/api',apiRoutes);


index.get("*",(req, res)=>{
    res.sendFile(path.resolve(__dirname,"public","dist","index.html"));
})

const rooms = new Map();
const users = new Map();



io.on("connection",(socket)=>{
    socketHandlers(socket,io,rooms,users);
});
httpServer.listen(process.env.PORT || 8000,"0.0.0.0");