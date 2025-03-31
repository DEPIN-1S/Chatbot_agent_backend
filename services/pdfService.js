

import fs from 'fs';
import path from 'path';
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
const METADATA_FILE = path.resolve(UPLOAD_DIR, 'pdf_metadata.json');

// Ensure the metadata file exists
const ensureMetadataFile = () => {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  
  if (!fs.existsSync(METADATA_FILE)) {
    fs.writeFileSync(METADATA_FILE, JSON.stringify({}), 'utf8');
  }
};

// Load metadata from file
const loadMetadata = () => {
  ensureMetadataFile();
  try {
    const data = fs.readFileSync(METADATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading metadata:', error);
    return {};
  }
};

// Save metadata to file
const saveMetadata = (metadata) => {
  ensureMetadataFile();
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving metadata:', error);
  }
};

const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
};

export const processPdfFile = async (filePath) => {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

  const loader = new PDFLoader(filePath);
  const docs = await loader.load();
  
  if (!docs || docs.length === 0) throw new Error("Failed to extract content from PDF");

  const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
  const splitDocs = await textSplitter.splitDocuments(docs);

  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_GENAI_API_KEY,
    modelName: "embedding-001",
  });

  const vectorStore = await FaissStore.fromDocuments(splitDocs, embeddings);

  const indexPath = filePath.replace('.pdf', '');
  ensureDirectoryExists(path.dirname(indexPath));

  await vectorStore.save(indexPath);

  return { content: docs.map(doc => doc.pageContent).join('\n'), indexPath, pageCount: docs.length };
};

export const answerQuestionFromPdf = async (vectorStore, question, options = {}) => {
  const model = new ChatGoogleGenerativeAI({
    modelName: options.model || "gemini-pro",
    temperature: options.temperature ?? 0.7,
    apiKey: process.env.GOOGLE_GENAI_API_KEY,
    maxOutputTokens: options.maxTokens ?? 1024,
  });

  const promptTemplate = PromptTemplate.fromTemplate(`
    Answer the following question based on the provided context:
    
    Question: {question}
    
    Context: {context}
  `);

  const retriever = vectorStore.asRetriever();

  const retrievalChain = RunnableSequence.from([
    { 
      question: (input) => input.input,
      context: async (input) => {
        const docs = await retriever.getRelevantDocuments(input.input);
        return docs.map(doc => doc.pageContent).join("\n\n");
      }
    },
    promptTemplate,
    model,
    new StringOutputParser(),
  ]);

  return await retrievalChain.invoke({ input: question });
};

export const loadVectorStore = async (indexPath) => {
  if (!fs.existsSync(indexPath)) throw new Error(`Index not found: ${indexPath}`);

  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_GENAI_API_KEY,
    modelName: "embedding-001",
  });

  return await FaissStore.load(indexPath, embeddings);
};

export const storeProcessedPdf = (pdfId, data) => {
  const metadata = loadMetadata();
  metadata[pdfId] = data;
  saveMetadata(metadata);
  console.log(`Stored PDF with ID: ${pdfId}`);
  console.log(`Current stored PDFs: ${Object.keys(metadata).join(', ')}`);
};

export const getProcessedPdf = (pdfId) => {
  const metadata = loadMetadata();
  const pdf = metadata[pdfId];
  console.log(`Retrieved PDF for ID: ${pdfId}, Found: ${!!pdf}`);
  return pdf;
};

export const getAllProcessedPdfs = () => {
  return loadMetadata();
};

export const findIndexPath = (basePath) => {
  const possiblePaths = [`${basePath}`, `${basePath}.faiss`, `${basePath}/index.faiss`];
  return possiblePaths.find((path) => fs.existsSync(path)) || null;
};

export default {
  processPdfFile,
  answerQuestionFromPdf,
  loadVectorStore,
  storeProcessedPdf,
  getProcessedPdf,
  getAllProcessedPdfs,
  findIndexPath
};
