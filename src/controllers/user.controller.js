
import { User } from '../models/user.model.js'
import { APIResponse } from '../utils/APIResponse.js'
import { APIError } from "../utils/APIError.js"
import {
  deleteImageCloudinary,
  uploadCloudinary,
} from "../utils/cloudinary.js";
import jwt from "jsonwebtoken"
import mongoose from 'mongoose'
import { asyncHandler } from '../utils/asyncHandler.js';
import fs from "fs"

const generateAccessAndRefreshTokens =async (userId) => {
       const user = await User.findById(userId);
       const accessToken = user.generateAccessToken();
       const refreshToken = user.generateRefreshToken();

       user.refreshToken = refreshToken;
       await user.save({ validateBeforeSave: false });
 // console.log("Generated Tokens:", { accessToken, refreshToken });

       return { accessToken, refreshToken };
   

  
}

const Register = asyncHandler(async (req, res, next) => {
  try {
    const { fullName, username, email, password } = req.body;

    if (!fullName || !username || !email || !password) {
      throw new APIError(400, "All fields are required");
    }

    const existedUser = await User.findOne({ email });
    if (existedUser) {
      throw new APIError(401, "User already existed");
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverLocalPath = req.files?.coverPhoto?.[0]?.path;

    if (!avatarLocalPath) {
      throw new APIError(400, "Avatar is required");
    }

    // Check mimetype to ensure coverPhoto is an image
    const coverPhotoMimetype = req.files?.coverPhoto?.[0]?.mimetype;
    if (coverPhotoMimetype && !coverPhotoMimetype.startsWith("image/")) {
      throw new APIError(
        400,
        "Only image files are allowed for the cover photo"
      );
    }

    const avatar = await uploadCloudinary(avatarLocalPath);

    let coverImage = "";
    if (coverLocalPath) {
      const coverUploadResult = await uploadCloudinary(coverLocalPath);
      if (coverUploadResult) {
        coverImage = coverUploadResult.url;
      } else {
        console.error("Cover photo upload failed.");
      }
    }

    const user = await User.create({
      fullName,
      avatar: avatar?.url,
      coverPhoto: coverImage || "",
      email,
      password,
      username,
    });

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    if (!createdUser) {
      throw new APIError(
        500,
        "Something went wrong while registering the user"
      );
    }

    return res
      .status(201)
      .json(new APIResponse(200, createdUser, "User registered successfully"));
  } catch (error) {
    next(error);
    console.log(error);
  }
});



const loginUser =async (req, res,next) => {
  
  try {
    const { email, password } = req.body
    
    
      if (!email  || !password) {
        throw new APIError(400, "All fields are required");
      }
  
      const user = await User.findOne({
        email 
      });
  
      if (!user) {
        throw new APIError(404, "User not exist");
      }
  
      const isPasswordVaild = await user.isPasswordCorrect(password);
  
      if (!isPasswordVaild) {
        throw new APIError(404, "User does not exist");
      }
  
    const tokens = await generateAccessAndRefreshTokens(user._id);
  
  
    if (!tokens || !tokens.accessToken || !tokens.refreshToken) {
      throw new APIError(500, "Failed to generate tokens");
    }
  
    const { accessToken, refreshToken } = tokens;
  
  
  if (!accessToken || !refreshToken) {
    throw new APIError(500, "Failed to generate tokens");
  }
      const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
      );
  
      const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "None",
      };
  
      return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
          new APIResponse(
            200,
            {
              user: loggedInUser,
              accessToken,
              refreshToken,
            },
            "User logged In Successfully"
          )
        );
   
  } catch (error) {
    next(error)
    
  }
}

const logoutUser = asyncHandler(async (req,res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new APIResponse(200, {}, "User logged Out"));
})

// Refresh access token
 const refreshAccessToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) throw new APIError(401, "Refresh token is missing");

    const user = await User.findOne({ refreshToken });
    if (!user) throw new APIError(401, "Invalid refresh token");

    const { accessToken } = await generateAccessAndRefreshTokens(user._id);

    res
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "None",
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      })
      .status(200)
      .json(new APIResponse(200, { accessToken }, "Access token refreshed"));
  } catch (error) {
    next(error);
  }
};

const changeCurrentPassword =asyncHandler(async (req, res) => {
  const { oldPassword, newPassword ,confirmPassword } = req.body;

  if (!(newPassword === confirmPassword)) {
  throw new APIError(401,"newPassword is not equal to confirmPassword")
}

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new APIError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new APIResponse(200, {}, "Password changed successfully"));
})

const getCurrentUser = asyncHandler(async (req, res) => {
   if (!req.user) {
     return res.status(400).json(new APIResponse(400, null, "User not found"));
   }
  return res
    .status(200)
    .json(new APIResponse(200, req.user, "User fetched successfully"));
})

const updateAccountDetails =asyncHandler( async (req, res,next) => {
  try {
    const { fullName, email } = req.body;
  
    if (!fullName || !email) {
      throw new APIError(400, "All fields are required");
    }
  
    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          fullName,
          email: email,
        },
      },
      { new: true }
    ).select("-password");
  
    return res
      .status(200)
      .json(new APIResponse(200, user, "Account details updated successfully"));
  } catch (error) {
    next()
    console.log("error",error)
  }
});


const updateUserAvatar =asyncHandler(async (req, res) => {
  
    const avatarLocalPath = req.file?.path;
    console.log("avatarLocalPath", avatarLocalPath);
   
    if (!avatarLocalPath) {
      throw new APIError(400, "Avatar file is missing");
    }

  try {
    const avatarResponse = await uploadCloudinary(avatarLocalPath);

    if (!avatarResponse)
      throw new APIError(501, "Error while uploading Avatar");

    // Extract the URL of the uploaded avatar
    const { secure_url: avatarUrl } = avatarResponse;

    const userId = req.user._id; // Get user ID from request, e.g., from JWT payload
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { avatar: avatarUrl },
      { new: true } // Return the updated document
    );

    if (!updatedUser) {
      throw new APIError(404, "User not found");
    }

    // Send the response
    res.status(200).json({
      success: true,
      message: "Avatar updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    throw new APIError(401,"something went wrong")
}
})

const updateUserCoverImage =asyncHandler(async (req, res) => { 
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new APIError(400, "Cover image file is missing");
  }


  const user = await User.findById(req.user?.id)
  
  if (!user) {
    throw new APIError(401,"User is notfound")
  }

  const currentCoverPhoto = user.coverPhoto

  if (currentCoverPhoto) {
    try {
      const coverPhotoUrl = currentCoverPhoto.split("/").pop().split(".")[0]
      await deleteImageCloudinary(coverPhotoUrl);
       user.coverPhoto = null;
       await user.save();
    } catch (error) {
        throw new APIError(500, "Error while deleting the old avatar image");
    }
  }
  




  const coverPhoto = await uploadCloudinary(coverImageLocalPath);

  if (!coverPhoto.url) {
    throw new APIError(400, "Error while uploading on avatar");
  }

  const coverImageUrl = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverPhoto: coverPhoto.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new APIResponse(200, coverImageUrl, "Cover image updated successfully"));
});


const getUserChannelProfile = asyncHandler(async(req,res) => { 
  const { username } = req.params
  

  if (!username) {
    throw new APIError(401,"username is missing ")
  }
   
  const channel = await User.aggregate([
    {
      $match: {
        username: username,
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: { $ifNull: ["$subscribers", []] },
        },
        channelsSubscribedToCount: {
          $size: { $ifNull: ["$subscribedTo", []] },
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);
 if (!channel?.length) {
   throw new APIError(404, "channel does not exists");
 }

 return res
   .status(200)
   .json(new APIResponse(200, channel[0], "User channel fetched successfully"));
})


const getWatchHistory = asyncHandler(async (req, res) => {
  try {
    // Find the user and populate the watchHistory field with corresponding video details
    const user = await User.findById(req.user._id)
      .populate({
        path: 'watchHistory', 
        select: '_id videoFile thumbnail title description duration views isPublished owner',
        populate: { path: 'owner', select: 'fullName username avatar' }, // Populate video owner details
      })
      .select('watchHistory'); // Only return the watchHistory field

    // Check if the user or their watchHistory exists
    if (!user || user.watchHistory.length === 0) {
      return res.status(404).json({ message: "No user found or no watch history." });
    }

    console.log("Fetched user data with watch history:", user.watchHistory);

    // Send the response with the watch history
    return res.status(200).json(
      new APIResponse(200, user.watchHistory, "Watch history fetched successfully")
    );
  } catch (error) {
    console.error("Error fetching watch history:", error);
    return res.status(500).json({ message: "Server error." });
  }
});


const clearWatchHistory = asyncHandler(async (req, res) => {
  const isCleared = await User.findByIdAndUpdate(
    new mongoose.Types.ObjectId(req.user?._id),
    {
      $set: {
        watchHistory: [],
      },
    },
    {
      new: true,
    }
  );
  if (!isCleared) throw new APIError(500, "Failed to clear history");
  return res
    .status(200)
    .json(new APIResponse(200, [], "History Cleared Successfully"));
});

const addVideoToWatchHistory = asyncHandler(async (req, res) => {
  const { videoId } = req.body;

  if (!videoId) {
    return res.status(400).json({ message: "Video ID is required." });
  }

  try {
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $addToSet: { watchHistory: videoId } }, // Adds the video ID only if it's not already present
        { new: true, upsert: true } // `new: true` to return the updated document, `upsert: true` to create it if it doesn't exist
      );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    
    return res.status(200).json({user, message: "Watch history updated." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error." });
  }
});

export {
  Register,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
  clearWatchHistory,
  addVideoToWatchHistory
};