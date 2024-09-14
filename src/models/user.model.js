import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    avatar: {
      type: String, //cloudinary
      required: true,
    },
    coverPhoto: {
      type: String, //cloudinary
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next() 
    
    this.password = await bcrypt.hash(this.password, 10)
    next()
}
    
)

userSchema.methods.isPasswordCorrect = async function (password) {
   return await bcrypt.compare(password,this.password)
}


userSchema.methods.generateAccessToken = function () {
   
 return jwt.sign(
      {
        _id: this._id
    
      },

      process.env.ACCESS_TOKEN,
      {
        expiresIn: process.env.ACCESSTOKEN_EXPIRES
      }                           
    );
}
 

userSchema.methods.generateRefreshToken = function () {
 
  return jwt.sign(
      {
        _id: this._id
      },
      process.env.REFRESH_TOKEN,
      {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES
      }
    );
}

console.log(process.env.ACCESS_TOKEN, process.env.REFRESH_TOKEN);



export const User=mongoose.model("User",userSchema)