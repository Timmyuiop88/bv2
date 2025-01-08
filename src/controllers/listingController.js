import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

const prisma = new PrismaClient();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export const createListing = async (req, res) => {
    try {
        const { title, description, price, type, currency, location, features } = req.body;
        const userId = req.user.userId || req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { isVendor: true }
        });

        if (!user?.isVendor) {
            return res.status(403).json({ 
                error: 'Only vendors can create listings. Please become a vendor first.' 
            });
        }

        const listing = await prisma.listing.create({
            data: {
                userId,
                title,
                description,
                price,
                type,
                currency,
                location,
                features,
                status: 'DRAFT'
            }
        });

        res.status(201).json(listing);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const getAllListings = async (req, res) => {
    try {
        const { 
            categoryId, 
            search, 
            minPrice, 
            maxPrice,
            type,
            page = 1,
            limit = 20
        } = req.query;

        const where = {
            status: 'ACTIVE',
            ...(categoryId && { categoryId }),
            ...(type && { type }),
            ...(search && {
                OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } }
                ]
            }),
            ...(minPrice && { price: { gte: parseFloat(minPrice) } }),
            ...(maxPrice && { price: { lte: parseFloat(maxPrice) } })
        };

        const [listings, total] = await Promise.all([
            prisma.listing.findMany({
                where,
                include: {
                    images: true,
                    category: true,
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            profileImage: true
                        }
                    }
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.listing.count({ where })
        ]);

        res.json({
            listings,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                currentPage: parseInt(page)
            }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const getListing = async (req, res) => {
    try {
        const { id } = req.params;
        const listing = await prisma.listing.findUnique({
            where: { id },
            include: {
                images: true,
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        profileImage: true
                    }
                }
            }
        });

        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        res.json(listing);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const updateListing = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const userId = req.user.id;

        const listing = await prisma.listing.findUnique({
            where: { id }
        });

        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        if (listing.userId !== userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const updatedListing = await prisma.listing.update({
            where: { id },
            data: updates
        });

        res.json(updatedListing);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const deleteListing = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const listing = await prisma.listing.findUnique({
            where: { id }
        });

        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        if (listing.userId !== userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await prisma.listing.delete({
            where: { id }
        });

        res.json({ message: 'Listing deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const getMyListings = async (req, res) => {
    try {
        const userId = req.user.id;
        const listings = await prisma.listing.findMany({
            where: { userId },
            include: {
                images: true
            }
        });
        res.json(listings);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const searchListings = async (req, res) => {
    try {
        const { query, type, minPrice, maxPrice, status } = req.query;

        const where = {
            status: status || 'ACTIVE',
            AND: []
        };

        if (query) {
            where.AND.push({
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } }
                ]
            });
        }

        if (type) {
            where.type = type;
        }

        if (minPrice || maxPrice) {
            where.price = {};
            if (minPrice) where.price.gte = parseFloat(minPrice);
            if (maxPrice) where.price.lte = parseFloat(maxPrice);
        }

        const listings = await prisma.listing.findMany({
            where,
            include: {
                images: true,
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        profileImage: true
                    }
                }
            }
        });

        res.json(listings);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const uploadListingImages = async (req, res) => {
    // Implementation depends on your file upload solution
    // (e.g., multer, cloudinary, etc.)
    res.status(501).json({ error: 'Not implemented' });
};

export const createListingWithImages = async (req, res) => {
  try {
    const { title, description, price, type, currency, location, features } = req.body;
    const images = req.files; // Array of image files
    const userId = req.user.userId;

    // Check if user is vendor
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isVendor: true }
    });

    if (!user?.isVendor) {
      return res.status(403).json({
        error: 'Only vendors can create listings. Please become a vendor first.'
      });
    }

    // Upload images to Cloudinary with progress tracking
    const uploadPromises = images.map((file) => {
      return new Promise((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
          {
            folder: 'listings',
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        // Create readable stream from buffer and pipe to Cloudinary
        const stream = Readable.from(file.buffer);
        stream.pipe(upload);

        // Track upload progress
        upload.on('progress', (progress) => {
          // Emit progress through Server-Sent Events if needed
          if (req.accepts('text/event-stream')) {
            res.write(`data: ${JSON.stringify({ progress })}\n\n`);
          }
        });
      });
    });

    const uploadedImages = await Promise.all(uploadPromises);

    // Create listing with uploaded image URLs
    const listing = await prisma.listing.create({
      data: {
        userId,
        title,
        description,
        price,
        type,
        currency,
        location,
        features,
        status: 'DRAFT',
        images: {
          create: uploadedImages.map((img, index) => ({
            url: img.secure_url,
            isPrimary: index === 0
          }))
        }
      },
      include: {
        images: true
      }
    });

    res.status(201).json(listing);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};