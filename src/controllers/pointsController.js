import { PrismaClient } from '@prisma/client';
import { APIError } from '../utils/errors.js';

const prisma = new PrismaClient();

export const getUserPoints = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.userId;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        points: true
      }
    });

    if (!user) {
      throw new APIError('User not found', 404);
    }

    res.json({
      status: 'success',
      points: user.points
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

export const addPoints = async (req, res) => {
  try {
    const { userId, points, reason } = req.body;
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        points: {
          increment: points
        }
      },
      select: {
        id: true,
        points: true
      }
    });

    res.json({
      status: 'success',
      points: user.points
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
}; 