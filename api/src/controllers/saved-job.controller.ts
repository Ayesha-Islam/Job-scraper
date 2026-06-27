import { Request, Response } from 'express';
import { SavedJobService } from '../services/saved-job.service';

export class SavedJobController {
  constructor(private savedJobService: SavedJobService) {}

  async saveJob(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { jobId } = req.body;

      if (!jobId || typeof jobId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'jobId is required',
        });
      }

      const savedJob = await this.savedJobService.saveJob(userId, jobId);

      return res.status(201).json({
        success: true,
        data: savedJob,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'NotFoundError') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }

      if (error instanceof Error && error.name === 'ConflictError') {
        return res.status(409).json({
          success: false,
          error: error.message,
        });
      }

      console.error('Save Job Error:', error);

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async getSavedJobs(req: Request, res: Response) {
    try {
      const savedJobs = await this.savedJobService.getSavedJobs(req.user!.id);

      return res.status(200).json({
        success: true,
        data: savedJobs,
      });
    } catch (error) {
      console.error('Get Saved Jobs Error:', error);

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async removeSavedJob(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { jobId } = req.params;

      await this.savedJobService.removeSavedJob(userId, jobId);

      return res.status(200).json({
        success: true,
        data: {
          removed: true,
        },
      });
    } catch (error) {
      console.error('Remove Saved Job Error:', error);

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async isJobSaved(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { jobId } = req.params;

      const saved = await this.savedJobService.isJobSaved(userId, jobId);

      return res.status(200).json({
        success: true,
        data: {
          saved,
        },
      });
    } catch (error) {
      console.error('Check Saved Job Error:', error);

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}