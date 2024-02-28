const express = require('express');
const router = express.Router();
const DBAccess = require("../helper/database");
const db = new DBAccess();
db.run();
router.post("/login",(req,res)=>{
    if(req.body.hasOwnProperty("userName") && req.body.hasOwnProperty("password")){
        const username = req.body.userName,password = req.body.password;
        db.authenticateUser(username,password)
            .then((data)=>{
                res.json(data);
            }).catch((err)=>{
                res.json({"err":"Internal Error","msg":err})
            }
        );
    }else{
        res.json({"err":"provide all fields"});
    }
});
router.post("/signup",(req,res)=>{
    if(req.body.hasOwnProperty("userName") && req.body.hasOwnProperty("password") && req.body.hasOwnProperty("email")){
        const username = req.body.userName,password = req.body.password,email = req.body.email;
        db.insertUser(username,email,password)
            .then((data)=>{
                res.json(data);
            }).catch((err)=>{
                res.json({"err":"Internal Error","msg":err})
            }
        );
    }else{
        res.json({"err":"provide all fields"})
    }
});
router.get("/room",(req,res)=>{
    if(req.query.hasOwnProperty("userName")){
        const userName = req.query.userName;
        db.getRooms(userName)
            .then((data)=>{
                res.json(data);
            }).catch((err)=>{
                res.json({"err":"Internal Error","msg":err});
            }
        );
    }else{
        res.json({"err":"provide all fields"});
    }
});
router.post("/room",(req,res)=> {
    if (req.body.hasOwnProperty("roomId") && req.body.hasOwnProperty("name") && req.body.hasOwnProperty("userName") && req.body.hasOwnProperty("source")) {
        const {roomId, status, source, name, userName} = req.body;
        db.getRoom(roomId).then((data)=>{
            if(data.err){
                db.insertRoom(roomId, name, status, source, userName)
                    .then(data => {
                        res.json(data);
                    }).catch((err) => {
                        res.json({"err": "Internal Error", "msg": err});
                    }
                )
            }else{
                db.updateRoomSourceCode(roomId,source)
                    .then((data)=>{
                        res.json(data);
                    }).catch((err)=>{
                        res.json({"err":"Internal Error","msg":err})
                    }
                )
            }
        })
    }else{
        res.json({"err":"provide all fields"});
    }
});
router.delete("/room",(req,res)=>{
    if(req.body.hasOwnProperty("roomId")){
        const {roomId} = req.body;
        db.deleteRoom(roomId)
            .then((data)=>{
                res.json(data);
            }).catch((err)=>{
                res.json({"err":"Internal Error","msg":err});
            }
        )
    }else{
        res.json({"err":"provide all fields"});
    }
});

module.exports = router;