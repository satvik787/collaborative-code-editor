const mongodb = require("mongodb");
const bcrypt = require("bcrypt");
const {ObjectId} = require("mongodb");
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
            "rooms":[]
        });
    }

    async getUser(userName){
         return await this.db.collection(COLLECTION_USER).findOne(
                {"userName":userName},
                {"_id":1}
         );
    }

    async insertRoom(roomId,status,adminId){
        await this.db.collection(COLLECTION_USER).findOneAndUpdate([
            {_id: new mongodb.ObjectId(adminId)},
            {$push:{rooms:new mongodb.ObjectId(roomId)}}
        ]);
        return this.db.collection(COLLECTION_ROOM).insertOne({
            "_id":roomId,
            "status":status,
            "adminId":new mongodb.ObjectId(adminId),
            "source":"",
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
        const room = await this.db.collection(COLLECTION_ROOM).findOne({_id:new mongodb.ObjectId(roomId)});
        if(!room)return {"err":"invalid roomId"};
        return room;
    }

    async updateRoomStatus(roomId,status){
        return this.db.collection(COLLECTION_ROOM).findOneAndUpdate(
            {_id:new mongodb.ObjectId(roomId)},
            {$set:{status:status}}
        );
    }

    async updateRoomSourceCode(roomId,code){
        return this.db.collection(COLLECTION_ROOM).findOneAndUpdate(
            {_id:new mongodb.ObjectId(roomId)},
            {$set:{source:code}}
        );
    }

    async deleteRoom(roomId,userId){
        await this.db.collection(COLLECTION_USER).findOneAndUpdate(
            {_id:new mongodb.ObjectId(userId)},
            {$pull:{"rooms":new mongodb.ObjectId(roomId)}}
        );
        return this.db.collection(COLLECTION_ROOM).deleteOne(
            {_id:new mongodb.ObjectId(roomId)}
        )
    }

}