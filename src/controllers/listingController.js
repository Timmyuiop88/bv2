import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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