export const logger = (req, res, next) =>{
    console.log(`Fecha: ${new Date().toUTCString()}`);
    
    next()
}