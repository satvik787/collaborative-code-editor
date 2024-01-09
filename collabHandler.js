module.exports = (socket,io,rooms,users)=> {
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
                socket.emit("checkRes",{roomData:users.get(userName)});
            }else {
                socket.emit("checkRes",{roomData:null});
            }
        }else socket.emit("err","provide all fields")
    }
    function handleConnection(data) {
        if (validateRequest(data,["roomId","type","userName","email"])) {
            const {roomId, type, userName, email} = data;
            if (type === "new") {
                const userObj = {admin:true,userName:userName,roomId:roomId,permission:{edit:true,lang:true,run:true}};
                rooms.set(roomId, {adminSocket:socket,adminName:userName,sourceCode:"",users:[userObj]});
                users.set(userName,userObj);
                socket.emit("joinRes",{newR:true,userName:userName,users:rooms.get(roomId).users,sourceCode:rooms.get(roomId).sourceCode,roomId:roomId});
            } else if (type === "req") {
                if (rooms.has(roomId)) {
                    const {adminSocket,adminName} = rooms.get(roomId);
                    adminSocket.emit(
                        "joinReq",
                        {
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
            const userObj = {admin:false,userName: response.userName, roomId: response.roomId, permission: {edit: false, lang: false, run: false}};
            users.set(response.userName, userObj);
            rooms.get(response.roomId).users.push(userObj);
        }
        socket.broadcast.emit("joinRes",{userName:response.userName,roomId:response.roomId,allowed:response.allowed});
        io.emit("userJoined",{userName:response.userName,roomId:response.roomId});
    }

    function handleGetUsers(roomId){
        if(!rooms.has(roomId))return;
        socket.emit("usersRes",{users:rooms.get(roomId).users});
    }

    function handleGetSourceCode(roomId){
        if(!rooms.has(roomId))return;
        socket.emit("sourceCodeRes",{sourceCode:rooms.get(roomId).sourceCode});
    }

    function handleDisconnect(data){
        if(data.hasOwnProperty("roomId") && data.hasOwnProperty("userName")) {
            const {roomId, userName} = data;
            if(users.has(userName)) {
                if (rooms.has(users.get(userName).roomId)) {
                    const {adminSocket, adminName} = rooms.get(users.get(userName).roomId);
                    if (adminName === userName) {
                        io.emit("forcedLeave", {msg:"Bye",roomId:roomId});
                        rooms.delete(users.get(userName).roomId);
                    }
                } else {
                    io.emit("userLeft", {userName:userName,roomId:roomId});
                }
                socket.leave(roomId);
                users.delete(userName);
            }
            // }else socket.emit("err",{"msg":"invalid request"});
        }else socket.emit("err",{"msg":"Provide all fields"});
    }

    function handlePermissionRequest(data){
        const {userName,permission} = data;
        const adminSocket = rooms.get(users.get(userName));
        adminSocket.emit("reqPermission",{"msg":`${userName} is requesting ${permission}`})
    }
    function handlePermissionChange(data){
        const {userName,permissions} = data;
        if(users.has(userName)){
            users.get(userName).permission = permissions;
            socket.broadcast.to(users.get(userName).roomId).emit("permissionChange",data);
        }else socket.emit("err",{"msg":"user inactive"})
    }

    function handleConfig(data){
        const {userName,config} = data;
        if(users.has(userName)){
            if(users.get(userName).permission[config["name"]]){
                socket.broadcast.to(users.get(userName).roomId).emit("config",config);
            }else socket.emit("err",{"msg":"permission denied"})
        }else socket.emit("err",{"msg":"user inactive"})
    }

    function handleCodeChange(data){
        io.emit("update",{data:data.data,userName:data.userName,roomId:data.roomId});
    }

    socket.on("getSourceCode",handleGetSourceCode);
    socket.on("getUsers",handleGetUsers);
    socket.on("connectRoom", handleConnection);
    socket.on("AdminReqRes",handleAdminReqRes);
    socket.on("leaveRoom",handleDisconnect);
    socket.on("checkUser",handleCheckUser);
    socket.on("permissionChange",handlePermissionChange);
    socket.on("permissionReq",handlePermissionRequest);
    socket.on("config",handleConfig);
    socket.on("codeChange",handleCodeChange);
}