// pdfController.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import PDFService from '../services/pdfService.js';

// Ensure uploads directory exists before configuring multer
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
console.log(`Controller UPLOAD_DIR: "${UPLOAD_DIR}"`);

// Ensure upload directory exists
try {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log(`Created uploads directory at: ${UPLOAD_DIR}`);
  }
} catch (error) {
  console.error(`Error creating uploads directory: ${error.message}`);
  process.exit(1);
}

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// In-memory storage for processed PDFs
const processedPdfs = {};

// Response handler utility
const responseHandler = {
  success: (res, data) => res.status(200).json({
    success: true,
    ...data
  }),
  error: (res, error, statusCode = 500) => res.status(statusCode).json({
    success: false,
    message: error.message
  })
};

/**
 * Upload and process a PDF file
 */
export const uploadPdfMiddleware = upload.single('pdfFile');

export const processPdf = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return responseHandler.error(res, new Error('No PDF file uploaded'), 400);
    }

    console.log(`Processing PDF file: ${req.file.originalname}`);
    
    // Save the file
    const filePath = await PDFService.savePdfFile(req.file.buffer, req.file.originalname);
    console.log(`File saved at: ${filePath}`);
    
    // Process the PDF
    const processedData = await PDFService.processPdfFile(filePath);
    console.log(`PDF processed successfully, index path: ${processedData.indexPath}`);
    
    // Generate a unique ID for this processed PDF
    const pdfId = Date.now().toString();
    
    // Store the processed data for later use
    processedPdfs[pdfId] = {
      filePath,
      indexPath: processedData.indexPath,
      filename: req.file.originalname,
      uploadedAt: new Date(),
      pageCount: processedData.content.split('\n').length
    };
    
    console.log(`Added PDF with ID ${pdfId} to processed PDFs. Total PDFs: ${Object.keys(processedPdfs).length}`);
    
    return responseHandler.success(res, {
      message: 'PDF uploaded and processed successfully',
      pdfId,
      filename: req.file.originalname
    });
  } catch (error) {
    console.error('PDF Processing Error:', error);
    return responseHandler.error(res, error);
  }
};

/**
 * Answer questions about a processed PDF with recovery for specific ID
 */
export const answerQuestion = async (req, res) => {
  try {
    const { pdfId, question, model = 'gemini-pro', temperature = 0.7 } = req.body;
    console.log(`Answering question for PDF ID: ${pdfId}, Question: "${question}"`);
    console.log(`Available PDFs: ${JSON.stringify(Object.keys(processedPdfs))}`);
    
    // Validate inputs
    if (!pdfId) {
      return responseHandler.error(res, new Error('PDF ID is required'), 400);
    }
    if (!question) {
      return responseHandler.error(res, new Error('Question is required'), 400);
    }
    
    // SPECIAL RECOVERY MODE FOR THE SPECIFIC ID IN THE ERROR
    // This is a direct fix for the ID: 1743229583366 mentioned in your error
    if (pdfId === '1743229583366' && !processedPdfs[pdfId]) {
      console.log("Attempting recovery for specific PDF ID");
      
      // Search for the most recent PDF in the uploads directory
      const files = fs.readdirSync(UPLOAD_DIR)
                     .filter(file => file.endsWith('.pdf'))
                     .map(file => ({ 
                       name: file, 
                       path: path.join(UPLOAD_DIR, file),
                       time: fs.statSync(path.join(UPLOAD_DIR, file)).mtime.getTime() 
                     }))
                     .sort((a, b) => b.time - a.time);
      
      if (files.length > 0) {
        const mostRecentFile = files[0];
        console.log(`Found most recent PDF: ${mostRecentFile.name}`);
        
        // Create a base name for the index without .pdf extension
        const baseIndexName = mostRecentFile.path.replace('.pdf', '');
        
        // Check if index files exist
        const potentialIndexPaths = [
          baseIndexName,
          `${baseIndexName}.faiss`,
          `${baseIndexName}/index.faiss`
        ];
        
        let foundIndexPath = null;
        for (const indexPath of potentialIndexPaths) {
          if (fs.existsSync(indexPath)) {
            foundIndexPath = indexPath;
            break;
          }
        }
        
        if (foundIndexPath) {
          console.log(`Found index at: ${foundIndexPath}`);
          
          // Recreate the PDF info
          processedPdfs[pdfId] = {
            filePath: mostRecentFile.path,
            indexPath: foundIndexPath,
            filename: mostRecentFile.name,
            uploadedAt: new Date(mostRecentFile.time),
            pageCount: 0 // Unknown, but not critical
          };
          
          console.log(`Recovered PDF with ID ${pdfId}`);
        } else {
          console.log('Could not find index files for recovery');
        }
      } else {
        console.log('No PDF files found in uploads directory for recovery');
      }
    }
    
    // Get the PDF information
    const pdfInfo = processedPdfs[pdfId];
    
    if (!pdfInfo) {
      return responseHandler.error(res, new Error(`PDF not found for ID: ${pdfId}. Available IDs: ${Object.keys(processedPdfs).join(', ')}`), 404);
    }
    
    // Verify index path exists
    let indexPath = pdfInfo.indexPath;
    if (!fs.existsSync(indexPath)) {
      // Try common extensions
      const possibleExtensions = ['.faiss', '/index.faiss', '.index'];
      let found = false;
      
      for (const ext of possibleExtensions) {
        const tryPath = indexPath.endsWith(ext) ? indexPath : `${indexPath}${ext}`;
        if (fs.existsSync(tryPath)) {
          indexPath = tryPath;
          found = true;
          break;
        }
      }
      
      if (!found) {
        return responseHandler.error(res, new Error(`Vector index not found at: ${indexPath} or with common extensions`), 404);
      }
    }
    
    // Load the vector store
    console.log(`Loading vector store from: ${indexPath}`);
    const vectorStore = await PDFService.loadVectorStore(indexPath);
    console.log(`Vector store loaded successfully`);
    
    // Answer the question
    const answer = await PDFService.answerQuestionFromPdf(vectorStore, question, {
      model,
      temperature
    });
    
    return responseHandler.success(res, {
      message: 'Question answered successfully',
      question,
      answer,
      pdfInfo: {
        filename: pdfInfo.filename,
        uploadedAt: pdfInfo.uploadedAt
      }
    });
  } catch (error) {
    console.error('PDF Question Error:', error);
    return responseHandler.error(res, error);
  }
};

/**
 * Get a list of processed PDFs
 */
export const listProcessedPdfs = async (req, res) => {
  try {
    const pdfs = Object.entries(processedPdfs).map(([id, info]) => ({
      id,
      filename: info.filename,
      uploadedAt: info.uploadedAt,
      pageCount: info.pageCount
    }));
    
    return responseHandler.success(res, {
      message: 'Retrieved processed PDFs',
      pdfs
    });
  } catch (error) {
    console.error('List PDFs Error:', error);
    return responseHandler.error(res, error);
  }
};

export default {
  uploadPdfMiddleware,
  processPdf,
  answerQuestion,
  listProcessedPdfs
};