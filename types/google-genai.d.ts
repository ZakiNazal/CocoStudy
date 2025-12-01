declare module "@google/genai" {
  export enum Type {
    ARRAY = "array",
    OBJECT = "object",
    STRING = "string",
    INTEGER = "integer",
  }

  export interface GenerateResponse {
    text?: string;
    candidates?: any[];
  }

  export class GoogleGenAI {
    constructor(opts?: { apiKey?: string });
    models: {
      generateContent(opts: any): Promise<GenerateResponse>;
    };
    chats: {
      create(opts?: any): { sendMessage(opts?: any): Promise<GenerateResponse> };
    };
  }

  export { GoogleGenAI as default };
}
