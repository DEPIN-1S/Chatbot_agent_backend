

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import PDFService from '../services/pdfService.js';

// Ensure uploads directory exists
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
console.log(`Controller UPLOAD_DIR: "${UPLOAD_DIR}"`);

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log(`Created uploads directory at: ${UPLOAD_DIR}`);
}

// Configure multer for disk storage (better for large PDFs)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ 
  storage, 
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

export const uploadPdfMiddleware = upload.single('pdfFile');

export const processPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No PDF file uploaded' });
    }

    console.log(`Processing PDF: ${req.file.filename}`);
    
    const filePath = req.file.path;
    
    // Process the PDF
    const processedData = await PDFService.processPdfFile(filePath);
    
    const pdfId = Date.now().toString();
    
    // Store processed data
    PDFService.storeProcessedPdf(pdfId, {
      filePath,
      indexPath: processedData.indexPath,
      filename: req.file.filename,
      uploadedAt: new Date().toISOString(), // Use ISO string for JSON compatibility
      pageCount: processedData.pageCount
    });

    console.log(`PDF successfully processed with ID: ${pdfId}`);
    
    // Verify storage
    const metadata = PDFService.getAllProcessedPdfs();
    console.log(`Current PDFs in storage: ${Object.keys(metadata).join(', ')}`);

    return res.status(200).json({
      success: true,
      message: 'PDF uploaded and processed successfully',
      pdfId,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('PDF Processing Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const answerQuestion = async (req, res) => {
  try {
    const { pdfId, question, model = 'gemini-pro', temperature = 1.5 } = req.body;
    
    if (!pdfId || !question) {
      return res.status(400).json({ success: false, message: 'PDF ID and question are required' });
    }

    console.log(`Answering question for PDF ID: ${pdfId}`);
    
    // Get all metadata for debugging
    const allMetadata = PDFService.getAllProcessedPdfs();
    console.log(`Available PDFs: ${Object.keys(allMetadata).join(', ')}`);

    const pdfInfo = PDFService.getProcessedPdf(pdfId);
    if (!pdfInfo) {
      return res.status(404).json({ 
        success: false, 
        message: `PDF not found for ID: ${pdfId}`,
        availablePdfs: Object.keys(allMetadata) 
      });
    }

    let indexPath = pdfInfo.indexPath;
    if (!fs.existsSync(indexPath)) {
      indexPath = PDFService.findIndexPath(indexPath);
      if (!indexPath) {
        return res.status(404).json({ success: false, message: `Index not found for PDF ID: ${pdfId}` });
      }
    }

    const vectorStore = await PDFService.loadVectorStore(indexPath);
    
    const answer = await PDFService.answerQuestionFromPdf(vectorStore, question, { model, temperature });

    return res.status(200).json({
      success: true,
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
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const listProcessedPdfs = async (req, res) => {
  try {
    const processedPdfs = PDFService.getAllProcessedPdfs();
    const pdfs = Object.entries(processedPdfs).map(([id, info]) => ({
      id,
      filename: info.filename,
      uploadedAt: info.uploadedAt,
      pageCount: info.pageCount
    }));
    
    return res.status(200).json({
      success: true,
      message: 'Retrieved processed PDFs',
      pdfs
    });
  } catch (error) {
    console.error('List PDFs Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  uploadPdfMiddleware,
  processPdf,
  answerQuestion,
  listProcessedPdfs
};