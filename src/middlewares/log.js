export const logger=(req, res, next)=>{
    console.log(`Fecha: ${new Date().toUTCString()} - url: ${req.baseUrl} - method: ${req.method}`)

    next()
}
