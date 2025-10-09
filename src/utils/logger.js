import { createLogger, format, transports } from 'winston';
import path from 'path';

const logger = createLogger({
    level: 'debug',
    format: format.combine(
        format.timestamp(),
        format.printf(({ timestamp, level, message }) => `${timestamp} [${level}] ${message}`)
    ),
    transports: [
        new transports.File({ filename: path.join(process.cwd(), 'ea_debug.log'), level: 'debug', options: { flags: 'a' } })
    ]
});

console.log('[EA DEBUG] Winston logger initialized and writing to ea_debug.log');

export default logger;
