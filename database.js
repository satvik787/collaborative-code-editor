const mongodb = require("mongodb");
const bcrypt = require("bcrypt");
const URI = "mongodb://localhost:27017";
const DATABASE = "collaborative_editor";
const COLLECTION_USER = "users";
const COLLECTION_ROOM = "room";
module.exports = class DBAccess{
     constructor() {
        this.client = new mongodb.MongoClient(URI);
        this.failed = false;
    }

    async run(){
        try {
            await this.client.connect();
            this.db = this.client.db(DATABASE);
        } catch (err){
            this.failed = true;
            await this.client.close();
        }
    }

    async insertUser(userName,email,password){
        const user = await this.getUser(userName);
        if(user){
            return {"err":"UserName exists"}
        }
        const hashedPassword = await bcrypt.hash(password,10);
        return await this.db.collection(COLLECTION_USER).insertOne({
            "userName":userName,
            "password":hashedPassword,
            "email":email,
        });
    }

    async getUser(userName){
         return await this.db.collection(COLLECTION_USER).findOne(
                {"userName":userName},
                {"_id":1}
         );
    }

    async insertRoom(roomId,name,status,source,userName){
        return this.db.collection(COLLECTION_ROOM).insertOne({
            "_id":roomId,
            "status":status,
            "name":name,
            "adminName":userName,
            "source":source,
            "date":new Date()
        });
    }

    async authenticateUser(userName,password){
        const user = await this.db.collection(COLLECTION_USER).findOne({userName:userName});
        if(!user)return {"err":"UserName Does not Exist"};
        if(await bcrypt.compare(password,user.password))return {
            "userName":user.userName,
            "room":user.rooms,
            "email":user.email,
            "_id":user._id
        };
        else return {"err":"wrong password"}
    }

    //
    async getRoom(roomId){
        const room = await this.db.collection(COLLECTION_ROOM).findOne({_id:roomId});
        if(!room)return {"err":"invalid roomId"};
        return room;
    }

    async getRooms(userName) {
        const cursor = this.db.collection(COLLECTION_ROOM).aggregate([
            {$match: {adminName: userName}},
            {$sort: {date: -1}}
        ]);
        const rooms = [];
        while(await cursor.hasNext()){
            rooms.push(await cursor.next());
        }
        return rooms;
    }


    async updateRoomSourceCode(roomId,code){
        return this.db.collection(COLLECTION_ROOM).findOneAndUpdate(
            {_id:roomId},
            {$set:{source:code}}
        );
    }

    async deleteRoom(roomId){
        return this.db.collection(COLLECTION_ROOM).deleteOne(
            {_id:roomId}
        )
    }

}