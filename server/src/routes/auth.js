import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// A function to get the routes.
// All route definitions are in one place and we only need to export one thing
function getAuthRoutes() {
  const router = express.Router();

  router.post('/google-login', googleLogin);

  return router;
}

// All controllers/utility functions here
async function googleLogin(req, res) {
  const { username = '', email = '' } = req.body;
  // check database for a user with this email
  let user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        username,
        email,
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

async function me(req, res) {}

function signout(req, res) {}

export { getAuthRoutes };
