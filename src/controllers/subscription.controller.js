import mongoose from "mongoose";
import { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { APIResponse } from "../utils/APIResponse.js";
import { APIError } from "../utils/APIError.js";



const toggleSubscription = async (req, res) => {
  const { channelId } = req.params;
  console.log("ChannelId:", channelId); 
  if (!isValidObjectId(channelId)) throw new APIError(400, "Invalid ChannelId");

  let isSubscribed;
  const findRes = await Subscription.findOne({
    subscriber: req.user?._id,
    channel: channelId,
  });

  if (findRes) {
    await Subscription.deleteOne({
      subscriber: req.user?._id,
      channel: channelId,
    });
    isSubscribed = false;
  } else {
    const newSub = await Subscription.create({
      subscriber: req.user?._id,
      channel: channelId,
    });
    if (!newSub) throw new APIError(500, "Failed to toggle Subscription");
    isSubscribed = true;
  }
  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        { isSubscribed },
        `${
          isSubscribed
            ? "Subscribed successfully"
            : "Un-Subscribed successfully"
        }`
      )
    );
  
  }
// controller to return subscriber list of a channel

const getUserChannelSubscribers = async (req, res) => {
  const { channelId = req.user?._id } = req.params;

  if (!isValidObjectId(channelId)) {
    return res
      .status(400)
      .json(new APIResponse(400, null, "Invalid ChannelId"));
  }

  try {
    const subscriberList = await Subscription.aggregate([
      {
        $match: {
          channel: new mongoose.Types.ObjectId(channelId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "subscriber",
          foreignField: "_id",
          as: "subscriber",
        },
      },
      {
        $unwind: {
          path: "$subscriber",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          "subscriber.isSubscribed": {
            $cond: {
              if: {
                $in: [
                  "$subscriber._id",
                  { $ifNull: ["$subscribedChannels.channel", []] },
                ],
              },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $project: {
          "subscriber.username": 1,
          "subscriber._id": 1,
          "subscriber.avatar": 1,
          "subscriber.fullName": 1,
          "subscriber.isSubscribed": 1,
        },
      },
      {
        $group: {
          _id: null,
          subscribers: {
            $push: "$subscriber",
          },
        },
      },
    ]);

    const subscribers =
      subscriberList.length > 0 ? subscriberList[0].subscribers : [];

    return res
      .status(200)
      .json(
        new APIResponse(200, subscribers, "Subscribers fetched successfully")
      );
  } catch (error) {
    console.error("Error fetching subscribers:", error);
    return res
      .status(500)
      .json(new APIResponse(500, null, "Failed to fetch subscribers"));
  }
};


// controller to return channel list to which user has subscribed

const getSubscribedChannels = async (req, res) => {
  const { subscriberId } = req.params;

  if (!isValidObjectId(subscriberId)) {
    return res
      .status(400)
      .json(new APIResponse(400, null, "Invalid subscriberId"));
  }

  try {
    const subscribedChannels = await Subscription.aggregate([
      {
        $match: {
          subscriber: new mongoose.Types.ObjectId(subscriberId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "channel",
          foreignField: "_id",
          as: "subscribedChannel",
          pipeline: [
            {
              $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "owner",
                as: "videos",
                pipeline: [
                  {
                    $match: {
                      isPublished: true,
                    },
                  },
                  {
                    $sort: { createdAt: -1 },
                  },
                  {
                    $limit: 1,
                  },
                ],
              },
            },
            {
              $addFields: {
                latestVideo: {
                  $arrayElemAt: ["$videos", 0],
                },
              },
            },
          ],
        },
      },
      {
        $unwind: "$subscribedChannel",
      },
      {
        $project: {
          _id: 0,
          subscribedChannel: {
            _id: 1,
            username: 1,
            fullName: 1,
            "avatar.url": 1,
            latestVideo: {
              _id: 1,
              "video.url": 1,
              "thumbnail.url": 1,
              owner: 1,
              title: 1,
              description: 1,
              duration: 1,
              createdAt: 1,
              views: 1,
              ownerDetails: 1,
            },
          },
        },
      },
    ]);

    if (!subscribedChannels) {
      return res
        .status(500)
        .json(
          new APIResponse(500, null, "Failed to fetch subscribed channels")
        );
    }

    return res
      .status(200)
      .json(
        new APIResponse(
          200,
          subscribedChannels,
          "Subscribed channels fetched successfully"
        )
      );
  } catch (error) {
    console.error("Error fetching subscribed channels:", error);
    return res
      .status(500)
      .json(new APIResponse(500, null, "Failed to fetch subscribed channels"));
  }
};




  

  










export { toggleSubscription, getUserChannelSubscribers,getSubscribedChannels }