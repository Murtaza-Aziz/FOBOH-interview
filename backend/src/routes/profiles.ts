/**
 * Pricing profile CRUD.
 *
 * createdAt and updatedAt are ALWAYS set by the server.
 * The client never sends them; the Zod schema doesn't include them.
 */

import { Router } from 'express';
import { profilesRepo } from '../store.js';
import type { PricingProfile } from '../types.js';
import { CreateProfileSchema, UpdateProfileSchema, validate } from '../validation.js';

export const profilesRouter = Router();

profilesRouter.get('/', (_req, res) => {
  res.json(profilesRepo.list());
});

profilesRouter.get('/:id', (req, res) => {
  const profile = profilesRepo.get(req.params['id']!);
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }
  res.json(profile);
});

profilesRouter.post('/', (req, res, next) => {
  try {
    const body = validate(CreateProfileSchema, req.body);
    const now = new Date().toISOString();
    const profile: PricingProfile = {
      ...body,
      priority: body.priority ?? 0,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    profilesRepo.upsert(profile);
    res.status(201).json(profile);
  } catch (err) {
    next(err);
  }
});

profilesRouter.put('/:id', (req, res, next) => {
  try {
    const existing = profilesRepo.get(req.params['id']!);
    if (!existing) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    const body = validate(UpdateProfileSchema, req.body);
    const updated: PricingProfile = {
      ...body,
      priority: body.priority ?? 0,
      id: existing.id,
      createdAt: existing.createdAt, // original creation time is preserved
      updatedAt: new Date().toISOString(),
    };
    profilesRepo.upsert(updated);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

profilesRouter.delete('/:id', (req, res) => {
  const deleted = profilesRepo.delete(req.params['id']!);
  if (!deleted) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }
  res.status(204).send();
});
