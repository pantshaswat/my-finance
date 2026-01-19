import { google } from 'googleapis';

export interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  body: string;
  date: string;
  internalDate: number;
}

export async function getGmailClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

export async function fetchEmailsFromSender(
  accessToken: string,
  senderEmail: string,
  afterDate?: Date,
  maxResults: number = 50
): Promise<EmailMessage[]> {
  const gmail = await getGmailClient(accessToken);
  
  let query = `from:${senderEmail}`;
  
  if (afterDate) {
    // Gmail uses YYYY/MM/DD format for dates
    const year = afterDate.getFullYear();
    const month = String(afterDate.getMonth() + 1).padStart(2, '0');
    const day = String(afterDate.getDate()).padStart(2, '0');
    query += ` after:${year}/${month}/${day}`;
  }
  
  console.log(`Gmail query: ${query}`);
  
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults,
  });

  const messages = response.data.messages || [];
  console.log(`Found ${messages.length} messages matching query`);
  
  const emailMessages: EmailMessage[] = [];

  for (const message of messages) {
    try {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
        format: 'full',
      });

      const headers = msg.data.payload?.headers || [];
      const fromHeader = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
      const subjectHeader = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '';
      const dateHeader = headers.find(h => h.name?.toLowerCase() === 'date')?.value || '';

      let body = '';
      
      // Recursive function to extract body from nested parts
      const extractBody = (payload: any): string => {
        // Direct body data
        if (payload.body?.data) {
          return Buffer.from(payload.body.data, 'base64').toString('utf-8');
        }
        
        // Check parts
        if (payload.parts && Array.isArray(payload.parts)) {
          // First try plain text
          for (const part of payload.parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
              return Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
          }
          
          // Then try HTML
          for (const part of payload.parts) {
            if (part.mimeType === 'text/html' && part.body?.data) {
              return Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
          }
          
          // Recursively check nested parts
          for (const part of payload.parts) {
            if (part.parts) {
              const nested = extractBody(part);
              if (nested) return nested;
            }
          }
        }
        
        return '';
      };

      body = extractBody(msg.data.payload);
      
      if (!body) {
        console.warn(`No body found for message ${message.id}`);
      }

      emailMessages.push({
        id: message.id!,
        from: fromHeader,
        subject: subjectHeader,
        body,
        date: dateHeader,
        internalDate: parseInt(msg.data.internalDate || '0'),
      });
    } catch (error) {
      console.error(`Error fetching message ${message.id}:`, error);
    }
  }

  // Sort by internal date (newest first)
  emailMessages.sort((a, b) => b.internalDate - a.internalDate);

  return emailMessages;
}