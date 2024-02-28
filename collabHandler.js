const DBAccess = require("./database");
module.exports = (socket,io,rooms,users)=> {
    const db = new DBAccess();
    db.run();
    function validateRequest(data,arr) {
        for(let i = 0;i < arr.length;i++){
            if(!data.hasOwnProperty(arr[i])) return false;
        }
        return true;
    }
    let cnt = 0;
    function handleCheckUser(data){
        if(validateRequest(data,["userName"])){
            const {userName} = data;
            if(users.has(userName)){
                if(users.get(userName).admin){
                    rooms.get(users.get(userName).roomId).adminSocket = socket;
                }
                socket.emit("checkRes",{roomData:users.get(userName)});
            }else {
                socket.emit("checkRes",{roomData:null});
            }
        }else socket.emit("err","provide all fields")
    }
    function handleConnection(data) {
        if (validateRequest(data,["roomId","type","userName"])) {
            const {roomId, type, userName, email,roomName} = data;
            if (type === "new") {
                const userObj = {admin:true,userName:userName,roomId:roomId};
                rooms.set(roomId, {adminSocket:socket,roomName:roomName,sourceCode:"",adminName:userName,users:[userObj]});
                users.set(userName,userObj);
                socket.emit("joinRes",{newR:true,roomId});
            } else if (type === "req") {
                if (rooms.has(roomId)) {
                    const {adminSocket,adminName} = rooms.get(roomId);
                    io.emit(
                        "joinReq",
                        {
                            "roomId":roomId,
                            "admin":adminName,
                            "userName": userName,
                            "email": email,
                        }
                    )
                } else {
                    socket.emit("err", {"msg": "Invalid RoomId or Inactive RoomId"});
                }
            }
        }else socket.emit("err",{"msg":"Provide all fields"});
    }

    function handleAdminReqRes(response){
        if(response.allowed) {
            const userObj = {admin:false,userName: response.userName, roomId: response.roomId};
            users.set(response.userName, userObj);
            rooms.get(response.roomId).users.push(userObj);
            io.emit("userJoined",{userName:response.userName,roomId:response.roomId});
        }
        io.emit("joinRes",{admin:false,roomId:response.roomId,userName:response.userName,allowed:response.allowed});
    }

    function handleGetUsers(roomId){
        if(!rooms.has(roomId)){
            socket.emit("err",{"msg":"Room ID not provided"});
            return;
        }
        socket.emit("usersRes",{users:rooms.get(roomId).users});
    }

    function handleGetSourceCode(roomId){
        if(!rooms.has(roomId)){
            socket.emit("err",{"msg":"Room ID not provided"});
            return;
        }
        socket.emit("sourceCodeRes",{lang:rooms.get(roomId).lang,sourceCode:rooms.get(roomId).sourceCode});
    }

    function handleDisconnect(data){
        if(data.hasOwnProperty("roomId") && data.hasOwnProperty("userName")) {
            const {roomId, userName} = data;
            if(users.has(userName)) {
                if (rooms.has(users.get(userName).roomId)) {
                    const {adminSocket, adminName} = rooms.get(users.get(userName).roomId);
                    if (adminName === userName) {
                        io.emit("forcedLeave", {msg: "Bye", roomId: roomId});
                        const removeList = [];
                        rooms.get(roomId).users.forEach((val)=>{removeList.push(val.userName)})
                        for(let i = 0;i < removeList.length;i++){
                            users.delete(removeList[i]);
                        }
                        rooms.delete(roomId);
                    } else {
                        io.emit("userLeft", {userName: userName, roomId: roomId});
                        const temp = [];
                        for(let i of rooms.get(roomId).users){
                            if(i.userName !== userName)temp.push(i);
                        }
                        rooms.get(roomId).users = temp;
                    }
                }
                socket.leave(roomId);
                users.delete(userName);
            }else {
                socket.leave(roomId);
            }
        }else socket.emit("err",{"msg":"Provide all fields"});
    }


    function handleStdInput(data){
        io.emit("inputSync",{roomId:data.roomId,input:data.input});
    }

    function handleStdOutput(data){
        io.emit("outputSync",{roomId:data.roomId,output:data.output})
    }

    function handleRun(data){
        io.emit("codeRunning",{roomId:data.roomId});
    }

    function handleCodeChange(data){
        rooms.get(data.roomId).sourceCode = data.data.source;
        io.emit("update",{data:data.data,userName:data.userName,roomId:data.roomId});
    }

    function handleLanguageChange(data){
        rooms.get(data.roomId).lang = data.data;
        io.emit("languageSync",{roomId:data.roomId,val:data.data});
    }
    function handleGetRoomName(data){
        if(data.hasOwnProperty("roomId") && rooms.has(data.roomId)){
            socket.emit("roomNameRes",{"roomName":rooms.get(data.roomId).roomName});
        }
    }

    function handleOffer(data){
        const {peerUserName,userName,offer} = data;
        io.emit("io:offer",{to:peerUserName,peerUserName:userName,offer:offer});
    }

    function handleAnswer(data){
        const {peerUserName,userName,answer} = data;
        io.emit("io:answer",{to:peerUserName,peerUserName:userName,answer:answer});
    }
    function handleCandidate(data){
        const {peerUserName,userName,candidate} = data;
        io.emit("io:candidate",{to:peerUserName,peerUserName:userName,candidate:candidate});
    }

    function handleReopenConnection(data,cb) {
        if (data.hasOwnProperty("roomId") && data.hasOwnProperty("userName")) {
            const {roomId,userName} = data;
            db.getRoom(roomId)
                .then((room)=>{
                    if(room.err === undefined){
                        const userObj = {admin:true,userName:userName,roomId:roomId};
                        rooms.set(roomId, {adminSocket:socket,roomName:room.name,sourceCode:room.source,adminName:userName,users:[userObj]});
                        users.set(userName,userObj);
                        cb();
                        console.log("REOPEN",rooms.get(roomId).users);
                    }else socket.emit("err",{"msg":`Err ${room.err}`})
                })
                .catch((err)=>{
                    console.log(err);
                    socket.emit("err",{"msg":`Internal Err ${err}`})
                })
        } else{
            socket.emit("err",{"msg":"Room ID not provided"});
        }
    }
    try {
        socket.on("stream:answer", handleAnswer);
        socket.on("stream:offer", handleOffer);
        socket.on("stream:candidate", handleCandidate);
        socket.on("languageChange", handleLanguageChange);
        socket.on("codeRun", handleRun);
        socket.on("stdInput", handleStdInput);
        socket.on("stdOutput", handleStdOutput);
        socket.on("getSourceCode", handleGetSourceCode);
        socket.on("getUsers", handleGetUsers);
        socket.on("connectRoom", handleConnection);
        socket.on("AdminReqRes", handleAdminReqRes);
        socket.on("leaveRoom", handleDisconnect);
        socket.on("checkUser", handleCheckUser);
        socket.on("codeChange", handleCodeChange);
        socket.on("getRoomName", handleGetRoomName);
        socket.on("reopenConnection", handleReopenConnection);
    }catch (err){
        console.log(err);
    }
}