import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import { Database, Resource, getModelByName } from '@adminjs/prisma';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma Client
const prisma = new PrismaClient();

// Register Prisma Adapter
AdminJS.registerAdapter({ Database, Resource });

const adminOptions = {
  resources: [
    {
      resource: { 
        model: getModelByName('User'), 
        client: prisma 
      },
      options: {
        navigation: { name: 'Users' }
      }
    },
    {
      resource: { 
        model: getModelByName('Listing'), 
        client: prisma 
      },
      options: {
        navigation: { name: 'Listings' }
      }
    },
    {
      resource: { 
        model: getModelByName('Verification'), 
        client: prisma 
      },
      options: {
        navigation: { name: 'Verifications' }
      }
    },
    {
      resource: { 
        model: getModelByName('Review'), 
        client: prisma 
      },
      options: {
        navigation: { name: 'Reviews' }
      }
    },
    {
      resource: { 
        model: getModelByName('Message'), 
        client: prisma 
      },
      options: {
        navigation: { name: 'Messages' }
      }
    },
    {
      resource: { 
        model: getModelByName('Offer'), 
        client: prisma 
      },
      options: {
        navigation: { name: 'Offers' }
      }
    },
    {
      resource: { 
        model: getModelByName('Image'), 
        client: prisma 
      },
      options: {
        navigation: { name: 'Images' }
      }
    }
  ],
  rootPath: '/admin',
  branding: {
    companyName: 'BackWood Admin',
    logo: false,
    softwareBrothers: false
  }
};

const adminJs = new AdminJS(adminOptions);

const ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admin@example.com',
  password: process.env.ADMIN_PASSWORD || 'password',
};

const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
  adminJs,
  {
    authenticate: async (email, password) => {
      if (email === ADMIN.email && password === ADMIN.password) {
        return ADMIN;
      }
      return null;
    },
    cookieName: 'adminjs',
    cookiePassword: process.env.ADMIN_COOKIE_SECRET || 'session-key'
  }
);

export { adminJs, adminRouter };