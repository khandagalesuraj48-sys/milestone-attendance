import type { Request } from 'express';

export interface ParsedMultipartFile {
  fieldName: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  buffer: Buffer;
}

export interface ParsedMultipartResult {
  fields: Record<string, string>;
  files: ParsedMultipartFile[];
}

/**
 * Pure TypeScript Zero-Dependency Multipart/Form-Data Parser
 * Compatible with Node.js Express, AWS Lambda, Cloud Run, and Netlify Functions
 */
export function parseMultipartBuffer(bodyBuffer: Buffer, contentType: string): ParsedMultipartResult {
  const result: ParsedMultipartResult = {
    fields: {},
    files: [],
  };

  if (!bodyBuffer || bodyBuffer.length === 0) {
    return result;
  }

  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) {
    return result;
  }
  const boundary = (boundaryMatch[1] || boundaryMatch[2]).trim();
  const boundaryDelimiter = Buffer.from(`--${boundary}`);

  let currentIdx = bodyBuffer.indexOf(boundaryDelimiter);
  if (currentIdx === -1) {
    return result;
  }

  while (currentIdx !== -1) {
    const afterBoundary = currentIdx + boundaryDelimiter.length;
    // Check for trailing '--' indicating end of stream
    if (bodyBuffer.slice(afterBoundary, afterBoundary + 2).toString() === '--') {
      break;
    }

    // Skip CR/LF or LF after delimiter
    let contentStart = afterBoundary;
    if (bodyBuffer.slice(contentStart, contentStart + 2).toString() === '\r\n') {
      contentStart += 2;
    } else if (bodyBuffer[contentStart] === 0x0a) {
      contentStart += 1;
    }

    const nextBoundaryIdx = bodyBuffer.indexOf(boundaryDelimiter, contentStart);
    if (nextBoundaryIdx === -1) {
      break;
    }

    const partBuffer = bodyBuffer.slice(contentStart, nextBoundaryIdx);
    currentIdx = nextBoundaryIdx;

    // Find header boundary (\r\n\r\n or \n\n)
    let headerEndIdx = partBuffer.indexOf('\r\n\r\n');
    let sepLen = 4;
    if (headerEndIdx === -1) {
      headerEndIdx = partBuffer.indexOf('\n\n');
      sepLen = 2;
    }
    if (headerEndIdx === -1) {
      continue;
    }

    const headerText = partBuffer.slice(0, headerEndIdx).toString('utf8');
    let partBody = partBuffer.slice(headerEndIdx + sepLen);

    // Strip trailing \r\n or \n before boundary
    if (partBody.length >= 2 && partBody.slice(-2).toString() === '\r\n') {
      partBody = partBody.slice(0, -2);
    } else if (partBody.length >= 1 && partBody[partBody.length - 1] === 0x0a) {
      partBody = partBody.slice(0, -1);
    }

    // Extract headers
    const nameMatch = headerText.match(/name="([^"]+)"/i);
    const filenameMatch = headerText.match(/filename="([^"]+)"/i);
    const typeMatch = headerText.match(/content-type:\s*([^\r\n;]+)/i);

    const name = nameMatch ? nameMatch[1] : '';
    const filename = filenameMatch ? filenameMatch[1] : undefined;
    const fileType = typeMatch ? typeMatch[1].trim() : 'application/octet-stream';

    if (filename !== undefined && filename.length > 0) {
      result.files.push({
        fieldName: name,
        fileName: filename,
        fileType,
        fileSize: partBody.length,
        buffer: partBody,
      });
    } else if (name) {
      result.fields[name] = partBody.toString('utf8');
    }
  }

  return result;
}

export async function parseIncomingMultipart(req: Request): Promise<ParsedMultipartResult> {
  const contentType = req.headers['content-type'] || '';

  if (!contentType.includes('multipart/form-data')) {
    return {
      fields: (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) ? req.body : {},
      files: [],
    };
  }

  if (Buffer.isBuffer(req.body)) {
    return parseMultipartBuffer(req.body, contentType);
  }

  if (typeof req.body === 'string') {
    return parseMultipartBuffer(Buffer.from(req.body, 'utf8'), contentType);
  }

  // Stream reader fallback if body parser hasn't buffered it
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const fullBuffer = Buffer.concat(chunks);
  return parseMultipartBuffer(fullBuffer, contentType);
}
