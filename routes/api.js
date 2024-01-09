const express = require('express');
const router = express.Router();
const DBAccess = require("../database");
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
})
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
})

module.exports = router;