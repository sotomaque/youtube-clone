import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { protect } from '../middleware/authorization';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const prisma = new PrismaClient();

// A function to get the routes.
// All route definitions are in one place and we only need to export one thing
function getAuthRoutes() {
  const router = express.Router();

  // everything here lies behing /api/v1/auth

  router.post('/google-login', googleLogin);
  router.get('/me', protect, me);
  router.get('/signout', signout);

  return router;
}

/**
 * LOGIN CONTROLLER
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function googleLogin(req, res, next) {
  const { idToken } = req.body;
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const { name, picture, email } = ticket.getPayload();

  if (!email) {
    return next({
      message: 'Please provide an email to login',
      status: 400,
    });
  }
  // check database for a user with this email
  let user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        username: name,
        avatar: picture,
      },
    });
  }

  // jwt
  const tokenPayload = { id: user.id };
  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });

  // set JWT as cookie
  res.cookie('token', token, { httpOnly: true });
  // respond wiwth
  res.status(200).send(token);
}

/**
 * ME CONTROLLER
 *  - returns an object with a user key that stores info
 * about currently logged in user.
 *
 * i.e. response = {
 *  user = {
 *    id,
 *    createdAt,
 *    ...,
 *    videos: [],
 *    channels: []
 *  }
 * }
 *
 * @param {*} req
 * @param {*} res
 */
async function me(req, res, next) {
  // GUARD
  if (!req.user) {
    return next({
      message: 'You need to be logged in to visit this route.',
      statusCode: 401,
    });
  }
  // GET CURRENT USER INFO
  const subscriptions = await prisma.subscription.findMany({
    where: {
      subscriberId: {
        equals: req.user.id,
      },
    },
  });
  const channelIds = subscriptions.map((sub) => sub.subscribedToId);
  const channels = await prisma.user.findMany({
    where: {
      id: {
        in: channelIds,
      },
    },
  });
  // SET ATTRIBUTE(S)
  const user = req.user;
  user.channels = channels;
  // RESPOND
  res.status(200).json({ user });
}

/**
 * SIGN OUT CONTROLLER
 *
 * @param {*} req
 * @param {*} res
 */
function signout(req, res) {
  res.clearCookie('token');
  res.status(200).json({});
}

export { getAuthRoutes };
