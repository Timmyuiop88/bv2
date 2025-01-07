import express from 'express';
import { authenticateToken, isAdmin, isModerator } from '../middleware/auth.js';
import { 
    createListing,
    getAllListings,
    getListing,
    updateListing,
    deleteListing,
    getMyListings,
    searchListings,
    uploadListingImages
} from '../controllers/listingController.js';

const router = express.Router();

// Public routes
router.get('/', getAllListings);
router.get('/search', searchListings);
router.get('/:id', getListing);

// Protected routes
router.use(authenticateToken); // Apply authentication to all routes below

router.post('/', authenticateToken, createListing);
router.get('/user/me', getMyListings);
router.post('/:id/images', uploadListingImages);
router.put('/:id', updateListing);
router.delete('/:id', deleteListing);

// Admin/Moderator routes
router.use('/:id/approve', isModerator, (req, res) => {
    // Approve listing implementation
});

router.use('/:id/feature', isAdmin, (req, res) => {
    // Feature listing implementation
});

export default router; 