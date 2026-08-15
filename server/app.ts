import express from 'express';
import { AuthenticatedRequest, requireAuth } from './auth';
import { authRouter } from './routes/authRoutes';
import { attendanceRouter } from './routes/attendanceRoutes';
import { adminRouter } from './routes/adminRoutes';
import { schedulerRouter } from './routes/schedulerRoutes';
import { storageRouter } from './routes/storageRoutes';
import { sitesRepository } from './repositories/sitesRepository';
import { locationsRepository } from './repositories/locationsRepository';
import { employeesRepository } from './repositories/employeesRepository';

export function createExpressApp() {
  const app = express();

  // Middleware for JSON & urlencoded payloads (support up to 20MB for metadata/payloads)
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ limit: '20mb', extended: true }));

  // URL normalization: support direct calls and Netlify functions rewrites (e.g. /v1/* -> /api/v1/*)
  app.use((req, _res, next) => {
    if (req.url.startsWith('/.netlify/functions/api')) {
      req.url = req.url.replace('/.netlify/functions/api', '/api');
    } else if (req.url.startsWith('/v1/')) {
      req.url = '/api' + req.url;
    }
    next();
  });

  // Root Health Check
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // API Health Check
  app.get(['/api/health', '/health/api'], (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Milestone Consultancy Workforce Platform',
      architecture: 'Firebase Auth + Firestore Native + Netlify Functions',
      version: '6.0-production-netlify',
      serverTimeUTC: new Date().toISOString(),
      timezone: 'Asia/Kolkata',
    });
  });

  // Common Authenticated Sites Endpoint
  app.get('/api/v1/sites', requireAuth, async (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    try {
      if (user.role === 'admin') {
        const allSites = await sitesRepository.getAll();
        return res.json({ success: true, sites: allSites });
      }

      const emp = await employeesRepository.getById(user.employeeId);
      const assignedIds = emp?.assignedSiteIds || [];
      const allActive = await sitesRepository.getActive();
      const userSites = allActive.filter((s) => assignedIds.includes(s.siteId));
      return res.json({ success: true, sites: userSites });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Common Authenticated Locations Endpoint
  app.get('/api/v1/locations', requireAuth, async (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    try {
      if (user.role === 'admin') {
        const allLocations = await locationsRepository.getAll();
        return res.json({
          success: true,
          locations: allLocations.map((l) => ({
            ...l,
            id: l.locationId || l.id,
            name: l.locationName || l.name,
          })),
        });
      }

      const emp = await employeesRepository.getById(user.employeeId);
      const assignedSiteIds = emp?.assignedSiteIds || [];
      const activeLocations = await locationsRepository.getActive();
      const userLocations = activeLocations
        .filter((loc) => !loc.siteId || assignedSiteIds.includes(loc.siteId))
        .map((l) => ({
          ...l,
          id: l.locationId || l.id,
          name: l.locationName || l.name,
        }));

      return res.json({ success: true, locations: userLocations });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Mount API Subsystems
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/attendance', attendanceRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/scheduler', schedulerRouter);
  app.use('/api/v1/internal', schedulerRouter);
  app.use('/api/v1/storage', storageRouter);

  // 404 handler for unmatched API routes - guarantees API requests never return HTML fallback
  app.all(['/api/*', '/v1/*'], (req, res) => {
    res.status(404).json({
      success: false,
      error: 'API_ROUTE_NOT_FOUND',
      message: `The API endpoint ${req.method} ${req.path} was not found.`,
    });
  });

  // Global Error Handler for API routes
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/v1/')) {
      console.error('[Milestone API Error]', err);
      return res.status(err.status || 500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: err.message || 'Internal Server Error',
      });
    }
    next(err);
  });

  return app;
}
