import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

export interface UploadResult {
  downloadURL: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  storagePath: string;
  isFirebaseStorage: boolean;
}

export const storageService = {
  /**
   * Upload any file to Firebase Storage with real-time progress callback.
   * Target path: sigae/{folder}/{timestamp}_{sanitizedName}
   */
  async uploadFile(
    file: File,
    folder: string = 'general',
    onProgress?: (percent: number) => void
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `sigae/${folder}/${timestamp}_${sanitizedName}`;

    try {
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          system: 'SIGAE_BOLIVIA',
        },
      });

      return new Promise<UploadResult>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          snapshot => {
            if (snapshot.totalBytes > 0 && onProgress) {
              const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              onProgress(progress);
            }
          },
          error => {
            console.warn('[SIGAE Storage] Firebase Storage direct upload notice:', error.code, error.message);
            // If storage bucket is in production mode with strict rules, or CORS issue
            // Provide data URL fallback so user can still preview and work seamlessly
            try {
              const reader = new FileReader();
              reader.onload = () => {
                const dataUrl = reader.result as string;
                resolve({
                  downloadURL: dataUrl,
                  fileName: file.name,
                  fileSize: file.size,
                  fileType: file.type,
                  storagePath,
                  isFirebaseStorage: false,
                });
              };
              reader.onerror = () => reject(error);
              reader.readAsDataURL(file);
            } catch (fallbackErr) {
              reject(error);
            }
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              if (onProgress) onProgress(100);
              console.log('[SIGAE Storage] Archivo subido con éxito a Firebase Storage:', downloadURL);
              resolve({
                downloadURL,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                storagePath,
                isFirebaseStorage: true,
              });
            } catch (urlError) {
              console.warn('[SIGAE Storage] getDownloadURL notice:', urlError);
              const objectUrl = URL.createObjectURL(file);
              resolve({
                downloadURL: objectUrl,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                storagePath,
                isFirebaseStorage: false,
              });
            }
          }
        );
      });
    } catch (err: any) {
      console.warn('[SIGAE Storage] Error initializing upload to Firebase Storage:', err);
      const objectUrl = URL.createObjectURL(file);
      return {
        downloadURL: objectUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        storagePath,
        isFirebaseStorage: false,
      };
    }
  },

  /**
   * Upload an official circular attachment or memo issued by Dirección
   */
  async uploadCircularAttachment(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<UploadResult> {
    return this.uploadFile(file, 'circulars', onProgress);
  },

  /**
   * Upload academic documents for a teacher (Título, RDA, Certificados)
   */
  async uploadTeacherDocument(
    teacherId: string,
    file: File,
    docType: string = 'documento',
    onProgress?: (percent: number) => void
  ): Promise<UploadResult> {
    return this.uploadFile(file, `teachers/${teacherId}/${docType}`, onProgress);
  },

  /**
   * Upload institutional school logo or official seal
   */
  async uploadSchoolLogo(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<UploadResult> {
    return this.uploadFile(file, 'institution/logo', onProgress);
  },

  /**
   * Upload an official academic submission document (Excel / PDF) for Dirección
   * Target: academic-submissions/{schoolId}/{year}/{submissionId}/{filename}
   */
  async uploadAcademicSubmissionDoc(
    schoolId: string,
    year: string,
    submissionId: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<UploadResult> {
    return this.uploadFile(file, `academic-submissions/${schoolId}/${year}/${submissionId}`, onProgress);
  },

  /**
   * Upload gradebook import by teacher
   * Target: gradebook-imports/{teacherUid}/{filename}
   */
  async uploadGradebookImport(
    teacherUid: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<UploadResult> {
    return this.uploadFile(file, `gradebook-imports/${teacherUid}`, onProgress);
  },

  /**
   * Upload schedule import by Dirección
   * Target: schedule-imports/{directorUid}/{filename}
   */
  async uploadScheduleImport(
    directorUid: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<UploadResult> {
    return this.uploadFile(file, `schedule-imports/${directorUid}`, onProgress);
  },

  /**
   * Upload message attachment
   * Target: message-attachments/{messageId}/{filename}
   */
  async uploadMessageAttachment(
    messageId: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<UploadResult> {
    return this.uploadFile(file, `message-attachments/${messageId}`, onProgress);
  },

  /**
   * Upload Kárdex evidence
   * Target: kardex-evidence/{recordId}/{filename}
   */
  async uploadKardexEvidence(
    recordId: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<UploadResult> {
    return this.uploadFile(file, `kardex-evidence/${recordId}`, onProgress);
  },
};
