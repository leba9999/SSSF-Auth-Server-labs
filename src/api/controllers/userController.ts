// Description: This file contains the functions for the user routes
// TODO: add function check, to check if the server is alive
// TODO: add function to get all users
// TODO: add function to get a user by id
// TODO: add function to create a user
// TODO: add function to update a user
// TODO: add function to delete a user
// TODO: add function to check if a token is valid

import {NextFunction, Request, Response} from 'express';
import userModel from '../models/userModel';
import CustomError from '../../classes/CustomError';
import {User, OutputUser} from '../../interfaces/User';
import bcrypt from 'bcryptjs';
import DBMessageResponse from '../../interfaces/DBMessageResponse';
import jwt from 'jsonwebtoken';
import LoginMessageResponse from '../../interfaces/LoginMessageResponse';

const salt = bcrypt.genSaltSync(12);

const check = (req: Request, res: Response) => {
  res.json({message: 'I am alive'});
};

const userListGet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await userModel.find().select('-password -role');
    res.json(users);
  } catch (error) {
    next(new CustomError((error as Error).message, 500));
  }
};

const userGet = async (
  req: Request<{id: string}>,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await userModel
      .findById(req.params.id)
      .select('-password -role');
    if (!user) {
      next(new CustomError('User not found', 404));
    }
    res.json(user);
  } catch (error) {
    next(new CustomError((error as Error).message, 500));
  }
};

const userPost = async (
  req: Request<{}, {}, User>,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.body;
    user.password = await bcrypt.hash(user.password, salt);
    const newUser = await userModel.create(user);
    const response: DBMessageResponse = {
      message: 'user created',
      user: {
        user_name: newUser.user_name,
        email: newUser.email,
        id: newUser._id,
      },
    };
    res.json(response);
  } catch (error) {
    next(new CustomError((error as Error).message, 500));
  }
};

const userPut = async (
  req: Request<{}, {}, User>,
  res: Response,
  next: NextFunction
) => {
  try {
    const headers = req.headers;
    const bearer = headers.authorization;
    if (!bearer) {
      next(new CustomError('No token provided', 401));
      return;
    }
    const token = bearer.split(' ')[1];

    const userFromToken = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as OutputUser;

    const user = req.body;
    if (user.password) {
      user.password = await bcrypt.hash(user.password, salt);
    }
    const result = await userModel
      .findByIdAndUpdate(userFromToken.id, user, {
        new: true,
      })
      .select('-password -role');
    if (!result) {
      next(new CustomError('User not found', 404));
      return;
    }
    const response: DBMessageResponse = {
      message: 'user updated',
      user: {
        user_name: result.user_name,
        email: result.email,
        id: result._id,
      },
    };
    res.json(response);
  } catch (error) {
    next(new CustomError((error as Error).message, 500));
  }
};

const userDelete = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const headers = req.headers;
    const bearer = headers.authorization;
    if (!bearer) {
      next(new CustomError('No token provided', 401));
      return;
    }
    const token = bearer.split(' ')[1];

    const userFromToken = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as OutputUser;

    const result = await userModel.findByIdAndDelete(userFromToken.id);
    if (!result) {
      next(new CustomError('User not found', 404));
      return;
    }
    const response: DBMessageResponse = {
      message: 'user deleted',
      user: {
        user_name: result.user_name,
        email: result.email,
        id: result._id,
      },
    };
    res.json(response);
  } catch (error) {
    next(new CustomError((error as Error).message, 500));
  }
};

const checkToken = async (req: Request, res: Response, next: NextFunction) => {
  const headers = req.headers;
  const bearer = headers.authorization;
  if (!bearer) {
    next(new CustomError('No token provided', 401));
    return;
  }
  const token = bearer.split(' ')[1];
  const userFromToken = jwt.verify(
    token,
    process.env.JWT_SECRET as string
  ) as OutputUser;

  const user = await userModel
    .findById(userFromToken.id)
    .select('-password -role');

  if (!user) {
    next(new CustomError('Token not valid', 404));
    return;
  }

  const newToken = jwt.sign(
    {
      user_name: user.user_name,
      email: user.email,
      id: user._id,
    },
    process.env.JWT_SECRET as string
  );

  const message: LoginMessageResponse = {
    message: 'Token is valid',
    token: newToken,
  };
  res.json({message: 'Token is valid'});
};

export default {
  check,
  userListGet,
  userGet,
  userPost,
  userPut,
  userDelete,
  checkToken,
};
