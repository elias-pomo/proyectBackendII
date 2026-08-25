import mongoose from "mongoose"

export const connDB=async(mongoUri, dbName)=>{
    try {
        await mongoose.connect(
            mongoUri, 
            {
                dbName,
            }
        )

        console.log(`DB ${dbName} online...!!!`)
    } catch (error) {
        console.log(`Error al conectar a DB: ${error.message}`)
    }
}