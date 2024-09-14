import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config(); 

const dataBase=()=>{
    mongoose.connect(process.env.MONGODB_URL).then(()=>{
        console.log("MongoDb connect")
    }).catch((error)=>{
  console.log("failed to connected",error)
    })
}

export default dataBase