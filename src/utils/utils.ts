import bcrypt from 'bcrypt';
import { AuthenticatedRequest, UserContext } from '../interfaces/general';

export const hashPassword = async (password: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    bcrypt.genSalt(10, (err, salt) => {
      if (err) {
        reject(err);
      }

      bcrypt.hash(password, salt, (err, hash) => {
        if (err) {
          reject(err);
        }

        resolve(hash);
      });
    });
});
}
  
export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    bcrypt.compare(password, hashedPassword, (err, isMatch) => {
      if (err) {
        reject(err);
      }
      resolve(isMatch);
    });
  });
};


export const formatDate = (date: Date) => {
  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const fCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value);
};

export const normalizeDate = (value: string | Date | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return formatDate(date);
};


export const getUserContext = (req: AuthenticatedRequest): UserContext | null => {
  if (!req.user || req.user.userId === null || req.user.userId === undefined) {
    return null;
  }

  return {
    userId: req.user.userId,
    userName: req.user.userName,
  };
};
