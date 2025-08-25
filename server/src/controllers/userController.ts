import type { Context } from "hono";
import admin from "../firebaseAdmin.js";
import { createRequire } from "module";
import { v4 as uuidv4 } from "uuid";
import type { IncomingMessage } from "http";
import { Readable } from "stream";
import { v2 as cloudinary } from "cloudinary";
import { config } from 'dotenv';
config();
const require = createRequire(import.meta.url);
const Busboy = require("busboy");

interface UserProfile {
  firstName: string;
  middleName?: string;
  lastName: string;
  phoneNumber: string;
  emailAddress: string;
  profilePhoto?: string; // URL to Firebase Storage
  residentialAddress: string;
  resume?: string; // URL to Firebase Storage
  profession: string;
  gender: string;
  summary?: string;
  createdAt?: FirebaseFirestore.FieldValue;
  updatedAt?: FirebaseFirestore.FieldValue;
}

/**
 * Creates a new user profile.
 * Expects a multipart/form-data request with:
 *  - Text fields: firstName, middleName, lastName, phoneNumber, emailAddress, residentialAddress, profession, gender, summary
 *  - File fields (optional): profilePhoto, resume
 *
 * If a profile for the given user ID already exists, it returns an error.
 */


// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
});


export const createUserProfileById = async (c: Context): Promise<Response> => {
  return new Promise<Response>(async (resolve) => {
    const contentType: string | undefined = c.req.header("content-type");
    if (!contentType || !contentType.includes("multipart/form-data")) {
      resolve(
        c.json({ error: "Content-Type must be multipart/form-data" }, 400)
      );
      return;
    }

    // Get user ID from URL parameter and check if profile exists
    const userId = c.req.param("id");
    if (!userId) {
      resolve(c.json({ error: "User ID not provided" }, 400));
      return;
    }
    const docRef = admin.firestore().collection("userProfiles").doc(userId);
    const existingDoc = await docRef.get();
    if (existingDoc.exists) {
      resolve(c.json({ error: "Profile already exists for this user." }, 400));
      return;
    }

    // Read request body
    const arrayBuffer = await c.req.arrayBuffer();
    const bodyBuffer = Buffer.from(arrayBuffer);
    const nodeReq = Readable.from(bodyBuffer);

    const bb = Busboy({ headers: c.req.header() as Record<string, string> });

    const fields: Record<string, string | undefined | null> = {};
    const files: Record<
      string,
      { buffer: Buffer; filename: string; mimetype: string }
    > = {};
    let fileTypeError: string | null = null;

    bb.on("field", (fieldname: string, val: string) => {
      fields[fieldname] = val;
    });

    bb.on(
      "file",
      (
        fieldname: string,
        file: any,
        filename: any,
        encoding: string,
        mimeType: string
      ) => {
        const safeFilename: string =
          typeof filename?.filename === "string"
            ? filename.filename
            : typeof filename === "string"
            ? filename
            : "unknown_file";

        // Validate resume file
        if (fieldname === "resume") {
          const isValidPDF =
            safeFilename.toLowerCase().endsWith(".pdf") ||
            (mimeType &&
              (mimeType.toLowerCase() === "application/pdf" ||
                mimeType.toLowerCase() === "application/x-pdf" ||
                mimeType.toLowerCase() === "application/acrobat" ||
                mimeType.toLowerCase() === "applications/vnd.pdf" ||
                mimeType.toLowerCase() === "text/pdf" ||
                mimeType.toLowerCase() === "text/x-pdf"));
          if (!isValidPDF) {
            fileTypeError = "Resume must be a PDF file.";
            file.resume();
            return;
          }
        }

        // Validate profilePhoto file
        if (fieldname === "profilePhoto") {
          const validImageTypes = ["image/jpeg", "image/jpg", "image/png"];
          const isValidImage =
            (mimeType && validImageTypes.includes(mimeType.toLowerCase())) ||
            /\.(jpg|jpeg|png)$/i.test(safeFilename);
          if (!isValidImage) {
            fileTypeError = "Profile photo must be a JPG or PNG image.";
            file.resume();
            return;
          }
        }

        const chunks: Buffer[] = [];
        file.on("data", (data: Buffer) => {
          chunks.push(data);
        });
        file.on("end", () => {
          files[fieldname] = {
            buffer: Buffer.concat(chunks),
            filename: safeFilename,
            mimetype: mimeType || "",
          };
        });
      }
    );

    bb.on("finish", async () => {
      if (fileTypeError) {
        resolve(c.json({ error: fileTypeError }, 400));
        return;
      }
      try {
        // Upload helper
        const uploadToCloudinary = (
          file: { buffer: Buffer; filename: string; mimetype: string },
          folder: string
        ): Promise<string> => {
          return new Promise((resolveUpload, rejectUpload) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder, resource_type: "auto" }, // auto lets PDFs + images work
              (err, result) => {
                if (err) rejectUpload(err);
                else resolveUpload(result?.secure_url || "");
              }
            );
            stream.end(file.buffer);
          });
        };

        // Process profile photo if provided
        if (files.profilePhoto) {
          fields.profilePhoto = await uploadToCloudinary(
            files.profilePhoto,
            "user_profiles/photos"
          );
        }

        // Process resume if provided
        if (files.resume) {
          fields.resume = await uploadToCloudinary(
            files.resume,
            "user_profiles/resumes"
          );
        }

        // Build the user profile object
        const userProfile: UserProfile = {
          firstName: fields?.firstName || "",
          middleName: fields?.middleName || "",
          lastName: fields?.lastName || "",
          phoneNumber: fields?.phoneNumber || "",
          emailAddress: fields?.emailAddress || "",
          profilePhoto: fields?.profilePhoto || "",
          residentialAddress: fields?.residentialAddress || "",
          resume: fields?.resume || "",
          profession: fields?.profession || "",
          gender: fields?.gender || "",
          summary: fields?.summary || "",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await docRef.set(userProfile);
        resolve(
          c.json(
            { message: "Profile created successfully", profile: userProfile },
            201
          )
        );
      } catch (error: any) {
        console.error("Error creating profile:", error);
        resolve(
          c.json({ error: error.message || "Error creating profile" }, 500)
        );
      }
    });

    nodeReq.pipe(bb);
  });
};

/**
 * Updates an existing user profile.
 * Expects a multipart/form-data request (with text and/or file fields) to update.
 * Only provided fields will be updated.
 *
 * If new files are uploaded, the previous file (if any) will be deleted from Firebase Storage.
 */
export const updateUserProfileById = async (c: Context): Promise<Response> => {
  return new Promise<Response>(async (resolve) => {
    const contentType: string | undefined = c.req.header("content-type");
    if (!contentType || !contentType.includes("multipart/form-data")) {
      resolve(
        c.json({ error: "Content-Type must be multipart/form-data" }, 400)
      );
      return;
    }

    const userId = c.req.param("id");
    if (!userId) {
      resolve(c.json({ error: "User ID not provided" }, 400));
      return;
    }

    const docRef = admin.firestore().collection("userProfiles").doc(userId);
    const existingDoc = await docRef.get();
    const existingProfile = existingDoc.exists ? existingDoc.data() : {};

    const arrayBuffer = await c.req.arrayBuffer();
    const bodyBuffer = Buffer.from(arrayBuffer);
    const nodeReq = Readable.from(bodyBuffer);

    const bb = Busboy({ headers: c.req.header() as Record<string, string> });

    const fields: Record<string, string> = {};
    const files: Record<
      string,
      { buffer: Buffer; filename: string; mimetype: string }
    > = {};
    let fileTypeError: string | null = null;

    bb.on("field", (fieldname: string, val: string) => {
      fields[fieldname] = val;
    });

    bb.on(
      "file",
      (
        fieldname: string,
        file: any,
        filename: any,
        encoding: string,
        mimetype: string
      ) => {
        const safeFilename: string =
          typeof filename?.filename === "string"
            ? filename.filename
            : typeof filename === "string"
            ? filename
            : "unknown_file";

        if (fieldname === "resume") {
          const isValidPDF =
            safeFilename.toLowerCase().endsWith(".pdf") ||
            (mimetype &&
              (mimetype.toLowerCase() === "application/pdf" ||
                mimetype.toLowerCase() === "application/x-pdf" ||
                mimetype.toLowerCase() === "application/acrobat" ||
                mimetype.toLowerCase() === "applications/vnd.pdf" ||
                mimetype.toLowerCase() === "text/pdf" ||
                mimetype.toLowerCase() === "text/x-pdf"));
          if (!isValidPDF) {
            fileTypeError = "Resume must be a PDF file.";
            file.resume();
            return;
          }
        }
        if (fieldname === "profilePhoto") {
          const validImageTypes = ["image/jpeg", "image/jpg", "image/png"];
          const isValidImage =
            (mimetype && validImageTypes.includes(mimetype.toLowerCase())) ||
            /\.(jpg|jpeg|png)$/i.test(safeFilename);
          if (!isValidImage) {
            fileTypeError = "Profile photo must be a JPG or PNG image.";
            file.resume();
            return;
          }
        }

        const chunks: Buffer[] = [];
        file.on("data", (data: Buffer) => {
          chunks.push(data);
        });
        file.on("end", () => {
          files[fieldname] = {
            buffer: Buffer.concat(chunks),
            filename: safeFilename,
            mimetype: mimetype || "",
          };
        });
      }
    );

    bb.on("finish", async () => {
      if (fileTypeError) {
        resolve(c.json({ error: fileTypeError }, 400));
        return;
      }
      try {
        // Upload helper for Cloudinary
        const uploadToCloudinary = (
          file: { buffer: Buffer; filename: string; mimetype: string },
          folder: string
        ): Promise<string> => {
          return new Promise((resolveUpload, rejectUpload) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder, resource_type: "auto" },
              (err, result) => {
                if (err) rejectUpload(err);
                else resolveUpload(result?.secure_url || "");
              }
            );
            stream.end(file.buffer);
          });
        };

        // Process new profilePhoto if provided
        if (files.profilePhoto) {
          fields.profilePhoto = await uploadToCloudinary(
            files.profilePhoto,
            "user_profiles/photos"
          );
        }

        // Process new resume if provided
        if (files.resume) {
          fields.resume = await uploadToCloudinary(
            files.resume,
            "user_profiles/resumes"
          );
        }

        fields.updatedAt =
          admin.firestore.FieldValue.serverTimestamp() as unknown as string;

        await docRef.update(fields);

        resolve(
          c.json({
            message: "Profile updated successfully",
            updatedFields: fields,
          })
        );
      } catch (error: any) {
        console.error("Error updating profile:", error);
        resolve(
          c.json({ error: error.message || "Error updating profile" }, 500)
        );
      }
    });

    nodeReq.pipe(bb);
  });
};

/**
 * Retrieves the user profile from Firestore.
 * Expects a user ID in the URL parameter.
 */
export const getUserProfileById = async (c: Context): Promise<Response> => {
  try {
    const userId = c.req.param("id");
    if (!userId) {
      return c.json({ error: "User ID not provided" }, 400);
    }
    const docRef = admin.firestore().collection("userProfiles").doc(userId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return c.json({ error: "Profile not found" }, 404);
    }
    return c.json(doc.data());
  } catch (error: any) {
    console.error("Error fetching profile:", error);
    return c.json({ error: error.message || "Error fetching profile" }, 500);
  }
};

export const getUserRole = async (c: Context): Promise<Response> => {
  try {
    const { userId } = await c.req.json();
    if (!userId) {
      return c.json({ error: "Missing field: userId is required." }, 400);
    }

    // Retrieve user details from Firebase Auth
    const userRecord = await admin.auth().getUser(userId);

    // Get custom claims (where role is stored)
    const role = userRecord.customClaims?.role;

    if (!role) {
      return c.json({ error: "Role not found for this user." }, 404);
    }

    return c.json({ role }, 200);
  } catch (error: any) {
    console.error("Error fetching user role:", error);
    return c.json({ error: error.message || "Internal server error" }, 500);
  }
};