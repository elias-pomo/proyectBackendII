import 'dotenv/config';

export const config={
    general: {
        PORT: process.env.PORT, 
        SECRET: process.env.SECRET, 
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN
    },
    database:{
        MONGO_URL: process.env.MONGO_URL,
        DB_NAME: process.env.DB_NAME,
    },
    mail: {
        HOST: process.env.MAIL_HOST,
        PORT: process.env.MAIL_PORT,
        USER: process.env.MAIL_USER,
        PASS: process.env.MAIL_PASS,
        FROM: process.env.MAIL_FROM
    }

}
