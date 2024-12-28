const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createOffer = async (req, res) => {
  try {
    const { userId: buyerId } = req.user;
    const { listingId, price, message } = req.body;

    // Check if listing exists and is available
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { offers: true }
    });

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    if (listing.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'This listing is not available' });
    }

    if (listing.userId === buyerId) {
      return res.status(400).json({ message: 'You cannot make an offer on your own listing' });
    }

    // Check if user already has a pending offer for this listing
    const existingOffer = await prisma.offer.findFirst({
      where: {
        listingId,
        buyerId,
        status: 'PENDING'
      }
    });

    if (existingOffer) {
      return res.status(400).json({ message: 'You already have a pending offer for this listing' });
    }

    // Create the offer
    const offer = await prisma.offer.create({
      data: {
        listingId,
        buyerId,
        sellerId: listing.userId,
        price,
        message,
      },
      include: {
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Notify seller through WebSocket if available
    const wsService = req.app.get('wsService');
    const sellerSocket = wsService.userSockets.get(listing.userId);
    if (sellerSocket) {
      sellerSocket.emit('new_offer', {
        offerId: offer.id,
        listingId: listing.id,
        buyer: offer.buyer,
        price: offer.price,
        message: offer.message
      });
    }

    res.status(201).json(offer);
  } catch (error) {
    res.status(500).json({ message: 'Error creating offer', error: error.message });
  }
};

exports.respondToOffer = async (req, res) => {
  try {
    const { userId: sellerId } = req.user;
    const { offerId } = req.params;
    const { status } = req.body;

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        listing: true,
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    if (offer.sellerId !== sellerId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (offer.status !== 'PENDING') {
      return res.status(400).json({ message: 'This offer can no longer be modified' });
    }

    // Update offer status
    const updatedOffer = await prisma.offer.update({
      where: { id: offerId },
      data: { status },
      include: {
        listing: true,
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // If offer is accepted, reject all other pending offers
    if (status === 'ACCEPTED') {
      await prisma.offer.updateMany({
        where: {
          listingId: offer.listingId,
          id: { not: offerId },
          status: 'PENDING'
        },
        data: { status: 'REJECTED' }
      });
    }

    // Notify buyer through WebSocket
    const wsService = req.app.get('wsService');
    const buyerSocket = wsService.userSockets.get(offer.buyerId);
    if (buyerSocket) {
      buyerSocket.emit('offer_response', {
        offerId: offer.id,
        listingId: offer.listingId,
        status: updatedOffer.status
      });
    }

    res.json(updatedOffer);
  } catch (error) {
    res.status(500).json({ message: 'Error responding to offer', error: error.message });
  }
};

exports.markOfferCompleted = async (req, res) => {
  try {
    const { userId: sellerId } = req.user;
    const { offerId } = req.params;

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { listing: true }
    });

    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    if (offer.sellerId !== sellerId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (offer.status !== 'ACCEPTED') {
      return res.status(400).json({ message: 'Only accepted offers can be marked as completed' });
    }

    // Update offer and listing status
    const [updatedOffer] = await prisma.$transaction([
      prisma.offer.update({
        where: { id: offerId },
        data: { status: 'COMPLETED' }
      }),
      prisma.listing.update({
        where: { id: offer.listingId },
        data: { status: 'SOLD' }
      })
    ]);

    // Notify buyer
    const wsService = req.app.get('wsService');
    const buyerSocket = wsService.userSockets.get(offer.buyerId);
    if (buyerSocket) {
      buyerSocket.emit('offer_completed', {
        offerId: offer.id,
        listingId: offer.listingId
      });
    }

    res.json(updatedOffer);
  } catch (error) {
    res.status(500).json({ message: 'Error completing offer', error: error.message });
  }
};

exports.getMyOffers = async (req, res) => {
  try {
    const { userId } = req.user;
    const { status, type } = req.query;

    const where = {};
    if (type === 'sent') {
      where.buyerId = userId;
    } else if (type === 'received') {
      where.sellerId = userId;
    }

    if (status) {
      where.status = status;
    }

    const offers = await prisma.offer.findMany({
      where,
      include: {
        listing: {
          include: {
            images: {
              where: { isPrimary: true },
              take: 1
            }
          }
        },
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching offers', error: error.message });
  }
}; 