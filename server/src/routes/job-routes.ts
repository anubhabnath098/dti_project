import { Hono } from 'hono'
import { authMiddleware, employerMiddleware, workerMiddleware } from '../middlewares/authMiddleware.js'
import { createJobPost, fetchJobPostById, fetchJobPosts , deleteJobPost, editJobPost, applyForJob, getWorkersByJobId, updateApplicationStatus, getJobsAppliedByWorker, deleteJobApplication, checkJobApplication} from '../controllers/jobController.js'

const jobRoutes = new Hono()

jobRoutes.use('*', authMiddleware)
jobRoutes.post('/create', employerMiddleware, createJobPost)
//new0
jobRoutes.post('/delete/:jobId', employerMiddleware, deleteJobPost);
//new1
jobRoutes.patch('/edit', employerMiddleware, editJobPost)
//new2
jobRoutes.post('/apply', workerMiddleware, applyForJob);
//new3
jobRoutes.get('applied-jobs/:workerId',getJobsAppliedByWorker)
//new4
jobRoutes.get('/workers/:jobId', employerMiddleware, getWorkersByJobId)
//new5
jobRoutes.patch('/update-application', employerMiddleware, updateApplicationStatus);
//new6
jobRoutes.post('/application/delete', workerMiddleware, deleteJobApplication)

jobRoutes.post('/check-application', workerMiddleware, checkJobApplication);

jobRoutes.get('/all',fetchJobPosts)
jobRoutes.get('/job-post/:jobId',fetchJobPostById);

export default jobRoutes
