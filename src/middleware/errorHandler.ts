import { Request, Response, NextFunction  } from 'express';


export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
    //res.status(404);
    res.status(404).json({ message: `Api no encontrada - ${req.originalUrl}` });
    const error = new Error(`Not Found - ${req.originalUrl}`);
    next(error);
};

export const errorHandler = (err: any, _req: Request, res: Response) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Algo salio mal!' });
};
