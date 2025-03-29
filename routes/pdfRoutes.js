// pdfRoutes.js
import express from 'express';
import PDFController from '../controller/PdfController.js';

const router = express.Router();


router.post('/upload', 
  PDFController.uploadPdfMiddleware,
  PDFController.processPdf
);

router.post('/ask', PDFController.answerQuestion);

router.get('/list', PDFController.listProcessedPdfs);

export default router;