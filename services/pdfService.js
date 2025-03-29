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

// Directory to store uploaded PDFs
// Use an absolute path to avoid any issues with relative paths
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
// const UPLOAD_DIR = '/Users/amiyonco/Desktop/chatbot Agent/uploads';
console.log(`Initialized UPLOAD_DIR as: "${UPLOAD_DIR}"`);

// Ensure upload directory exists - simplified approach
const ensureDirectoryExists = (dirPath) => {
  if (!dirPath || dirPath === '') {
    throw new Error('Directory path cannot be empty');
  }
  
  try {
    if (fs.existsSync(dirPath)) {
      const stats = fs.statSync(dirPath);
      if (!stats.isDirectory()) {
        throw new Error(`Path exists but is not a directory: ${dirPath}`);
      }
    } else {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dirPath}`);
    }
    return true;
  } catch (error) {
    console.error(`Failed to ensure directory ${dirPath}: ${error.message}`);
    throw error;
  }
};

// Create upload directory at startup
try {
  ensureDirectoryExists(UPLOAD_DIR);
  console.log(`Upload directory created/verified at: ${UPLOAD_DIR}`);
} catch (error) {
  console.error(`Failed to create upload directory: ${error.message}`);
  // Continue execution, the error will be handled when trying to save files
}

export const savePdfFile = async (fileBuffer, filename) => {
  try {
    // Create a safe filename
    const safeFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(UPLOAD_DIR, safeFilename);

    // Write file to disk
    await fs.promises.writeFile(filePath, fileBuffer);

    return filePath;
  } catch (error) {
    console.error(`Error saving PDF file: ${error.message}`);
    throw new Error(`Failed to save PDF file: ${error.message}`);
  }
};

export const processPdfFile = async (filePath) => {
  try {
    // Verify file exists before processing
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }

    // Load PDF file
    const loader = new PDFLoader(filePath);
    const docs = await loader.load();

    if (!docs || docs.length === 0) {
      throw new Error("Failed to extract content from PDF");
    }

    // Create text chunks for better processing
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const splitDocs = await textSplitter.splitDocuments(docs);

    // Create embeddings and vector store
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
      modelName: "embedding-001",
    });

    // Create and save the vectorstore
    const vectorStore = await FaissStore.fromDocuments(splitDocs, embeddings);

    // Save the vectorstore index (optional, for persistence)
    const indexPath = filePath.replace('.pdf', '');

    // Ensure the directory for the index exists
    const indexDir = path.dirname(indexPath);
    ensureDirectoryExists(indexDir);

    await vectorStore.save(indexPath);

    return {
      content: docs.map(doc => doc.pageContent).join('\n'),
      vectorStore,
      indexPath
    };
  } catch (error) {
    console.error("PDF Processing Error:", error);
    throw new Error(`Failed to process PDF: ${error.message}`);
  }
};

export const answerQuestionFromPdf = async (vectorStore, question, options = {}) => {
  try {
    // Create the model
    const model = new ChatGoogleGenerativeAI({
      modelName: options.model || "gemini-pro",
      temperature: options.temperature ?? 0.7,
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
      maxOutputTokens: options.maxTokens ?? 1024,
    });

    // Create the prompt template
    const promptTemplate = PromptTemplate.fromTemplate(`
      Answer the following question based on the provided context:
      
      Question: {question}
      
      Context: {context}
    `);

    // Create the chain for combining documents
    const retriever = vectorStore.asRetriever();

    // Create a chain that combines retrieval with the prompt and model
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

    // Generate an answer
    const response = await retrievalChain.invoke({
      input: question,
    });

    return response;
  } catch (error) {
    console.error("PDF Question Answering Error:", error);
    throw new Error(`Failed to answer question: ${error.message}`);
  }
};

export const loadVectorStore = async (indexPath) => {
  try {
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
      modelName: "embedding-001",
    });

    return await FaissStore.load(indexPath, embeddings);
  } catch (error) {
    console.error("Vector Store Loading Error:", error);
    throw new Error(`Failed to load vector store: ${error.message}`);
  }
};

export default {
  savePdfFile,
  processPdfFile,
  answerQuestionFromPdf,
  loadVectorStore
};