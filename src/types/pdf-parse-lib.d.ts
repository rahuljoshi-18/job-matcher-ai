declare module "pdf-parse/lib/pdf-parse.js" {
  type PdfParseResult = {
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    version: string;
    text: string;
  };

  type PdfParse = (buffer: Buffer) => Promise<PdfParseResult>;

  const pdfParse: PdfParse;

  export default pdfParse;
}
