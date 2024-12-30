import { PrismaClient } from '@prisma/client';
import { APIError, NotFoundError } from '../utils/errors.js';

const prisma = new PrismaClient();

export const createOffer = async (req, res, next) => {
  try {
    const buyerId = req.user.userId;
    const { listingId, price, message } = req.body;

    // Get listing to check if it exists and get sellerId
    const listing = await prisma.listing.findUnique({
      where: { id: listingId }
    });

    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    // Create offer
    const offer = await prisma.offer.create({
      data: {
        listingId,
        buyerId,
        sellerId: listing.userId,
        price,
        message,
        status: 'PENDING'
      },
      include: {
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true
          }
        },
        listing: {
          select: {
            id: true,
            title: true,
            price: true
          }
        }
      }
    });

    res.status(201).json({
      status: 'success',
      offer
    });
  } catch (error) {
    next(error);
  }
};

export const getOffers = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { type = 'received' } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const where = type === 'sent' 
      ? { buyerId: userId }
      : { sellerId: userId };

    const offers = await prisma.offer.findMany({
      where,
      include: {
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true
          }
        },
        listing: {
          select: {
            id: true,
            title: true,
            price: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const total = await prisma.offer.count({ where });

    res.json({
      status: 'success',
      offers,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    next(error);
  }
};

export const respondToOffer = async (req, res, next) => {
  try {
    const { offerId } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { listing: true }
    });

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    if (offer.listing.userId !== userId) {
      throw new APIError('Not authorized to respond to this offer', 403);
    }

    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      throw new APIError('Invalid status. Must be ACCEPTED or REJECTED', 400);
    }

    const updatedOffer = await prisma.offer.update({
      where: { id: offerId },
      data: { status },
      include: {
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true
          }
        },
        listing: {
          select: {
            id: true,
            title: true,
            price: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      offer: updatedOffer
    });
  } catch (error) {
    next(error);
  }
};

export const markOfferCompleted = async (req, res, next) => {
  try {
    const { offerId } = req.params;
    const userId = req.user.userId;

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { listing: true }
    });

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    if (offer.listing.userId !== userId) {
      throw new APIError('Not authorized to complete this offer', 403);
    }

    if (offer.status !== 'ACCEPTED') {
      throw new APIError('Can only complete accepted offers', 400);
    }

    const updatedOffer = await prisma.offer.update({
      where: { id: offerId },
      data: { status: 'COMPLETED' },
      include: {
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true
          }
        },
        listing: {
          select: {
            id: true,
            title: true,
            price: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      offer: updatedOffer
    });
  } catch (error) {
    next(error);
  }
};

export const getMyOffers = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const offers = await prisma.offer.findMany({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId }
        ]
      },
      include: {
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true
          }
        },
        listing: {
          select: {
            id: true,
            title: true,
            price: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const total = await prisma.offer.count({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId }
        ]
      }
    });

    res.json({
      status: 'success',
      offers,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    next(error);
  }
}; 