const isSilent = () => process.env.NODE_ENV === 'test';

const write = (stream, level, message, error) => {
    if (isSilent()) return;
    const detail = error ? `\n${error.stack ?? error.message ?? error}` : '';
    stream.write(`[${new Date().toISOString()}] ${level} ${message}${detail}\n`);
};

export const logger = {
    info: (message) => write(process.stdout, 'INFO', message),
    warn: (message) => write(process.stderr, 'WARN', message),
    error: (message, error) => write(process.stderr, 'ERROR', message, error)
};