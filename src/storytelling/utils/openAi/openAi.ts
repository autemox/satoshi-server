import { OpenAI } from "openai";
import dotenv from "dotenv";
dotenv.config();

export const openAi = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});