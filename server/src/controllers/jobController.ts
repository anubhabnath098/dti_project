import type { Context } from 'hono';
import admin from '../firebaseAdmin.js';
import { v4 as uuidv4 } from 'uuid';
import Busboy from 'busboy';
import { Readable } from 'stream';



export const createJobPost = async (c: Context): Promise<Response> => {
  return new Promise<Response>(async (resolve) => {
    // Check for multipart/form-data content type
    const contentType: string | undefined = c.req.header('content-type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      resolve(c.json({ error: 'Content-Type must be multipart/form-data' }, 400));
      return;
    }

    // Generate unique job post ID and Firestore document reference
    const jobPostId = uuidv4();
    const jobPostsRef = admin.firestore().collection('jobPosts').doc(jobPostId);

    // Read the request body into a buffer and create a stream
    const arrayBuffer = await c.req.arrayBuffer();
    const bodyBuffer = Buffer.from(arrayBuffer);
    const nodeReq = Readable.from(bodyBuffer);

    // Set up Busboy to parse multipart/form-data
    const bb = Busboy({ headers: c.req.header() as Record<string, string> });
    const fields: Record<string, any> = {};

    bb.on('field', (fieldname: string, val: string) => {
      fields[fieldname] = val;
    });

    bb.on('finish', async () => {
      try {
        // Only these fields are required:
        const { employer_id, job_title, type_of_work } = fields;
        if (!employer_id || !job_title || !type_of_work) {
          resolve(
            c.json(
              { error: 'Missing required fields: employer_id, job_title, and type_of_work are required' },
              400
            )
          );
          return;
        }

        // Optional fields with defaults if not provided
        const employer_name = fields.employer_name || '';
        const place_of_work = fields.place_of_work || '';
        const city = fields.city || '';
        const state = fields.state || '';
        const district = fields.district || '';
        const pincode = fields.pincode || '';
        const vacancies = fields.vacancies ? Number(fields.vacancies) : 0;
        const special_woman_provision = fields.special_woman_provision === 'true';
        const special_transgender_provision = fields.special_transgender_provision === 'true';
        const special_disability_provision = fields.special_disability_provision === 'true';
        const wage = fields.wage || '';
        const hours_per_week = fields.hours_per_week ? Number(fields.hours_per_week) : 0;
        const job_duration = fields.job_duration || '';
        const start_time = fields.start_time || '';
        const end_time = fields.end_time || '';
        const job_role_description = fields.job_role_description || '';

        // Construct the job post data object
        const jobPostData = {
          id: jobPostId,
          employer_id,
          employer_name,
          job_title,
          place_of_work,
          location: {
            city,
            state,
            district,
            pincode
          },
          vacancies,
          special_woman_provision,
          special_transgender_provision,
          special_disability_provision,
          wage,
          hours_per_week,
          job_duration,
          start_time,
          end_time,
          type_of_work,
          job_role_description,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Save the job post to Firestore
        await jobPostsRef.set(jobPostData);

        resolve(
          c.json(
            {
              message: 'Job post created successfully',
              jobPost: jobPostData
            },
            201
          )
        );
      } catch (error: any) {
        console.error('Error creating job post:', error);
        resolve(c.json({ error: error.message || 'Error creating job post' }, 500));
      }
    });

    // Pipe the request to Busboy for processing
    nodeReq.pipe(bb);
  });
};


export const deleteJobPost = async (c: Context): Promise<Response> => {
  return new Promise<Response>(async (resolve) => {
    try {
      // jobId from path param, employer_id from query param
      const jobId = c.req.param("jobId");
      const employer_id = c.req.query("employer_id");

      if (!jobId || !employer_id) {
        resolve(
          c.json(
            { error: "Missing required fields: jobId (path param) and employer_id (query param) are required" },
            400
          )
        );
        return;
      }

      const jobPostRef = admin.firestore().collection("jobPosts").doc(jobId);
      const jobDoc = await jobPostRef.get();

      if (!jobDoc.exists) {
        resolve(c.json({ error: "Job post not found" }, 404));
        return;
      }

      const jobData = jobDoc.data();

      // Check if employer_id matches
      if (jobData?.employer_id !== employer_id) {
        resolve(
          c.json(
            { error: "Unauthorized: employer_id does not match job post owner" },
            403
          )
        );
        return;
      }

      // Delete the job post
      await jobPostRef.delete();

      resolve(
        c.json(
          { message: "Job post deleted successfully", jobId },
          200
        )
      );
    } catch (error: any) {
      console.error("Error deleting job post:", error);
      resolve(c.json({ error: error.message || "Error deleting job post" }, 500));
    }
  });
};

export const editJobPost = async (c: Context): Promise<Response> => {
  return new Promise<Response>(async (resolve) => {
    // Check for multipart/form-data
    const contentType: string | undefined = c.req.header("content-type");
    if (!contentType || !contentType.includes("multipart/form-data")) {
      resolve(c.json({ error: "Content-Type must be multipart/form-data" }, 400));
      return;
    }

    // Read the request body
    const arrayBuffer = await c.req.arrayBuffer();
    const bodyBuffer = Buffer.from(arrayBuffer);
    const nodeReq = Readable.from(bodyBuffer);

    // Parse multipart with Busboy
    const bb = Busboy({ headers: c.req.header() as Record<string, string> });
    const fields: Record<string, any> = {};

    bb.on("field", (fieldname: string, val: string) => {
      fields[fieldname] = val;
    });

    bb.on("finish", async () => {
      try {
        const { jobId, employer_id } = fields;

        if (!jobId || !employer_id) {
          resolve(
            c.json({ error: "Missing required fields: jobId and employer_id are required" }, 400)
          );
          return;
        }

        const jobPostRef = admin.firestore().collection("jobPosts").doc(jobId);
        const jobDoc = await jobPostRef.get();

        if (!jobDoc.exists) {
          resolve(c.json({ error: "Job post not found" }, 404));
          return;
        }

        const jobData = jobDoc.data();

        if (jobData?.employer_id !== employer_id) {
          resolve(
            c.json(
              { error: "Unauthorized: employer_id does not match job post owner" },
              403
            )
          );
          return;
        }

        // Prepare update fields (only provided ones will be updated)
        const updateData: Record<string, any> = {};

        const optionalFields = [
          "employer_name",
          "job_title",
          "place_of_work",
          "city",
          "state",
          "district",
          "pincode",
          "vacancies",
          "special_woman_provision",
          "special_transgender_provision",
          "special_disability_provision",
          "wage",
          "hours_per_week",
          "job_duration",
          "start_time",
          "end_time",
          "type_of_work",
          "job_role_description"
        ];

        for (const field of optionalFields) {
          if (fields[field] !== undefined) {
            if (
              ["vacancies", "hours_per_week"].includes(field)
            ) {
              updateData[field] = Number(fields[field]);
            } else if (
              ["special_woman_provision", "special_transgender_provision", "special_disability_provision"].includes(field)
            ) {
              updateData[field] = fields[field] === "true";
            } else {
              updateData[field] = fields[field];
            }
          }
        }

        // Handle nested location update
        if (
          fields.city !== undefined ||
          fields.state !== undefined ||
          fields.district !== undefined ||
          fields.pincode !== undefined
        ) {
          updateData["location"] = {
            city: fields.city ?? jobData?.location?.city ?? "",
            state: fields.state ?? jobData?.location?.state ?? "",
            district: fields.district ?? jobData?.location?.district ?? "",
            pincode: fields.pincode ?? jobData?.location?.pincode ?? ""
          };
        }

        updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        await jobPostRef.update(updateData);

        resolve(
          c.json(
            {
              message: "Job post updated successfully",
              jobId,
              updatedFields: updateData
            },
            200
          )
        );
      } catch (error: any) {
        console.error("Error updating job post:", error);
        resolve(c.json({ error: error.message || "Error updating job post" }, 500));
      }
    });

    nodeReq.pipe(bb);
  });
};


export const applyForJob = async (c: Context): Promise<Response> => {
  return new Promise<Response>(async (resolve) => {
    // Check content type
    const contentType: string | undefined = c.req.header("content-type");
    if (!contentType || !contentType.includes("multipart/form-data")) {
      resolve(c.json({ error: "Content-Type must be multipart/form-data" }, 400));
      return;
    }

    // Read body
    const arrayBuffer = await c.req.arrayBuffer();
    const bodyBuffer = Buffer.from(arrayBuffer);
    const nodeReq = Readable.from(bodyBuffer);

    // Parse form
    const bb = Busboy({ headers: c.req.header() as Record<string, string> });
    const fields: Record<string, any> = {};

    bb.on("field", (fieldname: string, val: string) => {
      fields[fieldname] = val;
    });

    bb.on("finish", async () => {
      try {
        const { worker_id, jobId } = fields;

        if (!worker_id || !jobId) {
          resolve(
            c.json(
              { error: "Missing required fields: worker_id and jobId are required" },
              400
            )
          );
          return;
        }

        // 🔎 Check if worker has already applied for this job
        const existingAppSnap = await admin
          .firestore()
          .collection("jobApplications")
          .where("worker_id", "==", worker_id)
          .where("jobId", "==", jobId)
          .limit(1)
          .get();

        if (!existingAppSnap.empty) {
          resolve(
            c.json(
              { error: "You have already applied for this job." },
              400
            )
          );
          return;
        }

        // 🚀 Create new application
        const applicationId = uuidv4();
        const applicationsRef = admin.firestore().collection("jobApplications").doc(applicationId);

        const applicationData = {
          id: applicationId,
          worker_id,
          jobId,
          status: "pending", // default
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await applicationsRef.set(applicationData);

        resolve(
          c.json(
            {
              message: "Application submitted successfully",
              application: applicationData,
            },
            201
          )
        );
      } catch (error: any) {
        console.error("Error applying for job:", error);
        resolve(c.json({ error: error.message || "Error applying for job" }, 500));
      }
    });

    nodeReq.pipe(bb);
  });
};

export const checkJobApplication = async (c: Context): Promise<Response> => {
  return new Promise<Response>(async (resolve) => {
    try {
      const { worker_id, jobId } = await c.req.json();

      if (!worker_id || !jobId) {
        resolve(
          c.json(
            { error: "Missing required fields: worker_id and jobId are required" },
            400
          )
        );
        return;
      }

      // 🔎 Check if worker already applied
      const existingAppSnap = await admin
        .firestore()
        .collection("jobApplications")
        .where("worker_id", "==", worker_id)
        .where("jobId", "==", jobId)
        .limit(1)
        .get();

      if (!existingAppSnap.empty) {
        resolve(
          c.json(
            { exists: true, message: "Application already exists for this worker and job" },
            200
          )
        );
        return;
      }

      resolve(
        c.json(
          { exists: false, message: "No application found for this worker and job" },
          200
        )
      );
    } catch (error: any) {
      console.error("Error checking job application:", error);
      resolve(c.json({ error: error.message || "Error checking job application" }, 500));
    }
  });
};

export const deleteJobApplication = async (c: Context): Promise<Response> => {
  return new Promise<Response>(async (resolve) => {
    // ✅ Check for multipart/form-data
    const contentType: string | undefined = c.req.header("content-type");
    if (!contentType || !contentType.includes("multipart/form-data")) {
      resolve(c.json({ error: "Content-Type must be multipart/form-data" }, 400));
      return;
    }

    // ✅ Read request body
    const arrayBuffer = await c.req.arrayBuffer();
    const bodyBuffer = Buffer.from(arrayBuffer);
    const nodeReq = Readable.from(bodyBuffer);

    // ✅ Parse fields with Busboy
    const bb = Busboy({ headers: c.req.header() as Record<string, string> });
    const fields: Record<string, any> = {};

    bb.on("field", (fieldname: string, val: string) => {
      fields[fieldname] = val;
    });

    bb.on("finish", async () => {
      try {
        const { worker_id, jobId } = fields;

        if (!worker_id || !jobId) {
          resolve(
            c.json(
              { error: "Missing required fields: worker_id and jobId are required" },
              400
            )
          );
          return;
        }

        // ✅ Find the application by worker_id + jobId
        const applicationsSnapshot = await admin
          .firestore()
          .collection("jobApplications")
          .where("worker_id", "==", worker_id)
          .where("jobId", "==", jobId)
          .limit(1)
          .get();

        if (applicationsSnapshot.empty) {
          resolve(c.json({ error: "No application found for this worker and job" }, 404));
          return;
        }

        // ✅ Delete the found application
        const appDoc = applicationsSnapshot.docs[0];
        await admin.firestore().collection("jobApplications").doc(appDoc.id).delete();

        resolve(
          c.json(
            {
              message: "Application deleted successfully",
              worker_id,
              jobId,
              applicationId: appDoc.id,
            },
            200
          )
        );
      } catch (error: any) {
        console.error("Error deleting application:", error);
        resolve(c.json({ error: error.message || "Error deleting application" }, 500));
      }
    });

    nodeReq.pipe(bb);
  });
};

export const getJobsAppliedByWorker = async (c: Context): Promise<Response> => {
  return new Promise<Response>(async (resolve) => {
    try {
      const workerId = c.req.param("workerId"); // take from path param
      if (!workerId) {
        resolve(c.json({ error: "workerId is required" }, 400));
        return;
      }

      // 1️⃣ Get all applications for this worker
      const applicationsSnapshot = await admin
        .firestore()
        .collection("jobApplications")
        .where("worker_id", "==", workerId)
        .get();

      if (applicationsSnapshot.empty) {
        resolve(c.json({ jobs: [] }, 200));
        return;
      }

      const jobs: any[] = [];

      // 2️⃣ Fetch job details for each application
      for (const doc of applicationsSnapshot.docs) {
        const appData = doc.data();
        const jobId = appData.jobId;

        if (!jobId) continue;

        const jobDoc = await admin
          .firestore()
          .collection("jobPosts")
          .doc(jobId)
          .get();

        if (jobDoc.exists) {
          jobs.push({
            applicationId: appData.id,
            status: appData.status,
            appliedAt: appData.createdAt,
            ...jobDoc.data(), // all job details
          });
        }
      }


      resolve(
        c.json(
          {
            workerId,
            totalApplications: jobs.length,
            jobs,
          },
          200
        )
      );
    } catch (error: any) {
      console.error("Error fetching jobs for worker:", error);
      resolve(
        c.json(
          { error: error.message || "Error fetching jobs for worker" },
          500
        )
      );
    }
  });
};

export const updateApplicationStatus = async (c: Context): Promise<Response> => {
  return new Promise<Response>(async (resolve) => {
    // Check for multipart/form-data
    const contentType: string | undefined = c.req.header("content-type");
    if (!contentType || !contentType.includes("multipart/form-data")) {
      resolve(c.json({ error: "Content-Type must be multipart/form-data" }, 400));
      return;
    }

    // Read request body
    const arrayBuffer = await c.req.arrayBuffer();
    const bodyBuffer = Buffer.from(arrayBuffer);
    const nodeReq = Readable.from(bodyBuffer);

    // Parse multipart
    const bb = Busboy({ headers: c.req.header() as Record<string, string> });
    const fields: Record<string, any> = {};

    bb.on("field", (fieldname: string, val: string) => {
      fields[fieldname] = val;
    });

    bb.on("finish", async () => {
      try {
        const { applicationId, status } = fields;

        if (!applicationId || !status) {
          resolve(
            c.json(
              { error: "Missing required fields: applicationId and status are required" },
              400
            )
          );
          return;
        }

        // Validate status
        const validStatuses = ["pending", "accepted", "rejected"];
        if (!validStatuses.includes(status)) {
          resolve(
            c.json(
              { error: "Invalid status. Must be one of: pending, accepted, rejected" },
              400
            )
          );
          return;
        }

        const applicationRef = admin.firestore().collection("jobApplications").doc(applicationId);
        const applicationDoc = await applicationRef.get();

        if (!applicationDoc.exists) {
          resolve(c.json({ error: "Application not found" }, 404));
          return;
        }

        await applicationRef.update({
          status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        resolve(
          c.json(
            {
              message: "Application status updated successfully",
              applicationId,
              newStatus: status,
            },
            200
          )
        );
      } catch (error: any) {
        console.error("Error updating application status:", error);
        resolve(c.json({ error: error.message || "Error updating application status" }, 500));
      }
    });

    nodeReq.pipe(bb);
  });
};

export const getWorkersByJobId = async (c: Context): Promise<Response> => {
  return new Promise<Response>(async (resolve) => {
    try {
      const jobId = c.req.param("jobId"); // get from path param

      if (!jobId) {
        resolve(c.json({ error: "Job ID is required" }, 400));
        return;
      }

      // 1️⃣ Get all applications for this job
      const applicationsSnapshot = await admin
        .firestore()
        .collection("jobApplications")
        .where("jobId", "==", jobId)
        .get();

      if (applicationsSnapshot.empty) {
        resolve(c.json({ workers: [] }, 200));
        return;
      }

      const workers: any[] = [];

      // 2️⃣ For each application, get the worker's profile
      for (const doc of applicationsSnapshot.docs) {
        const appData = doc.data();
        const workerId = appData.worker_id;

        if (!workerId) continue;

        const userDoc = await admin
          .firestore()
          .collection("userProfiles")
          .doc(workerId)
          .get();

        if (userDoc.exists) {
          workers.push({
            applicationId: appData.id,
            status: appData.status,
            appliedAt: appData.createdAt,
            ...userDoc.data(),
          });
        }
      }


      resolve(
        c.json(
          {
            jobId,
            totalApplicants: workers.length,
            workers,
          },
          200
        )
      );
    } catch (error: any) {
      console.error("Error fetching workers for job:", error);
      resolve(
        c.json(
          { error: error.message || "Error fetching workers for job" },
          500
        )
      );
    }
  });
};

export const fetchJobPosts = async (c: Context): Promise<Response> => {
  try {
    // Retrieve query parameters using the query() method
    const employer_id = c.req.query('employer_id');
    const type_of_work = c.req.query('type_of_work');
    const limitStr = c.req.query('limit');

    // Start with a base query on the "jobPosts" collection
    let query: FirebaseFirestore.Query = admin.firestore().collection('jobPosts');

    // Filter by employer_id if provided
    if (employer_id) {
      query = query.where('employer_id', '==', employer_id);
    }

    // Filter by type_of_work if provided
    if (type_of_work) {
      query = query.where('type_of_work', '==', type_of_work);
    }

    // Apply limit if provided and valid
    if (limitStr) {
      const limitNumber = Number(limitStr);
      if (!isNaN(limitNumber)) {
        query = query.limit(limitNumber);
      }
    }

    // Execute the query and collect results
    const snapshot = await query.get();
    const jobPosts: any[] = [];
    snapshot.forEach((doc) => {
      jobPosts.push(doc.data());
    });

    return c.json({ jobPosts }, 200);
  } catch (error: any) {
    console.error('Error fetching job posts:', error);
    return c.json({ error: error.message || 'Error fetching job posts' }, 500);
  }
};

export const fetchJobPostById = async (c: Context): Promise<Response> => {
  try {
    // Retrieve the job post ID from the route parameters
    const jobPostId = c.req.param('jobId');
    if (!jobPostId) {
      return c.json({ error: "Job post id is required" }, 400);
    }

    // Get a reference to the specific job post document
    const docRef = admin.firestore().collection('jobPosts').doc(jobPostId);
    const docSnapshot = await docRef.get();

    // Check if the document exists
    if (!docSnapshot.exists) {
      return c.json({ error: "Job post not found" }, 404);
    }

    // Return the job post data
    return c.json({ jobPost: docSnapshot.data() }, 200);
  } catch (error: any) {
    console.error('Error fetching job post:', error);
    return c.json({ error: error.message || 'Error fetching job post' }, 500);
  }
};

export interface JobPost {
  id: string;
  employer_id: string;
  job_title: string;
  type_of_work: string;
  employer_name?: string;
  place_of_work?: string;
  location?: {
    city?: string;
    state?: string;
    district?: string;
    pincode?: string;
  };
  vacancies?: number;
  special_woman_provision?: boolean;
  special_transgender_provision?: boolean;
  special_disability_provision?: boolean;
  wage?: string;
  hours_per_week?: number;
  job_duration?: string;
  start_time?: string;
  end_time?: string;
  job_role_description?: string;
  createdAt?: FirebaseFirestore.FieldValue;
  updatedAt?: FirebaseFirestore.FieldValue;
}

  
  