import 'dotenv/config';
process.loadEnvFile("./.env")

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

}

console.log(config)