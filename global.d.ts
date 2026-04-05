import mongoose from 'mongoose';

declare global {
  // eslint-disable-next-line no-var
  var mongoose: {
    conn: Awaited<ReturnType<typeof mongoose.connect>> | null;
    promise: ReturnType<typeof mongoose.connect> | null;
  };
}

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
    };
  }
}

export {};