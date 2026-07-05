import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SavedJobController } from '../../src/controllers/saved-job.controller';

function createResponseMock() {
  const res: any = {
    status: vi.fn(),
    json: vi.fn(),
  };

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);

  return res;
}

function createServiceMock() {
  return {
    saveJob: vi.fn(),
    getSavedJobs: vi.fn(),
    removeSavedJob: vi.fn(),
    isJobSaved: vi.fn(),
  };
}

describe('SavedJobController', () => {
  let service: ReturnType<typeof createServiceMock>;
  let controller: SavedJobController;

  beforeEach(() => {
    service = createServiceMock();
    controller = new SavedJobController(service as any);
  });

  it('returns 201 when saving a job succeeds', async () => {
    const savedJob = { id: 1, userId: 7, jobId: 'job-1' };
    service.saveJob.mockResolvedValue(savedJob);

    const req: any = { user: { id: 7 }, body: { jobId: 'job-1' } };
    const res = createResponseMock();

    await controller.saveJob(req, res);

    expect(service.saveJob).toHaveBeenCalledWith(7, 'job-1');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: savedJob });
  });

  it('returns 400 when jobId is missing', async () => {
    const req: any = { user: { id: 7 }, body: {} };
    const res = createResponseMock();

    await controller.saveJob(req, res);

    expect(service.saveJob).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'jobId is required',
    });
  });

  it('returns 404 when service throws NotFoundError', async () => {
    const error = new Error('Job not found');
    error.name = 'NotFoundError';
    service.saveJob.mockRejectedValue(error);

    const req: any = { user: { id: 7 }, body: { jobId: 'missing-job' } };
    const res = createResponseMock();

    await controller.saveJob(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Job not found' });
  });

  it('returns 409 when service throws ConflictError', async () => {
    const error = new Error('Job already saved');
    error.name = 'ConflictError';
    service.saveJob.mockRejectedValue(error);

    const req: any = { user: { id: 7 }, body: { jobId: 'job-1' } };
    const res = createResponseMock();

    await controller.saveJob(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Job already saved' });
  });

  it('returns saved jobs for the current user', async () => {
    const savedJobs = [{ id: 1, userId: 7, jobId: 'job-1', job: { id: 'job-1' } }];
    service.getSavedJobs.mockResolvedValue(savedJobs);

    const req: any = { user: { id: 7 } };
    const res = createResponseMock();

    await controller.getSavedJobs(req, res);

    expect(service.getSavedJobs).toHaveBeenCalledWith(7);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: savedJobs });
  });

  it('removes a saved job for the current user', async () => {
    service.removeSavedJob.mockResolvedValue({ removed: true });

    const req: any = { user: { id: 7 }, params: { jobId: 'job-1' } };
    const res = createResponseMock();

    await controller.removeSavedJob(req, res);

    expect(service.removeSavedJob).toHaveBeenCalledWith(7, 'job-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { removed: true },
    });
  });

  it('returns saved state for the current user and job', async () => {
    service.isJobSaved.mockResolvedValue(true);

    const req: any = { user: { id: 7 }, params: { jobId: 'job-1' } };
    const res = createResponseMock();

    await controller.isJobSaved(req, res);

    expect(service.isJobSaved).toHaveBeenCalledWith(7, 'job-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { saved: true },
    });
  });
});
