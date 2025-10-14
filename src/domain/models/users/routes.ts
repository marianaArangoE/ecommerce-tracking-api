import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../../../application/middlewares/validate';

const router = Router();

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('email inválido'),
    body('password').isLength({ min: 8 }).withMessage('password mínimo 8')
  ],
  validate,
  (req: Request, res: Response) => {
    const { email } = req.body;

    const user = users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });

    // Mock tokens (no JWT real)
    const accessToken = `mock_access_${user.id}_${Date.now()}`;
    const refreshToken = `mock_refresh_${user.id}_${Date.now()}`;

    return res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified
      }
    });
  }
);
router.get('/', (_req: Request, res: Response) => 
  res.json({ items: users, total: users.length })
);

router.get('/:id',
  [param('id').notEmpty()],
  validate,
  (req: Request, res: Response) => {
    const u = users.find(x => x.id === req.params.id);
    if (!u) return res.status(404).json({ error: 'USER_NOT_FOUND' });
    res.json(u);
  }
);

router.post('/register',
  [
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('name').notEmpty()
  ],
  validate,
  (req: Request, res: Response) => {
    const id = `u${users.length+1}`;
    const newUser = {
      id,
      email: req.body.email,
      passwordHash: '***',
      name: req.body.name,
      role: 'USER',
      emailVerified: false,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    res.status(201).json(newUser);
  }
);

export default router;
