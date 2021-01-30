import express from 'express';
import { PrismaClient } from '@prisma/client';
import { getAuthUser, protect } from '../middleware/authorization';
import { getVideoViews } from './video';

const prisma = new PrismaClient();

function getUserRoutes() {
  const router = express.Router();

  // GET RECOMMENDED CHANNELS
  router.get('/', protect, getRecommendedChannels);
  // EDIT USER
  router.put('/', protect, editUser);

  // GET LIKED VIDEOS
  router.get('/liked-videos', protect, getLikedVideos);
  // GET HISTORY
  router.get('/history', protect, getHistory);
  // GET FEED
  router.get('/feed', protect, getFeed);
  // SEARCH USER(S)
  router.get('/search', getAuthUser, searchUser);

  // GET USER PROFILE
  router.get('/:userId', getAuthUser, getProfile);
  // SUBSCRIBE / UNSUBSCRIBE TO USER
  router.get('/:userId/subscribe', protect, toggleSubscribe);

  return router;
}

/**
 * function is called by getLikedVideos and getHistory
 *
 * @param {*} model - i.e. prisma.view / prisma.videoLike
 * @param {*} req
 * @param {*} res
 */
async function getVideos(model, req, res) {
  // FIND VIDEOS OF GIVEN MODEL (i.e. Videos I have viewed / Videos I have liked)
  // WHERE USERID OF VIDEO === USER ID OF USER MAKING REQUEST
  const videoRelations = await model.findMany({
    where: {
      userId: req.user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  // TAKE ARRAY OF VIDEOS, MAP OVER IT CREATING ANOTHER ARRAY OF IDS FOR THE VIDEOS
  const videoIds = videoRelations.map((like) => like.videoId);
  // GET ARRAY OF VIDEOS THAT MATCH MODEL (I.E. VIDEOS WE HAVE VIEWED / LIKED)
  let videos = await prisma.video.findMany({
    where: {
      id: {
        in: videoIds,
      },
    },
    include: {
      user: true,
    },
  });
  // IF NO MATCHES FOUND -> THROW ERROR
  if (!videos.length) {
    return res.status(200).json({ videos });
  }
  // ITERATE THROUGH VIDEOS, GETTING VIEWS COUNT FOR EACH VIDEO, AND ADDING
  // THAT DATA AS AN ATTRIBUTE IN EACH VIDEO OBJECT
  videos = await getVideoViews(videos);
  // RESPOND WITH VIDEOS ARRAY
  return res.status(200).json({ videos });
}

/**
 * controller for getting all liked videos for user making request
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function getLikedVideos(req, res, next) {
  await getVideos(prisma.videoLike, req, res);
}

/**
 * controller for getting all viewed videos for user making request
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function getHistory(req, res, next) {
  await getVideos(prisma.view, req, res);
}

/**
 * controller for subscribing / unsubscribing to a channel
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function toggleSubscribe(req, res, next) {
  // GUARD: USER CANNOT SUBSCRIBE TO THEIR OWN CHANNEL
  if (req.user.id === req.params.userId) {
    return next({
      message: 'You cannot subscribe to your own channel',
      status: 400,
    });
  }
  // GET USER INFO FOR WHOM WE WOULD LIKE TO SUBSCRIBE
  const user = await prisma.user.findUnique({
    where: {
      id: req.params.userId,
    },
  });
  // GUARD: IF USER DOES NOT EXIST -> THROW ERROR
  if (!user) {
    return next({
      message: `No user found with id ${req.params.userId}`,
      status: 404,
    });
  }
  // FIGURE OUT IF WE ARE ALREADY SUBSCRIBED
  const isSubscribed = await prisma.subscription.findFirst({
    where: {
      subscriberId: {
        equals: req.user.id,
      },
      subscribedToId: {
        equals: req.params.userId,
      },
    },
  });
  // IF ALREADY SUBSCRIBED -> UNSUBSCRIBE
  if (isSubscribed) {
    await prisma.subscription.delete({
      where: {
        id: isSubscribed.id,
      },
    });
  }
  // IF NOT SUBSCRIBED -> SUBSCRIBE
  else {
    await prisma.subscription.create({
      data: {
        subscriber: {
          connect: {
            id: req.user.id,
          },
        },
        subscribedTo: {
          connect: {
            id: req.params.userId,
          },
        },
      },
    });
  }
  // SEND RESPONSE
  res.status(200).json({});
}

/**
 * controller for getting videos from channels requesting user is subd to
 *
 * @param {*} req
 * @param {*} res
 */
async function getFeed(req, res) {
  const subscribedTo = await prisma.subscription.findMany({
    where: {
      subscriberId: {
        equals: req.user.id,
      },
    },
  });

  const subscriptions = subscribedTo.map((sub) => sub.subscribedToId);

  const feed = await prisma.video.findMany({
    where: {
      userId: {
        in: subscriptions,
      },
    },
    include: {
      user: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!feed.length) {
    return res.status(200).json({ feed });
  }
  const feedVideos = await getVideoViews(feed);
  return res.status(200).json({ feed: feedVideos });
}

/**
 * controller for searching for users by username
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function searchUser(req, res, next) {
  // GUARD -> If no search query provided -> throw error
  if (!req.query.query) {
    return next({
      message: 'Please enter a search query',
      status: 400,
    });
  }
  // SEARCH FOR MATCHING USER(S)
  const users = await prisma.user.findMany({
    where: {
      username: {
        contains: req.query.query,
        mode: 'insensitive',
      },
    },
  });
  // GUARD -> If no matches are found -> return early and respond with empty array
  if (!users.length) {
    return res.status(200).json({ users });
  }
  // OTHERWISE
  // FOR EACH MATCHING USER
  for (const user of users) {
    // GET SUBSCRIBER COUNT FOR THAT USER
    const subscribersCount = await prisma.subscription.count({
      where: {
        subscribedToId: {
          equals: user.id,
        },
      },
    });
    // GET VIDEO COUNT FOR THAT USER
    const videosCount = await prisma.video.count({
      where: {
        userId: user.id,
      },
    });
    let isMe,
      isSubscribed = false;
    if (req.user) {
      isMe = req.user.id === user.id;
      isSubscribed = await prisma.subscription.findFirst({
        where: {
          AND: {
            subscriberId: {
              equals: req.user.id,
            },
            subscribedToId: {
              equals: user.id,
            },
          },
        },
      });
    }
    // UPDATE USER OBJECT WITH COMPUTED ATTRIBUTES
    user.subscribersCount = subscribersCount;
    user.videosCount = videosCount;
    user.isSubscribed = Boolean(isSubscribed);
    user.isMe = isMe;
  }
  // SEND RESPONSE
  res.status(200).json({ users });
}

/**
 * controller for getting recommended channels
 * (grabs first 10 users who are not requesting user)
 *
 * @param {*} req
 * @param {*} res
 */
async function getRecommendedChannels(req, res) {
  const channels = await prisma.user.findMany({
    where: {
      id: {
        not: req.user.id,
      },
    },
    take: 10,
  });

  if (!channels.length) {
    return res.status(200).json({ channels });
  }

  for (const channel of channels) {
    const subscribersCount = await prisma.subscription.count({
      where: {
        subscribedToId: {
          equals: channel.id,
        },
      },
    });
    const videosCount = await prisma.video.count({
      where: {
        userId: channel.id,
      },
    });
    const isSubscribed = await prisma.subscription.findFirst({
      where: {
        AND: {
          subscriberId: {
            equals: req.user.id,
          },
          subscribedToId: {
            equals: channel.id,
          },
        },
      },
    });

    channel.subscribersCount = subscribersCount;
    channel.videosCount = videosCount;
    channel.isSubscribed = Boolean(isSubscribed);
  }
  // SEND RESPONSE
  res.status(200).json({ channels });
}

/**
 * controller for getting user details
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function getProfile(req, res, next) {
  // GET USER INFO
  const user = await prisma.user.findUnique({
    where: {
      id: req.params.userId,
    },
  });
  // GUARD: IF USER DOES NOT EXIST -> THROW ERROR
  if (!user) {
    return next({
      message: `No user found with id ${req.params.userId}`,
      status: 404,
    });
  }
  // GET SUBSCRIPTION DATA FOR USER
  const subscribersCount = await prisma.subscription.count({
    where: {
      subscribedToId: {
        equals: user.id,
      },
    },
  });
  let isMe,
    isSubscribed = false;
  if (req.user) {
    isMe = req.user.id === user.id;
    isSubscribed = await prisma.subscription.findFirst({
      where: {
        AND: {
          subscriberId: {
            equals: req.user.id,
          },
          subscribedToId: {
            equals: user.id,
          },
        },
      },
    });
  }
  const subscribedTo = await prisma.subscription.findMany({
    where: {
      subscriberId: {
        equals: user.id,
      },
    },
  });
  const subscriptions = subscribedTo.map((sub) => sub.subscribedToId);
  const channels = await prisma.user.findMany({
    where: {
      id: {
        in: subscriptions,
      },
    },
  });
  for (const channel of channels) {
    const subscribersCount = await prisma.subscription.count({
      where: {
        subscribedToId: {
          equals: channel.id,
        },
      },
    });
    channels.subscribersCount = subscribersCount;
  }
  // GET VIDEOS FOR USER
  let videos = await prisma.video.findMany({
    where: {
      userId: {
        equals: user.id,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  user.subscribersCount = subscribersCount;
  user.isSubscribed = Boolean(isSubscribed);
  user.isMe = isMe;
  user.channels = channels;
  user.videos = videos;

  if (!videos.length) {
    return res.status(200).json({ user });
  }

  user.videos = getVideoViews(videos);

  res.status(200).json({ user });
}

/**
 * controller for updating a users profile
 *
 * @param {\} req
 * @param {*} res
 */
async function editUser(req, res) {
  const { username, cover, avatar, about } = req.body;

  const user = await prisma.user.update({
    where: {
      id: req.user.id,
    },
    data: {
      username,
      cover,
      avatar,
      about,
    },
  });

  res.status(200).json({ user });
}

export { getUserRoutes };
